
import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { ApiKeyModal } from './components/ApiKeyModal';
import { EmailPreview } from './components/EmailPreview';
import { scoutAmazonProducts } from './services/geminiService';
import { sendEmail, formatEmailBody } from './services/emailService';
import { AgentReport, AppConfig } from './types';

// Default empty config. 
// SECURITY: Do NOT hardcode keys here anymore. 
// Users must enter them in the UI, and they will be saved to SessionStorage.
// SessionStorage automatically clears when browser is closed, providing better security.
const EMPTY_CONFIG: AppConfig = {
  geminiKey: '',
  emailServiceId: '',
  emailTemplateId: '',
  emailPublicKey: ''
};

function App() {
  const [config, setConfig] = useState<AppConfig>(EMPTY_CONFIG);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<AgentReport | null>(null);
  const [showEmail, setShowEmail] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Load config from SessionStorage on startup
  // SessionStorage clears when browser closes, reducing long-term exposure risk
  useEffect(() => {
    const savedConfig = sessionStorage.getItem('agent_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(parsed);
      } catch (e) {
        console.error("Failed to parse config", e);
      }
    } else {
        // If no config found, force show the modal
        setShowConfigModal(true);
    }
    setIsConfigLoaded(true);
  }, []);

  const handleSaveConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
    sessionStorage.setItem('agent_config', JSON.stringify(newConfig));
    setShowConfigModal(false);
  };

  const handleRunAnalysis = async () => {
    if (!config.geminiKey) {
        setShowConfigModal(true);
        return;
    }

    setIsAnalyzing(true);
    setReport(null);
    try {
      // 1. Scout Products (AI Analysis)
      // Pass the key directly from the config state.
      // We no longer rely on process.env injection which is flaky in browser builds.
      const data = await scoutAmazonProducts(config.geminiKey);
      setReport(data);

      // 2. Auto-send Email
      if (config.emailServiceId && config.emailTemplateId && config.emailPublicKey) {
        try {
           await sendEmail({
            serviceId: config.emailServiceId,
            templateId: config.emailTemplateId,
            publicKey: config.emailPublicKey,
            toEmail: "icyfire.info@gmail.com",
            subject: `Weekly Amazon Product Digest - ${data.date}`,
            message: formatEmailBody(data)
          });
          alert(`分析完成。\n\n结果已加载，报告已自动发送至 icyfire.info@gmail.com`);
        } catch (emailError) {
          console.error("Auto-email failed", emailError);
          alert("分析完成。结果已加载。\n\n警告：自动发送邮件失败。您可以尝试手动发送。");
        }
      } else {
        alert("分析完成。结果已加载。");
      }

    } catch (error: any) {
      console.error(error);
      alert(`分析失败: ${error.message || "请检查您的网络连接或 API Key 是否有效。"}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Don't render until we've checked session storage
  if (!isConfigLoaded) return null;

  // Check if we have a valid configuration (has Gemini Key)
  const hasValidConfig = !!config.geminiKey;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative">
      
      {/* Header / Config Trigger */}
      <div className="absolute top-4 right-4 z-10">
        <button 
            onClick={() => setShowConfigModal(true)}
            className="text-xs font-medium text-slate-400 hover:text-slate-600 underline"
        >
            {hasValidConfig ? '设置 / 更新 Key' : '未配置'}
        </button>
      </div>

      <Dashboard 
        report={report} 
        isAnalyzing={isAnalyzing} 
        onRunAnalysis={handleRunAnalysis}
        onComposeEmail={() => setShowEmail(true)}
      />

      {showEmail && report && (
        <EmailPreview 
            report={report}
            config={config}
            onClose={() => setShowEmail(false)} 
        />
      )}

      {/* Force show modal if no config, or if user requested it */}
      {(showConfigModal || !hasValidConfig) && (
        <ApiKeyModal 
            onSave={handleSaveConfig}
            initialConfig={config}
            // If we don't have a valid config, user CANNOT close this modal (force setup)
            canClose={hasValidConfig} 
            onClose={() => setShowConfigModal(false)}
        />
      )}
    </div>
  );
}

export default App;
