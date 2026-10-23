import React from 'react';
import { BoqItem, GlobalPricingParams } from '../types/pricing';
import {
  Calculator,
  ShieldCheck,
  TrendingUp,
  ExternalLink,
  Info,
  Layers,
  ArrowRight,
  Zap,
} from 'lucide-react';

interface PriceFormulaHoverCardProps {
  item: BoqItem;
  globalParams: GlobalPricingParams;
  anchorRect: DOMRect | null;
  onOpenFullInspector?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const PriceFormulaHoverCard: React.FC<PriceFormulaHoverCardProps> = ({
  item,
  globalParams,
  anchorRect,
  onOpenFullInspector,
  onMouseEnter,
  onMouseLeave,
}) => {
  if (!anchorRect) return null;

  // 计算位置：默认定位在单元格左上方或正上方，防止跑出屏幕视口
  const cardWidth = 380;
  const spaceAbove = anchorRect.top;
  const showBelow = spaceAbove < 320; // 若上方空间不足，显示在下方

  // 水平定位：尽量对齐触发元素右侧或偏左
  let left = anchorRect.right - cardWidth;
  if (left < 16) left = 16;
  if (left + cardWidth > window.innerWidth - 16) {
    left = window.innerWidth - cardWidth - 16;
  }

  const top = showBelow
    ? anchorRect.bottom + 8
    : Math.max(16, anchorRect.top - 8);

  // 1. 拆解单价构成
  const origPrice = item.materialPriceOriginal;
  const currency = item.materialCurrency;
  let rateToDzd = 1;
  if (currency === 'EUR') rateToDzd = globalParams.exchangeRates.EUR_TO_DZD;
  else if (currency === 'USD') rateToDzd = globalParams.exchangeRates.USD_TO_DZD;
  else if (currency === 'CNY') rateToDzd = globalParams.exchangeRates.CNY_TO_DZD;

  const basePurchaseDzd = Math.round(origPrice * rateToDzd * 100) / 100;
  const freightRatePct = Math.round((globalParams.freightRate + globalParams.portMiscRate) * 100); // 9%
  const tariffPct = item.applyTariff ? Math.round(globalParams.cnyTariffRate * 100) : 0; // 30% or 0%

  const materialSubtotal = item.materialCostDzd;
  const installSubtotal = item.installationCostDzd;
  const directCost = item.directCostDzd;
  const mgmtRatePct = Math.round(globalParams.managementRate * 100); // 10%
  const mgmtCost = item.managementCostDzd;
  const unitPrice = item.unitPriceDzd;

  // 主材单价推导数学表达式简写
  // [原币 × 汇率] × (1 + 关税) × (1 + 运杂)
  const tariffMultiplierStr = item.applyTariff ? `(1 + ${tariffPct}%)` : '1.00';
  const freightMultiplierStr = `(1 + ${freightRatePct}%)`;

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'fixed',
        left: `${left}px`,
        top: showBelow ? `${top}px` : undefined,
        bottom: showBelow ? undefined : `${window.innerHeight - top}px`,
        width: `${cardWidth}px`,
      }}
      className="z-50 bg-white rounded-xl shadow-2xl border border-blue-200/90 p-4 text-xs font-sans text-slate-800 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-sm pointer-events-auto"
    >
      {/* 头部：清单子项标识与单价总览 */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-150">
        <div className="flex items-center gap-1.5">
          <span className="p-1 rounded bg-blue-100 text-blue-700">
            <Calculator className="w-3.5 h-3.5" />
          </span>
          <span className="font-bold text-slate-900 truncate max-w-[210px]">
            {item.itemNo} 综合单价测算逻辑
          </span>
        </div>
        <div className="text-right">
          <span className="font-mono font-black text-blue-900 text-sm">
            {unitPrice.toLocaleString()} DZD
          </span>
        </div>
      </div>

      {/* 核心推导公式标牌 (高亮可视化黑盒公式) */}
      <div className="my-2.5 p-2.5 rounded-lg bg-blue-50/80 border border-blue-200 font-mono text-[11px] text-blue-950 space-y-1.5">
        <div className="text-[10px] text-blue-700 font-bold flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-blue-600" />
            <span>核心计价推导公式 (可视化透明模型)</span>
          </span>
          <span className="text-[9px] bg-blue-100/80 px-1.5 py-0.5 rounded text-blue-800 font-semibold">
            实时代入
          </span>
        </div>
        <div className="bg-white p-2 rounded-lg border border-blue-200/60 leading-relaxed font-semibold shadow-2xs space-y-1">
          <div className="text-slate-900 font-bold">
            [原币 × 汇率] × (1+关税) × (1+运费) = 主材到岸价
          </div>
          <div className="text-blue-900 text-[10px]">
            [主材到岸价 + 人材机安装定额] × (1 + {mgmtRatePct}% 管理取费) = <strong>最终综合单价</strong>
          </div>
        </div>
      </div>

      {/* 分项数值代入分解 */}
      <div className="space-y-1.5 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-150 font-mono">
        {/* ① 主材到岸加税价 */}
        <div className="flex items-center justify-between text-slate-700">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>主材到岸CIF加税:</span>
          </span>
          <span className="font-bold text-slate-900">
            {materialSubtotal.toLocaleString()} DZD
          </span>
        </div>
        <div className="text-[10px] text-slate-500 pl-2.5 space-y-0.5">
          <div>• 原币出厂: {origPrice.toLocaleString()} {currency} × {rateToDzd} = {basePurchaseDzd.toLocaleString()} DZD</div>
          <div>
            • 关税与运杂: × {tariffMultiplierStr} × {freightMultiplierStr}
            {item.applyTariff ? (
              <span className="text-amber-700 font-semibold ml-1">(CNY加30%税)</span>
            ) : (
              <span className="text-emerald-700 font-semibold ml-1">(免关税)</span>
            )}
          </div>
        </div>

        {/* ② 安装费定额 */}
        <div className="flex items-center justify-between text-slate-700 pt-1 border-t border-slate-200">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>安装费定额 (人材机):</span>
          </span>
          <span className="font-bold text-slate-900">
            {installSubtotal.toLocaleString()} DZD
          </span>
        </div>
        <div className="text-[10px] text-slate-500 pl-2.5">
          • 人工({item.laborDays}工日×6500) + 辅材机械合价
        </div>

        {/* ③ 人材机直接费小计 */}
        <div className="flex items-center justify-between text-slate-800 pt-1 border-t border-slate-200 font-semibold">
          <span>人材机直接费小计:</span>
          <span className="text-slate-900">
            {directCost.toLocaleString()} DZD
          </span>
        </div>

        {/* ④ 综合管理费 */}
        <div className="flex items-center justify-between text-slate-600 text-[10px]">
          <span>+ 综合管理费 ({mgmtRatePct}% 取费率):</span>
          <span className="text-slate-800">
            +{mgmtCost.toLocaleString()} DZD
          </span>
        </div>
      </div>

      {/* 底部：下钻审计按钮 */}
      <div className="mt-2.5 pt-2 border-t border-slate-150 flex items-center justify-between">
        <span className="text-[10px] text-slate-400">
          来源: {item.selectedSupplierName || '基准库定额匹配'}
        </span>
        {onOpenFullInspector && (
          <button
            type="button"
            onClick={onOpenFullInspector}
            className="text-[11px] font-bold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>完整血统审计</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
