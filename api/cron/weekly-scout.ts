/**
 * Vercel Cron Job - 每周自动运行的产品扫描任务
 * 计划：每周一上午8:00 UTC运行
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { scoutProducts, sendEmail, saveHistory, ScoutReport } from '../lib/scout.js';
import { getKV, closeKV } from '../lib/redis.js';

/**
 * 检查是否在最近6天内已执行过（防止重复执行）
 */
async function checkLastExecution(kv: any): Promise<boolean> {
  if (!kv) {
    // 如果没有Redis，无法检查，允许执行（但记录警告）
    console.warn('Redis未配置，无法检查上次执行时间，将允许执行');
    return false;
  }

  try {
    const lastExecutionKey = 'weekly_scout_last_execution';
    const lastExecution = await kv.get(lastExecutionKey);
    
    if (lastExecution) {
      const lastExecutionTime = new Date(lastExecution as string).getTime();
      const now = Date.now();
      const sixDaysInMs = 6 * 24 * 60 * 60 * 1000; // 6天的毫秒数
      
      if (now - lastExecutionTime < sixDaysInMs) {
        const daysSinceLastRun = Math.floor((now - lastExecutionTime) / (24 * 60 * 60 * 1000));
        console.log(`上次执行于 ${daysSinceLastRun} 天前，跳过本次执行（防止重复）`);
        return true; // 已执行过，跳过
      }
    }
    
    return false; // 未执行过或已超过6天，允许执行
  } catch (e: any) {
    console.warn('检查上次执行时间失败，将允许执行:', e.message);
    return false; // 出错时允许执行
  }
}

/**
 * 记录本次执行时间
 */
async function recordExecution(kv: any): Promise<void> {
  if (!kv) return;
  
  try {
    const lastExecutionKey = 'weekly_scout_last_execution';
    await kv.set(lastExecutionKey, new Date().toISOString());
    console.log('已记录本次执行时间');
  } catch (e: any) {
    console.warn('记录执行时间失败:', e.message);
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // 验证Cron Secret（可选，但推荐）
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 声明在 try 外，以便 catch 中可以关闭
  let kv: Awaited<ReturnType<typeof getKV>> = null;

  try {
    // 验证环境变量
    const geminiKey = process.env.GEMINI_API_KEY;
    const emailServiceId = process.env.EMAIL_SERVICE_ID;
    const emailTemplateId = process.env.EMAIL_TEMPLATE_ID;
    const emailPublicKey = process.env.EMAIL_PUBLIC_KEY;
    const emailPrivateKey = process.env.EMAIL_PRIVATE_KEY;
    const recipientEmail = process.env.RECIPIENT_EMAIL || 'icyfire.info@gmail.com';

    const missing = [];
    if (!geminiKey) missing.push('GEMINI_API_KEY');
    if (!emailServiceId) missing.push('EMAIL_SERVICE_ID');
    if (!emailTemplateId) missing.push('EMAIL_TEMPLATE_ID');
    if (!emailPublicKey) missing.push('EMAIL_PUBLIC_KEY');
    if (!emailPrivateKey) missing.push('EMAIL_PRIVATE_KEY');

    if (missing.length > 0) {
      throw new Error(`配置缺失，请在Vercel环境变量中设置: ${missing.join(', ')}`);
    }

    // 获取KV实例（用于防重复执行检查）
    kv = await getKV();
    
    // 检查是否在最近6天内已执行过
    const alreadyExecuted = await checkLastExecution(kv);
    if (alreadyExecuted) {
      await closeKV(kv);
      return res.status(200).json({
        success: true,
        message: '任务已跳过（最近6天内已执行过）',
        skipped: true
      });
    }

    console.log('开始执行每周产品扫描任务...');

    // 执行扫描
    const report = await scoutProducts(geminiKey!, kv);

    console.log(`扫描完成，找到 ${report.products.length} 个产品。`);

    // 保存历史记录（在发送邮件前保存，防止邮件发送失败导致数据丢失）
    if (report.products.length > 0 && kv) {
      await saveHistory(kv, report.products);
    }

    // 发送邮件
    await sendEmail(report, {
      serviceId: emailServiceId!,
      templateId: emailTemplateId!,
      publicKey: emailPublicKey!,
      privateKey: emailPrivateKey!,
      recipientEmail
    });

    // 记录本次执行时间（防止重复执行）
    await recordExecution(kv);
    await closeKV(kv);

    console.log('任务全部完成。');

    return res.status(200).json({
      success: true,
      message: '扫描任务完成',
      date: report.date,
      productCount: report.products.length
    });

  } catch (error: any) {
    console.error('任务失败:', error.message);
    await closeKV(kv);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
