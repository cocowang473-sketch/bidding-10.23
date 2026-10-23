import React, { useState, useRef, useEffect } from 'react';
import {
  Building2,
  ChevronRight,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Globe2,
  History,
  SlidersHorizontal,
  Download,
  BookOpen,
  Plus,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Laptop,
} from 'lucide-react';

import { TenderProject } from '../types/tenderProject';
import {
  ViewAdaptationControls,
  LayoutWidthMode,
  TableDensityMode,
} from './ViewAdaptationControls';

interface HeaderProps {
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  currentBreadcrumb?: {
    group: string;
    item: string;
    subItem?: string;
  };
  activeTender?: TenderProject;
  tenders?: TenderProject[];
  onSelectTender?: (id: string) => void;
  onNavigateToTendersHub?: () => void;
  onNavigateToWorkbenchOverview?: () => void;
  onOpenCreateModal?: () => void;
  onOpenHistoryDrawer?: () => void;
  historyCount?: number;
  isAutoSaving?: boolean;
  lastSavedText?: string;
  layoutWidth?: LayoutWidthMode;
  onLayoutWidthChange?: (mode: LayoutWidthMode) => void;
  zoomScale?: number;
  onZoomScaleChange?: (scale: number) => void;
  tableDensity?: TableDensityMode;
  onTableDensityChange?: (density: TableDensityMode) => void;
  onOpenProductDocModal?: () => void;
  onOpenExportModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isSidebarCollapsed = false,
  onToggleSidebar,
  currentBreadcrumb,
  activeTender,
  tenders = [],
  onSelectTender,
  onNavigateToTendersHub,
  onNavigateToWorkbenchOverview,
  onOpenCreateModal,
  onOpenHistoryDrawer,
  historyCount = 0,
  isAutoSaving = false,
  lastSavedText = '刚才',
  layoutWidth = 'fluid',
  onLayoutWidthChange,
  zoomScale = 100,
  onZoomScaleChange,
  tableDensity = 'standard',
  onTableDensityChange,
  onOpenProductDocModal,
  onOpenExportModal,
}) => {
  const [isTenderDropdownOpen, setIsTenderDropdownOpen] = useState(false);
  const tenderDropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        tenderDropdownRef.current &&
        !tenderDropdownRef.current.contains(e.target as Node)
      ) {
        setIsTenderDropdownOpen(false);
      }
    };
    if (isTenderDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTenderDropdownOpen]);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
      <div className="w-full px-3.5 sm:px-6">
        <div className="flex items-center justify-between gap-3 h-14">
          {/* 左侧：侧边栏切换 + 品牌 / 交互式层级面包屑 */}
          <div className="flex items-center gap-3 min-w-0">
            {onToggleSidebar && (
              <button
                type="button"
                onClick={onToggleSidebar}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200 shrink-0"
                title={isSidebarCollapsed ? '展开左侧边栏 (260px)' : '收起左侧边栏 (68px)'}
              >
                {isSidebarCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4 text-slate-700" />
                ) : (
                  <PanelLeftClose className="w-4 h-4 text-slate-700" />
                )}
              </button>
            )}

            {/* 可点击的面包屑导航 */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
              {/* 一级：标段总览 */}
              <button
                type="button"
                onClick={onNavigateToTendersHub}
                className="hover:text-blue-700 font-medium transition-colors cursor-pointer truncate hidden md:inline"
              >
                {currentBreadcrumb?.group || '标段分类管理'}
              </button>

              <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0 hidden md:inline" />

              {/* 二级：在管标段快速切换下拉触发器 */}
              <div className="relative shrink-0" ref={tenderDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsTenderDropdownOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200/80 text-slate-800 font-bold transition-all border border-slate-200/80 cursor-pointer max-w-[200px] sm:max-w-[280px] lg:max-w-[340px]"
                  title="点击切换当前工作标段"
                >
                  <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">
                    {activeTender ? activeTender.name : '在管标段'}
                  </span>
                  <ChevronDown
                    className={`w-3 h-3 text-slate-400 shrink-0 transition-transform ${
                      isTenderDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* 标段切换下拉卡片 */}
                {isTenderDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1.5 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2.5 py-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-2">
                      <span>切换在管海外标段 ({tenders.length})</span>
                      {onOpenCreateModal && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsTenderDropdownOpen(false);
                            onOpenCreateModal();
                          }}
                          className="text-blue-600 hover:text-blue-800 font-bold cursor-pointer text-xs"
                        >
                          + 新建标
                        </button>
                      )}
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-1 pt-1">
                      {tenders.map((t) => {
                        const isCurrent = t.id === activeTender?.id;
                        return (
                          <div
                            key={t.id}
                            onClick={() => {
                              if (onSelectTender) onSelectTender(t.id);
                              setIsTenderDropdownOpen(false);
                            }}
                            className={`p-2.5 rounded-lg text-left cursor-pointer transition-all ${
                              isCurrent
                                ? 'bg-blue-50/80 border border-blue-200 text-blue-900 font-semibold'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="text-xs truncate font-medium">{t.name}</div>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 font-mono">
                              <span>{t.code}</span>
                              <span className="text-emerald-700 font-bold">
                                {t.currency} · 截标 {t.deadline.slice(5)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {onNavigateToTendersHub && (
                      <div className="pt-2 border-t border-slate-100 mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsTenderDropdownOpen(false);
                            onNavigateToTendersHub();
                          }}
                          className="w-full text-center py-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                        >
                          前往标段分类管理看板 ➔
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 三级：当前活动子模块 */}
              {currentBreadcrumb?.item && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  <span className="font-semibold text-blue-800 truncate">
                    {currentBreadcrumb.item}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* 右侧：状态指示、视图自适应工具、历史抽屉与企业环境标签 */}
          <div className="flex items-center gap-2 shrink-0">
            {/* 1. 云端自动保存与加密同步状态指示 */}
            <div
              onClick={onOpenHistoryDrawer}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 cursor-pointer transition-colors"
              title="查看实时操作审计日志与数据保存历史"
            >
              {isAutoSaving ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-amber-800 font-semibold">正在同步变更...</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-slate-600">云端已同步 · {lastSavedText}</span>
                </>
              )}
            </div>

            {/* 2. 审计变更历史按钮 */}
            {onOpenHistoryDrawer && (
              <button
                type="button"
                onClick={onOpenHistoryDrawer}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer relative"
                title="打开审计变更记录台账"
              >
                <History className="w-4 h-4 text-slate-600" />
                {historyCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center font-mono">
                    {historyCount > 9 ? '9+' : historyCount}
                  </span>
                )}
              </button>
            )}

            {/* 3. 视图缩放与自适应设置 (Popover 控件) */}
            {onLayoutWidthChange && onZoomScaleChange && onTableDensityChange && (
              <ViewAdaptationControls
                layoutWidth={layoutWidth}
                onLayoutWidthChange={onLayoutWidthChange}
                zoomScale={zoomScale}
                onZoomScaleChange={onZoomScaleChange}
                density={tableDensity}
                onDensityChange={onTableDensityChange}
                variant="popover"
              />
            )}

            {/* 4. 导出整包快捷按钮 */}
            {onOpenExportModal && (
              <button
                type="button"
                onClick={onOpenExportModal}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all cursor-pointer active:scale-95"
                title="导出标书整包与中法双语报价文件"
              >
                <Download className="w-3.5 h-3.5" />
                <span>导出标书</span>
              </button>
            )}

            {/* 5. 产品手册与系统规程按钮 (PRD) */}
            {onOpenProductDocModal && (
              <button
                type="button"
                onClick={onOpenProductDocModal}
                className="hidden xl:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                title="查看系统架构与操作规范说明 (PRD)"
              >
                <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                <span>操作规程</span>
              </button>
            )}

            {/* 6. 企业租户标识 */}
            <div className="hidden 2xl:flex items-center gap-2 pl-2 border-l border-slate-200 text-[11px] text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>海外工程商务部 · 国际协同组价工作区</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
