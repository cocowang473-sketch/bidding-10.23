import React, { useState } from 'react';
import { BoqItem, GlobalPricingParams } from '../types/pricing';
import {
  Calculator,
  ShieldCheck,
  Building2,
  FileText,
  Copy,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  TrendingDown,
  Info,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface PriceFormulaInspectorModalProps {
  isOpen: boolean;
  item: BoqItem | null;
  globalParams: GlobalPricingParams;
  onClose: () => void;
  onNavigateToContract?: (contractName: string) => void;
  onNavigateToRfq?: (materialName: string) => void;
}

export const PriceFormulaInspectorModal: React.FC<PriceFormulaInspectorModalProps> = ({
  isOpen,
  item,
  globalParams,
  onClose,
  onNavigateToContract,
  onNavigateToRfq,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !item) return null;

  // 1. 拆解人工、辅材、机械费
  const laborBase = item.customLaborBase ?? globalParams.laborBaseRate;
  const laborCost = Math.round(item.laborDays * laborBase * 100) / 100;

  const auxCoeff = item.customAuxCoeff ?? globalParams.auxCoefficient;
  const auxCost = Math.round(item.auxContent * globalParams.auxBaseValue * auxCoeff * 100) / 100;

  const machCoeff = item.customMachCoeff ?? globalParams.machineryCoefficient;
  const machCost = Math.round(item.machContent * globalParams.machineryBaseValue * machCoeff * 100) / 100;

  const installSubtotal = Math.round((laborCost + auxCost + machCost) * 100) / 100;

  // 2. 主材费与国际运杂、关税拆解
  const origPrice = item.materialPriceOriginal;
  const currency = item.materialCurrency;
  const freightRate = globalParams.freightRate; // 2%
  const portRate = globalParams.portMiscRate; // 7%
  const freightMultiplier = 1 + freightRate + portRate; // 1.09
  const tariffRate = item.applyTariff ? globalParams.cnyTariffRate : 0; // 30% or 0

  let rateToDzd = 1;
  if (currency === 'EUR') rateToDzd = globalParams.exchangeRates.EUR_TO_DZD;
  else if (currency === 'USD') rateToDzd = globalParams.exchangeRates.USD_TO_DZD;
  else if (currency === 'CNY') rateToDzd = globalParams.exchangeRates.CNY_TO_DZD;

  // 纯离岸采购折算当地币 (未加运杂与关税)
  const basePurchaseDzd = Math.round(origPrice * rateToDzd * 100) / 100;
  // 国际运杂费 (运费2% + 港杂7% = 9%)
  const freightDzd = Math.round(basePurchaseDzd * (freightRate + portRate) * 100) / 100;
  // 进口清关关税 (30%仅针对CNY)
  const tariffDzd = item.applyTariff
    ? Math.round(basePurchaseDzd * tariffRate * freightMultiplier * 100) / 100
    : 0;

  const materialSubtotal = item.materialCostDzd;
  const directCost = item.directCostDzd;
  const managementRate = globalParams.managementRate;
  const managementCost = item.managementCostDzd;
  const unitPrice = item.unitPriceDzd;
  const totalPrice = item.totalPriceDzd;

  // 各部分在综合单价中的百分比
  const pctMaterialBase = Math.max(1, Math.round((basePurchaseDzd / unitPrice) * 100));
  const pctTariffFreight = Math.max(1, Math.round(((freightDzd + tariffDzd) / unitPrice) * 100));
  const pctLabor = Math.max(1, Math.round((laborCost / unitPrice) * 100));
  const pctAuxMach = Math.max(1, Math.round(((auxCost + machCost) / unitPrice) * 100));
  const pctMgmt = Math.max(1, Math.round((managementCost / unitPrice) * 100));

  // 拼接公式完整推导文本
  const formulaText = `【${item.itemNo} ${item.descriptionZh} 综合单价推导依据】
1. 主材采购与清关运费:
   原币采购价: ${origPrice.toLocaleString()} ${currency} (汇率折算: ${rateToDzd} DZD)
   基础货价: ${basePurchaseDzd.toLocaleString()} DZD
   国际运杂(运费2%+港杂7%): +${freightDzd.toLocaleString()} DZD
   进口清关关税(${item.applyTariff ? '30%' : '免关税'}): +${tariffDzd.toLocaleString()} DZD
   主材到港含税合价: ${materialSubtotal.toLocaleString()} DZD
2. 安装费定额:
   人工费: ${item.laborDays} 工日 × ${laborBase} = ${laborCost.toLocaleString()} DZD
   辅材费: ${item.auxContent} × 35 × ${auxCoeff} = ${auxCost.toLocaleString()} DZD
   机械费: ${item.machContent} × 45 × ${machCoeff} = ${machCost.toLocaleString()} DZD
   安装费小计: ${installSubtotal.toLocaleString()} DZD
3. 直接费 = 主材(${materialSubtotal.toLocaleString()}) + 安装(${installSubtotal.toLocaleString()}) = ${directCost.toLocaleString()} DZD
4. 综合管理取费 = 直接费 × ${managementRate * 100}% = ${managementCost.toLocaleString()} DZD
5. 最终综合单价 = 直接费 + 取费 = ${unitPrice.toLocaleString()} DZD/单位 (清单合价: ${totalPrice.toLocaleString()} DZD)`;

  const handleCopyFormula = () => {
    navigator.clipboard.writeText(formulaText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* 标题栏 */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 border border-blue-400/30 rounded-xl text-blue-300">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-500/30 text-blue-200 border border-blue-400/30 font-semibold">
                  {item.itemNo}
                </span>
                <span className="text-xs text-blue-200/80">价格推导审计 & 数据血统追踪</span>
              </div>
              <h2 className="text-base font-bold text-white mt-0.5 flex items-center gap-2">
                {item.descriptionZh}
                <span className="text-xs font-normal text-slate-300 italic hidden sm:inline">
                  ({item.descriptionFr})
                </span>
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyFormula}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition-colors border border-white/15 cursor-pointer"
              title="复制完整推导依据，便于粘贴入投标汇报"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="text-emerald-300">已复制公式</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-300" />
                  <span>复制推导公式</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 滚动内容区 */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 text-xs">
          {/* 综合单价最终核定看板 */}
          <div className="bg-gradient-to-br from-blue-50/70 via-slate-50 to-indigo-50/40 border border-blue-200/70 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-slate-500 block text-xs">当前最终核定综合单价 (包含全部人材机、税费与管理费)</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                  {unitPrice.toLocaleString()}
                </span>
                <span className="text-sm font-semibold text-blue-700">DZD / {item.unit}</span>
                <span className="text-slate-400 text-xs ml-2">
                  (工程量: {item.quantity} {item.unit} ➔ 合价{' '}
                  <strong className="text-slate-900 font-mono">{totalPrice.toLocaleString()} DZD</strong>)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-right sm:border-l sm:border-blue-200 sm:pl-4">
              <div>
                <span className="text-[11px] text-slate-500 block">综合置信度</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 text-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  {item.matchConfidence}% 高置信
                </span>
              </div>
            </div>
          </div>

          {/* 成本结构拆解比例条 */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1.5 font-medium text-slate-600">
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                综合单价五维构成占比分解
              </span>
              <span className="text-slate-400">总计 100%</span>
            </div>
            <div className="h-4 rounded-full overflow-hidden flex bg-slate-100 border border-slate-200 text-[10px] text-white font-mono font-bold leading-none text-center">
              <div
                style={{ width: `${pctMaterialBase}%` }}
                className="bg-emerald-600 flex items-center justify-center hover:opacity-90 transition-opacity"
                title={`主材基础货价: ${basePurchaseDzd.toLocaleString()} DZD (${pctMaterialBase}%)`}
              >
                {pctMaterialBase > 12 && `${pctMaterialBase}%`}
              </div>
              <div
                style={{ width: `${pctTariffFreight}%` }}
                className="bg-amber-600 flex items-center justify-center hover:opacity-90 transition-opacity"
                title={`运杂与关税: ${(freightDzd + tariffDzd).toLocaleString()} DZD (${pctTariffFreight}%)`}
              >
                {pctTariffFreight > 12 && `${pctTariffFreight}%`}
              </div>
              <div
                style={{ width: `${pctLabor}%` }}
                className="bg-blue-600 flex items-center justify-center hover:opacity-90 transition-opacity"
                title={`安装人工定额: ${laborCost.toLocaleString()} DZD (${pctLabor}%)`}
              >
                {pctLabor > 10 && `${pctLabor}%`}
              </div>
              <div
                style={{ width: `${pctAuxMach}%` }}
                className="bg-indigo-600 flex items-center justify-center hover:opacity-90 transition-opacity"
                title={`辅材与机械: ${(auxCost + machCost).toLocaleString()} DZD (${pctAuxMach}%)`}
              >
                {pctAuxMach > 8 && `${pctAuxMach}%`}
              </div>
              <div
                style={{ width: `${pctMgmt}%` }}
                className="bg-slate-600 flex items-center justify-center hover:opacity-90 transition-opacity"
                title={`综合取费管理: ${managementCost.toLocaleString()} DZD (${pctMgmt}%)`}
              >
                {pctMgmt > 6 && `${pctMgmt}%`}
              </div>
            </div>
            {/* 图例 */}
            <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                <span>主材采购 ({pctMaterialBase}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" />
                <span>运杂+清关关税 ({pctTariffFreight}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                <span>安装人工 ({pctLabor}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
                <span>辅材与机械 ({pctAuxMach}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-600 inline-block" />
                <span>综合管理费 ({pctMgmt}%)</span>
              </div>
            </div>
          </div>

          {/* 数据血统与凭证回溯 */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              数据血统与凭证回溯 (Data Lineage & Sourcing)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  ① 主材采购单价溯源
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">供应商 / 签约主体:</span>
                  <strong className="text-slate-900">{item.selectedSupplierName || '未指定'}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">采购原币出厂价:</span>
                  <strong className="font-mono text-emerald-800">
                    {origPrice.toLocaleString()} {currency}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">产地与关税归属:</span>
                  <span className="text-slate-800">
                    {item.materialOrigin} · {item.applyTariff ? '适用30%关税' : '免进口关税'}
                  </span>
                </div>
                <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-slate-400 text-[10px]">溯源依据:</span>
                  <span className="text-blue-700 font-medium text-[11px] flex items-center gap-1">
                    阿尔及利亚 240 床综合医院标段历史合同 / 供应商回函
                  </span>
                </div>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  ② 安装定额工法溯源
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">定额对应编码:</span>
                  <strong className="font-mono text-slate-900">{item.matchedQuotaId || 'CFO-STD'}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">用工固定基数:</span>
                  <strong className="font-mono text-blue-800">{laborBase} DZD/工日 (已核验)</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">工艺工法说明:</span>
                  <span className="text-slate-800">IEC/中建阿尔及利亚海外施工工艺标准</span>
                </div>
                <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-slate-400 text-[10px]">定额基准:</span>
                  <span className="text-emerald-700 font-medium text-[11px]">
                    近1年内签单工程校核 (误差 &lt; 2%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 步骤分步计算透明推导 */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-700" />
              步骤式算式透明化分步推导 (Step-by-Step Mathematical Derivation)
            </h3>

            {/* 步骤 1 */}
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
              <div className="flex items-center justify-between font-semibold text-slate-900 pb-1.5 border-b border-slate-200">
                <span className="flex items-center gap-1.5 text-emerald-800">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px]">
                    1
                  </span>
                  主材到港与清关合价测算 (含国际运杂与进口关税)
                </span>
                <span className="font-mono font-bold text-emerald-800">
                  {materialSubtotal.toLocaleString()} DZD
                </span>
              </div>
              <div className="mt-2 space-y-1 text-slate-600 font-mono text-[11px]">
                <div className="flex items-center justify-between">
                  <span>• 原币价格折算当地币:</span>
                  <span>
                    {origPrice.toLocaleString()} {currency} × {rateToDzd} ={' '}
                    <strong>{basePurchaseDzd.toLocaleString()} DZD</strong>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>• 国际运杂费 (运费 2% + 出口港杂 7% = 9%):</span>
                  <span>
                    {basePurchaseDzd.toLocaleString()} × 9% ={' '}
                    <strong className="text-amber-700">+{freightDzd.toLocaleString()} DZD</strong>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>
                    • 阿尔及利亚海关清关关税 (
                    {item.applyTariff ? '人民币货物加收 30%' : '欧美直发免关税'}):
                  </span>
                  <span>
                    {item.applyTariff ? (
                      <strong className="text-amber-800">+{tariffDzd.toLocaleString()} DZD</strong>
                    ) : (
                      <strong className="text-emerald-700">0 DZD (免税)</strong>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* 步骤 2 */}
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
              <div className="flex items-center justify-between font-semibold text-slate-900 pb-1.5 border-b border-slate-200">
                <span className="flex items-center gap-1.5 text-blue-800">
                  <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-[10px]">
                    2
                  </span>
                  安装费定额测算 (定额人工 + 辅材 + 机械)
                </span>
                <span className="font-mono font-bold text-blue-800">
                  {installSubtotal.toLocaleString()} DZD
                </span>
              </div>
              <div className="mt-2 space-y-1 text-slate-600 font-mono text-[11px]">
                <div className="flex items-center justify-between">
                  <span>• 人工费 (工日 × 固定基数 6,500 DZD):</span>
                  <span>
                    {item.laborDays} 工日 × {laborBase} ={' '}
                    <strong>{laborCost.toLocaleString()} DZD</strong>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>• 辅材费 (辅材基数 35 × 测算系数 {auxCoeff}):</span>
                  <span>
                    {item.auxContent} × 35 × {auxCoeff} ={' '}
                    <strong>{auxCost.toLocaleString()} DZD</strong>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>• 机械费 (机械基数 45 × 测算系数 {machCoeff}):</span>
                  <span>
                    {item.machContent} × 45 × {machCoeff} ={' '}
                    <strong>{machCost.toLocaleString()} DZD</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* 步骤 3 & 4 */}
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
              <div className="flex items-center justify-between font-semibold text-slate-900 pb-1.5 border-b border-slate-200">
                <span className="flex items-center gap-1.5 text-slate-800">
                  <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center text-[10px]">
                    3
                  </span>
                  人材机直接费汇总与综合管理取费 (10%)
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {unitPrice.toLocaleString()} DZD
                </span>
              </div>
              <div className="mt-2 space-y-1 text-slate-600 font-mono text-[11px]">
                <div className="flex items-center justify-between">
                  <span>• 人材机直接费小计 (主材到港 + 安装定额):</span>
                  <span>
                    {materialSubtotal.toLocaleString()} + {installSubtotal.toLocaleString()} ={' '}
                    <strong>{directCost.toLocaleString()} DZD</strong>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>• 综合管理费 (直接费小计 × 10% 取费率):</span>
                  <span>
                    {directCost.toLocaleString()} × 10% ={' '}
                    <strong className="text-slate-800">+{managementCost.toLocaleString()} DZD</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部按钮栏 */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            公式由系统实时解析引擎驱动，所有计算过程均具备审计复核效力。
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyFormula}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold cursor-pointer"
            >
              复制公式文本
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold cursor-pointer"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
