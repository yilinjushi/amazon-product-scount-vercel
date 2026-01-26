/**
 * 手动触发扫描API
 * 需要密码验证
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { scoutProducts, sendEmail, saveHistory } from '../lib/scout.js';
import { verifyToken } from '../lib/auth.js';
import { checkRateLimit } from '../lib/rateLimit.js';

// 动态导入Redis客户端
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
  // 确保所有响应都是JSON格式
  res.setHeader('Content-Type', 'application/json');

  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 验证token
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  
  // 获取KV实例（用于token验证）
  const kv = await getKV();
  
  // 验证token（优先使用Redis验证，否则使用内存验证）
  const isValidToken = await verifyToken(token, kv);
  
  if (!isValidToken) {
    // 如果使用了Redis，关闭连接
    if (kv) {
      await kv.quit().catch(() => {}); // 忽略关闭错误
    }
    return res.status(401).json({ error: '未授权，请先验证密码' });
  }

  // 检查速率限制（每小时最多10次，每天最多20次）
  const rateLimitResult = await checkRateLimit(kv);
  if (!rateLimitResult.allowed) {
    // 如果使用了Redis，关闭连接
    if (kv) {
      await kv.quit().catch(() => {}); // 忽略关闭错误
    }
    return res.status(429).json({ 
      error: rateLimitResult.message || '超过次数，请隔天再试',
      hourlyCount: rateLimitResult.hourlyCount,
      dailyCount: rateLimitResult.dailyCount,
      hourlyLimit: 10,
      dailyLimit: 20
    });
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

    // 使用已有的KV实例（如果之前获取了）
    // 如果没有，重新获取（用于历史记录存储）
    const kvForHistory = kv || await getKV();

    // 执行扫描
    const report = await scoutProducts(geminiKey!, kvForHistory);

    console.log(`扫描完成，找到 ${report.products.length} 个产品。`);

    // 保存历史记录
    if (report.products.length > 0 && kvForHistory) {
      await saveHistory(kvForHistory, report.products);
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

    // 关闭Redis连接（如果使用了）
    if (kvForHistory && kvForHistory !== kv) {
      await kvForHistory.quit().catch(() => {});
    }
    if (kv) {
      await kv.quit().catch(() => {});
    }

    return res.status(200).json({
      success: true,
      message: '扫描完成',
      report
    });

  } catch (error: any) {
    console.error('扫描失败:', error);
    
    // 确保关闭Redis连接
    if (kv) {
      await kv.quit().catch(() => {});
    }
    
    const errorMessage = error.message || '未知错误';
    const errorStack = process.env.NODE_ENV === 'development' ? error.stack : undefined;
    
    return res.status(500).json({
      success: false,
      error: errorMessage,
      ...(errorStack && { stack: errorStack })
    });
  }
}
