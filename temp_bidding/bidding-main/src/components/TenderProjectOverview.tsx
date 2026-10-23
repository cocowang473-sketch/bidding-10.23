import React from 'react';
import {
  FolderArchive,
  FileText,
  Calculator,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Globe2,
  Building2,
  Upload,
  Download,
  FileCode,
  FileSpreadsheet,
  AlertCircle,
  ExternalLink,
  Tag,
  Check,
  Layers,
  Sparkles,
  Printer,
} from 'lucide-react';
import { TenderProject } from '../types/tenderProject';
import { TenderAttachment } from '../types/tenderAttachment';
import { ProposalSection } from '../types/proposalVariables';
import { BoqItem } from '../types/pricing';

interface TenderProjectOverviewProps {
  tender: TenderProject;
  onNavigateToSubTab: (subTab: 'attachments' | 'variables' | 'preview' | 'boq') => void;
  onNavigateToAttachmentsSubTab?: (subView: 'vault' | 'matrix' | 'upload') => void;
  onOpenExportModal?: () => void;
  onInspectAttachment?: (attachment: TenderAttachment) => void;
}

export const TenderProjectOverview: React.FC<TenderProjectOverviewProps> = ({
  tender,
  onNavigateToSubTab,
  onNavigateToAttachmentsSubTab,
  onOpenExportModal,
  onInspectAttachment,
}) => {
  const attachments = tender.attachments || [];
  const variableValues = tender.variableValues || {};
  const boqItems = tender.boqItems || [];
  const varCount = Object.keys(variableValues).length;

  // 计算工程量清单综合总价 (若已组价)
  const totalBoqCostDzd = boqItems.reduce(
    (sum, item) => sum + (item.totalPriceDzd || (item.unitPriceDzd ? item.unitPriceDzd * item.quantity : 0)),
    0
  );

  const renderFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'dwg':
        return <FileCode className="w-5 h-5 text-indigo-600" />;
      case 'xlsx':
      case 'xls':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-600" />;
      case 'docx':
      case 'doc':
        return <FileText className="w-5 h-5 text-blue-600" />;
      default:
        return <FolderArchive className="w-5 h-5 text-amber-600" />;
    }
  };

  // 标段关键商务条款速查清单
  const keyTerms = [
    {
      label: '招标编号',
      value: tender.code,
      key: 'tender_code',
      desc: '官方招标文件正式备案文号',
    },
    {
      label: '工程地点',
      value: variableValues['project_location'] || '阿尔及利亚 提济乌祖省 (Tizi Ouzou)',
      key: 'project_location',
      desc: '施工总承包现场所在国及省份',
    },
    {
      label: '合同工期',
      value: variableValues['project_duration_months'] ? `${variableValues['project_duration_months']} 个月` : '24 个日历月',
      key: 'project_duration_months',
      desc: '开工令签发日起计总工期',
    },
    {
      label: '投标保证金',
      value: variableValues['bid_bond_amount'] || '15,000,000 DZD (不可撤销见索即付)',
      key: 'bid_bond_amount',
      desc: '一级商业银行出具投标保函',
    },
    {
      label: '履约保函比例',
      value: variableValues['performance_bond_rate'] || '合同总价的 10%',
      key: 'performance_bond_rate',
      desc: '中标后开具至最终验收',
    },
    {
      label: '预付款比例',
      value: variableValues['advance_payment_rate'] || '合同总价的 15%',
      key: 'advance_payment_rate',
      desc: '凭等额预付款保函支付',
    },
    {
      label: '工程质保期',
      value: variableValues['warranty_period'] || '24 个月 (竣工验收移交起计)',
      key: 'warranty_period',
      desc: '机电系统与强电缺陷责任期',
    },
    {
      label: '结算与支付货币',
      value: `${tender.currency} (100% 当地币对公转账结算)`,
      key: 'currency',
      desc: '遵循阿尔及利亚公共采购法典',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 顶部：标段核心指标仪表板 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 指标 1: 官方文件归档 */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-blue-400 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>官方招标文件归档</span>
            <FolderArchive className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
            {attachments.length}{' '}
            <span className="text-xs font-normal text-slate-500">份原件</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>中法双语原件包解构完成</span>
          </div>
        </div>

        {/* 指标 2: 锁定的标书变量 */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-blue-400 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>商务技术变量锁定</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-700 mt-2">
            {varCount}{' '}
            <span className="text-xs font-normal text-slate-500">项锁定</span>
          </div>
          <div className="text-[11px] text-blue-700 font-medium mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>自动穿透替换标书全案</span>
          </div>
        </div>

        {/* 指标 3: 清单组价进度 */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-blue-400 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>工程量清单 (BQE) 组价</span>
            <Calculator className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-2">
            {boqItems.length > 0 ? (
              <>
                {boqItems.length}{' '}
                <span className="text-xs font-normal text-slate-500">项子目</span>
              </>
            ) : (
              <span className="text-slate-400 text-lg">待导入清单</span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1 truncate">
            {totalBoqCostDzd > 0 ? (
              <span className="text-slate-700 font-mono font-semibold">
                测算造价: {totalBoqCostDzd.toLocaleString()} {tender.currency}
              </span>
            ) : (
              <span>阿尔及利亚工日定额已就绪</span>
            )}
          </div>
        </div>

        {/* 指标 4: 截标与履约倒计时 */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-blue-400 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>截标截止时间</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-2 truncate">
            {tender.deadline}
          </div>
          <div className="text-[11px] text-amber-800 font-medium mt-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>编制窗口期内，建议提早 3 天封标</span>
          </div>
        </div>
      </div>

      {/* 核心三板块流水线协同卡片 (深度契合用户标书作业体系) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              标段作业三板块流水线 (流水线协同与独立隔离)
            </h2>
            <p className="text-xs text-slate-500">
              本标段拥有独立的官方原件库、变量库、条款组件与造价清单，可随时穿透作业
            </p>
          </div>
          {onOpenExportModal && (
            <button
              type="button"
              onClick={onOpenExportModal}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>导出中法双语标书整包</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* 板块 1 卡片：招标公告与官方文件解析 */}
          <div className="bg-white rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-sm transition-all p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  板块 1: 招标公告与官方文件
                </span>
                <FolderArchive className="w-5 h-5 text-indigo-600" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  官方原件解包、档案库与变量提取
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  归档业主发出的官方招标文件 (Cahier des Charges)、技术规范 (CCTP)、施工图纸及清单包，解包后自动锁定商务变量与人工补齐项。
                </p>
              </div>

              {/* 状态清单 */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-150 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">已归档官方原件:</span>
                  <span className="font-bold text-indigo-700 font-mono">{attachments.length} 份原件</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">核心卷册解析覆盖:</span>
                  <span className="font-medium text-slate-800">3 份核心 Doc 卷册 (通告/合同/BQE)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">八大板块结构化提取:</span>
                  <span className="text-emerald-700 font-semibold font-mono">
                    36 项提取(绿色) / 12 项待确认
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-150 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  onNavigateToAttachmentsSubTab
                    ? onNavigateToAttachmentsSubTab('vault')
                    : onNavigateToSubTab('attachments')
                }
                className="py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>官方原件方块库</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  onNavigateToAttachmentsSubTab
                    ? onNavigateToAttachmentsSubTab('matrix')
                    : onNavigateToSubTab('attachments')
                }
                className="py-2 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>八大板块提取清单</span>
              </button>
            </div>
          </div>

          {/* 板块 2 卡片：投标须知与标书装配 */}
          <div className="bg-white rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-sm transition-all p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  板块 2: 投标须知与标书装配
                </span>
                <FileText className="w-5 h-5 text-blue-600" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  商务条款响应、组件编制与变量联动
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  装配投标函、商务响应表、履约承诺、施工组织总设计等三大核心标书组件，锁定的变量实时高亮并双向穿透修改。
                </p>
              </div>

              {/* 状态清单 */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-150 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">标书章节组件:</span>
                  <span className="font-bold text-blue-700 font-mono">
                    {tender.proposalSections?.length || 3} 个核心章节
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">锁定变量替换:</span>
                  <span className="font-medium text-slate-800">{varCount} 处全局变量</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">标书交付格式:</span>
                  <span className="text-blue-700 font-medium">中/法双语对照 PDF/Word</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-150 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigateToSubTab('variables')}
                className="flex-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>进入条款装配</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onNavigateToSubTab('preview')}
                className="py-2 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                title="进入交互式 A4 标书动态排版与打印预览"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-600" />
                <span>排版预览</span>
              </button>
            </div>
          </div>

          {/* 板块 3 卡片：投标组件与清单组价 */}
          <div className="bg-white rounded-xl border border-slate-200 hover:border-emerald-400 hover:shadow-sm transition-all p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  板块 3: 投标组件与清单组价
                </span>
                <Calculator className="w-5 h-5 text-emerald-600" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  BQE 量单组价、定额套用与供应链比价
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  基于阿尔及利亚官方人材机定额及历史签单总库，对强电/机电工程量清单进行单价分析、国际税费核算与供应商多商比价。
                </p>
              </div>

              {/* 状态清单 */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-150 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">清单测算状态:</span>
                  <span className="font-bold text-emerald-700 font-mono">
                    {boqItems.length > 0 ? `${boqItems.length} 项已组价` : '待导入量单'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">工日定额基数:</span>
                  <span className="font-medium text-slate-800 font-mono">6,500 DZD/工日</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">欧洲设备免税:</span>
                  <span className="text-emerald-700 font-medium">EUR.1 证书零关税</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-150 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigateToSubTab('boq')}
                className="flex-1 py-2 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>进入清单智能组价</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 标段核心商务与技术条款速查表格 (真实工程专业对标) */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-700" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">
              标段关键商务条款与履约边界速查卡
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToSubTab('variables')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
          >
            <span>修改或核实变量</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-150">
          {keyTerms.map((term) => (
            <div key={term.key} className="p-4 space-y-1 hover:bg-slate-50/60 transition-colors">
              <span className="text-[11px] font-medium text-slate-400 block">{term.label}</span>
              <div className="text-xs sm:text-sm font-bold text-slate-900 font-mono truncate">
                {term.value}
              </div>
              <p className="text-[10px] text-slate-500 truncate">{term.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 官方文档原件方块速览 (前 4 份官方原件方块卡片预览) */}
      {attachments.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderArchive className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                本标段官方归档文档方块库 (共 {attachments.length} 份原件)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToSubTab('attachments')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              <span>查看全部文档方块库</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {attachments.slice(0, 4).map((att) => (
              <div
                key={att.id}
                onClick={() => {
                  if (onInspectAttachment) {
                    onInspectAttachment(att);
                  } else {
                    onNavigateToSubTab('attachments');
                  }
                }}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-xs bg-slate-50/50 hover:bg-white transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-white border border-slate-200 group-hover:border-blue-300 transition-colors">
                      {renderFileIcon(att.fileType)}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {att.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono block truncate mt-0.5">
                        {att.fileSize}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 line-clamp-2 leading-snug">
                    {att.name}
                  </h4>
                  {att.nameFr && (
                    <p className="text-[10px] text-slate-400 italic line-clamp-1 mt-0.5">
                      {att.nameFr}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-mono text-blue-700 font-semibold">
                    {att.linkedVariables.length} 处变量
                  </span>
                  <span className="text-blue-600 font-medium group-hover:underline flex items-center gap-0.5">
                    查看详情 ➔
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
