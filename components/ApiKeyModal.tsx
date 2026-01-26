
import React, { useState, useEffect } from 'react';
import { AppConfig } from '../types';
import { Settings, Key, Mail, Info, ShieldAlert, X } from 'lucide-react';

interface ApiKeyModalProps {
  onSave: (config: AppConfig) => void;
  initialConfig?: AppConfig;
  canClose?: boolean;
  onClose?: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSave, initialConfig, canClose = false, onClose }) => {
  const [geminiKey, setGeminiKey] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [publicKey, setPublicKey] = useState('');

  useEffect(() => {
    if (initialConfig) {
        setGeminiKey(initialConfig.geminiKey || '');
        setServiceId(initialConfig.emailServiceId || '');
        setTemplateId(initialConfig.emailTemplateId || '');
        setPublicKey(initialConfig.emailPublicKey || '');
    }
  }, [initialConfig]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (geminiKey.trim()) {
      onSave({
        geminiKey: geminiKey.trim(),
        emailServiceId: serviceId.trim(),
        emailTemplateId: templateId.trim(),
        emailPublicKey: publicKey.trim()
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50 px-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full border border-slate-200 max-h-[90vh] overflow-y-auto relative animate-in zoom-in duration-300">
        
        {canClose && onClose && (
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
                <X className="w-5 h-5" />
            </button>
        )}

        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
            <div className={`p-2 rounded-lg ${canClose ? 'bg-slate-100' : 'bg-blue-100'}`}>
                {canClose ? <Settings className="w-6 h-6 text-slate-700" /> : <ShieldAlert className="w-6 h-6 text-blue-700" />}
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-900">
                    {canClose ? 'Agent Configuration' : '安全访问设置'}
                </h2>
                <p className="text-sm text-slate-500">
                    {canClose ? 'Update your API keys' : '请输入密钥以解锁 Agent'}
                </p>
            </div>
        </div>

        {!canClose && (
            <div className="mb-6 p-3 bg-yellow-50 text-yellow-800 text-xs rounded-lg border border-yellow-200 leading-relaxed">
                <strong>安全提示：</strong> 为了防止未授权的资源消耗，本应用已启用“Bring Your Own Key”模式。您的密钥将仅保存在您浏览器的本地存储中，不会上传至任何服务器。
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Gemini Section */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-2">
                <Key className="w-4 h-4 text-blue-600" />
                Google Gemini API Key <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
              placeholder="AIzaSy..."
              required
            />
          </div>

          <div className="h-px bg-slate-100 my-2"></div>

          {/* EmailJS Section */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
             <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-orange-600" />
                    <h3 className="text-sm font-bold text-slate-800">Gmail via EmailJS (可选)</h3>
                </div>
                <a href="https://www.emailjs.com/docs/tutorial/creating-contact-form/" target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-1">
                    <Info className="w-3 h-3" /> Setup Guide
                </a>
             </div>
             
             <div className="space-y-3">
                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Service ID</label>
                    <input
                        type="text"
                        value={serviceId}
                        onChange={(e) => setServiceId(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                        placeholder="service_..."
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Template ID</label>
                    <input
                        type="text"
                        value={templateId}
                        onChange={(e) => setTemplateId(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                        placeholder="template_..."
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Public Key</label>
                    <input
                        type="password"
                        value={publicKey}
                        onChange={(e) => setPublicKey(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                        placeholder="user_..."
                    />
                </div>
             </div>
          </div>

          <button
            type="submit"
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-lg transition-colors shadow-lg shadow-slate-200"
          >
            {canClose ? '保存配置' : '解锁并进入 Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
};
