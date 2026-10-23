import React, { useState } from 'react';
import { BoqItem, GlobalPricingParams } from '../types/pricing';
import { ProposalSection, VariableValues } from '../types/proposalVariables';
import {
  X,
  Download,
  Copy,
  Check,
  FileSpreadsheet,
  FileText,
  Layers,
  Building2,
  Printer,
  Sparkles,
  ShieldCheck,
  Calculator,
} from 'lucide-react';

interface ExportSummaryModalProps {
  isOpen: boolean;
  items: BoqItem[];
  globalParams: GlobalPricingParams;
  proposalSections?: ProposalSection[];
  variableValues?: VariableValues;
  onClose: () => void;
}

export const ExportSummaryModal: React.FC<ExportSummaryModalProps> = ({
  isOpen,
  items,
  globalParams,
  proposalSections = [],
  variableValues = {},
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'erjuan_summary' | 'boq_detail' | 'proposal'>('erjuan_summary');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const totalBidAmountDzd = items.reduce((sum, item) => sum + item.totalPriceDzd, 0);
  const totalDirectCostDzd = items.reduce((sum, item) => sum + item.directCostDzd * item.quantity, 0);
  const totalMaterialCostDzd = items.reduce((sum, item) => sum + item.materialCostDzd * item.quantity, 0);
  const totalInstallationCostDzd = items.reduce((sum, item) => sum + item.installationCostDzd * item.quantity, 0);
  const totalManagementCostDzd = items.reduce((sum, item) => sum + item.managementCostDzd * item.quantity, 0);
  const totalLaborDays = items.reduce((sum, item) => sum + item.laborDays * item.quantity, 0);

  const exchangeRateCny = globalParams.exchangeRates.CNY_TO_DZD || 18.5;
  const totalBidAmountCny = Math.round(totalBidAmountDzd / exchangeRateCny);

  // 安全百分比计算函数，避免清单为空时除以 0 导致 NaN
  const calcPct = (val: number, total: number) => {
    if (total <= 0) return '0.0%';
    return `${((val / total) * 100).toFixed(1)}%`;
  };

  // 格式化渠道名称
  const getChannelNameZh = (channel?: string) => {
    switch (channel) {
      case 'ai_market':
        return '大模型分析市场价格';
      case 'historical_project':
        return '往期历史项目签约数据';
      case 'local_pricebook':
        return '阿尔及利亚当地官方造价信息价';
      case 'vendor_rfq':
        return '供应商邮件询价与回函比选';
      default:
        return '历史库采购基准价';
    }
  };

  // 生成中建二局安装公司二局安标准工程量清单综合报价汇总表 (CSV)
  const handleDownloadErJuAnCsv = () => {
    const lines: string[] = [];
    lines.push('中建二局安装工程有限公司');
    lines.push('阿尔及利亚 240 床综合医院项目机电强电工程商务标综合报价汇总表 (二局安标准汇总表)');
    lines.push(`编制单位: 中建二局安装工程有限公司海外分公司,投标币种: 阿尔及利亚第纳尔 (DZD),折算汇率: 1 CNY = ${exchangeRateCny} DZD,编制基准日: ${new Date().toISOString().split('T')[0]}`);
    lines.push('');
    lines.push('【表-01: 中建二局安装公司 · 投标报价汇总表】');
    lines.push('费用项目,测算依据/费率标准,金额 (DZD),折合人民币 (元),占总报价比例');
    lines.push(`一、分部分项工程直接费,人材机直接费汇总,${totalDirectCostDzd.toLocaleString()},¥${Math.round(totalDirectCostDzd / exchangeRateCny).toLocaleString()},${calcPct(totalDirectCostDzd, totalBidAmountDzd)}`);
    lines.push(`  1.1 主材采购费 (含原币、关税与运杂),原币折算 + 30%关税(CNY) + 9%运杂,${totalMaterialCostDzd.toLocaleString()},¥${Math.round(totalMaterialCostDzd / exchangeRateCny).toLocaleString()},${calcPct(totalMaterialCostDzd, totalBidAmountDzd)}`);
    lines.push(`  1.2 安装费定额 (人工/辅材/机械),定额工日基数 ${globalParams.laborBaseRate} DZD + 辅材机械测算系数 1.1,${totalInstallationCostDzd.toLocaleString()},¥${Math.round(totalInstallationCostDzd / exchangeRateCny).toLocaleString()},${calcPct(totalInstallationCostDzd, totalBidAmountDzd)}`);
    lines.push(`二、综合管理取费,人材机直接费 × 10% 综合费率,${totalManagementCostDzd.toLocaleString()},¥${Math.round(totalManagementCostDzd / exchangeRateCny).toLocaleString()},${calcPct(totalManagementCostDzd, totalBidAmountDzd)}`);
    lines.push(`投标总报价合计 (DZD),直接费 + 综合管理取费,${totalBidAmountDzd.toLocaleString()},¥${totalBidAmountCny.toLocaleString()},100.0%`);
    lines.push('');
    lines.push('【表-02: 中建二局安装公司 · 分部分项工程量清单计价明细表】');
    const headers = [
      '序号',
      '项目编码',
      '项目描述(中文)',
      '法语描述(Description)',
      '规格型号',
      '单位',
      '工程量',
      '定额工日(工日/单位)',
      '安装费小计(DZD)',
      '主材采购原币',
      '采购币种',
      '原产地',
      '关税状态',
      '主材到港折算单价(DZD)',
      '综合单价(DZD)',
      '综合合价(DZD)',
      '材料单价获取渠道来源',
    ];
    lines.push(headers.join(','));

    items.forEach((i) => {
      lines.push(
        [
          i.itemNo,
          `"CSCEC-ALG-${i.itemNo}"`,
          `"${i.descriptionZh.replace(/"/g, '""')}"`,
          `"${i.descriptionFr.replace(/"/g, '""')}"`,
          `"${i.spec.replace(/"/g, '""')}"`,
          i.unit,
          i.quantity,
          i.laborDays,
          i.installationCostDzd,
          i.materialPriceOriginal,
          i.materialCurrency,
          `"${i.materialOrigin}"`,
          i.applyTariff ? '+30%关税' : '免关税',
          i.materialCostDzd,
          i.unitPriceDzd,
          i.totalPriceDzd,
          `"${getChannelNameZh(i.priceChannel)}"`,
        ].join(',')
      );
    });

    lines.push('');
    lines.push('【表-03: 编制审批签署栏】');
    lines.push('编制人 (商务造价工程师): 张工,复核人 (项目商务经理): 李工,审定人 (项目总经济师): 陈总,企业印鉴: 中建二局安装工程有限公司海外事业部');

    const csvContent = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '中建二局安装公司_阿尔及利亚240医院_商务标工程量清单综合报价汇总表.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 生成二局安格式标准 Excel XML 文件 (.xlsx / .xls 兼容标准格式)
  const handleDownloadErJuAnExcel = () => {
    // 构造具备专业中建二局安装公司格式的 Excel HTML/XML 格式，支持 Excel 直接完美解析渲染
    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8"/>
        <style>
          body { font-family: 'Microsoft YaHei', 'SimSun', sans-serif; }
          .title { font-size: 16pt; font-weight: bold; text-align: center; color: #004098; }
          .subtitle { font-size: 12pt; font-weight: bold; text-align: center; color: #333333; }
          .meta { font-size: 9pt; color: #666666; text-align: left; }
          table { border-collapse: collapse; width: 100%; margin-top: 10px; }
          th { background-color: #004098; color: #ffffff; font-weight: bold; border: 0.5pt solid #cccccc; padding: 6px; font-size: 10pt; }
          td { border: 0.5pt solid #cccccc; padding: 5px; font-size: 9pt; }
          .num { text-align: right; font-family: 'Consolas', monospace; }
          .center { text-align: center; }
          .total-row { background-color: #f0f7ff; font-weight: bold; color: #004098; }
        </style>
      </head>
      <body>
        <div class="title">中建二局安装工程有限公司</div>
        <div class="subtitle">阿尔及利亚 240 床综合医院项目机电强电工程商务标综合报价汇总表</div>
        <div class="meta">编制单位: 中建二局安装工程有限公司海外分公司 | 投标币种: 阿尔及利亚第纳尔 (DZD) | 汇率基准: 1 CNY = ${exchangeRateCny} DZD | 导出时间: ${new Date().toLocaleString()}</div>
        
        <h3>一、中建二局安装公司 · 投标报价汇总表 (表-01)</h3>
        <table>
          <tr>
            <th>费用项目</th>
            <th>测算依据 / 费率标准</th>
            <th>金额 (DZD)</th>
            <th>折合人民币 (元)</th>
            <th>占总报价比例</th>
          </tr>
          <tr>
            <td>一、分部分项工程直接费</td>
            <td>人材机直接费汇总</td>
            <td class="num">${totalDirectCostDzd.toLocaleString()}</td>
            <td class="num">¥${Math.round(totalDirectCostDzd / exchangeRateCny).toLocaleString()}</td>
            <td class="center">${calcPct(totalDirectCostDzd, totalBidAmountDzd)}</td>
          </tr>
          <tr>
            <td>&nbsp;&nbsp;1.1 主材采购费</td>
            <td>原币到港折算 + 30%关税(CNY) + 9%运杂</td>
            <td class="num">${totalMaterialCostDzd.toLocaleString()}</td>
            <td class="num">¥${Math.round(totalMaterialCostDzd / exchangeRateCny).toLocaleString()}</td>
            <td class="center">${calcPct(totalMaterialCostDzd, totalBidAmountDzd)}</td>
          </tr>
          <tr>
            <td>&nbsp;&nbsp;1.2 安装工程定额费</td>
            <td>定额工日基数 ${globalParams.laborBaseRate} DZD + 辅材机械测算系数 1.1</td>
            <td class="num">${totalInstallationCostDzd.toLocaleString()}</td>
            <td class="num">¥${Math.round(totalInstallationCostDzd / exchangeRateCny).toLocaleString()}</td>
            <td class="center">${calcPct(totalInstallationCostDzd, totalBidAmountDzd)}</td>
          </tr>
          <tr>
            <td>二、综合管理取费</td>
            <td>人材机直接费 × 10% 取费率</td>
            <td class="num">${totalManagementCostDzd.toLocaleString()}</td>
            <td class="num">¥${Math.round(totalManagementCostDzd / exchangeRateCny).toLocaleString()}</td>
            <td class="center">${calcPct(totalManagementCostDzd, totalBidAmountDzd)}</td>
          </tr>
          <tr class="total-row">
            <td>投标总报价合计 (DZD)</td>
            <td>直接费 + 综合管理取费</td>
            <td class="num">${totalBidAmountDzd.toLocaleString()} DZD</td>
            <td class="num">¥${totalBidAmountCny.toLocaleString()} 元</td>
            <td class="center">100.0%</td>
          </tr>
        </table>

        <h3>二、中建二局安装公司 · 分部分项工程量清单计价明细表 (表-02)</h3>
        <table>
          <tr>
            <th>序号</th>
            <th>清单项目描述 (中文)</th>
            <th>法语描述</th>
            <th>规格型号</th>
            <th>单位</th>
            <th>工程量</th>
            <th>定额工日</th>
            <th>主材原币</th>
            <th>币种</th>
            <th>产地/关税</th>
            <th>到港主材费(DZD)</th>
            <th>综合单价(DZD)</th>
            <th>综合合价(DZD)</th>
            <th>单价获取渠道来源</th>
          </tr>
          ${items
            .map(
              (i) => `
            <tr>
              <td class="center">${i.itemNo}</td>
              <td>${i.descriptionZh}</td>
              <td style="color:#666666; font-style:italic;">${i.descriptionFr}</td>
              <td>${i.spec}</td>
              <td class="center">${i.unit}</td>
              <td class="num">${i.quantity}</td>
              <td class="num">${i.laborDays}</td>
              <td class="num">${i.materialPriceOriginal.toLocaleString()}</td>
              <td class="center">${i.materialCurrency}</td>
              <td class="center">${i.materialOrigin} (${i.applyTariff ? '+30%关税' : '免税'})</td>
              <td class="num">${i.materialCostDzd.toLocaleString()}</td>
              <td class="num" style="font-weight:bold;">${i.unitPriceDzd.toLocaleString()}</td>
              <td class="num" style="font-weight:bold; color:#004098;">${i.totalPriceDzd.toLocaleString()}</td>
              <td class="center">${getChannelNameZh(i.priceChannel)}</td>
            </tr>
          `
            )
            .join('')}
          <tr class="total-row">
            <td colspan="12" style="text-align:right;">清单投标合价总计:</td>
            <td class="num">${totalBidAmountDzd.toLocaleString()} DZD</td>
            <td></td>
          </tr>
        </table>

        <br/>
        <table>
          <tr>
            <td><strong>编制人 (商务造价工程师):</strong> 张工</td>
            <td><strong>复核人 (项目商务经理):</strong> 李工</td>
            <td><strong>审定人 (项目总经济师):</strong> 陈总</td>
            <td><strong>编制单位:</strong> 中建二局安装工程有限公司</td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '中建二局安装公司_阿尔及利亚240医院_商务标工程量清单综合报价汇总表.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 标书条款正文
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden text-xs flex flex-col max-h-[92vh]">
        {/* 头部信息 */}
        <div className="p-4 px-6 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-900 via-blue-950 to-indigo-950 text-white">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-400/30">
              <FileSpreadsheet className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/20 text-white">
                  二局安标准工程汇总表
                </span>
                <h3 className="text-sm font-bold tracking-tight">
                  中建二局安装工程有限公司 · 商务标工程量清单综合报价成果导出
                </h3>
              </div>
              <p className="text-[11px] text-blue-200 mt-0.5">
                阿尔及利亚 240 床综合医院机电强电标段 · 满足中建海外商务标清标审计与二局安标准报表规范
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 选项卡 */}
        <div className="px-6 pt-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('erjuan_summary')}
              className={`px-3 py-2 border-b-2 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'erjuan_summary'
                  ? 'border-blue-700 text-blue-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-blue-700" />
              <span>1. 二局安标准工程报价汇总表 (表-01)</span>
            </button>
            <button
              onClick={() => setActiveTab('boq_detail')}
              className={`px-3 py-2 border-b-2 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'boq_detail'
                  ? 'border-blue-700 text-blue-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-700" />
              <span>2. 分部分项清单明细表 (含4渠道溯源) (表-02)</span>
            </button>
            <button
              onClick={() => setActiveTab('proposal')}
              className={`px-3 py-2 border-b-2 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'proposal'
                  ? 'border-blue-700 text-blue-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-blue-700" />
              <span>3. 商务标通用条款正文 (含变量穿透)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadErJuAnCsv}
              className="inline-flex items-center gap-1 px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg shadow-2xs font-semibold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>导出 CSV</span>
            </button>
            <button
              onClick={handleDownloadErJuAnExcel}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded-lg shadow-sm font-semibold cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
              <span>导出二局安汇总表 Excel</span>
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Tab 1: 二局安标准总报价汇总表预览 */}
          {activeTab === 'erjuan_summary' && (
            <div className="space-y-4">
              {/* 二局安红头与报表表头 */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <div className="text-center pb-3 border-b border-slate-200">
                  <div className="text-lg font-bold text-blue-950 tracking-tight">
                    中建二局安装工程有限公司
                  </div>
                  <div className="text-sm font-bold text-slate-800 mt-0.5">
                    阿尔及利亚 240 床综合医院项目机电强电工程商务标综合报价汇总表
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-center gap-4">
                    <span>编制单位: 中建二局安装工程有限公司海外分公司</span>
                    <span>·</span>
                    <span>投标币种: DZD (阿尔及利亚第纳尔)</span>
                    <span>·</span>
                    <span>汇率基准: 1 CNY = {exchangeRateCny} DZD</span>
                  </div>
                </div>

                {/* 汇总表表-01 */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-blue-900 text-white text-[11px]">
                      <tr>
                        <th className="p-2.5 pl-3">费用项目</th>
                        <th className="p-2.5">测算依据 / 费率标准</th>
                        <th className="p-2.5 text-right font-mono">金额 (DZD)</th>
                        <th className="p-2.5 text-right font-mono">折合人民币 (元)</th>
                        <th className="p-2.5 text-center pr-3">占总报价比例</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      <tr className="hover:bg-slate-50 font-medium">
                        <td className="p-2.5 pl-3">一、分部分项工程直接费</td>
                        <td className="p-2.5 text-slate-600">人材机直接费汇总</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                          {totalDirectCostDzd.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-600">
                          ¥{Math.round(totalDirectCostDzd / exchangeRateCny).toLocaleString()}
                        </td>
                        <td className="p-2.5 text-center pr-3 font-semibold text-slate-700">
                          {calcPct(totalDirectCostDzd, totalBidAmountDzd)}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50 text-slate-700">
                        <td className="p-2.5 pl-6 text-slate-600">1.1 主材采购费 (含原币、关税与运杂)</td>
                        <td className="p-2.5 text-slate-500">原币折算 + 30%关税(CNY) + 9%运杂</td>
                        <td className="p-2.5 text-right font-mono">{totalMaterialCostDzd.toLocaleString()}</td>
                        <td className="p-2.5 text-right font-mono text-slate-500">
                          ¥{Math.round(totalMaterialCostDzd / exchangeRateCny).toLocaleString()}
                        </td>
                        <td className="p-2.5 text-center pr-3 text-slate-500">
                          {calcPct(totalMaterialCostDzd, totalBidAmountDzd)}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50 text-slate-700">
                        <td className="p-2.5 pl-6 text-slate-600">1.2 安装工程定额费 (人工/辅材/机械)</td>
                        <td className="p-2.5 text-slate-500">
                          定额工日基数 {globalParams.laborBaseRate} DZD + 辅材机械测算系数 1.1
                        </td>
                        <td className="p-2.5 text-right font-mono">{totalInstallationCostDzd.toLocaleString()}</td>
                        <td className="p-2.5 text-right font-mono text-slate-500">
                          ¥{Math.round(totalInstallationCostDzd / exchangeRateCny).toLocaleString()}
                        </td>
                        <td className="p-2.5 text-center pr-3 text-slate-500">
                          {calcPct(totalInstallationCostDzd, totalBidAmountDzd)}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50 font-medium">
                        <td className="p-2.5 pl-3">二、综合管理取费</td>
                        <td className="p-2.5 text-slate-600">人材机直接费 × 10% 取费率</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                          {totalManagementCostDzd.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-600">
                          ¥{Math.round(totalManagementCostDzd / exchangeRateCny).toLocaleString()}
                        </td>
                        <td className="p-2.5 text-center pr-3 font-semibold text-slate-700">
                          {calcPct(totalManagementCostDzd, totalBidAmountDzd)}
                        </td>
                      </tr>
                      <tr className="bg-blue-50/70 font-bold text-blue-900 border-t-2 border-blue-200">
                        <td className="p-3 pl-3 text-sm">投标总报价合计 (DZD)</td>
                        <td className="p-3 text-xs">直接费 + 综合管理取费</td>
                        <td className="p-3 text-right font-mono text-base text-blue-900">
                          {totalBidAmountDzd.toLocaleString()} DZD
                        </td>
                        <td className="p-3 text-right font-mono text-sm text-blue-800">
                          ¥{totalBidAmountCny.toLocaleString()} 元
                        </td>
                        <td className="p-3 text-center pr-3 text-sm">100.0%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 审批签署栏 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-200 text-[11px] text-slate-600">
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                    <span className="text-slate-400 block">编制人 (商务造价工程师)</span>
                    <span className="font-semibold text-slate-800 mt-1 block">张工 (海外商务部)</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                    <span className="text-slate-400 block">复核人 (项目商务经理)</span>
                    <span className="font-semibold text-slate-800 mt-1 block">李工 (机电商务经理)</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                    <span className="text-slate-400 block">审定人 (项目总经济师)</span>
                    <span className="font-semibold text-slate-800 mt-1 block">陈总 (国际工程首席商务官)</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                    <span className="text-slate-400 block">企业公章与印鉴</span>
                    <span className="font-semibold text-blue-900 mt-1 block">中建二局安装工程有限公司</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: 分部分项清单明细表 */}
          {activeTab === 'boq_detail' && (
            <div className="space-y-3">
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[60vh] overflow-y-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0 font-semibold">
                    <tr>
                      <th className="p-2 pl-3 w-16">序号</th>
                      <th className="p-2 min-w-[200px]">清单项目描述 (中文/法文)</th>
                      <th className="p-2 min-w-[130px]">规格型号</th>
                      <th className="p-2 text-center w-14">单位</th>
                      <th className="p-2 text-right w-18">工程量</th>
                      <th className="p-2 text-right min-w-[110px]">主材原币采购价</th>
                      <th className="p-2 text-right min-w-[110px]">综合单价 (DZD)</th>
                      <th className="p-2 text-right min-w-[120px]">综合合价 (DZD)</th>
                      <th className="p-2 min-w-[140px] pr-3">单价获取渠道来源</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-slate-800">
                    {items.map((i) => (
                      <tr key={i.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2 pl-3 font-mono font-semibold text-blue-900">{i.itemNo}</td>
                        <td className="p-2">
                          <div className="font-medium">{i.descriptionZh}</div>
                          <div className="text-[10px] text-slate-400 italic truncate max-w-xs">
                            {i.descriptionFr}
                          </div>
                        </td>
                        <td className="p-2 font-mono text-[10px] text-slate-600">{i.spec}</td>
                        <td className="p-2 text-center">{i.unit}</td>
                        <td className="p-2 text-right font-mono">{i.quantity}</td>
                        <td className="p-2 text-right font-mono">
                          {i.materialPriceOriginal.toLocaleString()} {i.materialCurrency}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900">
                          {i.unitPriceDzd.toLocaleString()}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-blue-900">
                          {i.totalPriceDzd.toLocaleString()}
                        </td>
                        <td className="p-2 pr-3">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {getChannelNameZh(i.priceChannel)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: 标书通用条款正文 */}
          {activeTab === 'proposal' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-600">已自动完成全案变量穿透替换 (如预付款、投标总价、履约保证)</span>
                <button
                  onClick={handleCopyProposal}
                  className="px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-white" />}
                  <span>{copied ? '已复制全案文本' : '一键复制标书文本'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 font-sans text-xs whitespace-pre-wrap max-h-[55vh] overflow-y-auto leading-relaxed">
                {getFullResolvedProposalText()}
              </pre>
            </div>
          )}
        </div>

        {/* 底部按钮栏 */}
        <div className="p-4 px-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-slate-500 text-xs">
            二局安清单共 <strong>{items.length}</strong> 项工程子目 · 投标总合价 <strong>{totalBidAmountDzd.toLocaleString()} DZD</strong>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-semibold transition-colors cursor-pointer"
            >
              关闭
            </button>
            <button
              onClick={handleDownloadErJuAnExcel}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold shadow-md transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>下载二局安汇总表 Excel (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
