/**
 * 速率限制模块
 * 用于限制手动扫描的执行次数
 * - 每小时最多10次
 * - 每天最多20次
 */

interface RateLimitResult {
  allowed: boolean;
  message?: string;
  hourlyCount?: number;
  dailyCount?: number;
}

// 内存存储（降级方案）
interface RateLimitData {
  hourly: { timestamp: number; count: number }[];
  daily: { date: string; count: number }[];
}

const memoryStore = new Map<string, RateLimitData>();

/**
 * 检查速率限制
 * @param kv Redis客户端（可选）
 * @returns RateLimitResult 包含是否允许执行及当前计数
 */
export async function checkRateLimit(kv?: any): Promise<RateLimitResult> {
  const now = Date.now();
  const currentHour = Math.floor(now / (60 * 60 * 1000)); // 当前小时的时间戳（小时为单位）
  const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD格式

  const HOURLY_LIMIT = 10;
  const DAILY_LIMIT = 20;

  try {
    if (kv) {
      // 使用Redis存储（推荐）
      return await checkRateLimitWithRedis(kv, currentHour, currentDate, HOURLY_LIMIT, DAILY_LIMIT);
    } else {
      // 使用内存存储（降级方案）
      return checkRateLimitFromMemory(currentHour, currentDate, HOURLY_LIMIT, DAILY_LIMIT);
    }
  } catch (error: any) {
    console.warn('速率限制检查失败，降级到内存存储:', error.message);
    // 降级到内存存储
    return checkRateLimitFromMemory(currentHour, currentDate, HOURLY_LIMIT, DAILY_LIMIT);
  }
}

/**
 * 使用Redis检查速率限制
 */
async function checkRateLimitWithRedis(
  kv: any,
  currentHour: number,
  currentDate: string,
  hourlyLimit: number,
  dailyLimit: number
): Promise<RateLimitResult> {
  const hourlyKey = `rate_limit:hourly:${currentHour}`;
  const dailyKey = `rate_limit:daily:${currentDate}`;

  try {
    // 获取当前计数
    const hourlyCountStr = await kv.get(hourlyKey);
    const dailyCountStr = await kv.get(dailyKey);

    const hourlyCount = hourlyCountStr ? parseInt(hourlyCountStr, 10) : 0;
    const dailyCount = dailyCountStr ? parseInt(dailyCountStr, 10) : 0;

    // 检查限制
    if (hourlyCount >= hourlyLimit) {
      return {
        allowed: false,
        message: '超过次数，请隔天再试',
        hourlyCount,
        dailyCount
      };
    }

    if (dailyCount >= dailyLimit) {
      return {
        allowed: false,
        message: '超过次数，请隔天再试',
        hourlyCount,
        dailyCount
      };
    }

    // 增加计数
    const newHourlyCount = hourlyCount + 1;
    const newDailyCount = dailyCount + 1;

    // 更新Redis计数
    await kv.incr(hourlyKey);
    await kv.incr(dailyKey);

    // 设置过期时间
    // 每小时限制：1小时后过期
    await kv.expire(hourlyKey, 3600);
    // 每天限制：24小时后过期
    await kv.expire(dailyKey, 86400);

    return {
      allowed: true,
      hourlyCount: newHourlyCount,
      dailyCount: newDailyCount
    };
  } catch (error: any) {
    console.warn('Redis速率限制检查失败:', error.message);
    throw error;
  }
}

/**
 * 使用内存检查速率限制（降级方案）
 */
function checkRateLimitFromMemory(
  currentHour: number,
  currentDate: string,
  hourlyLimit: number,
  dailyLimit: number
): RateLimitResult {
  const key = 'manual_scan_rate_limit';
  let data = memoryStore.get(key);

  if (!data) {
    data = {
      hourly: [],
      daily: []
    };
    memoryStore.set(key, data);
  }

  const now = Date.now();

  // 清理过期的每小时记录（保留最近1小时）
  data.hourly = data.hourly.filter(
    item => now - item.timestamp < 60 * 60 * 1000
  );

  // 清理过期的每天记录（保留今天）
  data.daily = data.daily.filter(item => item.date === currentDate);

  // 计算当前计数
  const hourlyCount = data.hourly.length;
  const dailyCount = data.daily.reduce((sum, item) => sum + item.count, 0);

  // 检查限制
  if (hourlyCount >= hourlyLimit) {
    return {
      allowed: false,
      message: '超过次数，请隔天再试',
      hourlyCount,
      dailyCount
    };
  }

  if (dailyCount >= dailyLimit) {
    return {
      allowed: false,
      message: '超过次数，请隔天再试',
      hourlyCount,
      dailyCount
    };
  }

  // 增加计数
  data.hourly.push({ timestamp: now, count: 1 });
  
  // 更新或创建今天的记录
  const todayRecord = data.daily.find(item => item.date === currentDate);
  if (todayRecord) {
    todayRecord.count += 1;
  } else {
    data.daily.push({ date: currentDate, count: 1 });
  }

  return {
    allowed: true,
    hourlyCount: hourlyCount + 1,
    dailyCount: dailyCount + 1
  };
}

/**
 * 获取当前速率限制状态（不增加计数）
 * @param kv Redis客户端（可选）
 * @returns 当前的每小时和每天计数
 */
export async function getRateLimitStatus(kv?: any): Promise<{
  hourlyCount: number;
  dailyCount: number;
  hourlyLimit: number;
  dailyLimit: number;
}> {
  const now = Date.now();
  const currentHour = Math.floor(now / (60 * 60 * 1000));
  const currentDate = new Date().toISOString().split('T')[0];

  const HOURLY_LIMIT = 10;
  const DAILY_LIMIT = 20;

  try {
    if (kv) {
      const hourlyKey = `rate_limit:hourly:${currentHour}`;
      const dailyKey = `rate_limit:daily:${currentDate}`;

      const hourlyCountStr = await kv.get(hourlyKey);
      const dailyCountStr = await kv.get(dailyKey);

      return {
        hourlyCount: hourlyCountStr ? parseInt(hourlyCountStr, 10) : 0,
        dailyCount: dailyCountStr ? parseInt(dailyCountStr, 10) : 0,
        hourlyLimit: HOURLY_LIMIT,
        dailyLimit: DAILY_LIMIT
      };
    } else {
      const key = 'manual_scan_rate_limit';
      const data = memoryStore.get(key);

      if (!data) {
        return {
          hourlyCount: 0,
          dailyCount: 0,
          hourlyLimit: HOURLY_LIMIT,
          dailyLimit: DAILY_LIMIT
        };
      }

      // 清理过期记录
      const now = Date.now();
      data.hourly = data.hourly.filter(
        item => now - item.timestamp < 60 * 60 * 1000
      );
      data.daily = data.daily.filter(item => item.date === currentDate);

      const hourlyCount = data.hourly.length;
      const dailyCount = data.daily.reduce((sum, item) => sum + item.count, 0);

      return {
        hourlyCount,
        dailyCount,
        hourlyLimit: HOURLY_LIMIT,
        dailyLimit: DAILY_LIMIT
      };
    }
  } catch (error: any) {
    console.warn('获取速率限制状态失败:', error.message);
    return {
      hourlyCount: 0,
      dailyCount: 0,
      hourlyLimit: HOURLY_LIMIT,
      dailyLimit: DAILY_LIMIT
    };
  }
}
