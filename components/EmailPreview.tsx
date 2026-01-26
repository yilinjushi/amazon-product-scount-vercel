import React from 'react';
import { AgentReport } from '../types';
import { formatEmailBody } from '../services/emailService';
import { Mail, X } from 'lucide-react';

interface EmailPreviewProps {
  report: AgentReport;
  config?: any; // 保留以兼容，但不再使用
  onClose: () => void;
}

export const EmailPreview: React.FC<EmailPreviewProps> = ({ report, onClose }) => {
  const recipient = "icyfire.info@gmail.com";
  const subject = `[自动周报] 亚马逊产品侦察 - ${report.date}`;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4 py-8">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                邮件预览
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
            </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 font-mono text-sm bg-slate-50">
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
                className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
            >
                关闭
            </button>
        </div>
      </div>
    </div>
  );
};
