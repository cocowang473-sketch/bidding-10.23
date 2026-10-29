import React from 'react';
import {
  Layers,
  Download,
  CheckCircle2,
  FileText,
  Settings2,
  Mail,
  Database,
  Building2,
  Sliders,
  ChevronRight,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  History,
} from 'lucide-react';
import {
  ViewAdaptationControls,
  LayoutWidthMode,
  TableDensityMode,
} from './ViewAdaptationControls';

interface HeaderProps {
  activeTab: 'workbench' | 'dual-db' | 'rfq' | 'config' | 'notice' | 'instructions' | 'tender-hub';
  onTabChange: (
    tab: 'workbench' | 'dual-db' | 'rfq' | 'config' | 'notice' | 'instructions' | 'tender-hub'
  ) => void;
  onExport: () => void;
  onOpenProductDoc?: () => void;
  onOpenHistoryDrawer?: () => void;
  isSaving?: boolean;
  lastSavedText?: string;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  currentBreadcrumb?: {
    group: string;
    item: string;
  };
  currentProjectName?: string;
  layoutWidth?: LayoutWidthMode;
  onLayoutWidthChange?: (mode: LayoutWidthMode) => void;
  zoomScale?: number;
  onZoomScaleChange?: (scale: number) => void;
  density?: TableDensityMode;
  onDensityChange?: (density: TableDensityMode) => void;
  showExportButton?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onExport,
  onOpenProductDoc,
  onOpenHistoryDrawer,
  isSaving = false,
  lastSavedText = '刚才',
  isSidebarCollapsed = false,
  onToggleSidebar,
  currentBreadcrumb,
  currentProjectName,
  layoutWidth = 'fluid',
  onLayoutWidthChange,
  zoomScale = 100,
  onZoomScaleChange,
  density = 'standard',
  onDensityChange,
  showExportButton = false,
}) => {
  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200/80 sticky top-0 z-20 shadow-sm">
      {/* 顶部主工作台栏 */}
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          {/* 左侧：侧边栏折叠按钮 + 面包屑导航与系统上下文 */}
          <div className="flex items-center gap-3 shrink-0 min-w-0">
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all duration-200 cursor-pointer border border-slate-200 hover:border-slate-300 hover:shadow-sm"
                title={isSidebarCollapsed ? '展开左侧边栏 (260px)' : '收起左侧边栏 (68px)'}
              >
                {isSidebarCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4 text-slate-700" />
                ) : (
                  <PanelLeftClose className="w-4 h-4 text-slate-700" />
                )}
              </button>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm sm:text-base font-bold text-slate-900 tracking-tight whitespace-nowrap">
                  招投标智能造价与供应链协同平台
                </span>
              </div>

              {currentBreadcrumb ? (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap mt-0.5">
                  <span className="text-slate-500">{currentBreadcrumb.group}</span>
                  <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="font-semibold text-blue-800">{currentBreadcrumb.item}</span>
                  {currentProjectName && (
                    <>
                      <span className="text-slate-300">|</span>
                      <span className="text-slate-500 hidden sm:inline">{currentProjectName}</span>
                    </>
                  )}
                </div>
              ) : currentProjectName ? (
                <div className="flex items-center gap-2 text-xs text-slate-500 whitespace-nowrap">
                  <span className="text-blue-800 font-semibold flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-blue-700" />
                    {currentProjectName}
                  </span>
                  <span>·</span>
                  <span>商务标组价工作区</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* 右侧：全局核心动作与自适应调节 */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* 界面自适应与显示调节 */}
            {onLayoutWidthChange && onZoomScaleChange && onDensityChange && (
              <ViewAdaptationControls
                layoutWidth={layoutWidth}
                onLayoutWidthChange={onLayoutWidthChange}
                zoomScale={zoomScale}
                onZoomScaleChange={onZoomScaleChange}
                density={density}
                onDensityChange={onDensityChange}
                variant="popover"
              />
            )}

            {showExportButton && (
              <button
                onClick={onExport}
                className="group inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 whitespace-nowrap shadow-md hover:shadow-lg shadow-blue-900/20 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                <span>导出标书报价汇总</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
