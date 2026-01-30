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
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-4xl sm:mx-4 h-[90dvh] sm:h-auto sm:max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-2xl sm:rounded-t-xl flex-shrink-0">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                邮件预览
            </h2>
            <button 
                onClick={onClose} 
                className="p-2 -mr-2 text-slate-400 hover:text-slate-600 active:bg-slate-200 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-target"
            >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 font-mono text-xs sm:text-sm bg-slate-50 overscroll-contain">
            <div className="space-y-4 max-w-3xl mx-auto bg-white p-4 sm:p-8 shadow-sm border border-slate-200 rounded-lg">
                <div className="border-b pb-3 sm:pb-4 mb-3 sm:mb-4">
                    <div className="flex flex-col sm:flex-row sm:gap-2 mb-2 sm:mb-1">
                        <span className="text-slate-500 font-semibold sm:w-16 text-xs sm:text-sm">To:</span>
                        <span className="text-slate-800 break-all">{recipient}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:gap-2">
                        <span className="text-slate-500 font-semibold sm:w-16 text-xs sm:text-sm">Subject:</span>
                        <span className="text-slate-800 break-words">{subject}</span>
                    </div>
                </div>
                <div className="whitespace-pre-wrap text-slate-700 leading-relaxed text-xs sm:text-sm break-words">
                    {formatEmailBody(report)}
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 bg-white rounded-b-xl flex justify-end gap-3 flex-shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-4">
            <button 
                onClick={onClose}
                className="px-6 py-3 min-h-[44px] bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 active:bg-slate-700 transition-colors shadow-lg shadow-slate-200 touch-target"
            >
                关闭
            </button>
        </div>
      </div>
    </div>
  );
};
