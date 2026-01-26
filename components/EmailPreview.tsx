import React, { useState } from 'react';
import { AgentReport, AppConfig } from '../types';
import { sendEmail, formatEmailBody } from '../services/emailService';
import { Mail, Send, X, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';

interface EmailPreviewProps {
  report: AgentReport;
  config: AppConfig;
  onClose: () => void;
}

export const EmailPreview: React.FC<EmailPreviewProps> = ({ report, config, onClose }) => {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const recipient = "icyfire.info@gmail.com";
  const subject = `Weekly Amazon Product Digest - ${report.date}`;
  
  const handleDirectSend = async () => {
    if (!config.emailServiceId || !config.emailTemplateId || !config.emailPublicKey) {
        setErrorMessage("配置缺失：请重启并提供所有 EmailJS 凭证（Service ID, Template ID, Public Key）。");
        setStatus('error');
        return;
    }

    setStatus('sending');
    setErrorMessage('');
    
    try {
        await sendEmail({
            serviceId: config.emailServiceId,
            templateId: config.emailTemplateId,
            publicKey: config.emailPublicKey,
            toEmail: recipient,
            subject: subject,
            message: formatEmailBody(report)
        });
        setStatus('success');
    } catch (error: any) {
        console.error("Failed to send:", error);
        setErrorMessage(error.message || "发送失败。请检查您的 EmailJS 配额或 ID。");
        setStatus('error');
    }
  };

  if (status === 'success') {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4 py-8">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">邮件已发送！</h2>
                <p className="text-slate-600 mb-6 leading-relaxed">
                    报告已成功投递至 <span className="font-semibold text-slate-900">{recipient}</span> （通过您的 Gmail 账户）。
                </p>
                <button 
                    onClick={onClose}
                    className="w-full py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
                >
                    返回仪表盘
                </button>
            </div>
        </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4 py-8">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                预览并发送 (Gmail via EmailJS)
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
            </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 font-mono text-sm bg-slate-50">
             {status === 'error' && (
                <div className="mb-4 bg-red-50 border border-red-200 p-4 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-red-800 text-sm">发送失败</h4>
                        <p className="text-red-700 text-xs mt-1">{errorMessage}</p>
                    </div>
                </div>
             )}

            <div className="space-y-4 max-w-3xl mx-auto bg-white p-8 shadow-sm border border-slate-200 rounded-lg">
                <div className="border-b pb-4 mb-4">
                    <div className="flex gap-2 mb-1">
                        <span className="text-slate-500 font-semibold w-16">To:</span>
                        <span className="text-slate-800">{recipient}</span>
                    </div>
                    <div className="flex gap-2">
                        <span className="text-slate-500 font-semibold w-16">Subject:</span>
                        <span className="text-slate-800">{subject}</span>
                    </div>
                </div>
                <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                    {formatEmailBody(report)}
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white rounded-b-xl flex justify-end gap-3">
            <button 
                onClick={onClose}
                disabled={status === 'sending'}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
            >
                取消
            </button>
            <button 
                onClick={handleDirectSend}
                disabled={status === 'sending' || !config.emailServiceId}
                className={`px-6 py-2 text-white font-bold rounded-lg transition-colors flex items-center gap-2 shadow-md ${!config.emailServiceId ? 'bg-slate-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-200'}`}
            >
                {status === 'sending' ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        发送中...
                    </>
                ) : (
                    <>
                        <Send className="w-4 h-4" />
                        {!config.emailServiceId ? '请先配置 EmailJS' : '发送邮件'}
                    </>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};
