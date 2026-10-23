import React from 'react';
import {
  Building2,
  FolderArchive,
  FileText,
  Calculator,
  LayoutDashboard,
  ArrowLeft,
  Calendar,
  Globe2,
  ShieldCheck,
  Clock,
  Sparkles,
  Layers,
  FileSpreadsheet,
  Printer,
} from 'lucide-react';
import { TenderProject } from '../types/tenderProject';

export type TenderWorkbenchSubTab = 'overview' | 'attachments' | 'variables' | 'preview' | 'boq';

interface TenderWorkspaceHeaderProps {
  activeTender: TenderProject;
  activeSubTab: TenderWorkbenchSubTab;
  onSubTabChange: (tab: TenderWorkbenchSubTab) => void;
  onBackToTendersHub: () => void;
}

export const TenderWorkspaceHeader: React.FC<TenderWorkspaceHeaderProps> = ({
  activeTender,
  activeSubTab,
  onSubTabChange,
  onBackToTendersHub,
}) => {
  const getStatusBadge = () => {
    switch (activeTender.status) {
      case 'submitted':
        return {
          label: '已投出 / 待开标',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'ready':
        return {
          label: '编制完成 / 待评审',
          className: 'bg-blue-50 text-blue-700 border-blue-200',
        };
      case 'in_progress':
      default:
        return {
          label: '正在编制 / 组价测算中',
          className: 'bg-amber-50 text-amber-800 border-amber-200',
        };
    }
  };

  const statusInfo = getStatusBadge();
  const attCount = activeTender.attachments?.length || 0;
  const varCount = Object.keys(activeTender.variableValues || {}).length;
  const boqCount = activeTender.boqItems?.length || 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs mb-4 overflow-hidden">
      {/* 标段基本信息条 */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackToTendersHub}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors cursor-pointer shrink-0 border border-white/10 flex items-center gap-1.5 text-xs font-medium"
            title="返回标段分类管理看板"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">全部海外标段</span>
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-300">
              <span className="font-mono font-semibold text-blue-300">
                {activeTender.code}
              </span>
              <span className="text-white/30">·</span>
              <span className="text-slate-300">
                {activeTender.category}
              </span>
              <span className="text-white/30">·</span>
              <span className="text-emerald-400 font-medium">
                {statusInfo.label}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                {activeTender.name}
              </h1>
            </div>

            {activeTender.nameFr && (
              <p className="text-xs text-slate-400 truncate italic font-serif mt-0.5">
                {activeTender.nameFr}
              </p>
            )}
          </div>
        </div>

        {/* 标段核心指标 */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2 text-slate-300">
            <Globe2 className="w-3.5 h-3.5 text-blue-400" />
            <span>{activeTender.country}</span>
            <span className="text-white/20">|</span>
            <span className="text-emerald-400 font-mono font-semibold">{activeTender.currency}</span>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2 text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>截标: {activeTender.deadline}</span>
          </div>

          <div className="text-xs text-slate-400 hidden xl:block">
            招标人: <span className="text-slate-200">{activeTender.client}</span>
          </div>
        </div>
      </div>

      {/* 标段三大板块核心工作流选项卡 (对标专业招投标系统) */}
      <div className="px-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between overflow-x-auto">
        <div className="flex items-center gap-1.5 py-2">
          {/* 板块 0: 标段综合总览看板 */}
          <button
            type="button"
            onClick={() => onSubTabChange('overview')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'overview'
                ? 'bg-white text-blue-900 shadow-2xs border border-slate-200/90 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-blue-600" />
            <span>标段综合工作台</span>
          </button>

          {/* 板块 1: 招标公告与官方文件解析 */}
          <button
            type="button"
            onClick={() => onSubTabChange('attachments')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'attachments'
                ? 'bg-white text-blue-900 shadow-2xs border border-slate-200/90 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5 text-indigo-600" />
            <span>1. 招标公告与官方文件解析</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[11px] font-mono ${
                activeSubTab === 'attachments'
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'bg-slate-200/80 text-slate-600'
              }`}
            >
              {attCount} 份原件 · 8大板块
            </span>
          </button>

          {/* 板块 2: 投标须知与标书装配 */}
          <button
            type="button"
            onClick={() => onSubTabChange('variables')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'variables'
                ? 'bg-white text-blue-900 shadow-2xs border border-slate-200/90 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>2. 投标须知与标书装配</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[11px] font-mono ${
                activeSubTab === 'variables'
                  ? 'bg-blue-50 text-blue-700 font-bold'
                  : 'bg-slate-200/80 text-slate-600'
              }`}
            >
              {varCount} 项变量锁定
            </span>
          </button>

          {/* 标书交互排版与打印预览 */}
          <button
            type="button"
            onClick={() => onSubTabChange('preview')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'preview'
                ? 'bg-white text-emerald-900 shadow-2xs border border-emerald-300 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Printer className="w-3.5 h-3.5 text-emerald-600" />
            <span>标书交互排版与预览</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[11px] font-mono ${
                activeSubTab === 'preview'
                  ? 'bg-emerald-50 text-emerald-700 font-bold'
                  : 'bg-slate-200/80 text-slate-600'
              }`}
            >
              A4标准PDF
            </span>
          </button>

          {/* 板块 3: 投标组件与清单组价 */}
          <button
            type="button"
            onClick={() => onSubTabChange('boq')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'boq'
                ? 'bg-white text-blue-900 shadow-2xs border border-slate-200/90 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calculator className="w-3.5 h-3.5 text-emerald-600" />
            <span>3. 投标组件与清单组价</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[11px] font-mono ${
                activeSubTab === 'boq'
                  ? 'bg-emerald-50 text-emerald-700 font-bold'
                  : 'bg-slate-200/80 text-slate-600'
              }`}
            >
              {boqCount > 0 ? `${boqCount} 项已组价` : '待组价'}
            </span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-3 text-xs text-slate-500 shrink-0">
          <span className="flex items-center gap-1 text-slate-600">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>最后更新: {activeTender.updatedAt}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
