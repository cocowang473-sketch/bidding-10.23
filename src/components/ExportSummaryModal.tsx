import React, { useState } from 'react';
import { BoqItem, GlobalPricingParams } from '../types/pricing';
import { ProposalSection, VariableValues } from '../types/proposalVariables';
import { X, Download, Copy, Check, FileSpreadsheet, FileText, Layers } from 'lucide-react';
import { NoticeAnalysisResult, InstructionsRecord } from '../types/bidding';

interface ExportSummaryModalProps {
  isOpen: boolean;
  items: BoqItem[];
  globalParams: GlobalPricingParams;
  proposalSections?: ProposalSection[];
  variableValues?: VariableValues;
  noticeAnalysis?: NoticeAnalysisResult | null;
  instructionsRecord?: InstructionsRecord | null;
  onClose: () => void;
}

export const ExportSummaryModal: React.FC<ExportSummaryModalProps> = ({
  isOpen,
  items,
  globalParams,
  proposalSections = [],
  variableValues = {},
  noticeAnalysis = null,
  instructionsRecord = null,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<
    'boq' | 'proposal' | 'notice-summary' | 'instructions-summary'
  >('boq');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const totalBidAmountDzd = items.reduce((sum, item) => sum + item.totalPriceDzd, 0);
  const totalDirectCostDzd = items.reduce((sum, item) => sum + item.directCostDzd * item.quantity, 0);

  // 生成替换变量后的完整标书
  const getFullResolvedProposalText = () => {
    return proposalSections
      .map((sec, idx) => {
        const resolvedBody = sec.templateContent.replace(/\[([^\]]+)\]/g, (_, key) => {
          return variableValues[key] || `[${key}]`;
        });
        return `第 ${idx + 1} 章节：${sec.title}\n\n${resolvedBody}\n\n${'='.repeat(40)}\n`;
      })
      .join('\n');
  };

  const handleCopyProposal = () => {
    const text = getFullResolvedProposalText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadProposalText = () => {
    const text = getFullResolvedProposalText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '宏远国际_完整投标文件条款.txt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyCsv = () => {
    const headers = [
      '序号',
      '中文名称',
      '法语名称',
      '规格型号',
      '单位',
      '工程量',
      '人工定额工日',
      '安装费小计(DZD)',
      '主材原币单价',
      '币种',
      '产地',
      '关税状态',
      '主材折算费(DZD)',
      '综合单价(DZD)',
      '综合合价(DZD)',
    ];

    const rows = items.map((i) => [
      i.itemNo,
      `"${i.descriptionZh}"`,
      `"${i.descriptionFr}"`,
      `"${i.spec}"`,
      i.unit,
      i.quantity,
      i.laborDays,
      i.installationCostDzd,
      i.materialPriceOriginal,
      i.materialCurrency,
      i.materialOrigin,
      i.applyTariff ? '+30%关税' : '免关税',
      i.materialCostDzd,
      i.unitPriceDzd,
      i.totalPriceDzd,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    navigator.clipboard.writeText(csvContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadCsv = () => {
    const headers = [
      '序号',
      '中文名称',
      '法语名称',
      '规格型号',
      '单位',
      '工程量',
      '人工定额工日',
      '安装费小计(DZD)',
      '主材原币单价',
      '币种',
      '产地',
      '关税状态',
      '主材折算费(DZD)',
      '综合单价(DZD)',
      '综合合价(DZD)',
    ];

    const rows = items.map((i) => [
      i.itemNo,
      `"${i.descriptionZh}"`,
      `"${i.descriptionFr}"`,
      `"${i.spec}"`,
      i.unit,
      i.quantity,
      i.laborDays,
      i.installationCostDzd,
      i.materialPriceOriginal,
      i.materialCurrency,
      i.materialOrigin,
      i.applyTariff ? '+30%关税' : '免关税',
      i.materialCostDzd,
      i.unitPriceDzd,
      i.totalPriceDzd,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '宏远国际_Phoenix智慧医疗综合体_CFO量单报价汇总表.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden text-xs">
        <div className="p-4 border-b border-slate-150 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-700" />
            <h3 className="text-sm font-bold text-slate-900">
              投标文件综合成果导出 (阿尔及利亚 Phoenix 智慧医疗综合体项目)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 导出类型选择 */}
        <div className="px-6 pt-4 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('boq')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'boq'
                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-700" />
            <span>1. CFO 量单双库报价表 (CSV/Excel)</span>
          </button>

          <button
            onClick={() => setActiveTab('proposal')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'proposal'
                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-700" />
            <span>2. 标书条款正文 (含变量替换)</span>
          </button>

          {noticeAnalysis && (
            <button
              onClick={() => setActiveTab('notice-summary')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'notice-summary'
                  ? 'bg-sky-50 text-sky-800 border border-sky-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-sky-700" />
              <span>3. 招标公告解读摘要</span>
            </button>
          )}

          {instructionsRecord && (
            <button
              onClick={() => setActiveTab('instructions-summary')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'instructions-summary'
                  ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-700" />
              <span>4. 投标须知与附件清单</span>
            </button>
          )}
        </div>

        {activeTab === 'boq' && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500 block">清单总项数</span>
                <span className="text-base font-bold text-slate-900">{items.length} 项</span>
              </div>
              <div>
                <span className="text-slate-500 block">标书总报价 (含10%管理费)</span>
                <span className="text-base font-bold text-blue-700 font-mono tabular-nums">
                  {totalBidAmountDzd.toLocaleString()} DZD
                </span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden p-3 bg-white space-y-1 text-slate-600">
              <p>• 包含人工定额工日、固定基数 ({globalParams.laborBaseRate} DZD)、辅材及机械系数</p>
              <p>• 包含主材采购单价、币种折算、中国原产地 30% 关税核算明细</p>
            </div>
          </div>
        )}

        {activeTab === 'proposal' && (
          <div className="p-6 space-y-3">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-800 block mb-1">
                已装配章节 ({proposalSections.length} 个核心条款):
              </span>
              <p className="text-slate-600">
                已将侧边栏填入的 <code className="font-mono text-blue-800 font-semibold">[项目名称]</code>、<code className="font-mono text-blue-800 font-semibold">[投标截止日期]</code> 等所有变量完整嵌入正文中。
              </p>
            </div>

            <div className="max-h-48 overflow-y-auto p-3 bg-slate-100/60 rounded border border-slate-200 font-mono text-[11px] text-slate-700 whitespace-pre-wrap">
              {getFullResolvedProposalText().slice(0, 450)}...
            </div>
          </div>
        )}

        {activeTab === 'notice-summary' && noticeAnalysis && (
          <div className="p-6 space-y-3 text-xs text-slate-700">
            <div className="p-3 bg-sky-50 rounded-lg border border-sky-200">
              <span className="font-semibold text-slate-800 block mb-1">
                公告字段 {noticeAnalysis.fields?.length ?? 0} 项,原子要求{' '}
                {noticeAnalysis.atomic_requirements?.length ?? 0} 条,待确认{' '}
                {noticeAnalysis.open_questions?.length ?? 0} 条
              </span>
              <p className="text-slate-600">
                模板:{noticeAnalysis.template_mode === 'llm_general' ? '通用字段模板' : '基础绿字段模板'}
              </p>
            </div>
            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-white space-y-1.5">
              {(noticeAnalysis.fields || []).map((f) => (
                <div key={f.key} className="grid grid-cols-[180px_1fr] gap-3">
                  <span className="text-slate-500">{f.label || f.key}</span>
                  <span className="text-slate-900 font-medium break-words">
                    {f.missing || !f.value ? (
                      <span className="text-amber-600">待补齐</span>
                    ) : (
                      f.value
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'instructions-summary' && instructionsRecord?.result && (
          <div className="p-6 space-y-3 text-xs text-slate-700">
            <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
              <span className="font-semibold text-slate-800 block mb-1">
                附件 {instructionsRecord.result.attachments.length} 份,已完成{' '}
                {instructionsRecord.result.attachments.filter((a) => a.status === 'done').length} 份
              </span>
              {instructionsRecord.result.instruction_brief?.summary && (
                <p className="text-slate-600 line-clamp-3">
                  {instructionsRecord.result.instruction_brief.summary}
                </p>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y divide-slate-100">
              {instructionsRecord.result.attachments.map((a) => (
                <div key={a.code} className="px-3 py-2 flex items-center gap-2">
                  <span className="font-mono text-[10px] text-slate-400">{a.code}</span>
                  <span className="flex-1 text-slate-900 font-medium">{a.title}</span>
                  <span className="text-[11px] text-slate-500">{a.status_label || a.status || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 bg-slate-50 border-t border-slate-150 flex items-center justify-between">
          <span className="text-slate-500">
            {activeTab === 'boq'
              ? '格式:UTF-8 带 BOM CSV'
              : activeTab === 'proposal'
              ? '格式:纯文本文档 / 正式送审条款'
              : activeTab === 'notice-summary'
              ? '摘要仅用于浏览;详细字段请在"招标公告智能解读"视图查看'
              : '摘要仅用于浏览;附件编制请在"投标须知工作台"视图完成'}
          </span>

          {(activeTab === 'boq' || activeTab === 'proposal') && (
            <div className="flex items-center gap-2">
              <button
                onClick={activeTab === 'boq' ? handleCopyCsv : handleCopyProposal}
                className="px-3 py-1.5 border border-slate-300 rounded bg-white hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '已复制到剪贴板' : '复制数据文本'}</span>
              </button>

              <button
                onClick={activeTab === 'boq' ? handleDownloadCsv : handleDownloadProposalText}
                className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded font-medium transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{activeTab === 'boq' ? '下载 CSV 报表' : '下载标书文本'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
