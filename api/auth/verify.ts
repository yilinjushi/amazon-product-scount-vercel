/**
 * 密码验证API
 * 验证管理员密码并返回token
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateToken, storeToken } from '../lib/auth.js';

// 动态导入Redis客户端（用于存储token）
async function getKV() {
  try {
    const redisUrl = process.env.history_REDIS_URL || 
                     process.env.KV_REST_API_URL || 
                     process.env.REDIS_URL || 
                     process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.history_REDIS_TOKEN || 
                       process.env.KV_REST_API_TOKEN || 
                       process.env.REDIS_TOKEN || 
                       process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!redisUrl) {
      return null; // 无Redis，将使用内存存储
    }
    
    const { createClient } = await import('redis');
    const clientConfig: any = { url: redisUrl };
    if (redisToken) {
      clientConfig.token = redisToken;
    }
    
    const client = createClient(clientConfig);
    await client.connect();
    return client;
  } catch (e: any) {
    console.warn('Redis未配置或连接失败，将使用内存存储token:', e.message);
    return null;
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: '密码不能为空' });
    }

    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      console.error('管理员认证配置错误');
      return res.status(500).json({ error: '服务器配置错误' });
    }

    // 验证密码
    if (password !== adminPassword) {
      return res.status(401).json({ error: '密码错误' });
    }

    // 生成安全的token（使用加密安全的随机数）
    const token = generateToken();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24小时后

    // 存储token（优先使用Redis，否则使用内存）
    const kv = await getKV();
    await storeToken(token, expiresAt, kv);

    // 如果使用了Redis，关闭连接
    if (kv) {
      await kv.quit().catch(() => {}); // 忽略关闭错误
    }

    return res.status(200).json({
      success: true,
      token,
      expiresAt
    });

  } catch (error: any) {
    console.error('验证失败:', error);
    return res.status(500).json({ error: '服务器错误' });
  }
}
