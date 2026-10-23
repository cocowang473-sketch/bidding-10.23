import React, { useState } from 'react';
import { BoqItem, GlobalPricingParams, MaterialComponent, InstallationQuotaComponent } from '../types/pricing';
import { X, Check, Calculator, Building2, Truck, RefreshCw, AlertTriangle, Layers } from 'lucide-react';

interface ItemDetailDrawerProps {
  item: BoqItem | null;
  globalParams: GlobalPricingParams;
  allMaterials: MaterialComponent[];
  allQuotas: InstallationQuotaComponent[];
  onClose: () => void;
  onUpdateItem: (updated: BoqItem) => void;
}

export const ItemDetailDrawer: React.FC<ItemDetailDrawerProps> = ({
  item,
  globalParams,
  allMaterials,
  allQuotas,
  onClose,
  onUpdateItem,
}) => {
  if (!item) return null;

  const [laborDays, setLaborDays] = useState(item.laborDays);
  const [auxContent, setAuxContent] = useState(item.auxContent);
  const [machContent, setMachContent] = useState(item.machContent);
  const [customAuxCoeff, setCustomAuxCoeff] = useState(item.customAuxCoeff ?? globalParams.auxCoefficient);
  const [customMachCoeff, setCustomMachCoeff] = useState(item.customMachCoeff ?? globalParams.machineryCoefficient);
  const [selectedMaterialId, setSelectedMaterialId] = useState(item.matchedMaterialId || '');
  const [currency, setCurrency] = useState(item.materialCurrency);
  const [origin, setOrigin] = useState(item.materialOrigin);
  const [priceOriginal, setPriceOriginal] = useState(item.materialPriceOriginal);
  const [applyTariff, setApplyTariff] = useState(item.applyTariff);

  const matchedMaterial = allMaterials.find((m) => m.id === selectedMaterialId);
  const matchedQuota = allQuotas.find((q) => q.id === item.matchedQuotaId);

  const handleMaterialChange = (matId: string) => {
    setSelectedMaterialId(matId);
    const found = allMaterials.find((m) => m.id === matId);
    if (found) {
      setCurrency(found.currency);
      setOrigin(found.defaultOrigin);
      setPriceOriginal(found.basePrice);
      setApplyTariff(found.currency === 'CNY');
    }
  };

  const handleSupplierSelect = (supplier: any) => {
    setPriceOriginal(supplier.unitPrice);
    setCurrency(supplier.currency);
    setOrigin(supplier.originCountry);
    setApplyTariff(supplier.currency === 'CNY');
  };

  const handleSave = () => {
    const updated: BoqItem = {
      ...item,
      laborDays,
      auxContent,
      machContent,
      customAuxCoeff,
      customMachCoeff,
      matchedMaterialId: selectedMaterialId,
      materialPriceOriginal: priceOriginal,
      materialCurrency: currency,
      materialOrigin: origin,
      applyTariff: currency === 'CNY',
    };
    onUpdateItem(updated);
    onClose();
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white shadow-2xl border-l border-slate-200 flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
              {item.itemNo}
            </span>
            <span className="text-xs text-slate-500 font-medium">双库匹配与组价明细</span>
          </div>
          <h3 className="text-sm font-bold text-slate-900 mt-1">
            {item.descriptionZh}
          </h3>
          <p className="text-xs text-slate-500 italic mt-0.5">
            {item.descriptionFr}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
        {/* 基本规格与量 */}
        <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 grid grid-cols-3 gap-3">
          <div>
            <span className="text-slate-500 block">规格型号</span>
            <span className="font-semibold text-slate-800">{item.spec}</span>
          </div>
          <div>
            <span className="text-slate-500 block">工程量</span>
            <span className="font-semibold text-slate-800 font-mono tabular-nums">{item.quantity} {item.unit}</span>
          </div>
          <div>
            <span className="text-slate-500 block">AI 匹配置信度</span>
            <span className="font-semibold text-emerald-700 font-mono tabular-nums">{item.matchConfidence}% 语义匹配</span>
          </div>
        </div>

        {/* 1. 安装费（定额库）匹配参数 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <Calculator className="w-4 h-4 text-blue-600" />
              <span>1. 安装费（定额含量）计算明细</span>
            </div>
            <span className="text-slate-500">
              对应定额: {matchedQuota ? matchedQuota.quotaCode : '未关联'}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 bg-blue-50/50 rounded border border-blue-100">
              <div>
                <span className="font-semibold text-slate-800">人工费计算 (固定基数 6500)</span>
                <p className="text-slate-500 text-[11px]">
                  公式: 人工含量 ({laborDays} 工日) × {globalParams.laborBaseRate} DZD = <span className="font-bold text-blue-700 font-mono tabular-nums">{item.laborCostDzd.toLocaleString()} DZD</span>
                </p>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.01"
                  value={laborDays}
                  onChange={(e) => setLaborDays(Number(e.target.value) || 0)}
                  className="w-20 px-2 py-1 text-right font-mono border rounded bg-white"
                />
                <span className="text-slate-500">工日</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <span className="font-semibold text-slate-800 block">辅材费参数调整</span>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-slate-500">基础基数(35)</span>
                  <input
                    type="number"
                    value={auxContent}
                    onChange={(e) => setAuxContent(Number(e.target.value) || 0)}
                    className="w-16 px-1.5 py-0.5 text-right font-mono border rounded bg-white"
                  />
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-slate-500">测算系数(如1.1)</span>
                  <input
                    type="number"
                    step="0.05"
                    value={customAuxCoeff}
                    onChange={(e) => setCustomAuxCoeff(Number(e.target.value) || 0)}
                    className="w-16 px-1.5 py-0.5 text-right font-mono border rounded bg-white"
                  />
                </div>
                <div className="mt-1 pt-1 border-t text-right text-slate-700 font-mono">
                  小计: {item.auxCostDzd} DZD
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <span className="font-semibold text-slate-800 block">机械费参数调整</span>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-slate-500">机械基数(45)</span>
                  <input
                    type="number"
                    value={machContent}
                    onChange={(e) => setMachContent(Number(e.target.value) || 0)}
                    className="w-16 px-1.5 py-0.5 text-right font-mono border rounded bg-white"
                  />
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-slate-500">机械系数(如1.1)</span>
                  <input
                    type="number"
                    step="0.05"
                    value={customMachCoeff}
                    onChange={(e) => setCustomMachCoeff(Number(e.target.value) || 0)}
                    className="w-16 px-1.5 py-0.5 text-right font-mono border rounded bg-white"
                  />
                </div>
                <div className="mt-1 pt-1 border-t text-right text-slate-700 font-mono">
                  小计: {item.machCostDzd} DZD
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. 主材费（采购价格）匹配与汇率关税折算 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <Truck className="w-4 h-4 text-emerald-600" />
              <span>2. 主材费匹配与国际汇率关税规则</span>
            </div>
            <span className="text-slate-500">
              匹配材料: {matchedMaterial ? matchedMaterial.code : '未绑定'}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-slate-600 block mb-1">关联主材库标准项：</label>
              <select
                value={selectedMaterialId}
                onChange={(e) => handleMaterialChange(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
              >
                <option value="">-- 选择或切换主材项 --</option>
                {allMaterials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code} - {m.standardNameZh} ({m.standardNameFr})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-slate-500 block">采购单价 (原币)</span>
                <input
                  type="number"
                  value={priceOriginal}
                  onChange={(e) => setPriceOriginal(Number(e.target.value) || 0)}
                  className="w-full px-2 py-1 border rounded bg-white font-mono"
                />
              </div>
              <div>
                <span className="text-slate-500 block">支付币种</span>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as any)}
                  className="w-full px-2 py-1 border rounded bg-white"
                >
                  <option value="CNY">CNY (人民币)</option>
                  <option value="EUR">EUR (欧元)</option>
                  <option value="USD">USD (美元)</option>
                  <option value="DZD">DZD (阿尔及利亚)</option>
                </select>
              </div>
              <div>
                <span className="text-slate-500 block">产地</span>
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full px-2 py-1 border rounded bg-white"
                />
              </div>
            </div>

            {/* 国际关税规则提示 */}
            <div className={`p-3 rounded-lg border text-xs ${
              currency === 'CNY'
                ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
            }`}>
              <div className="flex items-center gap-1.5 font-semibold">
                {currency === 'CNY' ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                )}
                <span>
                  {currency === 'CNY'
                    ? '国际清关规则：中国原产地设备采购需计入 30% 进口关税'
                    : '国际清关规则：欧洲 / 美洲原产地设备适用免征进口关税 (0%)'}
                </span>
              </div>
              <p className="mt-1 text-[11px] opacity-90">
                运杂费率：国际海运 2% + 出口港杂 7%。当地货币折算汇率：
                1 {currency} = {
                  currency === 'CNY'
                    ? globalParams.exchangeRates.CNY_TO_DZD
                    : currency === 'EUR'
                    ? globalParams.exchangeRates.EUR_TO_DZD
                    : currency === 'USD'
                    ? globalParams.exchangeRates.USD_TO_DZD
                    : 1
                } DZD。
              </p>
            </div>

            {/* 供应商比价与留存 */}
            {matchedMaterial && matchedMaterial.supplierQuotes.length > 0 && (
              <div>
                <span className="font-semibold text-slate-800 block mb-1.5">
                  可选供应商报价（系统默认推荐最低价，人工可自由选用）：
                </span>
                <div className="space-y-1.5">
                  {matchedMaterial.supplierQuotes.map((sq) => {
                    const isSelected = sq.unitPrice === priceOriginal && sq.currency === currency;
                    return (
                      <div
                        key={sq.supplierId}
                        onClick={() => handleSupplierSelect(sq)}
                        className={`p-2 rounded border cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-blue-50 border-blue-400 font-medium'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-900">{sq.supplierName}</span>
                            {sq.isLowestPrice && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 text-emerald-800">
                                最低价
                              </span>
                            )}
                          </div>
                          <span className="text-slate-400 text-[11px]">
                            产地: {sq.originCountry} · 交期: {sq.leadTimeDays}天 · 报价日: {sq.quotedDate}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-sm font-bold text-slate-800 tabular-nums">
                            {sq.unitPrice.toLocaleString()} {sq.currency}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. 综合取费与最终报价汇总 */}
        <div className="bg-slate-900 text-white p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-slate-400">安装费直接费小计:</span>
            <span className="font-mono font-semibold tabular-nums">{item.installationCostDzd.toLocaleString()} DZD</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-slate-400">主材费折算小计 (含税运):</span>
            <span className="font-mono font-semibold tabular-nums">{item.materialCostDzd.toLocaleString()} DZD</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-slate-400">综合取费 (10% 管理费):</span>
            <span className="font-mono font-semibold tabular-nums">{item.managementCostDzd.toLocaleString()} DZD</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-sm font-bold text-amber-400">综合单价:</span>
            <span className="text-lg font-bold font-mono text-amber-400 tabular-nums">
              {item.unitPriceDzd.toLocaleString()} DZD / {item.unit}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">合价 (× {item.quantity} {item.unit}):</span>
            <span className="text-base font-bold font-mono text-white tabular-nums">
              {item.totalPriceDzd.toLocaleString()} DZD
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
        >
          取消
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
        >
          <Check className="w-3.5 h-3.5" />
          <span>保存并应用重算</span>
        </button>
      </div>
    </div>
  );
};
