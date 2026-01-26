/**
 * Vercel Cron Job - 每周自动运行的产品扫描任务
 * 计划：每周一上午8:00 UTC运行
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { scoutProducts, sendEmail, saveHistory, ScoutReport } from '../lib/scout.js';

// 动态导入Redis客户端（仅在需要时）
async function getKV() {
  try {
    // 检查环境变量是否存在（支持多种Redis环境变量格式）
    // 支持 Vercel KV/Redis 的各种命名格式
    const redisUrl = process.env.history_REDIS_URL || 
                     process.env.KV_REST_API_URL || 
                     process.env.REDIS_URL || 
                     process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.history_REDIS_TOKEN || 
                       process.env.KV_REST_API_TOKEN || 
                       process.env.REDIS_TOKEN || 
                       process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!redisUrl) {
      console.warn('Redis URL环境变量未配置，将跳过历史记录存储');
      return null;
    }
    
    // 使用标准的redis客户端
    const { createClient } = await import('redis');
    
    // 如果URL包含认证信息（如 https://username:password@host），直接使用URL
    // 否则需要单独的token
    const clientConfig: any = { url: redisUrl };
    if (redisToken) {
      clientConfig.token = redisToken;
    }
    
    const client = createClient(clientConfig);
    
    await client.connect();
    return client;
  } catch (e: any) {
    console.warn('Redis未配置或连接失败，将跳过历史记录存储:', e.message);
    return null;
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

    console.log('开始执行每周产品扫描任务...');

    // 获取KV实例
    const kv = await getKV();

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

    console.log('任务全部完成。');

    return res.status(200).json({
      success: true,
      message: '扫描任务完成',
      date: report.date,
      productCount: report.products.length
    });

  } catch (error: any) {
    console.error('任务失败:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
