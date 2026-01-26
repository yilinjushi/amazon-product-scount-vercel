
// EmailJS Service Wrapper
// This allows sending emails using Gmail SMTP via EmailJS middleware
// Docs: https://www.emailjs.com/docs/rest-api/send/

import { AgentReport } from '../types';

interface EmailParams {
  serviceId: string;
  templateId: string;
  publicKey: string;
  toEmail: string;
  subject: string;
  message: string;
}

export const formatEmailBody = (report: AgentReport): string => {
  return `
Hi Team,

以下是本周的亚马逊（美国）新产品机会摘要，已根据我们的研发能力进行筛选。

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
1. 查看“匹配度”以评估技术可行性。
2. 点击链接分析竞品功能。

此致,
Amazon Product Scout Agent (亚马逊产品侦察兵)
  `;
};

export const sendEmail = async ({
  serviceId,
  templateId,
  publicKey,
  toEmail,
  subject,
  message
}: EmailParams): Promise<boolean> => {
  const url = 'https://api.emailjs.com/api/v1.0/email/send';

  const data = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    template_params: {
      to_email: toEmail,
      subject: subject,
      message: message,
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`EmailJS Error: ${errorText}`);
    }

    return true;
  } catch (error) {
    console.error('Email Service Error:', error);
    throw error;
  }
};
