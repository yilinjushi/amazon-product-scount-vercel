/**
 * 核心扫描逻辑 - 重构为TypeScript，适配Vercel Serverless Functions
 * 产品数量：10个（从6个改为10个）
 * 历史记录：使用Vercel KV存储
 */

import { GoogleGenAI } from "@google/genai";

const COMPANY_PROFILE = {
  name: 'IcyFire Tech Solutions',
  techStackSummary: [
    'Sensors: Temp/Humidity (SHT/NTC), MEMS, Bio-impedance, Hall Effect',
    'Connectivity: BLE, WiFi (Tuya/ESP), SubG',
    'Output: LCD/LED, Motor/Servo, Audio',
    'Algorithms: PID, Pedometer'
  ]
};

export interface ScoutedProduct {
  name: string;
  price?: string;
  amazonRating?: string;
  description: string;
  matchScore: number;
  reasoning: string;
  requiredTech: string[];
  url?: string;
  imageUrl?: string;
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

// 辅助函数：验证和清理图片URL
function validateImageUrl(imageUrl: string | undefined): string | undefined {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return undefined;
  }
  
  const trimmed = imageUrl.trim();
  
  // 必须是 HTTP 或 HTTPS URL
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return undefined;
  }
  
  // 优先使用亚马逊CDN链接（m.media-amazon.com）
  if (trimmed.includes('m.media-amazon.com') || trimmed.includes('images-na.ssl-images-amazon.com')) {
    return trimmed;
  }
  
  // 也接受其他常见图片格式的URL（来自Google搜索等）
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const hasImageExtension = imageExtensions.some(ext => trimmed.toLowerCase().includes(ext));
  
  if (hasImageExtension) {
    return trimmed;
  }
  
  // 如果URL看起来像图片URL（包含image或img），也接受
  if (trimmed.toLowerCase().includes('image') || trimmed.toLowerCase().includes('img')) {
    return trimmed;
  }
  
  return undefined;
}

/**
 * 测试图片URL是否可访问
 */
async function testImageUrl(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
    
    const response = await fetch(url, { 
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    clearTimeout(timeoutId);
    
    const contentType = response.headers.get('content-type') || '';
    return response.ok && (
      contentType.startsWith('image/') || 
      contentType.includes('image')
    );
  } catch (error) {
    console.warn(`图片URL验证失败: ${url}`, error);
    return false;
  }
}

/**
 * 从产品名称提取英文关键词（用于图片搜索）
 */
function extractEnglishKeywords(productName: string): string {
  // 提取括号前的英文部分，或整个名称如果没有括号
  const match = productName.match(/^([^(]+)/);
  if (match) {
    return match[1].trim();
  }
  return productName.trim();
}

/**
 * 使用Unsplash API搜索产品图片
 */
async function fetchImageFromUnsplash(productName: string): Promise<string | undefined> {
  try {
    const keywords = extractEnglishKeywords(productName);
    // 使用公开的Unsplash Source API（无需API密钥，但有速率限制）
    // 注意：Unsplash Source API是公开的，但可能需要使用代理或直接访问
    const searchQuery = encodeURIComponent(keywords);
    
    // 尝试使用Unsplash Source API（公开访问）
    // 格式：https://source.unsplash.com/500x500/?{keywords}
    const unsplashUrl = `https://source.unsplash.com/500x500/?${searchQuery}`;
    
    // 验证这个URL是否可访问
    const isValid = await testImageUrl(unsplashUrl);
    if (isValid) {
      return unsplashUrl;
    }
    
    // 如果Unsplash Source不可用，尝试使用占位图片服务
    return `https://via.placeholder.com/500/cccccc/666666?text=${encodeURIComponent(keywords.substring(0, 20))}`;
  } catch (error) {
    console.warn(`Unsplash图片获取失败: ${productName}`, error);
    return undefined;
  }
}

/**
 * 获取后备图片URL（组合所有后备方案）
 */
async function getFallbackImageUrl(productName: string): Promise<string | undefined> {
  // 尝试Unsplash
  const unsplashUrl = await fetchImageFromUnsplash(productName);
  if (unsplashUrl) {
    return unsplashUrl;
  }
  
  // 最后使用占位图片
  const keywords = extractEnglishKeywords(productName);
  return `https://via.placeholder.com/500/cccccc/666666?text=${encodeURIComponent(keywords.substring(0, 20))}`;
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
      const limitedHistory = updatedHistory.slice(-500);
      
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
    
    **STRATEGY: GENERATE CANDIDATES & FILTER**
    Please identify **12 distinct electronic products** (I will select the best 10).
    
    **REQUIREMENT:** Identify distinct electronic products.
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
          "url": "Provide an Amazon Search URL (e.g., https://www.amazon.com/s?k=Keywords). DO NOT guess specific /dp/ ASIN links.",
          "imageUrl": "CRITICAL IMAGE URL REQUIREMENTS: Use Google Search to find REAL, DIRECTLY ACCESSIBLE product image URLs. Requirements: 1) Must be a complete HTTP/HTTPS URL that can be opened directly in a browser without authentication, 2) Must NOT require special headers, referrers, or cookies, 3) Prefer URLs from m.media-amazon.com or public CDN services, 4) The URL must end with image file extensions (.jpg, .jpeg, .png, .webp, .gif) or be clearly an image resource, 5) Test that the URL is publicly accessible. If you cannot find a valid, directly accessible image URL, leave this field EMPTY (do not guess or invent URLs)."
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
      },
    });

    const jsonText = response.text || "{}";
    const cleanJson = jsonText.replace(/```json/g, '').replace(/```/g, '');
    const data = JSON.parse(cleanJson);
    
    let rawProducts: ScoutedProduct[] = data.products || [];

    // --- CODE-LEVEL DEDUPLICATION & SANITIZATION ---
    // 1. 过滤重复
    // 2. 修复 URL (强制使用搜索链接以避免 404)
    // 3. 多层次图片URL获取策略
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
          
          // 多层次图片URL获取策略
          let finalImageUrl: string | undefined = undefined;
          
          // 步骤1: 验证AI返回的图片URL格式
          const validatedUrl = validateImageUrl(p.imageUrl);
          if (validatedUrl) {
            // 步骤2: 测试URL是否可访问（异步，但不阻塞）
            const isAccessible = await testImageUrl(validatedUrl);
            if (isAccessible) {
              finalImageUrl = validatedUrl;
              console.log(`[Image] 使用AI返回的图片URL: ${p.name}`);
            } else {
              console.log(`[Image] AI返回的图片URL不可访问，尝试后备方案: ${p.name}`);
            }
          }
          
          // 步骤3: 如果AI返回的URL无效，使用Unsplash后备方案
          if (!finalImageUrl) {
            const fallbackUrl = await getFallbackImageUrl(p.name);
            if (fallbackUrl) {
              finalImageUrl = fallbackUrl;
              console.log(`[Image] 使用后备图片URL: ${p.name}`);
            }
          }
          
          return {
            ...p,
            url: safeUrl,
            imageUrl: finalImageUrl
          };
        })
    );

    // 截取前 10 个（从6个改为10个）
    const finalProducts = uniqueProducts.slice(0, 10);
    
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
> 匹配度: ${p.matchScore}/100
> 价格: ${p.price || 'N/A'} | 评分: ${p.amazonRating || 'N/A'}
> 链接: ${p.url || '未找到链接'}

推荐理由 (WHY IT FITS US):
${p.reasoning}

所需技术栈 (REQUIRED TECH STACK):
[ ${p.requiredTech.join(' ] [ ')} ]

`).join('\n--------------------------------------------------\n')}

后续行动:
1. 查看"匹配度"以评估技术可行性。
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
