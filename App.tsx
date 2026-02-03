
import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { PasswordModal } from './components/PasswordModal';
import { EmailPreview } from './components/EmailPreview';
import { ParticleBackground } from './components/ParticleBackground';
import { AgentReport } from './types';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<AgentReport | null>(null);
  const [showEmail, setShowEmail] = useState(false);

  // 检查认证状态（从localStorage读取持久化的token）
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const expiresAt = localStorage.getItem('admin_token_expires');
    
    if (token && expiresAt) {
      const expires = parseInt(expiresAt, 10);
      if (Date.now() < expires) {
        setIsAuthenticated(true);
      } else {
        // Token已过期，清除
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_token_expires');
      }
    }
    
    setIsAuthChecked(true);
  }, []);

  const handlePasswordVerify = (token: string, expiresAt: number) => {
    setIsAuthenticated(true);
  };

  const handleRunAnalysis = async () => {
    // 获取token
    const token = localStorage.getItem('admin_token');
    if (!token) {
      alert('请先验证密码');
      return;
    }

    setIsAnalyzing(true);
    setReport(null);
    
    try {
      // 调用后端API执行扫描
      const response = await fetch('/api/scout/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      // 检查响应类型
      const contentType = response.headers.get('content-type');
      let data: any;

      if (contentType && contentType.includes('application/json')) {
        // 响应是JSON格式
        data = await response.json();
      } else {
        // 响应不是JSON，可能是HTML错误页面
        const text = await response.text();
        console.error('非JSON响应:', text);
        throw new Error(`服务器返回了非JSON响应。状态码: ${response.status}。请检查服务器配置和环境变量。`);
      }

      if (!response.ok) {
        if (response.status === 401) {
          // Token失效，清除并重新验证
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_token_expires');
          setIsAuthenticated(false);
          alert('认证已过期，请重新验证密码');
          return;
        }
        
        if (response.status === 429) {
          // 速率限制错误
          const rateLimitInfo = data.hourlyCount !== undefined 
            ? `\n\n当前使用情况：\n每小时: ${data.hourlyCount}/${data.hourlyLimit} 次\n每天: ${data.dailyCount}/${data.dailyLimit} 次`
            : '';
          alert(`${data.error || '超过次数，请隔天再试'}${rateLimitInfo}`);
          return;
        }
        
        throw new Error(data.error || `扫描失败 (状态码: ${response.status})`);
      }

      if (data.success && data.report) {
        // 转换报告格式以适配前端
        const formattedReport: AgentReport = {
          id: Date.now().toString(),
          date: data.report.date,
          summary: data.report.summary,
          products: data.report.products
        };
        setReport(formattedReport);
        alert(`扫描完成。\n\n找到 ${formattedReport.products.length} 个产品，报告已自动发送至 icyfire.info@gmail.com`);
      } else {
        throw new Error('扫描完成但未返回报告');
      }

    } catch (error: any) {
      console.error('扫描错误详情:', error);
      
      // 处理 Gemini API 配额超限错误
      let errorMessage = error.message || "请检查您的网络连接。";
      
      if (errorMessage.includes('配额') || errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
        errorMessage = 'Gemini API 配额已超限。\n\n' +
          '可能的原因：\n' +
          '1. 已达到免费配额限制\n' +
          '2. 需要升级 API 计划\n' +
          '3. 账单问题\n\n' +
          '解决方案：\n' +
          '• 检查 Google AI Studio 的配额和账单\n' +
          '• 访问 https://ai.google.dev/gemini-api/docs/rate-limits 查看详情\n' +
          '• 等待配额重置或升级计划';
      }
      
      alert(`扫描失败: ${errorMessage}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 等待认证检查完成
  if (!isAuthChecked) {
    return null;
  }

  // 显示密码验证界面
  if (!isAuthenticated) {
    return <PasswordModal onVerify={handlePasswordVerify} />;
  }

  return (
    <div className="min-h-[100dvh] app-background text-white font-sans relative">
      <ParticleBackground />
      <div className="relative z-10">
        <Dashboard 
          report={report} 
          isAnalyzing={isAnalyzing} 
          onRunAnalysis={handleRunAnalysis}
          onComposeEmail={() => setShowEmail(true)}
        />
      </div>

      {showEmail && report && (
        <EmailPreview 
            report={report}
            onClose={() => setShowEmail(false)} 
        />
      )}
    </div>
  );
}

export default App;
