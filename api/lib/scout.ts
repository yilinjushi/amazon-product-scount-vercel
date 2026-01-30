/**
 * 核心扫描逻辑 - 重构为TypeScript，适配Vercel Serverless Functions
 * 历史记录：使用Vercel KV存储
 */

import { GoogleGenAI } from "@google/genai";
import { SCOUT_CONFIG, AI_CONFIG, COMPANY_PROFILE } from './config.js';

// 使用后端专用的类型定义（与前端types.ts结构相似但独立）
export interface ScoutedProduct {
  name: string;
  price?: string;
  amazonRating?: string;
  description: string;
  matchScore: number;
  reasoning: string;
  requiredTech: string[];
  url?: string;
  isNewRelease?: boolean;
}

export interface ScoutReport {
  date: string;
  summary: string;
  products: ScoutedProduct[];
}

// 辅助函数：确保链接是安全的
function ensureSafeUrl(product: ScoutedProduct): string {
  const url = product.url || '';
  const name = product.name || '';
  
  // 如果 URL 为空，或者包含 /dp/ (具体产品页) 或 /gp/，则视为高风险幻觉链接
  // 此时强制生成搜索链接
  if (!url || url.includes('/dp/') || url.includes('/gp/') || !url.startsWith('http')) {
    return `https://www.amazon.com/s?k=${encodeURIComponent(name)}`;
  }
  return url;
}


/**
 * 从Redis加载历史记录
 */
export async function loadHistory(kv: any): Promise<string[]> {
  try {
    if (kv) {
      const historyJson = await kv.get('scout_history');
      if (historyJson) {
        // Redis返回的是字符串，需要解析JSON
        const history = typeof historyJson === 'string' 
          ? JSON.parse(historyJson) 
          : historyJson;
        return Array.isArray(history) ? history : [];
      }
    }
  } catch (e: any) {
    console.warn("读取历史记录失败，将创建新记录:", e.message);
  }
  return [];
}

/**
 * 保存历史记录到Redis
 */
export async function saveHistory(kv: any, newProducts: ScoutedProduct[]): Promise<void> {
  try {
    if (kv && newProducts.length > 0) {
      const history = await loadHistory(kv);
      const newNames = newProducts.map(p => p.name);
      // 合并并去重
      const updatedHistory = [...new Set([...history, ...newNames])];
      // 限制历史记录数量，防止无限增长
      const limitedHistory = updatedHistory.slice(-SCOUT_CONFIG.HISTORY_LIMIT);
      
      // Redis需要存储JSON字符串
      await kv.set('scout_history', JSON.stringify(limitedHistory));
      console.log(`已更新历史记录。当前数据库包含 ${limitedHistory.length} 个产品。`);
    }
  } catch (e: any) {
    console.error("保存历史记录失败:", e);
  }
}

/**
 * 扫描亚马逊产品
 * @param geminiKey Gemini API密钥
 * @param kv Vercel KV实例（可选）
 * @returns 扫描报告
 */
export async function scoutProducts(
  geminiKey: string,
  kv?: any
): Promise<ScoutReport> {
  console.log("正在启动 Gemini 扫描...");
  const ai = new GoogleGenAI({ apiKey: geminiKey });

  // 加载历史记录
  const history = await loadHistory(kv);
  const exclusionContext = history.length > 0 
    ? `**STRICT EXCLUSION LIST (DO NOT SUGGEST):** ${history.join(', ')}` 
    : '';

  console.log(`加载了 ${history.length} 个历史产品进行排除。`);

  const prompt = `
    Perform a product scan on Amazon US for ${COMPANY_PROFILE.name}.
    Tech Stack: ${JSON.stringify(COMPANY_PROFILE.techStackSummary)}
    
    **STRATEGY: USE GOOGLE SEARCH TO FIND CURRENT AMAZON PRODUCTS**
    You MUST use the Google Search tool to search for current Amazon products. Search for:
    - "Amazon Best Sellers Electronics"
    - "Amazon New Releases Smart Home"
    - "Trending IoT devices ${new Date().getFullYear()}"
    
    Based on your search results, identify **${SCOUT_CONFIG.PRODUCT_CANDIDATES} distinct electronic products** (I will select the best ${SCOUT_CONFIG.PRODUCT_COUNT}).
    
    **REQUIREMENT:** Identify distinct electronic products from your search results.
    Target Categories: Smart Home, Health, Pet Supplies, Tools.
    
    ${exclusionContext}
    
    **OUTPUT FORMAT (JSON ONLY, Values in Simplified Chinese):**
    {
      "summary": "本周趋势分析摘要（中文）",
      "products": [
        {
          "name": "产品名称 (English Name + 中文名)",
          "price": "$XX.XX",
          "amazonRating": "4.5",
          "description": "功能简介",
          "matchScore": 85,
          "reasoning": "推荐理由...",
          "requiredTech": ["技术1", "技术2"],
          "url": "Provide an Amazon Search URL (e.g., https://www.amazon.com/s?k=Keywords). DO NOT guess specific /dp/ ASIN links."
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: AI_CONFIG.MODEL,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // 注意：使用 googleSearch 工具时不支持 responseMimeType: 'application/json'
        // 改为在 prompt 中要求返回 JSON 格式，然后手动解析
      },
    });

    const jsonText = response.text || "{}";
    
    // 健壮的 JSON 解析
    let data: { summary?: string; products?: ScoutedProduct[] };
    try {
      const cleanJson = jsonText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .replace(/^\s*\n/gm, '')
        .trim();
      data = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('JSON 解析失败，原始响应:', jsonText.substring(0, 500));
      // 尝试提取 JSON 部分
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          data = JSON.parse(jsonMatch[0]);
        } catch {
          console.error('二次 JSON 解析也失败');
          data = { summary: '解析失败', products: [] };
        }
      } else {
        data = { summary: '解析失败', products: [] };
      }
    }
    
    let rawProducts: ScoutedProduct[] = data.products || [];

    // --- CODE-LEVEL DEDUPLICATION & SANITIZATION ---
    // 1. 过滤重复
    // 2. 修复 URL (强制使用搜索链接以避免 404)
    const normalizedHistory = new Set(history.map(h => h.trim().toLowerCase()));
    
    const uniqueProducts = await Promise.all(
      rawProducts
        .filter(p => {
          const normalizedName = p.name.trim().toLowerCase();
          const isDuplicate = normalizedHistory.has(normalizedName);
          if (isDuplicate) console.log(`[Filter] Detected duplicate: ${p.name}`);
          return !isDuplicate;
        })
        .map(async (p) => {
          // 修复产品URL
          const safeUrl = ensureSafeUrl(p);
          
          return {
            ...p,
            url: safeUrl,
            imageUrl: undefined // 不再获取图片
          };
        })
    );

    // 截取前 N 个
    const finalProducts = uniqueProducts.slice(0, SCOUT_CONFIG.PRODUCT_COUNT);
    
    console.log(`AI 生成了 ${rawProducts.length} 个，过滤后剩余 ${uniqueProducts.length} 个，最终选取 ${finalProducts.length} 个。`);

    return {
      date: new Date().toLocaleDateString('zh-CN'),
      summary: data.summary || "分析完成。",
      products: finalProducts
    };
  } catch (error: any) {
    console.error("Gemini 扫描失败:", error);
    
    // 处理 Gemini API 配额超限错误
    if (error.code === 429 || error.status === 'RESOURCE_EXHAUSTED') {
      const quotaError = new Error('Gemini API 配额已超限。请检查您的 API 配额和账单详情。如需帮助，请访问: https://ai.google.dev/gemini-api/docs/rate-limits');
      (quotaError as any).code = 429;
      (quotaError as any).status = 'RESOURCE_EXHAUSTED';
      throw quotaError;
    }
    
    // 处理其他 Gemini API 错误
    if (error.message) {
      throw new Error(`Gemini API 错误: ${error.message}`);
    }
    
    throw error;
  }
}

/**
 * 发送邮件
 */
export async function sendEmail(
  report: ScoutReport,
  emailConfig: {
    serviceId: string;
    templateId: string;
    publicKey: string;
    privateKey: string;
    recipientEmail: string;
  }
): Promise<void> {
  console.log("正在构建邮件内容 (Plain Text)...");
  
  // 构建纯文本邮件
  const emailText = `
Hi Team,

以下是本周的亚马逊（美国）新产品机会摘要 (服务器自动扫描)，已根据我们的研发能力进行筛选。

执行摘要 (EXECUTIVE SUMMARY):
${report.summary}

--------------------------------------------------
已识别的机会 (IDENTIFIED OPPORTUNITIES) - ${report.products.length} 项
--------------------------------------------------

${report.products.map((p, i) => `
#${i + 1}: ${p.name}
> 技术匹配度: ${p.matchScore}/100
> 价格: ${p.price || 'N/A'} | 评分: ${p.amazonRating || 'N/A'}
> 链接: ${p.url || '未找到链接'}

推荐理由 (WHY IT FITS US):
${p.reasoning}

所需技术栈 (REQUIRED TECH STACK):
[ ${p.requiredTech.join(' ] [ ')} ]

`).join('\n--------------------------------------------------\n')}

后续行动:
1. 查看"技术匹配度"以评估技术可行性。
2. 点击链接分析竞品功能。

此致,
Amazon Product Scout Agent (Server Bot)
  `;

  const url = 'https://api.emailjs.com/api/v1.0/email/send';
  const data = {
    service_id: emailConfig.serviceId,
    template_id: emailConfig.templateId,
    user_id: emailConfig.publicKey,
    accessToken: emailConfig.privateKey,
    template_params: {
      to_email: emailConfig.recipientEmail,
      subject: `[自动周报] 亚马逊产品侦察 - ${report.date}`,
      message: emailText,
    }
  };

  console.log("正在发送邮件至:", emailConfig.recipientEmail);
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`邮件发送失败: ${errorText}`);
  }
  console.log("邮件发送成功!");
}
