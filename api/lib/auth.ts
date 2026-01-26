/**
 * 安全的Token生成和验证模块
 * 使用加密安全的随机数生成token，并支持过期时间验证
 */

import crypto from 'crypto';

interface TokenData {
  token: string;
  expiresAt: number;
}

// 内存中的token存储（用于无Redis环境）
// 注意：在Serverless环境中，这可能在函数重启后丢失
// 建议使用Redis进行持久化存储
const tokenStore = new Map<string, number>();

/**
 * 生成安全的随机token
 * 使用crypto.randomBytes生成32字节的随机数，转换为base64
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('base64');
}

/**
 * 存储token及其过期时间
 * @param token Token字符串
 * @param expiresAt 过期时间戳（毫秒）
 * @param kv Redis客户端（可选），如果提供则存储到Redis
 */
export async function storeToken(
  token: string, 
  expiresAt: number, 
  kv?: any
): Promise<void> {
  if (kv) {
    // 使用Redis存储（推荐）
    try {
      const tokenKey = `admin_token:${token}`;
      // 存储过期时间，并设置Redis过期时间（比实际过期时间多1小时，确保清理）
      await kv.set(tokenKey, expiresAt.toString());
      // 设置Redis key的过期时间（秒）
      const ttl = Math.ceil((expiresAt - Date.now()) / 1000) + 3600;
      await kv.expire(tokenKey, ttl);
    } catch (e: any) {
      console.warn('Redis存储token失败，使用内存存储:', e.message);
      // 降级到内存存储
      tokenStore.set(token, expiresAt);
    }
  } else {
    // 使用内存存储（降级方案）
    tokenStore.set(token, expiresAt);
    
    // 设置清理定时器（可选，防止内存泄漏）
    setTimeout(() => {
      tokenStore.delete(token);
    }, expiresAt - Date.now() + 1000);
  }
}

/**
 * 验证token是否有效
 * @param token Token字符串
 * @param kv Redis客户端（可选），如果提供则从Redis验证
 * @returns true如果token有效且未过期，false otherwise
 */
export async function verifyToken(
  token: string | undefined, 
  kv?: any
): Promise<boolean> {
  if (!token) {
    return false;
  }

  try {
    if (kv) {
      // 从Redis验证（推荐）
      try {
        const tokenKey = `admin_token:${token}`;
        const expiresAtStr = await kv.get(tokenKey);
        
        if (!expiresAtStr) {
          return false; // Token不存在
        }
        
        const expiresAt = parseInt(expiresAtStr, 10);
        if (Date.now() > expiresAt) {
          // Token已过期，删除
          await kv.del(tokenKey);
          return false;
        }
        
        return true; // Token有效
      } catch (e: any) {
        console.warn('Redis验证token失败，使用内存验证:', e.message);
        // 降级到内存验证
        return verifyTokenFromMemory(token);
      }
    } else {
      // 从内存验证（降级方案）
      return verifyTokenFromMemory(token);
    }
  } catch (error) {
    console.warn('Token验证出错:', error);
    return false;
  }
}

/**
 * 从内存中验证token（降级方案）
 */
function verifyTokenFromMemory(token: string): boolean {
  const expiresAt = tokenStore.get(token);
  
  if (!expiresAt) {
    return false; // Token不存在
  }
  
  if (Date.now() > expiresAt) {
    tokenStore.delete(token); // 清理过期token
    return false; // Token已过期
  }
  
  return true; // Token有效
}

/**
 * 删除token（用于登出等场景）
 * @param token Token字符串
 * @param kv Redis客户端（可选）
 */
export async function revokeToken(token: string, kv?: any): Promise<void> {
  if (kv) {
    try {
      const tokenKey = `admin_token:${token}`;
      await kv.del(tokenKey);
    } catch (e: any) {
      console.warn('Redis删除token失败:', e.message);
    }
  }
  
  // 同时从内存中删除
  tokenStore.delete(token);
}

/**
 * 清理所有过期的token（定期维护任务）
 * @param kv Redis客户端（可选）
 */
export async function cleanupExpiredTokens(kv?: any): Promise<number> {
  let cleaned = 0;
  
  if (kv) {
    // Redis会自动清理过期的key，这里只需要清理内存中的
    // 但我们可以扫描Redis中的token key（如果需要）
    // 注意：这可能需要扫描所有key，在生产环境中谨慎使用
  }
  
  // 清理内存中的过期token
  const now = Date.now();
  for (const [token, expiresAt] of tokenStore.entries()) {
    if (now > expiresAt) {
      tokenStore.delete(token);
      cleaned++;
    }
  }
  
  return cleaned;
}
