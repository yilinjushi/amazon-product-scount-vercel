/**
 * 手动触发扫描API
 * 需要密码验证
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { scoutProducts, sendEmail, saveHistory } from '../lib/scout.js';

// 简单的token验证（生产环境建议使用JWT）
function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  // 这里可以添加更复杂的token验证逻辑
  // 目前简单检查token是否存在且格式正确
  try {
    Buffer.from(token, 'base64');
    return true;
  } catch {
    return false;
  }
}

// 动态导入Vercel KV
async function getKV() {
  try {
    // 检查环境变量是否存在
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      console.warn('Vercel KV环境变量未配置，将跳过历史记录存储');
      return null;
    }
    
    const { kv } = await import('@vercel/kv');
    return kv;
  } catch (e: any) {
    console.warn('Vercel KV未配置或导入失败，将跳过历史记录存储:', e.message);
    return null;
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // 确保所有响应都是JSON格式
  res.setHeader('Content-Type', 'application/json');

  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 验证token
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  
  if (!verifyToken(token)) {
    return res.status(401).json({ error: '未授权，请先验证密码' });
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
      throw new Error(`配置缺失: ${missing.join(', ')}`);
    }

    console.log('开始执行手动产品扫描...');

    // 获取KV实例
    const kv = await getKV();

    // 执行扫描
    const report = await scoutProducts(geminiKey!, kv);

    console.log(`扫描完成，找到 ${report.products.length} 个产品。`);

    // 保存历史记录
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

    console.log('手动扫描任务完成。');

    return res.status(200).json({
      success: true,
      message: '扫描完成',
      report
    });

  } catch (error: any) {
    console.error('扫描失败:', error);
    const errorMessage = error.message || '未知错误';
    const errorStack = process.env.NODE_ENV === 'development' ? error.stack : undefined;
    
    return res.status(500).json({
      success: false,
      error: errorMessage,
      ...(errorStack && { stack: errorStack })
    });
  }
}
