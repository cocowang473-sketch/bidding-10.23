import React, { useState, useMemo } from 'react';
import {
  RfqInquiryRecord,
  CurrencyType,
  EmailTemplateItem,
  GlobalPricingParams,
  SupplierReplyDetail,
} from '../types/pricing';
import {
  REPLY_OPTIONS,
  GeneratedReplyOption,
} from '../utils/rfqEmailTemplates';
import { EmailTemplateManagerView } from './EmailTemplateManagerView';
import {
  Mail,
  Send,
  Plus,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Clock,
  ExternalLink,
  ShieldCheck,
  Check,
  Eye,
  Building2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  FileText,
  RotateCcw,
  Edit3,
  X,
  Sliders,
  ArrowUpDown,
  TrendingDown,
  Award,
  Layers,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface EmailRfqHubViewProps {
  rfqRecords: RfqInquiryRecord[];
  onOpenSendModal: (prefill?: any) => void;
  onAdoptRfq: (rfqId: string, customQuote?: SupplierReplyDetail) => void;
  templates: EmailTemplateItem[];
  onUpdateTemplates: (templates: EmailTemplateItem[]) => void;
  globalParams: GlobalPricingParams;
  activeSubModule?: 'records' | 'compare' | 'templates';
  onSubModuleChange?: (subMod: 'records' | 'compare' | 'templates') => void;
}

export const EmailRfqHubView: React.FC<EmailRfqHubViewProps> = ({
  rfqRecords,
  onOpenSendModal,
  onAdoptRfq,
  templates,
  onUpdateTemplates,
  globalParams,
  activeSubModule: propActiveSubModule,
  onSubModuleChange,
}) => {
  // 询价中心二级子系统切换
  const [internalActiveSubModule, setInternalActiveSubModule] = useState<
    'records' | 'compare' | 'templates'
  >('records');

  const activeSubModule =
    propActiveSubModule !== undefined ? propActiveSubModule : internalActiveSubModule;
  const setActiveSubModule = (mod: 'records' | 'compare' | 'templates') => {
    setInternalActiveSubModule(mod);
    onSubModuleChange?.(mod);
  };

  // 过滤与展开状态
  const [filter, setFilter] = useState<'all' | 'pending' | 'adopted'>('all');
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [activeSupplierTabMap, setActiveSupplierTabMap] = useState<Record<string, string>>({});

  // 价格排序模式：'asc' 升序 (由低到高，默认) | 'desc' 降序 (由高到低)
  const [priceSortOrder, setPriceSortOrder] = useState<'asc' | 'desc'>('asc');

  // 内嵌快速回复弹窗状态
  const [replyModalRfq, setReplyModalRfq] = useState<RfqInquiryRecord | null>(null);
  const [selectedReplySupplier, setSelectedReplySupplier] = useState<SupplierReplyDetail | null>(null);
  const [replyType, setReplyType] = useState<'award' | 'negotiate' | 'clarify'>('award');
  const [replySubject, setReplySubject] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [sentFeedbackId, setSentFeedbackId] = useState<string | null>(null);

  const pendingCount = rfqRecords.filter((r) => !r.isAdoptedToHistoryDb).length;
  const adoptedCount = rfqRecords.filter((r) => r.isAdoptedToHistoryDb).length;

  const filteredRecords = rfqRecords.filter((r) => {
    if (filter === 'pending') return !r.isAdoptedToHistoryDb;
    if (filter === 'adopted') return r.isAdoptedToHistoryDb;
    return true;
  });

  // 折算为当地货币 DZD 进行横向排序与公平比价
  const convertToDzd = (price: number, currency: CurrencyType): number => {
    switch (currency) {
      case 'CNY':
        return price * globalParams.exchangeRates.CNY_TO_DZD;
      case 'EUR':
        return price * globalParams.exchangeRates.EUR_TO_DZD;
      case 'USD':
        return price * globalParams.exchangeRates.USD_TO_DZD;
      case 'DZD':
      default:
        return price;
    }
  };

  // 打开针对特定供应商的回复生成窗口
  const handleOpenReplyDialog = (
    rfq: RfqInquiryRecord,
    targetQuote?: SupplierReplyDetail
  ) => {
    setReplyModalRfq(rfq);
    const quote =
      targetQuote ||
      rfq.supplierReplies?.[0] ||
      (rfq.replySummary
        ? {
            supplierName: rfq.replySummary.supplierName,
            supplierEmail: 'vendor.official@b2b.com',
            quotedPrice: rfq.replySummary.quotedPrice,
            currency: rfq.replySummary.currency,
            replyAttachmentName: rfq.replySummary.replyAttachmentName,
            origin: rfq.replySummary.origin,
            leadTime: rfq.replySummary.leadTime,
            parsedAt: rfq.replySummary.parsedAt,
          }
        : null);

    setSelectedReplySupplier(quote);
    const supplierName = quote?.supplierName || rfq.targetSuppliers[0] || '供应商合作伙伴';
    const opt = REPLY_OPTIONS.find((o) => o.type === 'award') || REPLY_OPTIONS[0];
    setReplyType('award');
    setReplySubject(opt.generateSubject(rfq.materialName, supplierName));
    setReplyBody(
      opt.generateBody({
        materialName: rfq.materialName,
        supplierName,
        quotedPrice: quote?.quotedPrice || 50000,
        currency: quote?.currency || 'CNY',
        unit: rfq.unit,
        quantity: rfq.quantityNeeded,
        leadTime: quote?.leadTime || '按工程计划交付',
      })
    );
    setSentFeedbackId(null);
  };

  const handleSwitchReplyType = (type: 'award' | 'negotiate' | 'clarify') => {
    if (!replyModalRfq) return;
    setReplyType(type);
    const supplierName =
      selectedReplySupplier?.supplierName ||
      replyModalRfq.replySummary?.supplierName ||
      replyModalRfq.targetSuppliers[0] ||
      '供应商合作伙伴';
    const opt = REPLY_OPTIONS.find((o) => o.type === type) || REPLY_OPTIONS[0];
    setReplySubject(opt.generateSubject(replyModalRfq.materialName, supplierName));
    setReplyBody(
      opt.generateBody({
        materialName: replyModalRfq.materialName,
        supplierName,
        quotedPrice: selectedReplySupplier?.quotedPrice || replyModalRfq.replySummary?.quotedPrice || 50000,
        currency: selectedReplySupplier?.currency || replyModalRfq.replySummary?.currency || 'CNY',
        unit: replyModalRfq.unit,
        quantity: replyModalRfq.quantityNeeded,
        leadTime: selectedReplySupplier?.leadTime || replyModalRfq.replySummary?.leadTime || '按工程计划交付',
      })
    );
  };

  const handleSendReply = () => {
    if (!replyModalRfq) return;
    setSentFeedbackId(replyModalRfq.id);
    setTimeout(() => {
      setReplyModalRfq(null);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* 模块模式 3: 邮件模板管理独立视图 */}
      {activeSubModule === 'templates' && (
        <EmailTemplateManagerView
          templates={templates}
          onUpdateTemplates={onUpdateTemplates}
          onSelectTemplateForRfq={(tpl) => {
            onOpenSendModal({ defaultTemplateId: tpl.id });
          }}
        />
      )}

      {/* 模块模式 2: 多商回函智能比价看板 (强化价格排序与价差分析) */}
      {activeSubModule === 'compare' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-150">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  材料询价多商回复报价对比与优选采纳台
                </h3>
              </div>

              <div className="flex items-center gap-2 text-xs flex-wrap">
                <span className="text-slate-500">排序规则：</span>
                <button
                  onClick={() =>
                    setPriceSortOrder(priceSortOrder === 'asc' ? 'desc' : 'asc')
                  }
                  className="px-2.5 py-1.5 bg-emerald-50 text-emerald-900 font-bold border border-emerald-200 rounded-lg flex items-center gap-1 cursor-pointer hover:bg-emerald-100"
                >
                  <TrendingDown className="w-3.5 h-3.5 text-emerald-700" />
                  <span>
                    {priceSortOrder === 'asc'
                      ? '按等值价格升序 (低价优先 🥇)'
                      : '按等值价格降序 (高价优先)'}
                  </span>
                </button>

                <button
                  onClick={() => onOpenSendModal(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition-all cursor-pointer whitespace-nowrap ml-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>新建询价邮件</span>
                </button>
              </div>
            </div>

            {/* 比价卡片网格 */}
            <div className="space-y-5">
              {rfqRecords.map((rfq) => {
                const quotesList: SupplierReplyDetail[] = rfq.supplierReplies && rfq.supplierReplies.length > 0
                  ? [...rfq.supplierReplies]
                  : rfq.replySummary
                  ? [
                      {
                        supplierName: rfq.replySummary.supplierName,
                        supplierEmail: 'official.quote@vendor.com',
                        quotedPrice: rfq.replySummary.quotedPrice,
                        currency: rfq.replySummary.currency,
                        replyAttachmentName: rfq.replySummary.replyAttachmentName,
                        origin: rfq.replySummary.origin,
                        leadTime: rfq.replySummary.leadTime,
                        parsedAt: rfq.replySummary.parsedAt,
                        quoteDetails: rfq.replySummary.quoteDetails,
                        isRecommended: true,
                      },
                    ]
                  : [];

                // 统一折算为当地货币进行数学排序
                const sortedQuotes = [...quotesList].sort((a, b) => {
                  const dzdA = convertToDzd(a.quotedPrice, a.currency);
                  const dzdB = convertToDzd(b.quotedPrice, b.currency);
                  return priceSortOrder === 'asc' ? dzdA - dzdB : dzdB - dzdA;
                });

                // 计算全局最低价基准
                const minDzd = quotesList.length > 0
                  ? Math.min(...quotesList.map((q) => convertToDzd(q.quotedPrice, q.currency)))
                  : 0;

                return (
                  <div
                    key={rfq.id}
                    className="bg-slate-50/70 border border-slate-200 rounded-xl p-4.5 space-y-3.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded text-xs">
                          {rfq.inquiryNo}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm">
                          {rfq.materialName}
                        </h4>
                        <span className="text-xs text-slate-500 font-sans">
                          ({rfq.materialSpec}) · 需求量: {rfq.quantityNeeded} {rfq.unit}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        {rfq.isAdoptedToHistoryDb ? (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <Check className="w-3.5 h-3.5" /> 已完成审核采纳入库
                          </span>
                        ) : (
                          <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-medium border border-amber-200">
                            待造价师人工审核决标
                          </span>
                        )}
                      </div>
                    </div>

                    {sortedQuotes.length === 0 ? (
                      <div className="py-6 text-center text-slate-400 text-xs">
                        <Clock className="w-5 h-5 mx-auto mb-1 text-slate-300" />
                        <span>询价函已发往多各供应商，等待报价回传中...</span>
                      </div>
                    ) : (
                      /* 多供应商报价横向卡片对比列表 (严格按价格排列) */
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 text-xs">
                        {sortedQuotes.map((q, qIdx) => {
                          const currentDzd = convertToDzd(q.quotedPrice, q.currency);
                          const isLowest = minDzd > 0 && Math.abs(currentDzd - minDzd) < 1;
                          const diffPercent = minDzd > 0
                            ? (((currentDzd - minDzd) / minDzd) * 100).toFixed(1)
                            : '0';

                          return (
                            <div
                              key={q.supplierName + qIdx}
                              className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                                isLowest
                                  ? 'bg-white border-emerald-500 shadow-md ring-1 ring-emerald-500'
                                  : 'bg-white border-slate-200 shadow-2xs hover:border-slate-300'
                              }`}
                            >
                              <div className="space-y-2">
                                {/* 供应商与名次 */}
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-bold text-slate-900 truncate">
                                    {q.supplierName}
                                  </span>
                                  {isLowest ? (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-0.5 shrink-0">
                                      🥇 最低价
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 shrink-0">
                                      第 {qIdx + 1} 位 (+{diffPercent}%)
                                    </span>
                                  )}
                                </div>

                                {/* 报价金额 */}
                                <div className="p-2 bg-slate-50 rounded-lg space-y-0.5">
                                  <div className="text-[10px] text-slate-400">原币报价单价：</div>
                                  <div className="font-mono font-bold text-emerald-700 text-sm">
                                    {q.quotedPrice.toLocaleString()} {q.currency} / {rfq.unit}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    折算当地货币约: {Math.round(currentDzd).toLocaleString()} DZD
                                  </div>
                                </div>

                                {/* 商务与履约属性 */}
                                <div className="space-y-1 text-[11px] text-slate-500">
                                  <div className="flex justify-between">
                                    <span>产地:</span>
                                    <span className="text-slate-800 font-medium">{q.origin}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>交货周期:</span>
                                    <span className="text-slate-800">{q.leadTime}</span>
                                  </div>
                                  {q.paymentTerms && (
                                    <div className="text-[10px] text-slate-400 line-clamp-1">
                                      结算: {q.paymentTerms}
                                    </div>
                                  )}
                                  <div className="text-[10px] text-slate-400 truncate">
                                    附件: {q.replyAttachmentName}
                                  </div>
                                </div>
                              </div>

                              {/* 操作按钮区 */}
                              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenReplyDialog(rfq, q)}
                                  className="text-[11px] text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 cursor-pointer bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded"
                                >
                                  <Sparkles className="w-3 h-3 text-blue-600" />
                                  <span>回函洽谈</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onAdoptRfq(rfq.id, q)}
                                  disabled={rfq.isAdoptedToHistoryDb}
                                  className={`px-2.5 py-1 rounded font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer ${
                                    rfq.isAdoptedToHistoryDb
                                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                                  }`}
                                >
                                  <Check className="w-3 h-3" />
                                  <span>{isLowest ? '采纳最低价' : '采纳此单价'}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 模块模式 1: 询价发函任务与记录大厅 */}
      {activeSubModule === 'records' && (
        <div className="space-y-6">
          {/* 采购渠道指示横条 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="font-semibold text-slate-500 text-[11px]">渠道 01</div>
              <div className="font-bold text-slate-900 mt-0.5">国内历史中标库</div>
              <p className="text-slate-500 text-[11px] mt-1">
                中建二局 1 年内已签合同单价库优先匹配。
              </p>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="font-semibold text-slate-500 text-[11px]">渠道 02</div>
              <div className="font-bold text-slate-900 mt-0.5">欧洲原产供应商 (免关税)</div>
              <p className="text-slate-500 text-[11px] mt-1">
                法国 Schneider、Legrand 等原厂 EUR.1 证书免征 30% 关税。
              </p>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="font-semibold text-slate-500 text-[11px]">渠道 03</div>
              <div className="font-bold text-slate-900 mt-0.5">当地市场现货牌价</div>
              <p className="text-slate-500 text-[11px] mt-1">
                阿尔及利亚本地工厂 (ENICAB) 现货，属地第纳尔结算。
              </p>
            </div>

            <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-200 shadow-2xs">
              <div className="font-semibold text-blue-700 text-[11px]">渠道 04 (直通车)</div>
              <div className="font-bold text-blue-950 mt-0.5">供应商专属邮件外发</div>
              <p className="text-blue-900 text-[11px] mt-1">
                随函附带技术实物图样，单商专属发信，回函自动比价。
              </p>
            </div>
          </div>

          {/* 询价单列表 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {/* 过滤条 */}
            <div className="p-4 border-b border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  供应商发函询价单与回复记录列表
                </h3>
                <span className="text-xs text-slate-500">
                  (共 {rfqRecords.length} 份)
                </span>
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    filter === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  全部 ({rfqRecords.length})
                </button>
                <button
                  onClick={() => setFilter('pending')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    filter === 'pending'
                      ? 'bg-white text-amber-800 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  待人工审核采纳 ({pendingCount})
                </button>
                <button
                  onClick={() => setFilter('adopted')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    filter === 'adopted'
                      ? 'bg-white text-emerald-800 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  已审核入库 ({adoptedCount})
                </button>
              </div>

              <button
                onClick={() => onOpenSendModal(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition-all cursor-pointer whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                <span>新建并发送询价邮件</span>
              </button>
            </div>

            {/* 询价列表卡片 */}
            <div className="divide-y divide-slate-150 text-xs">
              {filteredRecords.map((rfq) => {
                const isExpanded = expandedEmailId === rfq.id;
                const currentSelectedSupplierTab =
                  activeSupplierTabMap[rfq.id] || rfq.targetSuppliers[0] || '';

                // 取出所有回复并按价格排序
                const quotesList = rfq.supplierReplies || (rfq.replySummary ? [rfq.replySummary] : []);

                return (
                  <div key={rfq.id} className="p-5 hover:bg-slate-50/60 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      {/* 左侧：物资、规格、配图、收件方 */}
                      <div className="flex gap-4 flex-1">
                        {/* 物资技术图样与工程实物参考图 */}
                        {rfq.imageUrl ? (
                          <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 relative group">
                            <img
                              src={rfq.imageUrl}
                              alt={rfq.materialName}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-slate-900/60 text-white text-[9px] py-0.5 text-center">
                              实物图样
                            </div>
                          </div>
                        ) : (
                          <div className="w-20 h-20 shrink-0 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400">
                            <Mail className="w-6 h-6" />
                          </div>
                        )}

                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded">
                              {rfq.inquiryNo}
                            </span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-500">发函时间: {rfq.sendDate}</span>
                            <span className="text-slate-400">·</span>
                            <span
                              className={`px-2 py-0.5 rounded font-semibold ${
                                rfq.status === 'adopted'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : rfq.status === 'replied'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {rfq.status === 'adopted'
                                ? '已完成审核采纳'
                                : rfq.status === 'replied'
                                ? `已回复 (${quotesList.length} 家报价)`
                                : '已外发待回函'}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-slate-900">
                            {rfq.materialName}
                          </h4>
                          <p className="text-slate-600 text-xs">
                            规格型号: {rfq.materialSpec} · 需求工程量:{' '}
                            <strong className="text-slate-900 font-mono">
                              {rfq.quantityNeeded} {rfq.unit}
                            </strong>
                          </p>

                          <div className="flex items-center gap-1.5 text-slate-500 pt-1 flex-wrap">
                            <span className="font-medium text-slate-600">发函供应商:</span>
                            {rfq.targetSuppliers.map((s, idx) => (
                              <span
                                key={idx}
                                className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-medium"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* 右侧：供应商回复解析与采纳动作 */}
                      <div className="w-full lg:w-96 shrink-0 bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2.5">
                        {rfq.replySummary ? (
                          <>
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                              <span className="font-semibold text-slate-800 flex items-center gap-1 text-[11px]">
                                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                                <span>优选推荐报价单:</span>
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {rfq.replySummary.parsedAt}
                              </span>
                            </div>

                            <div className="bg-white p-2.5 rounded-lg border border-slate-150 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900">
                                  {rfq.replySummary.supplierName}
                                </span>
                                <span className="font-mono font-bold text-emerald-700 text-sm">
                                  {rfq.replySummary.quotedPrice.toLocaleString()}{' '}
                                  {rfq.replySummary.currency}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-slate-500">
                                <span className="truncate max-w-[200px]">
                                  附件: {rfq.replySummary.replyAttachmentName}
                                </span>
                                <span>{rfq.replySummary.origin}</span>
                              </div>
                              <div className="text-[10px] text-slate-400">
                                交货周期: {rfq.replySummary.leadTime}
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() =>
                                    setExpandedEmailId(isExpanded ? null : rfq.id)
                                  }
                                  className="text-[11px] text-blue-700 hover:text-blue-900 font-medium flex items-center gap-1 cursor-pointer"
                                >
                                  <span>{isExpanded ? '收起函件' : '查看专属邮件'}</span>
                                  {isExpanded ? (
                                    <ChevronUp className="w-3 h-3" />
                                  ) : (
                                    <ChevronDown className="w-3 h-3" />
                                  )}
                                </button>

                                <button
                                  onClick={() => handleOpenReplyDialog(rfq)}
                                  className="text-[11px] text-emerald-700 hover:text-emerald-900 font-medium flex items-center gap-1 cursor-pointer bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                                >
                                  <Sparkles className="w-3 h-3 text-emerald-600" />
                                  <span>一键生成回信</span>
                                </button>
                              </div>

                              {rfq.isAdoptedToHistoryDb ? (
                                <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" /> 已写入历史材料库
                                </span>
                              ) : (
                                <button
                                  onClick={() => onAdoptRfq(rfq.id)}
                                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold transition-colors flex items-center gap-1 shadow-xs cursor-pointer text-[11px]"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>人工审核采纳</span>
                                </button>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="py-4 text-center text-slate-400">
                            <Clock className="w-5 h-5 mx-auto mb-1 text-slate-300" />
                            <span>已发送专属询价函，等待供应商回复报价中...</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 展开的单商专属发函邮件信纸格式 */}
                    {isExpanded && (
                      <div className="mt-4 p-4 bg-slate-100/70 border border-slate-200 rounded-xl space-y-3 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">
                              专属商务询价函件预览 (单商单函)：
                            </span>
                            {/* 供应商切换标签 */}
                            <div className="flex items-center gap-1">
                              {rfq.targetSuppliers.map((s) => {
                                const isTabActive = currentSelectedSupplierTab === s;
                                return (
                                  <button
                                    key={s}
                                    onClick={() =>
                                      setActiveSupplierTabMap((prev) => ({
                                        ...prev,
                                        [rfq.id]: s,
                                      }))
                                    }
                                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                                      isTabActive
                                        ? 'bg-blue-700 text-white font-semibold'
                                        : 'bg-white text-slate-700 hover:bg-slate-200'
                                    }`}
                                  >
                                    {s}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <span className="text-[11px] text-slate-400 font-mono">
                            CSCEC-II Official Mail Server
                          </span>
                        </div>

                        <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2 font-sans">
                          <div className="text-[11px] text-slate-500 border-b border-slate-100 pb-1.5 flex justify-between">
                            <span>
                              收件人：<strong className="text-blue-800">{currentSelectedSupplierTab}</strong>
                            </span>
                            <span>
                              主题：{rfq.perSupplierEmails?.[currentSelectedSupplierTab]?.subject || rfq.emailSubject || `关于【${rfq.materialName}】设备采购报价邀请函`}
                            </span>
                          </div>
                          <div className="whitespace-pre-wrap text-slate-700 leading-relaxed pt-1 text-xs">
                            {rfq.perSupplierEmails?.[currentSelectedSupplierTab]?.body ||
                              rfq.emailBody ||
                              `致：${currentSelectedSupplierTab} 商务与投标负责人：\n我司正在进行阿尔及利亚 240 医院项目关键设备采购，现针对【${rfq.materialName}】(${rfq.materialSpec})，需求数量 ${rfq.quantityNeeded} ${rfq.unit} 发起正式商务询价。\n随信附带工程实物样照与接口图样附件，请查收并回复正式盖章报价单。\n\n顺祝商祺！\n中国建筑第二工程局有限公司 (CSCEC-II) 海外工程事业部`}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 快捷回复生成弹窗 */}
      {replyModalRfq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 border-b border-slate-150 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  针对供应商报价一键生成商务回复函
                </h3>
              </div>
              <button
                onClick={() => setReplyModalRfq(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-200">
                <span className="text-slate-500 block">回复目标物资及供应商：</span>
                <span className="font-bold text-blue-950 text-sm mt-0.5 block">
                  {replyModalRfq.materialName} ·{' '}
                  {selectedReplySupplier?.supplierName || replyModalRfq.replySummary?.supplierName}
                </span>
                <span className="text-blue-800 text-[11px] mt-0.5 block">
                  报价单价: {(selectedReplySupplier?.quotedPrice || replyModalRfq.replySummary?.quotedPrice || 0).toLocaleString()}{' '}
                  {selectedReplySupplier?.currency || replyModalRfq.replySummary?.currency} / {replyModalRfq.unit}
                </span>
              </div>

              {/* 回复类型切换 */}
              <div className="grid grid-cols-3 gap-2">
                {REPLY_OPTIONS.map((opt) => {
                  const isSel = replyType === opt.type;
                  return (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => handleSwitchReplyType(opt.type)}
                      className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                        isSel
                          ? 'bg-blue-50 border-blue-400 text-blue-950 shadow-2xs font-semibold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-bold text-xs">{opt.title.split('及')[0]}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                        {opt.badge}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="text-slate-600 font-medium block mb-0.5">
                  回复函邮件主题 (可编辑)
                </label>
                <input
                  type="text"
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-semibold text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="text-slate-600 font-medium block mb-0.5">
                  回复函邮件正文 (支持逐字编辑调整)
                </label>
                <textarea
                  rows={8}
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 font-sans leading-relaxed bg-white focus:border-blue-500"
                />
              </div>

              {sentFeedbackId === replyModalRfq.id && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg font-semibold flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>已成功向该供应商投递正式商务回复函！</span>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-150 flex items-center justify-end gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => setReplyModalRfq(null)}
                className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                关闭
              </button>
              <button
                type="button"
                onClick={handleSendReply}
                className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>立即发送商务回复函</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
