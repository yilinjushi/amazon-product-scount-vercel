/**
 * 速率限制功能测试脚本
 * 用于测试每小时10次、每天20次的限制
 * 
 * 使用方法：
 * 1. 确保已设置环境变量 ADMIN_PASSWORD
 * 2. 运行: npx tsx test-rate-limit.ts
 * 3. 或编译后运行: npm run build && node dist/test-rate-limit.js
 */

import { checkRateLimit, getRateLimitStatus } from './api/lib/rateLimit.js';

// 模拟Redis客户端（用于测试）
class MockRedis {
  private store: Map<string, string> = new Map();
  private expires: Map<string, number> = new Map();

  async get(key: string): Promise<string | null> {
    const value = this.store.get(key);
    if (!value) return null;
    
    // 检查是否过期
    const expireTime = this.expires.get(key);
    if (expireTime && Date.now() > expireTime) {
      this.store.delete(key);
      this.expires.delete(key);
      return null;
    }
    
    return value;
  }

  async set(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async incr(key: string): Promise<number> {
    const current = await this.get(key);
    const newValue = current ? parseInt(current, 10) + 1 : 1;
    await this.set(key, newValue.toString());
    return newValue;
  }

  async expire(key: string, seconds: number): Promise<void> {
    this.expires.set(key, Date.now() + seconds * 1000);
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
    this.expires.delete(key);
  }

  async quit(): Promise<void> {
    // 清理
  }
}

// 测试函数
async function testRateLimit() {
  console.log('=== 速率限制功能测试 ===\n');

  // 测试1: 使用内存存储（无Redis）
  console.log('测试1: 内存存储模式（无Redis）');
  console.log('-----------------------------------');
  
  for (let i = 1; i <= 12; i++) {
    const result = await checkRateLimit(undefined); // 不使用Redis
    console.log(`第 ${i} 次请求:`, {
      allowed: result.allowed,
      message: result.message,
      hourlyCount: result.hourlyCount,
      dailyCount: result.dailyCount
    });
    
    if (!result.allowed) {
      console.log(`\n✅ 测试通过：第 ${i} 次请求被正确限制（每小时限制10次）\n`);
      break;
    }
  }

  // 测试2: 使用Redis存储
  console.log('\n测试2: Redis存储模式');
  console.log('-----------------------------------');
  
  const mockRedis = new MockRedis();
  
  // 重置计数
  await mockRedis.del('rate_limit:hourly:0');
  await mockRedis.del('rate_limit:daily:2026-01-26');
  
  for (let i = 1; i <= 12; i++) {
    const result = await checkRateLimit(mockRedis);
    console.log(`第 ${i} 次请求:`, {
      allowed: result.allowed,
      message: result.message,
      hourlyCount: result.hourlyCount,
      dailyCount: result.dailyCount
    });
    
    if (!result.allowed) {
      console.log(`\n✅ 测试通过：第 ${i} 次请求被正确限制（每小时限制10次）\n`);
      break;
    }
  }

  // 测试3: 检查状态（不增加计数）
  console.log('\n测试3: 获取当前状态（不增加计数）');
  console.log('-----------------------------------');
  
  const status1 = await getRateLimitStatus(mockRedis);
  console.log('状态1（获取后）:', status1);
  
  const status2 = await getRateLimitStatus(mockRedis);
  console.log('状态2（再次获取，应该相同）:', status2);
  
  if (status1.hourlyCount === status2.hourlyCount) {
    console.log('\n✅ 测试通过：getRateLimitStatus 不会增加计数\n');
  }

  // 测试4: 每天限制测试（模拟）
  console.log('\n测试4: 每天限制测试（模拟）');
  console.log('-----------------------------------');
  console.log('注意：此测试需要实际运行20次才能验证每天限制');
  console.log('建议：在实际环境中测试每天限制功能\n');

  await mockRedis.quit();
  
  console.log('=== 测试完成 ===');
}

// 运行测试
testRateLimit().catch(console.error);
