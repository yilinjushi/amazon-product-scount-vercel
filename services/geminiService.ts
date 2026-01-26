
import { GoogleGenAI } from "@google/genai";
import { COMPANY_PROFILE } from "../constants";
import { ScoutedProduct, AgentReport } from "../types";

// Note: In a real app, API_KEY should be in process.env. 
// For this demo, we assume the environment variable is set or passed correctly.

const HISTORY_KEY = 'agent_scout_history';

// --- Fuzzy Matching Helpers ---

// Calculate Levenshtein distance between two strings
const levenshteinDistance = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[a.length][b.length];
};

// Check if a new name is too similar to any name in the history
// Threshold 0.8 means 80% similarity triggers a duplicate flag
const isFuzzyDuplicate = (newName: string, history: string[], threshold = 0.8): boolean => {
  const normalizedNew = newName.toLowerCase().trim();
  
  return history.some(oldName => {
    const normalizedOld = oldName.toLowerCase().trim();
    
    // 1. Exact Match (Fastest)
    if (normalizedNew === normalizedOld) return true;

    // 2. Length check optimization
    // If length difference is greater than allowed error margin, skip expensive calculation
    const maxLength = Math.max(normalizedNew.length, normalizedOld.length);
    if (maxLength === 0) return true; // Both empty
    
    const minSimilarityLength = maxLength * threshold;
    if (Math.min(normalizedNew.length, normalizedOld.length) < minSimilarityLength) {
        return false;
    }

    // 3. Levenshtein Distance (Precise)
    const distance = levenshteinDistance(normalizedNew, normalizedOld);
    const similarity = 1 - (distance / maxLength);
    
    if (similarity >= threshold) {
        console.log(`[Fuzzy Match] '${newName}' is too similar to '${oldName}' (${(similarity * 100).toFixed(1)}%)`);
        return true;
    }
    
    return false;
  });
};

const getSystemInstruction = () => `
You are the "Amazon Product Scout Agent" for ${COMPANY_PROFILE.name}.
Your goal is to find new product ideas.

**CORE DIRECTIVE: ALWAYS RETURN 10 PRODUCTS.**
If you cannot find 10 "Perfect Matches", you must include "Partial Matches" or "Broad Category Matches" to meet the quota.

**Tech Profile for Matching:**
${JSON.stringify(COMPANY_PROFILE.techStack)}

**Target Categories:**
1. Smart Home & IoT
2. Health & Personal Care
3. Pet Supplies
4. Kitchen & Home Tools

**LANGUAGE REQUIREMENT:**
**OUTPUT MUST BE IN SIMPLIFIED CHINESE (简体中文).**
Translate all product names, descriptions, reasonings, and tech stacks into Chinese.
`;

// Helper: Ensure URL is safe (not a hallucinated ASIN)
const ensureSafeUrl = (product: ScoutedProduct): string => {
    const url = product.url || '';
    const name = product.name || '';
    
    // If URL looks like a direct specific product page (which AI often hallucinates), 
    // force it to be a Search URL instead.
    if (!url || url.includes('/dp/') || url.includes('/gp/') || !url.startsWith('http')) {
        return `https://www.amazon.com/s?k=${encodeURIComponent(name)}`;
    }
    return url;
};

// Modified signature to accept apiKey directly
export const scoutAmazonProducts = async (apiKey: string): Promise<AgentReport> => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please provide a valid Google Gemini API Key.");
  }

  // Initialize strictly with the passed key
  const ai = new GoogleGenAI({ apiKey });
  
  // 1. Load History from LocalStorage
  let history: string[] = [];
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) {
        history = JSON.parse(saved);
    }
  } catch (e) {
    console.warn("Failed to load history", e);
  }

  // Optimize prompt context: Only send the last 50 items to the AI to save tokens and focus on recent redundancy.
  // We will perform a full check against the entire history in the code layer later.
  const recentHistory = history.slice(-50); 
  const exclusionList = recentHistory.join(', ');

  const prompt = `
    Perform a product scan on Amazon US.
    
    **STRATEGY: GENERATE CANDIDATES & FILTER**
    Please identify **12 distinct electronic products** (I will select the best 10).
    
    **CRITICAL EXCLUSION LIST (DO NOT SUGGEST THESE):**
    [ ${exclusionList} ]
    
    **SEARCH STRATEGY:**
    1. Use Google Search to find "Amazon Best Sellers Electronics", "Amazon New Releases Smart Home", "Trending IoT devices 2024".
    2. Look for products that use ANY of the following:
       - Sensors (Temp, Humidity, Motion)
       - Displays (LCD, LED, Time)
       - Motors (Fans, Pumps, Vibration)
       - Connectivity (Bluetooth, WiFi)
    
    **MATCHING LOGIC (Be Generous):**
    - **High Score (80-100):** Uses our specific sensors (e.g., Temp + LCD).
    - **Medium Score (50-79):** Same category (e.g., A smart clock, even if we usually make weather stations).
    - **Low Score (30-49):** Generic gadget that we *could* manufacture (e.g., A simple night light).
    
    **IMPORTANT:**
    - Do NOT return an empty list.
    - Do NOT filter out products just because they look similar to existing ones.
    - If you can't find a direct Amazon URL, provide a Google Search URL like "https://www.google.com/search?q=Product+Name".
    - **IMAGES:** Try to find a representative image URL for the product.
    
    **OUTPUT FORMAT (JSON ONLY):**
    The JSON structure keys must remain in English (e.g. "summary", "products"), but the VALUES must be in Simplified Chinese.
    {
      "summary": "本周趋势分析摘要（中文）",
      "products": [
        {
          "name": "产品名称（中文）",
          "price": "$XX.XX",
          "amazonRating": "4.5",
          "description": "功能简介（中文）",
          "matchScore": 85,
          "reasoning": "推荐理由（中文）...",
          "requiredTech": ["技术1（中文）", "技术2"],
          "url": "Provide an Amazon Search URL (e.g. https://www.amazon.com/s?k=Keywords) to ensure the link works. DO NOT guess /dp/ ASIN links.",
          "imageUrl": "https://... (image url if found)",
          "isNewRelease": true
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
        systemInstruction: getSystemInstruction(),
      },
    });

    const jsonText = response.text || "{}";
    let data;
    try {
        data = JSON.parse(jsonText);
    } catch (e) {
        console.warn("JSON Parse failed, attempting cleanup", e);
        const cleanJson = jsonText.replace(/```json/g, '').replace(/```/g, '');
        data = JSON.parse(cleanJson);
    }
    
    let rawProducts = data.products || [];
    
    // --- 2. CODE-LEVEL ROBUST DEDUPLICATION & SANITIZATION ---
    // Use fuzzy matching against the ENTIRE history
    
    const uniqueProducts = rawProducts.filter((p: ScoutedProduct) => {
        const isDuplicate = isFuzzyDuplicate(p.name, history, 0.75);
        if (isDuplicate) {
            console.log(`Filtered fuzzy duplicate: ${p.name}`);
        }
        return !isDuplicate;
    }).map((p: ScoutedProduct) => ({
        ...p,
        // Force replace hallucinated ASIN links with Search URLs
        url: ensureSafeUrl(p)
    }));

    // --- 3. SLICE TO 10 ---
    // We asked for 12, filtered duplicates, now take top 10
    const finalProducts = uniqueProducts.slice(0, 10);

    // --- 4. SAVE HISTORY ---
    if (finalProducts.length > 0) {
        const newNames = finalProducts.map((p: ScoutedProduct) => p.name);
        const updatedHistory = [...history, ...newNames];
        // Keep unique and slice to prevent infinite growth issues in storage
        const uniqueHistory = Array.from(new Set(updatedHistory)).slice(-300);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(uniqueHistory));
    }
    
    return {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString(),
      products: finalProducts,
      summary: data.summary || "分析完成。"
    };

  } catch (error) {
    console.error("Gemini Scout Error:", error);
    // Rethrow with a user-friendly message if possible, or pass the raw error
    throw error;
  }
};
