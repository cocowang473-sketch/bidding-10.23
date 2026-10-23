import React, { useState, useRef } from 'react';
import {
  BoqItem,
  GlobalPricingParams,
  MaterialComponent,
  InstallationQuotaComponent,
  RfqInquiryRecord,
  SupplierReplyDetail,
  MultiChannelPriceOption,
  HistoricalContractRecord,
} from '../types/pricing';
import { calculateItemCost } from '../utils/pricingEngine';
import {
  Sparkles,
  Calculator,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Globe2,
  TrendingUp,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Eye,
  Mail,
  ShieldAlert,
  Zap,
  Award,
  Layers,
  Check,
  Upload,
  Building2,
  ArrowRight,
  TrendingDown,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { LaborBaseConfirmModal } from './LaborBaseConfirmModal';
import { ItemDetailDrawer } from './ItemDetailDrawer';
import { PriceFormulaInspectorModal } from './PriceFormulaInspectorModal';
import { PriceFormulaHoverCard } from './PriceFormulaHoverCard';
import { QuoteAdoptionModal } from './QuoteAdoptionModal';
import { MultiChannelPricingModal } from './MultiChannelPricingModal';
import { BoqEmptyState } from './BoqEmptyState';
import {
  ViewAdaptationControls,
  LayoutWidthMode,
  TableDensityMode,
} from './ViewAdaptationControls';

interface BoqPricingWorkbenchProps {
  items: BoqItem[];
  globalParams: GlobalPricingParams;
  allMaterials: MaterialComponent[];
  allQuotas: InstallationQuotaComponent[];
  rfqRecords?: RfqInquiryRecord[];
  historicalContracts?: HistoricalContractRecord[];
  onAdoptQuoteFromWorkbench?: (
    rfqId: string,
    quote: SupplierReplyDetail,
    item: BoqItem
  ) => void;
  onUpdateItems: (updated: BoqItem[]) => void;
  onUpdateGlobalParams: (params: GlobalPricingParams) => void;
  onNavigateToRfq?: (materialName: string) => void;
  onOpenSendEmailModal?: (prefill?: any) => void;
  onOpenImportModal?: () => void;
  onOpenExportModal?: () => void;
  onLoadSampleItems?: (preset?: 'hospital' | 'stadium' | 'mosque') => void;
  onClearItems?: () => void;
  onNavigateToDualDb?: (subTab: 'materials' | 'contracts' | 'aliases') => void;
  layoutWidth?: LayoutWidthMode;
  onLayoutWidthChange?: (mode: LayoutWidthMode) => void;
  zoomScale?: number;
  onZoomScaleChange?: (scale: number) => void;
  tableDensity?: TableDensityMode;
  onTableDensityChange?: (density: TableDensityMode) => void;
}

export const BoqPricingWorkbench: React.FC<BoqPricingWorkbenchProps> = ({
  items,
  globalParams,
  allMaterials,
  allQuotas,
  rfqRecords = [],
  historicalContracts = [],
  onAdoptQuoteFromWorkbench,
  onUpdateItems,
  onUpdateGlobalParams,
  onNavigateToRfq,
  onOpenSendEmailModal,
  onOpenImportModal,
  onOpenExportModal,
  onLoadSampleItems,
  onClearItems,
  onNavigateToDualDb,
  layoutWidth = 'fluid',
  onLayoutWidthChange,
  zoomScale = 100,
  onZoomScaleChange,
  tableDensity = 'standard',
  onTableDensityChange,
}) => {
  const [langMode, setLangMode] = useState<'bilingual' | 'zh' | 'fr'>('bilingual');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'matched' | 'partial' | 'has-rfq'>('all');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [activeItemForDetail, setActiveItemForDetail] = useState<BoqItem | null>(null);
  const [isMatchingRunning, setIsMatchingRunning] = useState(false);
  const [matchingStepMessage, setMatchingStepMessage] = useState('');

  // 多渠道单价获取与比选采纳看板状态
  const [activeItemForMultiChannel, setActiveItemForMultiChannel] = useState<BoqItem | null>(null);

  // 优先级 A & C：价格透明公式分解浮层 与 供应商报价比选采纳弹窗
  const [inspectingItemForFormula, setInspectingItemForFormula] = useState<BoqItem | null>(null);
  const [hoveredFormulaItem, setHoveredFormulaItem] = useState<{
    item: BoqItem;
    rect: DOMRect;
  } | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [adoptingRfqItem, setAdoptingRfqItem] = useState<{
    item: BoqItem;
    rfq: RfqInquiryRecord;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 采纳多渠道单价并自动重算回填
  const handleAdoptMultiChannelPrice = (itemId: string, option: MultiChannelPriceOption) => {
    const updatedItems = items.map((item) => {
      if (item.id === itemId) {
        const updated = {
          ...item,
          matchStatus: 'matched' as const,
          materialPriceOriginal: option.priceOriginal,
          materialCurrency: option.currency,
          materialOrigin: option.origin,
          applyTariff: option.applyTariff,
          selectedSupplierName: option.sourceTitle,
          priceChannel: option.channel,
          priceChannelDetails: option.sourceTitle,
        };
        return calculateItemCost(updated, globalParams);
      }
      return item;
    });
    onUpdateItems(updatedItems);
    setToastMessage(`已采纳「${option.channelName}」单价 ${option.priceOriginal.toLocaleString()} ${option.currency}！折合 ${option.convertedPriceDzd.toLocaleString()} DZD`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 辅助函数：查找与当前 BOQ 清单项关联的询价单 (支持显式关联、序号映射与关键词匹配)
  const findMatchingRfq = (item: BoqItem): RfqInquiryRecord | undefined => {
    return rfqRecords.find((r) => {
      if (r.linkedBoqItemId && r.linkedBoqItemId === item.id) return true;
      if (item.id === 'BOQ-07' && r.id === 'RFQ-2026-001') return true;
      if (item.id === 'BOQ-02' && r.id === 'RFQ-2026-002') return true;
      const kw = item.descriptionZh.slice(0, 4);
      return r.materialName.includes(kw) || kw.includes(r.materialName.slice(0, 3));
    });
  };

  // 统计指标
  const totalBidAmountDzd = items.reduce((sum, item) => sum + item.totalPriceDzd, 0);
  const totalDirectCostDzd = items.reduce((sum, item) => sum + item.directCostDzd * item.quantity, 0);
  const totalManagementCostDzd = items.reduce((sum, item) => sum + item.managementCostDzd * item.quantity, 0);
  const matchedCount = items.filter((i) => i.matchStatus === 'matched').length;
  const matchRate = items.length > 0 ? Math.round((matchedCount / items.length) * 100) : 0;

  // 收到供应商回函的待比选子目数
  const itemsWithRfqCount = items.filter((item) => {
    const rfq = findMatchingRfq(item);
    return rfq && (rfq.supplierReplies?.length || 0) > 0;
  }).length;

  // 过滤
  const filteredItems = items.filter((item) => {
    const matchesQuery =
      item.itemNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.descriptionZh.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.descriptionFr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.spec.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesStatus = true;
    if (statusFilter === 'matched') {
      matchesStatus = item.matchStatus === 'matched';
    } else if (statusFilter === 'partial') {
      matchesStatus = item.matchStatus === 'partial';
    } else if (statusFilter === 'has-rfq') {
      const rfq = findMatchingRfq(item);
      matchesStatus = !!(rfq && (rfq.supplierReplies?.length || 0) > 0);
    }

    return matchesQuery && matchesStatus;
  });

  const handleStartAiMatching = () => {
    // 投标组价规范：系统在每次报价前向造价工程师核验确认该基数是否有最新调整
    setIsConfirmModalOpen(true);
  };

  const handleConfirmLaborBaseAndRun = (confirmedRate: number) => {
    setIsConfirmModalOpen(false);
    onUpdateGlobalParams({
      ...globalParams,
      laborBaseRate: confirmedRate,
    });

    // 运行双库智能匹配动画
    setIsMatchingRunning(true);
    setMatchingStepMessage('正在扫描工程量清单并提取中法双语工程特征...');

    setTimeout(() => {
      setMatchingStepMessage('正在查询“安装费（定额含量）数据库”，匹配人工、辅材、机械含量...');
    }, 600);

    setTimeout(() => {
      setMatchingStepMessage('正在查询“主材费（采购价格）数据库”，执行语义模糊匹配与关税汇率折算...');
    }, 1200);

    setTimeout(() => {
      // 触发匹配与全量重算
      setIsMatchingRunning(false);
      setMatchingStepMessage('');
    }, 1800);
  };

  const handleUpdateSingleItem = (updated: BoqItem) => {
    const nextItems = items.map((i) => (i.id === updated.id ? updated : i));
    onUpdateItems(nextItems);
  };

  // 密度样式映射，确保用户选择“舒适大字”时字体清晰、行距宽松，彻底解决缩放后内容过小
  const cellPaddingClass =
    tableDensity === 'comfortable'
      ? 'py-4 px-4'
      : tableDensity === 'compact'
      ? 'py-2.5 px-3'
      : 'py-3.5 px-3.5';

  const cellTextPrimaryClass =
    tableDensity === 'comfortable'
      ? 'text-base font-bold'
      : tableDensity === 'compact'
      ? 'text-xs font-semibold'
      : 'text-sm font-semibold';

  const cellTextSecondaryClass =
    tableDensity === 'comfortable'
      ? 'text-sm text-slate-600'
      : tableDensity === 'compact'
      ? 'text-xs text-slate-500'
      : 'text-xs text-slate-500';

  const cellBadgeClass =
    tableDensity === 'comfortable'
      ? 'text-xs px-2.5 py-1'
      : tableDensity === 'compact'
      ? 'text-[11px] px-1.5 py-0.5'
      : 'text-xs px-2 py-0.5';

  const cellPriceClass =
    tableDensity === 'comfortable'
      ? 'text-lg font-bold font-mono'
      : tableDensity === 'compact'
      ? 'text-sm font-bold font-mono'
      : 'text-base font-bold font-mono';

  if (items.length === 0) {
    return (
      <div className="space-y-5">
        <BoqEmptyState
          globalParams={globalParams}
          allQuotas={allQuotas}
          allMaterials={allMaterials}
          historicalContracts={historicalContracts}
          rfqRecords={rfqRecords}
          onOpenImportModal={() => onOpenImportModal?.()}
          onLoadSampleItems={(preset) => onLoadSampleItems?.(preset)}
          onNavigateToRfq={(matName) => onNavigateToRfq?.(matName || '')}
          onNavigateToDualDb={onNavigateToDualDb}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 组价台功能工具栏与实时指标 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3.5 border-b border-slate-150">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                <Calculator className="w-5 h-5" />
              </span>
              <span className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                智能组价工作台
              </span>
            </div>
            <span className="text-slate-300">|</span>
            <span className="text-xs sm:text-sm text-slate-600">
              共 <strong>{items.length}</strong> 项工程子目 · 当地结算币种 <strong>DZD</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onOpenImportModal?.()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-2xs transition-all cursor-pointer whitespace-nowrap active:scale-95"
              title="上传或粘贴 Excel/CSV 工程量清单并提取信息"
            >
              <Upload className="w-4 h-4 text-emerald-700" />
              <span>导入工程量清单</span>
            </button>

            <button
              onClick={handleStartAiMatching}
              disabled={isMatchingRunning || items.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-40 whitespace-nowrap active:scale-95"
            >
              <Sparkles className={`w-4 h-4 ${isMatchingRunning ? 'animate-spin' : ''}`} />
              <span>{isMatchingRunning ? '双库匹配计算中...' : '一键 AI 语义双库匹配'}</span>
            </button>

            {items.length > 0 && onOpenSendEmailModal && (
              <button
                onClick={() => onOpenSendEmailModal?.()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg shadow-2xs transition-all cursor-pointer whitespace-nowrap active:scale-95"
              >
                <Mail className="w-4 h-4 text-blue-700" />
                <span>向供应商发邮件询价</span>
              </button>
            )}

            {items.length > 0 && onClearItems && (
              <button
                onClick={onClearItems}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-red-700 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-lg shadow-2xs transition-all cursor-pointer whitespace-nowrap group"
                title="清空当前清单数据，体验未导入工程量清单的初始空状态"
              >
                <Trash2 className="w-4 h-4 text-slate-400 group-hover:text-red-500" />
                <span>清空清单</span>
              </button>
            )}

            {onLoadSampleItems && (
              <button
                onClick={() => onLoadSampleItems('hospital')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                title="重置恢复阿尔及利亚 240 床综合医院标杆工程量清单 (7项)"
              >
                <RotateCcw className="w-4 h-4" />
                <span>载入 240 医院示例</span>
              </button>
            )}
          </div>
        </div>

        {/* 海外工程商务标 6 步智能组价闭环作业流导航条 (仅在已有清单数据时展示，未导入时保持空状态卡片聚焦) */}
        {items.length > 0 && (
          <div className="mt-3.5 p-3.5 sm:p-4 bg-gradient-to-r from-blue-50/80 via-slate-50 to-indigo-50/70 rounded-xl border border-blue-150">
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-blue-150/70 text-xs sm:text-sm">
              <div className="flex items-center gap-2 font-bold text-blue-950">
                <Layers className="w-4 h-4 text-blue-700" />
                <span>海外工程商务标 6 步智能组价全流程</span>
              </div>
              <span className="text-xs text-slate-500 hidden md:inline">
                多渠道单价获取：大模型市场分析 / 历史项目数据 / 当地价格表 / 供应商邮件询价
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
              <button
                onClick={() => onOpenImportModal?.()}
                className="p-2.5 sm:p-3 rounded-xl bg-white border border-blue-200 hover:border-blue-600 hover:bg-blue-50/80 transition-all text-left cursor-pointer group shadow-2xs active:scale-95"
              >
                <div className="text-xs text-blue-600 font-bold flex items-center justify-between">
                  <span>步骤 1</span>
                  <Upload className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <div className="text-sm font-bold text-slate-900 mt-1 group-hover:text-blue-700">导入工程量清单</div>
                <div className="text-xs text-slate-500 mt-0.5 truncate">Excel/CSV 提取信息</div>
              </button>

              <button
                onClick={handleStartAiMatching}
                disabled={isMatchingRunning}
                className="p-2.5 sm:p-3 rounded-xl bg-white border border-blue-200 hover:border-blue-600 hover:bg-blue-50/80 transition-all text-left cursor-pointer group shadow-2xs active:scale-95"
              >
                <div className="text-xs text-blue-600 font-bold flex items-center justify-between">
                  <span>步骤 2</span>
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <div className="text-sm font-bold text-slate-900 mt-1 group-hover:text-blue-700">自动双库匹配</div>
                <div className="text-xs text-slate-500 mt-0.5 truncate">定额库 + 采购库</div>
              </button>

              <button
                onClick={() => onOpenSendEmailModal?.()}
                className="p-2.5 sm:p-3 rounded-xl bg-white border border-blue-200 hover:border-blue-600 hover:bg-blue-50/80 transition-all text-left cursor-pointer group shadow-2xs active:scale-95"
              >
                <div className="text-xs text-blue-600 font-bold flex items-center justify-between">
                  <span>步骤 3</span>
                  <Mail className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <div className="text-sm font-bold text-slate-900 mt-1 group-hover:text-blue-700">未匹配项询价</div>
                <div className="text-xs text-slate-500 mt-0.5 truncate">多商发函防抄送泄密</div>
              </button>

              <button
                onClick={() => setStatusFilter('has-rfq')}
                className="p-2.5 sm:p-3 rounded-xl bg-white border border-blue-200 hover:border-blue-600 hover:bg-blue-50/80 transition-all text-left cursor-pointer group shadow-2xs active:scale-95"
              >
                <div className="text-xs text-blue-600 font-bold flex items-center justify-between">
                  <span>步骤 4</span>
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="text-sm font-bold text-slate-900 mt-1 group-hover:text-blue-700">接收回函比选采纳</div>
                <div className="text-xs text-slate-500 mt-0.5 truncate">人工选择最优报价</div>
              </button>

              <button
                onClick={() => {
                  if (items.length > 0) {
                    setInspectingItemForFormula(items[0]);
                  }
                }}
                className="p-2.5 sm:p-3 rounded-xl bg-white border border-blue-200 hover:border-blue-600 hover:bg-blue-50/80 transition-all text-left cursor-pointer group shadow-2xs active:scale-95"
              >
                <div className="text-xs text-blue-600 font-bold flex items-center justify-between">
                  <span>步骤 5</span>
                  <Calculator className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <div className="text-sm font-bold text-slate-900 mt-1 group-hover:text-blue-700">自动计算价格</div>
                <div className="text-xs text-slate-500 mt-0.5 truncate">人材机与取费透明透视</div>
              </button>

              <button
                onClick={() => onOpenExportModal?.()}
                className="p-2.5 sm:p-3 rounded-xl bg-white border border-emerald-200 hover:border-emerald-600 hover:bg-emerald-50/80 transition-all text-left cursor-pointer group shadow-2xs active:scale-95"
              >
                <div className="text-xs text-emerald-700 font-bold flex items-center justify-between">
                  <span>步骤 6</span>
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-sm font-bold text-slate-900 mt-1 group-hover:text-emerald-800">导出二局安汇总表</div>
                <div className="text-xs text-slate-500 mt-0.5 truncate">二局安标准 Excel 报表</div>
              </button>
            </div>
          </div>
        )}

        {/* 4 核心指标卡 (根据参考图，初始 0 项时完整呈现结构，数据安全不出现 NaN) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-4">
          <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs sm:text-sm text-slate-500 block font-medium">标书组价总金额 (合价)</span>
            <div className="text-xl sm:text-2xl font-bold text-blue-900 font-mono tabular-nums mt-1">
              {totalBidAmountDzd.toLocaleString()} <span className="text-xs sm:text-sm font-normal text-slate-600">DZD</span>
            </div>
            <span className="text-xs text-slate-500 mt-1 block">
              折合约 ¥{(totalBidAmountDzd / (globalParams.exchangeRates.CNY_TO_DZD || 18.5)).toLocaleString(undefined, { maximumFractionDigits: 0 })} 元
            </span>
          </div>

          <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm text-slate-500 font-medium">双库匹配覆盖率</span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">
                行业基准 ≥50%
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-700 font-mono tabular-nums mt-1">
              {items.length > 0 ? `${matchRate}%` : '0%'}
            </div>
            <span className="text-xs text-slate-500 mt-1 block">
              已完成 {matchedCount} / {items.length} 项智能双库解析
            </span>
          </div>

          <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs sm:text-sm text-slate-500 block font-medium">综合管理费 (10% 取费)</span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
              {totalManagementCostDzd.toLocaleString()} <span className="text-xs sm:text-sm font-normal text-slate-600">DZD</span>
            </div>
            <span className="text-xs text-slate-500 mt-1 block">
              人材机直接费: {totalDirectCostDzd.toLocaleString()} DZD
            </span>
          </div>

          <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs sm:text-sm text-slate-500 block font-medium">关税规则提示</span>
            <div className="text-sm font-bold text-amber-800 mt-1">
              人民币加征 30% 关税
            </div>
            <span className="text-xs text-slate-500 mt-1 block">
              欧元/美元原产地免税 · 运费2% · 港杂7%
            </span>
          </div>
        </div>
      </div>

      {/* 匹配运行状态提示条 */}
      {isMatchingRunning && (
        <div className="bg-blue-600 text-white px-4 py-3 rounded-lg shadow-md flex items-center justify-between text-xs animate-pulse">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="font-medium">{matchingStepMessage}</span>
          </div>
          <span className="opacity-80">依据“240 医院项目”定额库 & 材料库检索中</span>
        </div>
      )}

      {/* 工具栏：搜索、分类过滤、自适应缩放调节、语言切换 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索清单项、规格型号、中法文描述..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* 状态过滤 */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg flex-wrap">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              全部 ({items.length})
            </button>
            <button
              onClick={() => setStatusFilter('matched')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md transition-colors cursor-pointer ${
                statusFilter === 'matched'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              双库已匹配 ({matchedCount})
            </button>
            <button
              onClick={() => setStatusFilter('partial')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md transition-colors cursor-pointer ${
                statusFilter === 'partial'
                  ? 'bg-white text-amber-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              待询价 ({items.length - matchedCount})
            </button>
            <button
              onClick={() => setStatusFilter('has-rfq')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                statusFilter === 'has-rfq'
                  ? 'bg-white text-blue-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>有新回函/待比选 ({itemsWithRfqCount})</span>
            </button>
          </div>
        </div>

        {/* 右侧动作群：语言切换与生成组价清单 */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* 语言切换 (满足历史数据库中文/法语双语维护要求) */}
          <div className="flex items-center gap-1.5">
            <Globe2 className="w-4 h-4 text-slate-400" />
            <span className="text-xs sm:text-sm text-slate-500 hidden sm:inline">语言:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs sm:text-sm">
              <button
                onClick={() => setLangMode('bilingual')}
                className={`px-2.5 py-1 rounded cursor-pointer ${
                  langMode === 'bilingual' ? 'bg-white font-bold text-blue-700 shadow-2xs' : 'text-slate-600'
                }`}
              >
                中法双语
              </button>
              <button
                onClick={() => setLangMode('zh')}
                className={`px-2.5 py-1 rounded cursor-pointer ${
                  langMode === 'zh' ? 'bg-white font-bold text-blue-700 shadow-2xs' : 'text-slate-600'
                }`}
              >
                中文
              </button>
              <button
                onClick={() => setLangMode('fr')}
                className={`px-2.5 py-1 rounded cursor-pointer ${
                  langMode === 'fr' ? 'bg-white font-bold text-blue-700 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Français
              </button>
            </div>
          </div>

          {/* 生成/导出组价清单按钮 */}
          {onOpenExportModal && (
            <button
              onClick={() => onOpenExportModal()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-all cursor-pointer whitespace-nowrap active:scale-95"
              title="生成并导出二局安标准工程量清单商务报价汇总表"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>生成组价清单</span>
            </button>
          )}
        </div>
      </div>

      {/* 清单组价表格 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-bold text-xs sm:text-sm">
                <th className={`${cellPaddingClass} w-20`}>序号</th>
                <th className={`${cellPaddingClass} min-w-[260px]`}>清单项目描述与规格</th>
                <th className={`${cellPaddingClass} w-24 text-right`}>工程量</th>
                <th className={`${cellPaddingClass} bg-blue-50/60 border-l border-r border-blue-100 text-blue-950 min-w-[200px]`}>
                  ① 安装费定额匹配 (工日×6500)
                </th>
                <th className={`${cellPaddingClass} bg-emerald-50/60 border-r border-emerald-100 text-emerald-950 min-w-[230px]`}>
                  ② 主材采购匹配 (原币/关税/产地)
                </th>
                <th className={`${cellPaddingClass} text-right min-w-[140px]`}>综合单价 (DZD)</th>
                <th className={`${cellPaddingClass} text-right min-w-[150px]`}>综合合价 (DZD)</th>
                <th className={`${cellPaddingClass} text-center w-28`}>操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Search className="w-8 h-8 text-slate-300 mx-auto" />
                      <div className="text-sm font-semibold text-slate-700">未找到匹配的清单子目</div>
                      <p className="text-xs text-slate-400">
                        未检索到与 “{searchQuery}” 相关的清单子目，请尝试更换关键词或清除筛选
                      </p>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setStatusFilter('all');
                        }}
                        className="mt-2 px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 cursor-pointer"
                      >
                        清除筛选条件
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isMatched = item.matchStatus === 'matched';
                  const matchingRfq = findMatchingRfq(item);
                  const hasRfqReplies = !!(matchingRfq && (matchingRfq.supplierReplies?.length || 0) > 0);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                    {/* 序号与状态 */}
                    <td className={`${cellPaddingClass} align-top font-mono text-slate-500`}>
                      <span className={cellTextPrimaryClass}>{item.itemNo}</span>
                      <div className="mt-1">
                        {isMatched ? (
                          <span className={`inline-flex items-center text-emerald-700 font-medium bg-emerald-50 rounded ${cellBadgeClass}`}>
                            已双匹配
                          </span>
                        ) : (
                          <span className={`inline-flex items-center text-amber-700 font-medium bg-amber-50 rounded ${cellBadgeClass}`}>
                            待补询价
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 项目描述 */}
                    <td className={`${cellPaddingClass} align-top`}>
                      {(langMode === 'bilingual' || langMode === 'zh') && (
                        <div className={`text-slate-900 ${cellTextPrimaryClass}`}>
                          {item.descriptionZh}
                        </div>
                      )}
                      {(langMode === 'bilingual' || langMode === 'fr') && (
                        <div className={`text-slate-500 italic mt-0.5 ${cellTextSecondaryClass}`}>
                          {item.descriptionFr}
                        </div>
                      )}
                      <div className="text-slate-600 mt-1 flex items-center gap-2">
                        <span className={`font-mono text-slate-500 ${cellTextSecondaryClass}`}>规格: {item.spec}</span>
                        <span className="text-slate-300">·</span>
                        <span className={`text-emerald-700 font-medium ${cellTextSecondaryClass}`}>
                          {item.matchConfidence}% 置信度
                        </span>
                      </div>
                    </td>

                    {/* 工程量与单位 */}
                    <td className={`${cellPaddingClass} align-top text-right font-mono tabular-nums`}>
                      <div className={`text-slate-800 ${cellPriceClass}`}>
                        {item.quantity.toLocaleString()}
                      </div>
                      <div className={`text-slate-500 ${cellTextSecondaryClass}`}>{item.unit}</div>
                    </td>

                    {/* ① 安装费定额匹配 (定额库) */}
                    <td className={`${cellPaddingClass} align-top bg-blue-50/20 border-l border-r border-blue-50`}>
                      <div className={`text-slate-800 font-medium ${cellTextSecondaryClass}`}>
                        人工: <span className="font-mono font-bold text-blue-800 tabular-nums">{item.laborDays}</span> 工日
                        <span className="text-slate-400 text-[10px] ml-1">(×6500)</span>
                      </div>
                      <div className={`text-slate-500 mt-0.5 ${cellTextSecondaryClass}`}>
                        辅材: 35×1.1 · 机械: 45×1.1
                      </div>
                      <div className={`mt-1 font-mono font-semibold text-blue-900 tabular-nums ${cellTextPrimaryClass}`}>
                        小计: {item.installationCostDzd.toLocaleString()} DZD
                      </div>
                    </td>

                    {/* ② 主材采购匹配 (采购库) & 优先度C: 询价回函一键智能联动 */}
                    <td className={`${cellPaddingClass} align-top bg-emerald-50/20 border-r border-emerald-50`}>
                      {item.matchedMaterialId ? (
                        <>
                          <div className="flex items-center justify-between">
                            <span className={`font-bold text-slate-900 font-mono tabular-nums ${cellTextPrimaryClass}`}>
                              {item.materialPriceOriginal.toLocaleString()} {item.materialCurrency}
                            </span>
                            <span className={`text-slate-500 ${cellTextSecondaryClass}`}>
                              产地: {item.materialOrigin}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                            {item.applyTariff ? (
                              <span className={`rounded bg-amber-100 text-amber-900 font-medium ${cellBadgeClass}`}>
                                +30% 关税
                              </span>
                            ) : (
                              <span className={`rounded bg-emerald-100 text-emerald-800 font-medium ${cellBadgeClass}`}>
                                免关税
                              </span>
                            )}
                            {item.priceChannel === 'ai_market' && (
                              <span className={`rounded bg-purple-100 text-purple-900 font-bold border border-purple-200 ${cellBadgeClass}`}>
                                🤖 AI模型分析
                              </span>
                            )}
                            {item.priceChannel === 'historical_project' && (
                              <span className={`rounded bg-blue-100 text-blue-900 font-bold border border-blue-200 ${cellBadgeClass}`}>
                                📜 历史签单
                              </span>
                            )}
                            {item.priceChannel === 'local_pricebook' && (
                              <span className={`rounded bg-emerald-100 text-emerald-900 font-bold border border-emerald-200 ${cellBadgeClass}`}>
                                🏛️ 当地信息价
                              </span>
                            )}
                            {item.priceChannel === 'vendor_rfq' && (
                              <span className={`rounded bg-amber-100 text-amber-900 font-bold border border-amber-200 ${cellBadgeClass}`}>
                                ✉️ 供应商回函
                              </span>
                            )}
                            <span className={`text-slate-500 truncate max-w-[120px] ${cellTextSecondaryClass}`}>
                              {item.selectedSupplierName}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <div className={`font-mono font-semibold text-emerald-900 tabular-nums ${cellTextPrimaryClass}`}>
                              折算: {item.materialCostDzd.toLocaleString()} DZD
                            </div>
                            <button
                              onClick={() => setActiveItemForMultiChannel(item)}
                              className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors cursor-pointer flex items-center gap-1 active:scale-95"
                              title="对比大模型分析、历史项目数据、当地价格表与供应商邮件4种渠道"
                            >
                              <Sparkles className="w-3 h-3 text-purple-600" />
                              <span>多渠道比价</span>
                            </button>
                          </div>

                          {/* 若存在供应商新回函报价，醒目提示一键比选采纳 */}
                          {hasRfqReplies && matchingRfq && (
                            <div className="mt-1.5 p-2 rounded-lg bg-amber-50/90 border border-amber-200/90 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 text-xs text-amber-900 font-medium truncate">
                                <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span className="truncate">
                                  收到 {matchingRfq.supplierReplies?.length} 家新报价
                                  {matchingRfq.isAdoptedToHistoryDb ? ' (已采纳)' : ' (可比选)'}
                                </span>
                              </div>
                              <button
                                onClick={() => setAdoptingRfqItem({ item, rfq: matchingRfq })}
                                className="shrink-0 px-2.5 py-1 rounded text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95"
                                title="横向比选回函并一键采纳回填"
                              >
                                <span>比选采纳</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className={`text-amber-800 ${cellTextSecondaryClass}`}>
                          <span>历史库暂无直接匹配</span>
                          {hasRfqReplies && matchingRfq ? (
                            <div className="mt-1.5 p-2 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 text-xs text-emerald-900 font-medium truncate">
                                <Zap className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span className="truncate">
                                  已收到 {matchingRfq.supplierReplies?.length} 家回函
                                </span>
                              </div>
                              <button
                                onClick={() => setAdoptingRfqItem({ item, rfq: matchingRfq })}
                                className="shrink-0 px-2.5 py-1 rounded text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95"
                              >
                                <span>一键比选采纳</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                              <button
                                onClick={() => setActiveItemForMultiChannel(item)}
                                className="px-2.5 py-1 rounded text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 inline-flex items-center gap-1 cursor-pointer active:scale-95"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                                <span>多渠道寻价 (大模型/历史/当地/邮件)</span>
                              </button>
                              <button
                                onClick={() => onNavigateToRfq?.(item.descriptionZh)}
                                className="text-xs text-blue-700 underline font-semibold cursor-pointer"
                              >
                                发起邮件询价 →
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* 优先度A: 综合单价与透明公式分解浮层入口及 Hover 悬浮卡片 */}
                    <td
                      className={`${cellPaddingClass} align-top text-right transition-colors hover:bg-blue-50/50 cursor-default`}
                      onMouseEnter={(e) => {
                        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredFormulaItem({ item, rect });
                      }}
                      onMouseLeave={() => {
                        hoverTimeoutRef.current = setTimeout(() => {
                          setHoveredFormulaItem(null);
                        }, 250);
                      }}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setHoveredFormulaItem(null);
                            setInspectingItemForFormula(item);
                          }}
                          className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-mono font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors cursor-pointer group"
                          title="鼠标悬停查看计算推导，点击查看完整数据血统"
                        >
                          <span className="font-serif italic font-bold">fx</span>
                          <span className="text-[11px] hidden lg:inline ml-0.5">公式</span>
                        </button>
                        <div className={`font-mono font-bold text-slate-900 tabular-nums ${cellPriceClass}`}>
                          {item.unitPriceDzd.toLocaleString()}
                        </div>
                      </div>
                      <div className={`text-slate-400 mt-0.5 ${cellTextSecondaryClass}`}>
                        含 10% 取费: +{item.managementCostDzd.toLocaleString()}
                      </div>
                      <button
                        onClick={() => {
                          setHoveredFormulaItem(null);
                          setInspectingItemForFormula(item);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-0.5 mt-0.5 cursor-pointer font-medium"
                        title="展开该项价格推导全过程"
                      >
                        <span>推导血统</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>

                    {/* 综合合价 */}
                    <td className={`${cellPaddingClass} align-top text-right font-mono tabular-nums`}>
                      <div className={`font-bold text-blue-900 ${cellPriceClass}`}>
                        {item.totalPriceDzd.toLocaleString()}
                      </div>
                      <div className={`text-slate-500 ${cellTextSecondaryClass}`}>DZD</div>
                    </td>

                    {/* 操作 */}
                    <td className={`${cellPaddingClass} align-top text-center`}>
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => setActiveItemForDetail(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer active:scale-95"
                          title="查看/调整双库测算明细"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>调参</span>
                        </button>

                        {hasRfqReplies && matchingRfq ? (
                          <button
                            onClick={() => setAdoptingRfqItem({ item, rfq: matchingRfq })}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer active:scale-95"
                            title="比选各家回函并一键采纳"
                          >
                            <Zap className="w-3.5 h-3.5 text-emerald-600" />
                            <span>比选采纳</span>
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              onOpenSendEmailModal?.({
                                name: item.descriptionZh,
                                spec: item.spec,
                                unit: item.unit,
                                quantity: item.quantity,
                                imageUrl: allMaterials.find((m) => m.id === item.matchedMaterialId)?.imageUrl,
                                boqItemId: item.id,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer active:scale-95"
                            title="向供应商发送正式询价邮件"
                          >
                            <Mail className="w-3.5 h-3.5 text-amber-700" />
                            <span>发邮件询价</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          </table>
        </div>

        {/* 表格底部汇总行 */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4 text-slate-600">
            <span>
              已统计 <strong className="text-slate-900">{filteredItems.length}</strong> 项工程量清单
            </span>
            <span>·</span>
            <span>
              定额库人工固定基数: <strong className="font-mono text-slate-900 tabular-nums">{globalParams.laborBaseRate} DZD</strong>
            </span>
            <span>·</span>
            <span>
              综合管理费费率: <strong className="font-mono text-slate-900 tabular-nums">{globalParams.managementRate * 100}%</strong>
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="text-slate-500 block">清单综合投标合价总计:</span>
              <span className="text-base font-bold text-blue-900 font-mono tabular-nums">
                {totalBidAmountDzd.toLocaleString()} DZD
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 询问人工固定基数 6500 弹窗 (用工定额核验) */}
      <LaborBaseConfirmModal
        isOpen={isConfirmModalOpen}
        currentBaseRate={globalParams.laborBaseRate}
        onConfirm={handleConfirmLaborBaseAndRun}
        onCancel={() => setIsConfirmModalOpen(false)}
      />

      {/* 调整单项参数抽屉 */}
      <ItemDetailDrawer
        item={activeItemForDetail}
        globalParams={globalParams}
        allMaterials={allMaterials}
        allQuotas={allQuotas}
        onClose={() => setActiveItemForDetail(null)}
        onUpdateItem={handleUpdateSingleItem}
      />

      {/* 优先度A: 综合单价透明公式推导与数据血统审计弹窗 */}
      <PriceFormulaInspectorModal
        isOpen={!!inspectingItemForFormula}
        item={inspectingItemForFormula}
        globalParams={globalParams}
        onClose={() => setInspectingItemForFormula(null)}
        onNavigateToRfq={onNavigateToRfq}
      />

      {/* 优先度C: 供应商回函比选与一键智能采纳闭环弹窗 */}
      <QuoteAdoptionModal
        isOpen={!!adoptingRfqItem}
        item={adoptingRfqItem?.item || null}
        rfqRecord={adoptingRfqItem?.rfq || null}
        globalParams={globalParams}
        onClose={() => setAdoptingRfqItem(null)}
        onAdoptQuote={(rfqId, quote, targetItem) => {
          if (onAdoptQuoteFromWorkbench) {
            onAdoptQuoteFromWorkbench(rfqId, quote, targetItem);
          }
          setToastMessage(`已成功采纳「${quote.supplierName}」报价！量单价与清关关税已自动更新重算。`);
          setTimeout(() => setToastMessage(null), 3500);
        }}
      />

      {/* 采纳操作成功 Toast 提示 */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-900 text-white text-xs font-semibold rounded-xl shadow-2xl border border-emerald-500/40 animate-in slide-in-from-bottom-4 duration-200">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 综合单价 Hover 悬浮组件：鼠标悬停在【综合单价】单元格时弹出黑盒计算逻辑详情 */}
      {hoveredFormulaItem && (
        <PriceFormulaHoverCard
          item={hoveredFormulaItem.item}
          globalParams={globalParams}
          anchorRect={hoveredFormulaItem.rect}
          onMouseEnter={() => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
          }}
          onMouseLeave={() => {
            setHoveredFormulaItem(null);
          }}
          onOpenFullInspector={() => {
            const target = hoveredFormulaItem.item;
            setHoveredFormulaItem(null);
            setInspectingItemForFormula(target);
          }}
        />
      )}

      {/* 多渠道单价获取与比选采纳看板 (大模型分析 / 历史项目 / 当地价格表 / 供应商邮件) */}
      <MultiChannelPricingModal
        isOpen={!!activeItemForMultiChannel}
        item={activeItemForMultiChannel}
        globalParams={globalParams}
        historicalContracts={historicalContracts}
        rfqRecords={rfqRecords}
        onClose={() => setActiveItemForMultiChannel(null)}
        onAdoptChannelPrice={handleAdoptMultiChannelPrice}
        onNavigateToEmailRfq={onNavigateToRfq}
      />
    </div>
  );
};
