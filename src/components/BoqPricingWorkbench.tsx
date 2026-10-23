import React, { useState, useRef } from 'react';
import {
  BoqItem,
  GlobalPricingParams,
  MaterialComponent,
  InstallationQuotaComponent,
  RfqInquiryRecord,
  SupplierReplyDetail,
} from '../types/pricing';
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
} from 'lucide-react';
import { LaborBaseConfirmModal } from './LaborBaseConfirmModal';
import { ItemDetailDrawer } from './ItemDetailDrawer';
import { PriceFormulaInspectorModal } from './PriceFormulaInspectorModal';
import { PriceFormulaHoverCard } from './PriceFormulaHoverCard';
import { QuoteAdoptionModal } from './QuoteAdoptionModal';
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
  onAdoptQuoteFromWorkbench?: (
    rfqId: string,
    quote: SupplierReplyDetail,
    item: BoqItem
  ) => void;
  onUpdateItems: (updated: BoqItem[]) => void;
  onUpdateGlobalParams: (params: GlobalPricingParams) => void;
  onNavigateToRfq?: (materialName: string) => void;
  onOpenSendEmailModal?: (prefill?: any) => void;
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
  onAdoptQuoteFromWorkbench,
  onUpdateItems,
  onUpdateGlobalParams,
  onNavigateToRfq,
  onOpenSendEmailModal,
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
  const matchRate = Math.round((matchedCount / items.length) * 100);

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
      ? 'py-4 px-3.5'
      : tableDensity === 'compact'
      ? 'py-2 px-2'
      : 'py-3 px-3';

  const cellTextPrimaryClass =
    tableDensity === 'comfortable'
      ? 'text-sm font-semibold'
      : 'text-xs font-semibold';

  const cellTextSecondaryClass =
    tableDensity === 'comfortable'
      ? 'text-xs'
      : tableDensity === 'compact'
      ? 'text-[10px]'
      : 'text-[11px]';

  const cellBadgeClass =
    tableDensity === 'comfortable'
      ? 'text-xs px-2 py-0.5'
      : tableDensity === 'compact'
      ? 'text-[9px] px-1 py-0.2'
      : 'text-[10px] px-1.5 py-0.2';

  const cellPriceClass =
    tableDensity === 'comfortable'
      ? 'text-base font-bold'
      : 'text-sm font-bold';

  return (
    <div className="space-y-6">
      {/* 组价台功能工具栏与实时指标 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-150">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
                <Calculator className="w-4 h-4" />
              </span>
              <span className="text-sm font-bold text-slate-900">
                强电工程量清单智能组价工作台
              </span>
            </div>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs text-slate-500">
              共 <strong>{items.length}</strong> 项工程子目 · 当地结算币种 <strong>DZD</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenSendEmailModal?.()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg shadow-2xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Mail className="w-3.5 h-3.5 text-blue-700" />
              <span>向供应商发邮件询价</span>
            </button>

            <button
              onClick={handleStartAiMatching}
              disabled={isMatchingRunning}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isMatchingRunning ? 'animate-spin' : ''}`} />
              <span>{isMatchingRunning ? '双库匹配计算中...' : '一键 AI 语义双库匹配'}</span>
            </button>
          </div>
        </div>

        {/* 4 核心指标卡 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-150">
            <span className="text-xs text-slate-500 block">标书组价总金额 (合价)</span>
            <div className="text-xl font-bold text-blue-900 font-mono tabular-nums mt-1">
              {totalBidAmountDzd.toLocaleString()} <span className="text-xs font-normal text-slate-600">DZD</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              折合约 ¥{(totalBidAmountDzd / globalParams.exchangeRates.CNY_TO_DZD).toLocaleString(undefined, { maximumFractionDigits: 0 })} 元
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-150">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">双库匹配覆盖率</span>
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                行业基准 ≥50%
              </span>
            </div>
            <div className="text-xl font-bold text-emerald-700 font-mono tabular-nums mt-1">
              {matchRate}%
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              已完成 {matchedCount} / {items.length} 项智能双库解析
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-150">
            <span className="text-xs text-slate-500 block">综合管理费 (10% 取费)</span>
            <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-1">
              {totalManagementCostDzd.toLocaleString()} <span className="text-xs font-normal text-slate-600">DZD</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              人材机直接费: {totalDirectCostDzd.toLocaleString()} DZD
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-150">
            <span className="text-xs text-slate-500 block">关税规则提示</span>
            <div className="text-xs font-semibold text-amber-800 mt-1">
              人民币加征 30% 关税
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
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
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              全部 ({items.length})
            </button>
            <button
              onClick={() => setStatusFilter('matched')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                statusFilter === 'matched'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              双库已匹配 ({matchedCount})
            </button>
            <button
              onClick={() => setStatusFilter('partial')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                statusFilter === 'partial'
                  ? 'bg-white text-amber-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              待询价 ({items.length - matchedCount})
            </button>
            <button
              onClick={() => setStatusFilter('has-rfq')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                statusFilter === 'has-rfq'
                  ? 'bg-white text-blue-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap className="w-3 h-3 text-amber-500" />
              <span>有新回函/待比选 ({itemsWithRfqCount})</span>
            </button>
          </div>
        </div>

        {/* 右侧动作群：语言切换 (已移除工作台页面多余的自适应、缩放与密度文本) */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* 语言切换 (满足历史数据库中文/法语双语维护要求) */}
          <div className="flex items-center gap-1.5">
            <Globe2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-500 hidden sm:inline">语言:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md text-xs">
              <button
                onClick={() => setLangMode('bilingual')}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  langMode === 'bilingual' ? 'bg-white font-semibold text-blue-700 shadow-2xs' : 'text-slate-600'
                }`}
              >
                中法双语
              </button>
              <button
                onClick={() => setLangMode('zh')}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  langMode === 'zh' ? 'bg-white font-semibold text-blue-700 shadow-2xs' : 'text-slate-600'
                }`}
              >
                中文
              </button>
              <button
                onClick={() => setLangMode('fr')}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  langMode === 'fr' ? 'bg-white font-semibold text-blue-700 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Français
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 清单组价表格 - 优化视觉层次 */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gradient-to-b from-slate-50 to-slate-100/80 border-b-2 border-slate-200 text-slate-700 font-semibold text-xs tracking-tight">
                <th className={`${cellPaddingClass} w-16 text-slate-600`}>序号</th>
                <th className={`${cellPaddingClass} min-w-[240px] text-slate-800`}>清单项目描述与规格</th>
                <th className={`${cellPaddingClass} w-20 text-right text-slate-600`}>工程量</th>
                <th className={`${cellPaddingClass} bg-blue-50/80 border-l border-r border-blue-200 text-blue-900 min-w-[190px]`}>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    <span>安装费定额匹配 (工日×6500)</span>
                  </div>
                </th>
                <th className={`${cellPaddingClass} bg-emerald-50/80 border-r border-emerald-200 text-emerald-900 min-w-[220px]`}>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>主材采购匹配 (原币/关税/产地)</span>
                  </div>
                </th>
                <th className={`${cellPaddingClass} text-right text-slate-800 min-w-[130px]`}>综合单价 (DZD)</th>
                <th className={`${cellPaddingClass} text-right text-slate-800 min-w-[140px]`}>综合合价 (DZD)</th>
                <th className={`${cellPaddingClass} text-center w-28 text-slate-600`}>操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => {
                const isMatched = item.matchStatus === 'matched';
                const matchingRfq = findMatchingRfq(item);
                const hasRfqReplies = !!(matchingRfq && (matchingRfq.supplierReplies?.length || 0) > 0);

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* 序号与状态 - 优化状态标识 */}
                    <td className={`${cellPaddingClass} align-top`}>
                      <span className={`${cellTextPrimaryClass} font-mono text-slate-600 font-medium`}>{item.itemNo}</span>
                      <div className="mt-1.5">
                        {isMatched ? (
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 rounded ${cellBadgeClass}`}>
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            已双匹配
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide text-amber-700 bg-amber-50 border border-amber-200 rounded ${cellBadgeClass}`}>
                            <AlertCircle className="w-2.5 h-2.5" />
                            待补询价
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 项目描述 - 优化排版层次 */}
                    <td className={`${cellPaddingClass} align-top`}>
                      {(langMode === 'bilingual' || langMode === 'zh') && (
                        <div className={`text-slate-900 font-medium leading-snug ${cellTextPrimaryClass}`}>
                          {item.descriptionZh}
                        </div>
                      )}
                      {(langMode === 'bilingual' || langMode === 'fr') && (
                        <div className={`text-slate-500 italic mt-1 leading-relaxed ${cellTextSecondaryClass}`}>
                          {item.descriptionFr}
                        </div>
                      )}
                      <div className="text-slate-600 mt-2 flex items-center gap-2 flex-wrap">
                        <span className={`font-mono text-slate-500 ${cellTextSecondaryClass}`}>规格: {item.spec}</span>
                        <span className="text-slate-300">·</span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide px-1.5 py-0.5 rounded ${
                          item.matchConfidence >= 90
                            ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                            : item.matchConfidence >= 70
                            ? 'text-blue-700 bg-blue-50 border border-blue-200'
                            : 'text-amber-700 bg-amber-50 border border-amber-200'
                        }`}>
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
                            <span className={`text-slate-500 truncate max-w-[130px] ${cellTextSecondaryClass}`}>
                              {item.selectedSupplierName}
                            </span>
                          </div>
                          <div className={`mt-1 font-mono font-semibold text-emerald-900 tabular-nums ${cellTextPrimaryClass}`}>
                            折算: {item.materialCostDzd.toLocaleString()} DZD
                          </div>

                          {/* 若存在供应商新回函报价，醒目提示一键比选采纳 */}
                          {hasRfqReplies && matchingRfq && (
                            <div className="mt-1.5 p-1.5 rounded-lg bg-amber-50/90 border border-amber-200/90 flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1 text-[11px] text-amber-900 font-medium truncate">
                                <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span className="truncate">
                                  收到 {matchingRfq.supplierReplies?.length} 家新报价
                                  {matchingRfq.isAdoptedToHistoryDb ? ' (已采纳)' : ' (可比选)'}
                                </span>
                              </div>
                              <button
                                onClick={() => setAdoptingRfqItem({ item, rfq: matchingRfq })}
                                className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer flex items-center gap-0.5"
                                title="横向比选回函并一键采纳回填"
                              >
                                <span>比选采纳</span>
                                <ChevronRight className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className={`text-amber-800 ${cellTextSecondaryClass}`}>
                          <span>历史库暂无直接匹配</span>
                          {hasRfqReplies && matchingRfq ? (
                            <div className="mt-1.5 p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1 text-[11px] text-emerald-900 font-medium truncate">
                                <Zap className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span className="truncate">
                                  已收到 {matchingRfq.supplierReplies?.length} 家回函
                                </span>
                              </div>
                              <button
                                onClick={() => setAdoptingRfqItem({ item, rfq: matchingRfq })}
                                className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer flex items-center gap-0.5"
                              >
                                <span>一键比选采纳</span>
                                <ChevronRight className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => onNavigateToRfq?.(item.descriptionZh)}
                              className="mt-1 block text-blue-700 underline font-medium cursor-pointer"
                            >
                              发起邮件询价采纳 →
                            </button>
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
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors cursor-pointer group"
                          title="鼠标悬停查看计算推导，点击查看完整数据血统"
                        >
                          <span className="font-serif italic font-bold">fx</span>
                          <span className="text-[9px] hidden lg:inline">公式</span>
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
                        className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-0.5 mt-0.5 cursor-pointer font-medium"
                        title="展开该项价格推导全过程"
                      >
                        <span>推导血统</span>
                        <ChevronRight className="w-2.5 h-2.5" />
                      </button>
                    </td>

                    {/* 综合合价 */}
                    <td className={`${cellPaddingClass} align-top text-right font-mono tabular-nums`}>
                      <div className={`font-bold text-blue-900 ${cellPriceClass}`}>
                        {item.totalPriceDzd.toLocaleString()}
                      </div>
                      <div className={`text-slate-500 ${cellTextSecondaryClass}`}>DZD</div>
                    </td>

                    {/* 操作 - 垂直排列优化工作流 */}
                    <td className={`${cellPaddingClass} align-top`}>
                      <div className="flex flex-col items-stretch gap-2 min-w-[110px]">
                        <button
                          onClick={() => setActiveItemForDetail(item)}
                          className="group inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-all duration-200 hover:shadow-sm cursor-pointer"
                          title="查看/调整双库测算明细"
                        >
                          <Eye className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                          <span>调参</span>
                        </button>

                        {hasRfqReplies && matchingRfq ? (
                          <button
                            onClick={() => setAdoptingRfqItem({ item, rfq: matchingRfq })}
                            className="group inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-all duration-200 hover:shadow-sm cursor-pointer"
                            title="比选各家回函并一键采纳"
                          >
                            <Zap className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
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
                            className="group inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-all duration-200 hover:shadow-sm cursor-pointer"
                            title="向供应商发送正式询价邮件"
                          >
                            <Mail className="w-3.5 h-3.5 text-amber-700 group-hover:scale-110 transition-transform" />
                            <span>询价</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 表格底部汇总行 - 优化数据显示层次 */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 px-4 py-3 border-t-2 border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 text-slate-600">
              <span className="flex items-center gap-1">
                已统计 <strong className="text-slate-900 font-semibold">{filteredItems.length}</strong> 项工程量清单
              </span>
              <span className="text-slate-300">·</span>
              <span className="flex items-center gap-1">
                定额库人工固定基数: <strong className="font-mono text-slate-900 tabular-nums font-semibold">{globalParams.laborBaseRate} DZD</strong>
              </span>
              <span className="text-slate-300">·</span>
              <span className="flex items-center gap-1">
                综合管理费费率: <strong className="font-mono text-slate-900 tabular-nums font-semibold">{globalParams.managementRate * 100}%</strong>
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
    </div>
  );
};
