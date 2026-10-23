import React, { useState } from 'react';
import {
  GlobalPricingParams,
  RfqInquiryRecord,
  MaterialComponent,
  CurrencyType,
} from '../types/pricing';
import {
  Settings,
  Mail,
  DollarSign,
  TrendingUp,
  Sliders,
  CheckCircle2,
  FileCheck,
  Send,
  Eye,
  AlertCircle,
  FileSpreadsheet,
  Globe,
  Check,
  Plus,
} from 'lucide-react';

interface GlobalConfigAndRfqViewProps {
  params: GlobalPricingParams;
  rfqRecords: RfqInquiryRecord[];
  onUpdateParams: (newParams: GlobalPricingParams) => void;
  onAdoptRfq: (rfqId: string) => void;
  onSendNewRfq: (record: RfqInquiryRecord) => void;
}

export const GlobalConfigAndRfqView: React.FC<GlobalConfigAndRfqViewProps> = ({
  params,
  rfqRecords,
  onUpdateParams,
  onAdoptRfq,
  onSendNewRfq,
}) => {
  const [activeTab, setActiveTab] = useState<'params' | 'rfq'>('params');
  const [currentParams, setCurrentParams] = useState<GlobalPricingParams>(params);
  const [isSavedToast, setIsSavedToast] = useState(false);

  // 新建询价表单弹窗
  const [isNewRfqModalOpen, setIsNewRfqModalOpen] = useState(false);
  const [rfqMaterialName, setRfqMaterialName] = useState('');
  const [rfqMaterialSpec, setRfqMaterialSpec] = useState('');
  const [rfqQuantity, setRfqQuantity] = useState(100);
  const [rfqUnit, setRfqUnit] = useState('米');
  const [rfqTargetSupplier, setRfqTargetSupplier] = useState('远东电缆海外部, 宝胜电缆, ENICAB');

  const handleSaveParams = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateParams(currentParams);
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 2500);
  };

  const handleCreateRfq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rfqMaterialName) return;

    const newRecord: RfqInquiryRecord = {
      id: `RFQ-${Date.now().toString().slice(-4)}`,
      inquiryNo: `RFQ-CSCEC2-${Date.now().toString().slice(-4)}`,
      materialName: rfqMaterialName,
      materialSpec: rfqMaterialSpec || '按图纸技术参数执行',
      quantityNeeded: rfqQuantity,
      unit: rfqUnit,
      sendDate: new Date().toLocaleDateString('zh-CN'),
      status: 'replied', // 模拟即时生成回复，便于用户体验人工审核采纳流程
      targetSuppliers: rfqTargetSupplier.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
      replySummary: {
        supplierName: rfqTargetSupplier.split(/[,，]/)[0] || '正泰海外事业部',
        quotedPrice: 380,
        currency: 'CNY',
        replyAttachmentName: `报价函_${rfqMaterialName.slice(0, 8)}_含报关单.xlsx`,
        origin: '中国',
        leadTime: '现货 25 天',
        parsedAt: new Date().toLocaleTimeString('zh-CN'),
      },
      isAdoptedToHistoryDb: false,
    };

    onSendNewRfq(newRecord);
    setIsNewRfqModalOpen(false);
    setRfqMaterialName('');
  };

  return (
    <div className="space-y-6">
      {/* 国际汇率与间接费测算引擎工具栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
            <Settings className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              国际汇率、关税与间接取费测算引擎
            </h2>
            <p className="text-[11px] text-slate-500">
              实时双向驱动全量 BOQ 综合单价 · 中国原产加征 30% 关税 · 欧洲 EUR.1 证书免税
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSavedToast && (
            <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
              <Check className="w-3.5 h-3.5" /> 已全案重算
            </span>
          )}
          <button
            type="button"
            onClick={() => setCurrentParams(params)}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            还原初始设定
          </button>
          <button
            type="button"
            onClick={(e) => handleSaveParams(e as any)}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            保存并全量重算
          </button>
        </div>
      </div>

      {/* TAB 1: 报价参数与汇率关税配置 */}
      {activeTab === 'params' && (
        <form onSubmit={handleSaveParams} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 卡片 1: 人工与辅材机械费计算 */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-150">
                <Sliders className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  人工与辅材机械费参数 (定额计算逻辑)
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                {/* 人工费定额固定基数 */}
                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-800">
                      人工费定额固定基数 (DZD/工日)
                    </label>
                    <span className="text-[11px] text-blue-700 font-medium">
                      标准工日基数
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={currentParams.laborBaseRate}
                      onChange={(e) =>
                        setCurrentParams({
                          ...currentParams,
                          laborBaseRate: Number(e.target.value) || 0,
                        })
                      }
                      className="flex-1 px-3 py-1.5 font-mono text-sm border rounded bg-white"
                    />
                    <span className="text-slate-500 font-mono">DZD / 工日</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-600">
                    <input
                      type="checkbox"
                      id="promptToggle"
                      checked={currentParams.promptBeforeQuoting}
                      onChange={(e) =>
                        setCurrentParams({
                          ...currentParams,
                          promptBeforeQuoting: e.target.checked,
                        })
                      }
                      className="rounded text-blue-600"
                    />
                    <label htmlFor="promptToggle" className="cursor-pointer">
                      每次组价测算前提示核验基数最新用工标准 (防范成本偏差)
                    </label>
                  </div>
                </div>

                {/* 辅材费参数 */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <label className="text-slate-600 block mb-1">
                      辅材基础数值 (如 35)
                    </label>
                    <input
                      type="number"
                      value={currentParams.auxBaseValue}
                      onChange={(e) =>
                        setCurrentParams({
                          ...currentParams,
                          auxBaseValue: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full px-2.5 py-1.5 font-mono border rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1">
                      辅材测算系数 (如 1.1)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      value={currentParams.auxCoefficient}
                      onChange={(e) =>
                        setCurrentParams({
                          ...currentParams,
                          auxCoefficient: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full px-2.5 py-1.5 font-mono border rounded bg-white"
                    />
                  </div>
                </div>

                {/* 机械费参数 */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <label className="text-slate-600 block mb-1">
                      机械基础数值 (如 45)
                    </label>
                    <input
                      type="number"
                      value={currentParams.machineryBaseValue}
                      onChange={(e) =>
                        setCurrentParams({
                          ...currentParams,
                          machineryBaseValue: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full px-2.5 py-1.5 font-mono border rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1">
                      机械测算系数 (如 1.1)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      value={currentParams.machineryCoefficient}
                      onChange={(e) =>
                        setCurrentParams({
                          ...currentParams,
                          machineryCoefficient: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full px-2.5 py-1.5 font-mono border rounded bg-white"
                    />
                  </div>
                </div>

                {/* 综合取费与管理费 */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-800">
                      综合管理费费率 (如 10%)
                    </label>
                    <span className="font-mono text-blue-700 font-bold">
                      {Math.round(currentParams.managementRate * 100)}%
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={currentParams.managementRate}
                    onChange={(e) =>
                      setCurrentParams({
                        ...currentParams,
                        managementRate: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-2.5 py-1.5 font-mono border rounded bg-white"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    公式：综合取费基于人材机总和乘以管理费费率得出。
                  </p>
                </div>
              </div>
            </div>

            {/* 卡片 2: 主材费汇率与关税折算规则 */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-150">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  主材费汇率与关税折算规则 (折算为当地货币 迪纳尔 DZD)
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                {/* 人民币 30% 关税规则 */}
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-950">
                      人民币采购关税加征率
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-bold font-mono">
                      {Math.round(currentParams.cnyTariffRate * 100)}%
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-900 mt-1">
                    <strong>清关税则规定：</strong>欧洲及美洲原产地免征进口关税，中国原产地货物需加收 30% 进口关税。
                  </p>
                </div>

                {/* 汇率配置 */}
                <div className="space-y-2">
                  <label className="font-semibold text-slate-700 block">
                    当地货币结算汇率表：
                  </label>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 border rounded bg-slate-50">
                      <span className="text-slate-500 block text-[11px]">1 EUR (欧元)</span>
                      <input
                        type="number"
                        step="0.1"
                        value={currentParams.exchangeRates.EUR_TO_DZD}
                        onChange={(e) =>
                          setCurrentParams({
                            ...currentParams,
                            exchangeRates: {
                              ...currentParams.exchangeRates,
                              EUR_TO_DZD: Number(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-full mt-1 px-1.5 py-1 font-mono border rounded bg-white text-right"
                      />
                      <span className="text-[10px] text-emerald-700 mt-0.5 block">免关税</span>
                    </div>

                    <div className="p-2 border rounded bg-slate-50">
                      <span className="text-slate-500 block text-[11px]">1 USD (美元)</span>
                      <input
                        type="number"
                        step="0.1"
                        value={currentParams.exchangeRates.USD_TO_DZD}
                        onChange={(e) =>
                          setCurrentParams({
                            ...currentParams,
                            exchangeRates: {
                              ...currentParams.exchangeRates,
                              USD_TO_DZD: Number(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-full mt-1 px-1.5 py-1 font-mono border rounded bg-white text-right"
                      />
                      <span className="text-[10px] text-emerald-700 mt-0.5 block">免关税</span>
                    </div>

                    <div className="p-2 border rounded bg-slate-50">
                      <span className="text-slate-500 block text-[11px]">1 CNY (人民币)</span>
                      <input
                        type="number"
                        step="0.1"
                        value={currentParams.exchangeRates.CNY_TO_DZD}
                        onChange={(e) =>
                          setCurrentParams({
                            ...currentParams,
                            exchangeRates: {
                              ...currentParams.exchangeRates,
                              CNY_TO_DZD: Number(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-full mt-1 px-1.5 py-1 font-mono border rounded bg-white text-right"
                      />
                      <span className="text-[10px] text-amber-700 mt-0.5 block">+30%关税</span>
                    </div>
                  </div>
                </div>

                {/* 运费与港杂费率 */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <label className="text-slate-600 block mb-1">
                      国际海运费率 (如 2%)
                    </label>
                    <input
                      type="number"
                      step="0.005"
                      value={currentParams.freightRate}
                      onChange={(e) =>
                        setCurrentParams({
                          ...currentParams,
                          freightRate: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full px-2.5 py-1.5 font-mono border rounded bg-white"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">
                      {Math.round(currentParams.freightRate * 100)}%
                    </span>
                  </div>

                  <div>
                    <label className="text-slate-600 block mb-1">
                      出口港杂费率 (如 7%)
                    </label>
                    <input
                      type="number"
                      step="0.005"
                      value={currentParams.portMiscRate}
                      onChange={(e) =>
                        setCurrentParams({
                          ...currentParams,
                          portMiscRate: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full px-2.5 py-1.5 font-mono border rounded bg-white"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">
                      {Math.round(currentParams.portMiscRate * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500">
              提示：参数修改后将实时影响工程量清单（CFO 量单）的各项综合单价与合价测算。
            </span>
            <div className="flex items-center gap-3">
              {isSavedToast && (
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                  <Check className="w-4 h-4" /> 已应用最新测算参数！
                </span>
              )}
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                保存并全局更新参数
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: 材料数据库与供应商询价机制 */}
      {activeTab === 'rfq' && (
        <div className="space-y-6">
          {/* 4 种单价获取渠道展示 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 block">渠道 1</span>
              <h4 className="font-bold text-slate-900 mt-0.5">大模型市场分析</h4>
              <p className="text-slate-500 text-[11px] mt-1">
                基于全球大宗商品与机电数据库推算参考价格区间。
              </p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 block">渠道 2 (优先)</span>
              <h4 className="font-bold text-slate-900 mt-0.5">历史项目数据</h4>
              <p className="text-slate-500 text-[11px] mt-1">
                以 240 医院项目等 1 年内签单历史作为第一优先匹配依据。
              </p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 block">渠道 3</span>
              <h4 className="font-bold text-slate-900 mt-0.5">当地价格表</h4>
              <p className="text-slate-500 text-[11px] mt-1">
                阿尔及利亚本地五金商行及 ENICAB 电缆厂本地迪纳尔牌价。
              </p>
            </div>

            <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 shadow-2xs">
              <span className="text-blue-600 font-semibold block">渠道 4 (可发起)</span>
              <h4 className="font-bold text-blue-950 mt-0.5">供应商邮件询价</h4>
              <p className="text-blue-800 text-[11px] mt-1">
                带配图邮件直发供应商，智能解析 Excel/PDF 附件 + 人工二次采纳。
              </p>
            </div>
          </div>

          {/* 询价单列表 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-150 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  供应商邮件询价与人工二次确认采纳台
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  企业合规规范：邮件询价返回的数据须经造价工程师人工审核采纳，确认无误后方沉淀至材料库供后续匹配复用。
                </p>
              </div>

              <button
                onClick={() => setIsNewRfqModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>发起新材料邮件询价</span>
              </button>
            </div>

            <div className="divide-y divide-slate-150 text-xs">
              {rfqRecords.map((rfq) => {
                return (
                  <div key={rfq.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded">
                            {rfq.inquiryNo}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500">发送时间: {rfq.sendDate}</span>
                          <span className="text-slate-400">·</span>
                          {rfq.isAdoptedToHistoryDb ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>已人工审核采纳入历史库</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>待人工二次确认采纳</span>
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 mt-1.5">
                          {rfq.materialName}
                        </h4>
                        <p className="text-slate-600 mt-0.5">
                          规格需求: {rfq.materialSpec} (需求量: {rfq.quantityNeeded} {rfq.unit})
                        </p>

                        <div className="mt-1 flex items-center gap-1.5 text-slate-500">
                          <span>目标供应商:</span>
                          {rfq.targetSuppliers.map((s, idx) => (
                            <span
                              key={idx}
                              className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* 供应商附件回复解析与采纳动作区 */}
                      {rfq.replySummary && (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg max-w-md w-full">
                          <div className="flex items-center justify-between text-slate-600 mb-1">
                            <span className="font-medium text-slate-800 flex items-center gap-1">
                              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                              <span>已解析供应商回复附件:</span>
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {rfq.replySummary.parsedAt}
                            </span>
                          </div>

                          <div className="bg-white p-2 rounded border border-slate-150">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">
                                {rfq.replySummary.supplierName}
                              </span>
                              <span className="font-mono font-bold text-emerald-700 text-sm">
                                {rfq.replySummary.quotedPrice.toLocaleString()}{' '}
                                {rfq.replySummary.currency}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-between">
                              <span>附件: {rfq.replySummary.replyAttachmentName}</span>
                              <span>产地: {rfq.replySummary.origin}</span>
                            </div>
                          </div>

                          <div className="mt-2.5 flex items-center justify-end gap-2">
                            {rfq.isAdoptedToHistoryDb ? (
                              <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> 已写入 240 医院历史材料库
                              </span>
                            ) : (
                              <button
                                onClick={() => onAdoptRfq(rfq.id)}
                                className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>人工审核无误 · 采纳写入历史库</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 新建询价弹窗 */}
      {isNewRfqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 text-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-600" />
              <span>生成并发送材料邮件询价单</span>
            </h3>

            <form onSubmit={handleCreateRfq} className="space-y-3">
              <div>
                <label className="text-slate-600 block mb-1">材料名称 (中法双语需求)*</label>
                <input
                  type="text"
                  required
                  value={rfqMaterialName}
                  onChange={(e) => setRfqMaterialName(e.target.value)}
                  placeholder="如: 低烟无卤耐火电缆 (Câble U-1000)"
                  className="w-full px-2.5 py-1.5 border rounded"
                />
              </div>

              <div>
                <label className="text-slate-600 block mb-1">规格型号与材质标准</label>
                <input
                  type="text"
                  value={rfqMaterialSpec}
                  onChange={(e) => setRfqMaterialSpec(e.target.value)}
                  placeholder="如: 4x185mm² 铜芯 IEC 60502"
                  className="w-full px-2.5 py-1.5 border rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 block mb-1">需求数量</label>
                  <input
                    type="number"
                    value={rfqQuantity}
                    onChange={(e) => setRfqQuantity(Number(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 border rounded font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block mb-1">单位</label>
                  <input
                    type="text"
                    value={rfqUnit}
                    onChange={(e) => setRfqUnit(e.target.value)}
                    className="w-full px-2.5 py-1.5 border rounded"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-600 block mb-1">
                  目标供应商群 (逗号隔开)
                </label>
                <input
                  type="text"
                  value={rfqTargetSupplier}
                  onChange={(e) => setRfqTargetSupplier(e.target.value)}
                  className="w-full px-2.5 py-1.5 border rounded"
                />
              </div>

              <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded text-blue-900 text-[11px]">
                询价邮件将自动附带中法双语技术规格与工程实物外观图鉴附件。
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsNewRfqModalOpen(false)}
                  className="px-3 py-1.5 border rounded hover:bg-slate-50 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-700 text-white rounded hover:bg-blue-800 cursor-pointer flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>立即发送询价</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
