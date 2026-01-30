import React from 'react';
import { AgentReport, ScoutedProduct } from '../types';
import { COMPANY_PROFILE } from '../constants';
import { Cpu, Wifi, Activity, Battery, ArrowUpRight, Mail, ExternalLink, Calendar, Clock, Search } from 'lucide-react';

interface DashboardProps {
  report: AgentReport | null;
  isAnalyzing: boolean;
  onRunAnalysis: () => void;
  onComposeEmail: () => void;
}

const TechBadge: React.FC<{ label: string; type?: 'required' | 'missing' }> = ({ label, type = 'required' }) => (
  <span className={`text-lg sm:text-xs px-3 sm:px-2 py-1.5 sm:py-1 rounded-full border ${type === 'required' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
    {label}
  </span>
);

const ProductCard: React.FC<{ product: ScoutedProduct }> = ({ product }) => {
  const isHighMatch = product.matchScore >= 80;
  const matchColor = isHighMatch ? 'text-green-600' : product.matchScore >= 60 ? 'text-yellow-600' : 'text-slate-400';
  
  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md active:shadow-md transition-shadow flex flex-col h-full">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
            {product.isNewRelease && (
                 <span className="bg-purple-100 text-purple-700 text-base sm:text-[10px] font-bold px-3 sm:px-2 py-1 sm:py-0.5 rounded uppercase tracking-wide mb-2 inline-block">
                    趋势 / 新品
                 </span>
            )}
            <h3 className="text-xl sm:text-lg font-bold text-slate-900 leading-tight line-clamp-2">{product.name}</h3>
            <div className="text-lg sm:text-sm text-slate-500 mt-1 flex items-center gap-2">
                <span>{product.price || 'N/A'}</span>
                <span>•</span>
                <span className="flex items-center text-yellow-500">★ {product.amazonRating || 'N/A'}</span>
            </div>
        </div>
        <div className="flex flex-col items-end ml-3 sm:ml-4 flex-shrink-0">
            <div className={`text-3xl sm:text-2xl font-black ${matchColor}`}>
                {product.matchScore}%
            </div>
            <span className="text-lg sm:text-xs text-slate-400 font-medium uppercase tracking-wider">技术匹配度</span>
        </div>
      </div>
      
      <p className="text-slate-600 text-xl sm:text-sm mb-4 line-clamp-3 flex-grow">
        {product.description}
      </p>

      <div className="mb-4 bg-slate-50 p-4 sm:p-3 rounded-lg border border-slate-100">
        <p className="text-lg sm:text-xs font-semibold text-slate-700 mb-1">推荐理由:</p>
        <p className="text-lg sm:text-xs text-slate-600 italic">"{product.reasoning}"</p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-1">
            {product.requiredTech.map((tech, i) => (
                <TechBadge key={i} label={tech} />
            ))}
             {product.missingTech && product.missingTech.map((tech, i) => (
                <TechBadge key={`miss-${i}`} label={tech} type="missing" />
            ))}
        </div>
        
        {product.url ? (
            <a 
                href={product.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-4 sm:py-3 min-h-[52px] sm:min-h-[44px] bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xl sm:text-sm font-semibold rounded-lg transition-colors touch-target"
            >
                在亚马逊查看 <ExternalLink className="w-5 h-5 sm:w-4 sm:h-4" />
            </a>
        ) : (
            <button disabled className="w-full py-4 sm:py-3 min-h-[52px] sm:min-h-[44px] bg-slate-50 text-slate-400 text-xl sm:text-sm font-semibold rounded-lg cursor-not-allowed">
                链接不可用
            </button>
        )}
      </div>
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ report, isAnalyzing, onRunAnalysis, onComposeEmail }) => {
  // Calculate next run date (Next Monday)
  const getNextRunDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7));
    return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'short' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-4xl sm:text-3xl font-bold text-slate-900">Adsmart Scout</h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2">
            <p className="text-slate-500 text-xl sm:text-base">自动化智能代理</p>
            <span className="hidden md:inline-block w-1 h-1 bg-slate-300 rounded-full"></span>
            <div className="flex items-center gap-1.5 text-lg sm:text-xs font-medium text-slate-500 bg-slate-100 px-3 sm:px-2 py-1.5 sm:py-1 rounded-md">
                <Clock className="w-5 h-5 sm:w-3.5 sm:h-3.5" />
                <span>下次扫描: {getNextRunDate()}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
           {report ? (
             <>
                <button 
                  onClick={onRunAnalysis}
                  disabled={isAnalyzing}
                  className="flex items-center justify-center gap-2 px-5 py-4 sm:py-3 min-h-[52px] sm:min-h-[44px] bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-sm touch-target text-xl sm:text-base"
                >
                    <ArrowUpRight className="w-5 h-5 sm:w-4 sm:h-4" />
                    重新扫描
                </button>
                <button 
                  onClick={onComposeEmail}
                  className="flex items-center justify-center gap-2 px-5 py-4 sm:py-3 min-h-[52px] sm:min-h-[44px] bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm shadow-blue-200 touch-target text-xl sm:text-base"
                >
                  <Mail className="w-5 h-5 sm:w-4 sm:h-4" />
                  预览周报
                </button>
             </>
           ) : (
             <></> 
             /* Button moved to center when no report */
           )}
        </div>
      </div>

      {/* Tech Profile Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
         <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 bg-blue-100 rounded-lg text-blue-600 flex-shrink-0">
                <Activity className="w-6 h-6 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
                <div className="text-lg sm:text-sm text-slate-500 font-medium truncate">核心传感器</div>
                <div className="font-bold text-slate-900 text-xl sm:text-base">{COMPANY_PROFILE.techStack[0].items.length} 种模块</div>
            </div>
         </div>
         <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 bg-purple-100 rounded-lg text-purple-600 flex-shrink-0">
                <Wifi className="w-6 h-6 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
                <div className="text-lg sm:text-sm text-slate-500 font-medium truncate">连接技术</div>
                <div className="font-bold text-slate-900 text-xl sm:text-base">{COMPANY_PROFILE.techStack[1].items.length} 种生态</div>
            </div>
         </div>
         <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 bg-green-100 rounded-lg text-green-600 flex-shrink-0">
                <Cpu className="w-6 h-6 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
                <div className="text-lg sm:text-sm text-slate-500 font-medium truncate">输出模组</div>
                <div className="font-bold text-slate-900 text-xl sm:text-base">{COMPANY_PROFILE.techStack[2].items.length} 种类型</div>
            </div>
         </div>
         <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 bg-orange-100 rounded-lg text-orange-600 flex-shrink-0">
                <Battery className="w-6 h-6 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
                <div className="text-lg sm:text-sm text-slate-500 font-medium truncate">现有产品线</div>
                <div className="font-bold text-slate-900 text-xl sm:text-base">{COMPANY_PROFILE.existingProducts.length} 个 SKU</div>
            </div>
         </div>
      </div>

      {/* Main Content Area */}
      {!report && (
        <div className="text-center py-12 sm:py-24 px-4 bg-white rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center transition-all">
            
            {isAnalyzing ? (
                <div className="py-8 sm:py-12 flex flex-col items-center animate-in fade-in zoom-in duration-300">
                    <div className="relative w-20 h-20 sm:w-20 sm:h-20 mb-4 sm:mb-6">
                        <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                        <Search className="absolute inset-0 m-auto w-8 h-8 sm:w-8 sm:h-8 text-blue-600 animate-pulse" />
                    </div>
                    <h3 className="text-2xl sm:text-xl font-bold text-slate-800">正在扫描亚马逊市场...</h3>
                    <p className="text-slate-500 mt-2 text-xl sm:text-base px-4">智能代理正在分析趋势与匹配技术栈</p>
                </div>
            ) : (
                <div className="py-6 sm:py-8 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
                    <button 
                        onClick={onRunAnalysis}
                        className="group relative flex items-center justify-center gap-3 sm:gap-4 px-8 sm:px-10 py-5 sm:py-5 min-h-[60px] sm:min-h-[56px] w-full sm:w-auto max-w-xs bg-blue-600 text-white text-2xl sm:text-xl font-bold rounded-2xl hover:bg-blue-700 active:bg-blue-800 transition-all shadow-xl shadow-blue-200 hover:shadow-2xl sm:hover:-translate-y-1 overflow-hidden mb-6 sm:mb-8 touch-target"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        <Search className="w-7 h-7 sm:w-7 sm:h-7 group-hover:scale-110 transition-transform duration-300" />
                        <span className="relative">新品扫描</span>
                    </button>
                    <p className="text-slate-500 max-w-md mx-auto leading-relaxed text-xl sm:text-base px-2">
                        运行 <strong>新产品发现框架</strong>，代理将自动识别亚马逊上与我们技术栈高度匹配的产品机会。
                    </p>
                </div>
            )}
        </div>
      )}

      {report && (
        <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="bg-slate-900 text-white p-4 sm:p-6 rounded-xl shadow-lg">
                <div className="flex items-start gap-3 sm:gap-4">
                    <div className="p-3 sm:p-3 bg-slate-800 rounded-lg flex-shrink-0">
                        <Calendar className="w-6 h-6 sm:w-6 sm:h-6 text-blue-400" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-xl sm:text-lg font-bold mb-1">每周市场分析</h3>
                        <p className="text-slate-300 leading-relaxed text-lg sm:text-sm">
                            {report.summary}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {report.products.map((product, idx) => (
                    <ProductCard key={idx} product={product} />
                ))}
            </div>
        </div>
      )}
    </div>
  );
};
