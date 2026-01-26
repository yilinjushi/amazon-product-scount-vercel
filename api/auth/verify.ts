/**
 * 密码验证API
 * 验证管理员密码并返回token
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// 简单的token生成（生产环境建议使用JWT）
function generateToken(): string {
  return Buffer.from(`${Date.now()}-${Math.random()}`).toString('base64');
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
      console.error('ADMIN_PASSWORD环境变量未设置');
      return res.status(500).json({ error: '服务器配置错误' });
    }

    // 验证密码
    if (password !== adminPassword) {
      return res.status(401).json({ error: '密码错误' });
    }

    // 生成token（有效期24小时）
    const token = generateToken();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24小时后

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
