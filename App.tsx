
import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { PasswordModal } from './components/PasswordModal';
import { EmailPreview } from './components/EmailPreview';
import { formatEmailBody } from './services/emailService';
import { AgentReport } from './types';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<AgentReport | null>(null);
  const [showEmail, setShowEmail] = useState(false);

  // 检查认证状态
  useEffect(() => {
    const token = sessionStorage.getItem('admin_token');
    const expiresAt = sessionStorage.getItem('admin_token_expires');
    
    if (token && expiresAt) {
      const expires = parseInt(expiresAt, 10);
      if (Date.now() < expires) {
        setIsAuthenticated(true);
      } else {
        // Token已过期，清除
        sessionStorage.removeItem('admin_token');
        sessionStorage.removeItem('admin_token_expires');
      }
    }
    
    setIsAuthChecked(true);
  }, []);

  const handlePasswordVerify = (token: string, expiresAt: number) => {
    setIsAuthenticated(true);
  };

  const handleRunAnalysis = async () => {
    // 获取token
    const token = sessionStorage.getItem('admin_token');
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

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Token失效，清除并重新验证
          sessionStorage.removeItem('admin_token');
          sessionStorage.removeItem('admin_token_expires');
          setIsAuthenticated(false);
          alert('认证已过期，请重新验证密码');
          return;
        }
        throw new Error(data.error || '扫描失败');
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
      console.error(error);
      alert(`扫描失败: ${error.message || "请检查您的网络连接。"}`);
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative">
      <Dashboard 
        report={report} 
        isAnalyzing={isAnalyzing} 
        onRunAnalysis={handleRunAnalysis}
        onComposeEmail={() => setShowEmail(true)}
      />

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
