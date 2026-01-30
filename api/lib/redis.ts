/**
 * Redis 连接管理模块
 * 统一管理 Redis 客户端的创建和关闭
 */

export type RedisClient = Awaited<ReturnType<typeof getKV>>;

/**
 * 获取 Redis 客户端实例
 * 支持多种 Vercel KV/Redis 环境变量格式
 */
export async function getKV(): Promise<any | null> {
  try {
    // 检查环境变量是否存在（支持多种Redis环境变量格式）
    const redisUrl = process.env.history_REDIS_URL || 
                     process.env.KV_REST_API_URL || 
                     process.env.REDIS_URL || 
                     process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.history_REDIS_TOKEN || 
                       process.env.KV_REST_API_TOKEN || 
                       process.env.REDIS_TOKEN || 
                       process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!redisUrl) {
      console.warn('Redis URL环境变量未配置');
      return null;
    }
    
    // 使用标准的 redis 客户端
    const { createClient } = await import('redis');
    
    const clientConfig: any = { url: redisUrl };
    if (redisToken) {
      clientConfig.token = redisToken;
    }
    
    const client = createClient(clientConfig);
    await client.connect();
    return client;
  } catch (e: any) {
    console.warn('Redis连接失败:', e.message);
    return null;
  }
}

/**
 * 安全关闭 Redis 连接
 */
export async function closeKV(kv: any | null): Promise<void> {
  if (kv) {
    await kv.quit().catch(() => {});
  }
}

/**
 * 使用 Redis 执行操作，自动管理连接生命周期
 * @param fn 需要执行的函数，接收 Redis 客户端作为参数
 * @returns 函数执行结果
 */
export async function withKV<T>(fn: (kv: any | null) => Promise<T>): Promise<T> {
  const kv = await getKV();
  try {
    return await fn(kv);
  } finally {
    await closeKV(kv);
  }
}
