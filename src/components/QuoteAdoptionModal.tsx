import React, { useState } from 'react';
import {
  BoqItem,
  GlobalPricingParams,
  RfqInquiryRecord,
  SupplierReplyDetail,
  CurrencyType,
} from '../types/pricing';
import {
  Sparkles,
  Check,
  CheckCircle2,
  TrendingDown,
  Building2,
  Clock,
  Truck,
  ShieldCheck,
  X,
  FileSpreadsheet,
  AlertCircle,
  ArrowRight,
  Award,
  Zap,
} from 'lucide-react';

interface QuoteAdoptionModalProps {
  isOpen: boolean;
  item: BoqItem | null;
  rfqRecord: RfqInquiryRecord | null;
  globalParams: GlobalPricingParams;
  onClose: () => void;
  onAdoptQuote: (rfqId: string, quote: SupplierReplyDetail, targetBoqItem: BoqItem) => void;
}

export const QuoteAdoptionModal: React.FC<QuoteAdoptionModalProps> = ({
  isOpen,
  item,
  rfqRecord,
  globalParams,
  onClose,
  onAdoptQuote,
}) => {
  const [selectedQuoteIndex, setSelectedQuoteIndex] = useState<number>(0);
  const [isAdopting, setIsAdopting] = useState(false);

  if (!isOpen || !item || !rfqRecord) return null;

  const replies = rfqRecord.supplierReplies || [];

  // 计算折算到 DZD 当地货币到港含税价 (包括汇率、运费2%、港杂7%、关税30%)
  const calculateLandedMaterialCostDzd = (price: number, currency: CurrencyType): number => {
    const freightAndPort = 1 + globalParams.freightRate + globalParams.portMiscRate;
    if (currency === 'EUR') {
      return Math.round(price * globalParams.exchangeRates.EUR_TO_DZD * freightAndPort);
    }
    if (currency === 'USD') {
      return Math.round(price * globalParams.exchangeRates.USD_TO_DZD * freightAndPort);
    }
    if (currency === 'CNY') {
      const tariff = 1 + globalParams.cnyTariffRate;
      return Math.round(price * globalParams.exchangeRates.CNY_TO_DZD * tariff * freightAndPort);
    }
    return price;
  };

  // 预估如果采纳该报价，新的综合单价 (DZD)
  const previewNewUnitPriceDzd = (quote: SupplierReplyDetail): number => {
    const landedMaterial = calculateLandedMaterialCostDzd(quote.quotedPrice, quote.currency);
    const directCost = item.installationCostDzd + landedMaterial;
    const mgmt = directCost * globalParams.managementRate;
    return Math.round(directCost + mgmt);
  };

  const handleSelectAndAdopt = (quote: SupplierReplyDetail) => {
    setIsAdopting(true);
    setTimeout(() => {
      onAdoptQuote(rfqRecord.id, quote, item);
      setIsAdopting(false);
      onClose();
    }, 400);
  };

  // 寻找最低价
  const lowestLandedPrice = Math.min(
    ...replies.map((r) => calculateLandedMaterialCostDzd(r.quotedPrice, r.currency))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* 头部 */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-300">
              <Zap className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 font-semibold">
                  {item.itemNo}
                </span>
                <span className="text-xs text-emerald-200/80">供应商回函比选与一键智能采纳闭环</span>
              </div>
              <h2 className="text-base font-bold text-white mt-0.5 flex items-center gap-2">
                {item.descriptionZh}
                <span className="text-xs font-normal text-emerald-200/70">
                  (关联询价单号: {rfqRecord.inquiryNo})
                </span>
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 核心内容区 */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs text-slate-800">
          {/* 当前量单项基准 vs 询价状态提示 */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-slate-500 block text-xs">当前清单采用价格基准</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-xl font-bold text-slate-900 font-mono">
                  {item.materialPriceOriginal.toLocaleString()} {item.materialCurrency}
                </span>
                <span className="text-slate-500 text-xs">
                  (当前供应商: {item.selectedSupplierName || '暂未选定'})
                </span>
              </div>
              <div className="text-slate-500 text-[11px] mt-1">
                当前综合单价: <strong className="font-mono text-slate-800">{item.unitPriceDzd.toLocaleString()} DZD</strong> ·
                工程量: <strong className="font-mono text-slate-800">{item.quantity} {item.unit}</strong>
              </div>
            </div>

            <div className="sm:border-l sm:border-slate-200 sm:pl-4">
              <span className="text-[11px] text-slate-500 block">回函收集进度</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  已收到 {replies.length} 家供应商正式回函
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">
                点击下方任一家报价的「一键采纳」，系统将自动刷新量单价、关税及合价
              </span>
            </div>
          </div>

          {/* 供应商报价对比卡片列表 */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 mb-3 flex items-center justify-between">
              <span>供应商报价横向对比明细 (已折算至当地货币 DZD 进行同口径比选)</span>
              <span className="text-[11px] text-slate-500 font-normal">
                排序规则: 按到港清关后综合折合价升序排列
              </span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {replies.map((quote, idx) => {
                const landedCost = calculateLandedMaterialCostDzd(quote.quotedPrice, quote.currency);
                const isLowest = landedCost === lowestLandedPrice;
                const newUnitDzd = previewNewUnitPriceDzd(quote);
                const priceDiffPct = Math.round(
                  ((newUnitDzd - item.unitPriceDzd) / item.unitPriceDzd) * 100
                );
                const isCurrentActive =
                  item.selectedSupplierName?.includes(quote.supplierName) ||
                  (item.materialPriceOriginal === quote.quotedPrice &&
                    item.materialCurrency === quote.currency);

                return (
                  <div
                    key={quote.supplierName}
                    className={`rounded-xl border p-4 transition-all relative flex flex-col justify-between ${
                      isLowest
                        ? 'border-emerald-300 bg-emerald-50/30 ring-1 ring-emerald-400/40'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    {/* 徽标 */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{quote.supplierName}</span>
                        {isLowest && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                            <Award className="w-3 h-3 text-emerald-600" />
                            推荐最优价
                          </span>
                        )}
                        {isCurrentActive && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                            当前量单已用
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">#{idx + 1}</span>
                    </div>

                    {/* 报价与折算 */}
                    <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-150 mb-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">原币出厂报价:</span>
                        <strong className="text-slate-900 font-mono text-sm">
                          {quote.quotedPrice.toLocaleString()} {quote.currency}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">折合到港主材价 (含关税运杂):</span>
                        <strong className="font-mono text-emerald-700">
                          {landedCost.toLocaleString()} DZD
                        </strong>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200">
                        <span className="text-slate-600">采纳后预计综合单价:</span>
                        <span className="font-mono font-bold text-slate-900 flex items-center gap-1">
                          {newUnitDzd.toLocaleString()} DZD
                          {priceDiffPct < 0 ? (
                            <span className="text-emerald-700 text-[10px] font-bold">
                              ({priceDiffPct}%)
                            </span>
                          ) : priceDiffPct > 0 ? (
                            <span className="text-amber-700 text-[10px] font-bold">
                              (+{priceDiffPct}%)
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">(持平)</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* 属性与交期 */}
                    <div className="space-y-1 text-slate-600 text-[11px] mb-3">
                      <div className="flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          产地: <strong className="text-slate-700">{quote.origin}</strong> · 交期:{' '}
                          <strong className="text-slate-700">{quote.leadTime}</strong>
                        </span>
                      </div>
                      {quote.paymentTerms && (
                        <div className="text-[10px] text-slate-500">
                          付款方式: {quote.paymentTerms}
                        </div>
                      )}
                      {quote.quoteDetails && (
                        <div className="text-[10px] text-slate-500 italic bg-white/70 p-1 rounded border border-slate-100">
                          “{quote.quoteDetails}”
                        </div>
                      )}
                    </div>

                    {/* 采纳操作按钮 */}
                    <div className="pt-2 border-t border-slate-150 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">
                        附件: {quote.replyAttachmentName || '技术规格报价函.pdf'}
                      </span>

                      <button
                        onClick={() => handleSelectAndAdopt(quote)}
                        disabled={isAdopting}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isLowest
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>一键采纳此报价</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 底部说明栏 */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>采纳后将自动同步更新物资库、历史签单库，并重新计算全标段汇总投标报价</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold cursor-pointer"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};
