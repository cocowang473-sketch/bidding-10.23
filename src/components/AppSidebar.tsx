import React from 'react';
import {
  FileText,
  Calculator,
  Database,
  Tag,
  Mail,
  ArrowUpDown,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Building2,
  FolderArchive,
  Send,
  FileSearch,
  ClipboardList,
  Briefcase,
} from 'lucide-react';

export type MainNavId =
  | 'projects-hub'
  | 'notice-analysis'
  | 'instructions-workbench'
  | 'workbench-boq'
  | 'dual-db-materials'
  | 'dual-db-contracts'
  | 'dual-db-aliases'
  | 'rfq-records'
  | 'rfq-compare'
  | 'rfq-templates'
  | 'config';

interface AppSidebarProps {
  currentNavId: MainNavId;
  onNavigate: (navId: MainNavId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  counts: {
    boqItems: number;
    contracts: number;
    pendingRfqs: number;
    emailTemplates: number;
    noticeFields?: number;
    instructionsDone?: number;
    instructionsTotal?: number;
    totalProjects?: number;
  };
  onOpenProductDoc: () => void;
  currentProjectName?: string;
}

interface NavGroup {
  groupTitle: string;
  items: {
    id: MainNavId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[];
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentNavId,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  counts,
  onOpenProductDoc,
  currentProjectName,
}) => {
  const navGroups: NavGroup[] = [
    {
      groupTitle: '招标标段管理中心',
      items: [
        {
          id: 'projects-hub',
          label: '标段总览',
          icon: Briefcase,
          badge: counts.totalProjects ? `${counts.totalProjects}` : undefined,
        },
      ],
    },
    {
      groupTitle: '招标文件智能解读',
      items: [
        {
          id: 'notice-analysis',
          label: '招标公告分析台',
          icon: FileSearch,
          badge: counts.noticeFields ? `${counts.noticeFields}` : undefined,
        },
        {
          id: 'instructions-workbench',
          label: '投标须知工作台',
          icon: ClipboardList,
          badge:
            counts.instructionsTotal && counts.instructionsTotal > 0
              ? `${counts.instructionsDone ?? 0}/${counts.instructionsTotal}`
              : undefined,
        },
      ],
    },
    {
      groupTitle: '标书与组价作业流',
      items: [
        {
          id: 'workbench-boq',
          label: '智能组价台',
          icon: Calculator,
        },
        {
          id: 'config',
          label: '国际汇率与综合费率',
          icon: Sliders,
        },
      ],
    },
    {
      groupTitle: '工程物资与资产库',
      items: [
        {
          id: 'dual-db-materials',
          label: '工程物资与定额总库',
          icon: Database,
        },
        {
          id: 'dual-db-contracts',
          label: '历史签单台账与导入',
          icon: FolderArchive,
        },
        {
          id: 'dual-db-aliases',
          label: '物料别名智能映射',
          icon: Tag,
        },
      ],
    },
    {
      groupTitle: '供应商询价与协同中心',
      items: [
        {
          id: 'rfq-records',
          label: '询价单跟踪与发函',
          icon: Mail,
        },
        {
          id: 'rfq-compare',
          label: '多商报价横向比选',
          icon: ArrowUpDown,
        },
        {
          id: 'rfq-templates',
          label: '询价邮件模板管理',
          icon: Send,
        },
      ],
    },
  ];

  return (
    <aside
      className={`bg-slate-950 text-slate-200 shrink-0 border-r border-slate-800 flex flex-col transition-all duration-300 z-30 select-none ${
        isCollapsed ? 'w-18' : 'w-68'
      }`}
    >
      {/* 顶部企业品牌 Logo 与系统名 - 优化视觉层次 */}
      <div className="h-16 border-b border-slate-800/80 px-4 flex items-center justify-between bg-slate-900/50">
        {!isCollapsed ? (
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-lg shrink-0 ring-1 ring-blue-400/20 overflow-hidden">
              <img
                src="/iflytek.png"
                alt="iFlytek Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-sm tracking-tight truncate">
                  BidCraft · 招投标智能协同平台
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">招投标智能造价与供应链协同平台</p>
            </div>
          </div>
        ) : (
          <div className="mx-auto w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-lg ring-1 ring-blue-400/20 overflow-hidden">
            <img
              src="/iflytek.png"
              alt="iFlytek Logo"
              className="w-full h-full object-contain"
            />
          </div>
        )}
      </div>

      {/* 当前工程标段上下文指示条 - 优化视觉呈现 */}
      {!isCollapsed && currentProjectName ? (
        <div className="p-3 mx-3 my-2.5 rounded-lg bg-blue-950/30 border border-blue-700/30">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-300 truncate">
            <Building2 className="w-3.5 h-3.5 shrink-0 text-blue-400" />
            <span className="truncate">{currentProjectName}</span>
          </div>
        </div>
      ) : currentProjectName ? (
        <div className="my-2 flex justify-center">
          <div
            className="w-2.5 h-2.5 rounded-full bg-blue-400 ring-4 ring-blue-500/20 animate-pulse"
            title={currentProjectName}
          ></div>
        </div>
      ) : null}

      {/* 侧边栏主菜单导航项 */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-5 scrollbar-thin scrollbar-thumb-slate-700">
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            {!isCollapsed && (
              <div className="px-2 pb-1">
                <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  {group.groupTitle}
                </span>
              </div>
            )}

            <div className="space-y-0.5">
              {group.items.map((item) => {
                const IconComponent = item.icon;
                const isActive = currentNavId === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center rounded-lg transition-all duration-200 text-left cursor-pointer group ${
                      isCollapsed
                        ? 'p-2.5 justify-center'
                        : 'px-2.5 py-2'
                    } ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium shadow-md shadow-blue-900/30'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <IconComponent
                        className={`w-4 h-4 shrink-0 transition-all duration-200 ${
                          isActive
                            ? 'text-white scale-110'
                            : 'text-slate-400 group-hover:text-slate-200 group-hover:scale-105'
                        }`}
                      />
                      {!isCollapsed && (
                        <div className="text-xs font-medium truncate leading-tight">
                          {item.label}
                        </div>
                      )}
                    </div>
                    {!isCollapsed && item.badge && (
                      <span
                        className={`ml-auto shrink-0 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md transition-colors ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-800 text-slate-300 border border-slate-700 group-hover:border-slate-600'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 底部功能区：折叠收起按钮 */}
      <div className="border-t border-slate-800 p-2.5 bg-slate-900/90">
        <button
          onClick={onToggleCollapse}
          className={`w-full flex items-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer text-xs ${
            isCollapsed ? 'p-2.5 justify-center' : 'px-2.5 py-1.5 justify-between'
          }`}
          title={isCollapsed ? '展开左侧边栏 (260px)' : '收起左侧边栏为紧凑模式 (68px)'}
        >
          {!isCollapsed ? (
            <>
              <span className="text-[11px] text-slate-400">收起侧边栏以宽屏展示</span>
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            </>
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </button>
      </div>
    </aside>
  );
};
