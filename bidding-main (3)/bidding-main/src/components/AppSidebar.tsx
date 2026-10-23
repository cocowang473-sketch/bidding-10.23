import React from 'react';
import {
  FileText,
  Calculator,
  Database,
  BookOpen,
  Tag,
  Mail,
  ArrowUpDown,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Building2,
  Sparkles,
  Clock,
  ShieldCheck,
  FileSpreadsheet,
  Download,
  HelpCircle,
  FolderArchive,
  Layers,
  Send,
  Workflow,
  LayoutDashboard,
  History,
  Printer,
  Users,
} from 'lucide-react';

import { TenderProject } from '../types/tenderProject';

export type MainNavId =
  | 'tenders-hub'
  | 'workbench-overview'
  | 'workbench-attachments'
  | 'workbench-variables'
  | 'workbench-preview'
  | 'workbench-boq'
  | 'enterprise-talent'
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
    attachments?: number;
    tenders?: number;
  };
  activeTender?: TenderProject;
  tenders?: TenderProject[];
  onSelectTender?: (id: string) => void;
  onOpenCreateModal?: () => void;
  onOpenProductDocModal?: () => void;
  onOpenHistoryDrawer?: () => void;
}

interface NavGroup {
  groupTitle: string;
  groupEn: string;
  items: {
    id: MainNavId;
    label: string;
    subLabel?: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
    badgeColor?: string;
  }[];
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentNavId,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  counts,
  activeTender,
  tenders = [],
  onSelectTender,
  onOpenCreateModal,
  onOpenProductDocModal,
  onOpenHistoryDrawer,
}) => {
  const [isTenderDropdownOpen, setIsTenderDropdownOpen] = React.useState(false);

  const navGroups: NavGroup[] = [
    {
      groupTitle: '标书与组价作业流',
      groupEn: 'BIDDING & PRICING',
      items: [
        {
          id: 'tenders-hub',
          label: '多标管理与项目总览',
          subLabel: '新建标段 / 多标分类切换',
          icon: Building2,
          badge: counts.tenders ? `${counts.tenders}个标` : '3个标',
          badgeColor: 'bg-indigo-100 text-indigo-700 font-bold',
        },
        {
          id: 'workbench-overview',
          label: '标段综合工作台',
          subLabel: activeTender ? activeTender.name : '当前标段总览与三板块状态',
          icon: LayoutDashboard,
        },
        {
          id: 'workbench-attachments',
          label: '1. 招标公告与文件解析',
          subLabel: '3卷册八大板块提取 / 方块文档库',
          icon: FolderArchive,
          badge: counts.attachments ? `${counts.attachments}份` : '6份',
          badgeColor: 'bg-indigo-100 text-indigo-700',
        },
        {
          id: 'workbench-variables',
          label: '2. 招标须知与标书装配',
          subLabel: '条款组件 / 变量填报 / 人工补齐',
          icon: FileText,
          badge: '已锁定',
          badgeColor: 'bg-blue-100 text-blue-700',
        },
        {
          id: 'workbench-preview',
          label: '标书交互排版与打印预览',
          subLabel: '动态排版 / A4 标准PDF导出',
          icon: Printer,
          badge: 'A4标准',
          badgeColor: 'bg-emerald-100 text-emerald-700 font-bold',
        },
        {
          id: 'workbench-boq',
          label: '3. 清单智能组价工作台',
          subLabel: 'BQE量单 / 人材机综合单价',
          icon: Calculator,
          badge: counts.boqItems > 0 ? `${counts.boqItems}项` : '未导入',
          badgeColor: counts.boqItems > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800',
        },
      ],
    },
    {
      groupTitle: '工程人才与核心资产库',
      groupEn: 'MASTER TALENT & ASSETS',
      items: [
        {
          id: 'enterprise-talent',
          label: '企业人才库与在岗中枢',
          subLabel: '简历提取 / 岗位矩阵 / 档期研判',
          icon: Users,
          badge: '可派驻',
          badgeColor: 'bg-blue-100 text-blue-700 font-bold',
        },
        {
          id: 'dual-db-materials',
          label: '工程物资与定额总库',
          subLabel: '主材库 / 安装定额对照',
          icon: Database,
        },
        {
          id: 'dual-db-contracts',
          label: '历史签单台账与导入',
          subLabel: 'Excel批量导入 / 签约价追溯',
          icon: FolderArchive,
          badge: `${counts.contracts}笔`,
          badgeColor: 'bg-indigo-100 text-indigo-700',
        },
        {
          id: 'dual-db-aliases',
          label: '物料别名智能映射',
          subLabel: '中法语义对照 / 同义词规则',
          icon: Tag,
        },
      ],
    },
    {
      groupTitle: '供应商询价与协同中心',
      groupEn: 'SUPPLY CHAIN & RFQ',
      items: [
        {
          id: 'rfq-records',
          label: '询价单跟踪与发函',
          subLabel: '一企一信 / 进度与状态看板',
          icon: Mail,
          badge: counts.pendingRfqs > 0 ? `${counts.pendingRfqs}待比价` : undefined,
          badgeColor: 'bg-amber-100 text-amber-700',
        },
        {
          id: 'rfq-compare',
          label: '多商报价横向比选',
          subLabel: '价格由低到高 / 一键采纳',
          icon: ArrowUpDown,
        },
        {
          id: 'rfq-templates',
          label: '询价邮件模板管理',
          subLabel: '分类模版 / 预设变量注入',
          icon: Send,
          badge: `${counts.emailTemplates}套`,
          badgeColor: 'bg-slate-100 text-slate-700',
        },
      ],
    },
    {
      groupTitle: '成本测算与国际费率',
      groupEn: 'COST ENGINE & FX',
      items: [
        {
          id: 'config',
          label: '国际汇率与综合费率',
          subLabel: '汇率联动 / 海运保险 / 关税模型',
          icon: Sliders,
        },
      ],
    },
  ];

  return (
    <aside
      className={`bg-slate-900 text-slate-200 shrink-0 border-r border-slate-800 flex flex-col transition-all duration-300 z-30 select-none ${
        isCollapsed ? 'w-18' : 'w-68'
      }`}
    >
      {/* 顶部企业品牌 Logo 与系统名 */}
      <div className="h-16 border-b border-slate-800/80 px-4 flex items-center justify-between">
        {!isCollapsed ? (
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
              CS
            </div>
            <div className="truncate">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-sm tracking-tight truncate">
                  海外工程智能投标系统
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">CostOS 标书智造与协同组价平台</p>
            </div>
          </div>
        ) : (
          <div className="mx-auto w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            CS
          </div>
        )}
      </div>

      {/* 当前工程标段切换器 */}
      {!isCollapsed ? (
        <div className="relative mx-3 my-2.5">
          <div
            onClick={() => setIsTenderDropdownOpen((prev) => !prev)}
            className="p-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 hover:border-blue-500/50 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-blue-300">
              <div className="flex items-center gap-1.5 min-w-0">
                <Building2 className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                <span className="truncate">{activeTender ? activeTender.name : '阿尔及利亚 240 床综合医院'}</span>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isTenderDropdownOpen ? 'rotate-90' : ''}`} />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
              <span>{activeTender?.statusLabel || '进行中'}</span>
              <span className="text-emerald-400 font-mono font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                {activeTender ? `截标 ${activeTender.deadline.slice(5)}` : '6天截标'}
              </span>
            </div>
          </div>

          {/* 标段切换下拉面板 */}
          {isTenderDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 p-2 space-y-1">
              <div className="text-[10px] text-slate-400 font-semibold px-2 py-1 uppercase tracking-wider flex items-center justify-between">
                <span>切换在管标段 ({tenders.length})</span>
                {onOpenCreateModal && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTenderDropdownOpen(false);
                      onOpenCreateModal();
                    }}
                    className="text-blue-400 hover:text-blue-300 cursor-pointer font-bold"
                  >
                    + 新建标
                  </button>
                )}
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {tenders.map((t) => {
                  const isCurrent = t.id === activeTender?.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        if (onSelectTender) onSelectTender(t.id);
                        setIsTenderDropdownOpen(false);
                      }}
                      className={`p-2 rounded-lg text-left cursor-pointer transition-colors ${
                        isCurrent
                          ? 'bg-blue-600/30 text-blue-200 border border-blue-500/40'
                          : 'hover:bg-slate-700/60 text-slate-300'
                      }`}
                    >
                      <div className="text-xs font-medium truncate">{t.name}</div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                        <span className="font-mono">{t.code}</span>
                        <span className={isCurrent ? 'text-blue-300 font-bold' : ''}>{t.statusLabel}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="pt-1 border-t border-slate-700/80">
                <button
                  onClick={() => {
                    setIsTenderDropdownOpen(false);
                    onNavigate('tenders-hub');
                  }}
                  className="w-full text-center py-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
                >
                  进入标段分类管理总览 ➔
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => onNavigate('tenders-hub')}
          className="my-2 flex justify-center cursor-pointer"
          title={`当前标段: ${activeTender?.name || '阿尔及利亚240床医院'}`}
        >
          <div className="w-3 h-3 rounded-full bg-emerald-400 ring-4 ring-emerald-500/20 animate-pulse"></div>
        </div>
      )}

      {/* 侧边栏主菜单导航项 */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-5 scrollbar-thin scrollbar-thumb-slate-700">
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            {!isCollapsed && (
              <div className="px-2 pb-1 flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  {group.groupTitle}
                </span>
                <span className="text-[9px] font-mono text-slate-400">{group.groupEn}</span>
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
                    title={isCollapsed ? `${item.label} (${item.subLabel || ''})` : undefined}
                    className={`w-full flex items-center rounded-lg transition-all text-left cursor-pointer group ${
                      isCollapsed
                        ? 'p-2.5 justify-center'
                        : 'px-2.5 py-2 justify-between gap-2.5'
                    } ${
                      isActive
                        ? 'bg-blue-600 text-white font-medium shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <IconComponent
                        className={`w-4.5 h-4.5 shrink-0 transition-transform ${
                          isActive
                            ? 'text-white scale-105'
                            : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      />
                      {!isCollapsed && (
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate leading-tight">
                            {item.label}
                          </div>
                          {item.subLabel && (
                            <div
                              className={`text-xs truncate leading-tight mt-0.5 ${
                                isActive ? 'text-blue-100' : 'text-slate-400'
                              }`}
                            >
                              {item.subLabel}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {!isCollapsed && item.badge && (
                      <span
                        className={`text-[11px] font-mono px-1.5 py-0.5 rounded font-medium shrink-0 ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-800 text-slate-300 border border-slate-700/60'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {isCollapsed && item.badge && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-400 ring-2 ring-slate-900"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 底部功能工具栏与折叠收起按钮 */}
      <div className="border-t border-slate-800 p-2 bg-slate-900/95 space-y-1">
        {!isCollapsed && (
          <div className="grid grid-cols-2 gap-1 pb-1">
            {onOpenProductDocModal && (
              <button
                type="button"
                onClick={onOpenProductDocModal}
                className="px-2 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="查看系统操作规程与业务架构 (PRD)"
              >
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                <span>操作规程</span>
              </button>
            )}

            {onOpenHistoryDrawer && (
              <button
                type="button"
                onClick={onOpenHistoryDrawer}
                className="px-2 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="查看审计变更历史台账"
              >
                <History className="w-3.5 h-3.5 text-emerald-400" />
                <span>变更审计</span>
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onToggleCollapse}
          className={`w-full flex items-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer text-xs ${
            isCollapsed ? 'p-2.5 justify-center' : 'px-2.5 py-1.5 justify-between'
          }`}
          title={isCollapsed ? '展开左侧边栏 (260px)' : '收起左侧边栏为紧凑模式 (68px)'}
        >
          {!isCollapsed ? (
            <>
              <span className="text-[11px] text-slate-400">收起侧栏至紧凑模式</span>
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
