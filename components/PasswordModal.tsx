import React, { useState } from 'react';
import { ShieldAlert, X, Lock, AlertCircle } from 'lucide-react';

interface PasswordModalProps {
  onVerify: (token: string, expiresAt: number) => void;
  onError?: (error: string) => void;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({ onVerify, onError }) => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('请输入密码');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '验证失败');
      }

      if (data.success && data.token) {
        // 保存token和过期时间
        sessionStorage.setItem('admin_token', data.token);
        sessionStorage.setItem('admin_token_expires', data.expiresAt.toString());
        onVerify(data.token, data.expiresAt);
      } else {
        throw new Error('验证失败');
      }
    } catch (err: any) {
      const errorMessage = err.message || '密码验证失败，请重试';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 flex items-end sm:items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl p-6 sm:p-8 w-full sm:max-w-md sm:mx-4 border border-slate-200 relative animate-in slide-in-from-bottom sm:zoom-in duration-300 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-8">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
          <div className="p-2 rounded-lg bg-blue-100 flex-shrink-0">
            <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 text-blue-700" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">管理密码验证</h2>
            <p className="text-xs sm:text-sm text-slate-500">请输入管理密码以访问系统</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-2">
              <Lock className="w-4 h-4 text-blue-600" />
              管理密码 <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-3 min-h-[44px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-base"
              placeholder="请输入管理密码"
              required
              autoFocus
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-800 text-sm rounded-lg border border-red-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-bold py-4 min-h-[52px] rounded-lg transition-colors shadow-lg shadow-blue-200 flex items-center justify-center gap-2 touch-target"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>验证中...</span>
              </>
            ) : (
              <span>验证并进入</span>
            )}
          </button>
        </form>

        <div className="mt-6 p-3 bg-slate-50 text-slate-600 text-xs rounded-lg border border-slate-200 leading-relaxed">
          <strong>安全提示：</strong> 此密码用于保护系统访问权限。密码验证通过后，token将保存在浏览器会话中，关闭浏览器后需要重新验证。
        </div>
      </div>
    </div>
  );
};
