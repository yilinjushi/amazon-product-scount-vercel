/**
 * 集中配置文件
 * 所有可配置的常量和默认值
 */

// 产品扫描配置
export const SCOUT_CONFIG = {
  /** 最终选取的产品数量 */
  PRODUCT_COUNT: 9,
  /** AI 生成的候选产品数量（略多于最终数量，用于过滤后仍有足够产品） */
  PRODUCT_CANDIDATES: 11,
  /** 历史记录最大数量（防止无限增长） */
  HISTORY_LIMIT: 500,
} as const;

// 速率限制配置
export const RATE_LIMIT_CONFIG = {
  /** 每小时最大请求次数 */
  HOURLY_LIMIT: 10,
  /** 每天最大请求次数 */
  DAILY_LIMIT: 20,
} as const;

// AI 模型配置
export const AI_CONFIG = {
  /** 使用的 Gemini 模型 */
  MODEL: 'gemini-2.5-flash',
} as const;

// 公司信息（用于产品匹配）
export const COMPANY_PROFILE = {
  name: 'IcyFire Tech Solutions',
  techStackSummary: [
    'Sensors: Temp/Humidity (SHT/NTC), MEMS, Bio-impedance, Hall Effect',
    'Connectivity: BLE, WiFi (Tuya/ESP), SubG',
    'Output: LCD/LED, Motor/Servo, Audio',
    'Algorithms: PID, Pedometer'
  ]
} as const;

// 默认收件人邮箱（可通过环境变量 RECIPIENT_EMAIL 覆盖）
export const DEFAULT_RECIPIENT_EMAIL = 'icyfire.info@gmail.com';
