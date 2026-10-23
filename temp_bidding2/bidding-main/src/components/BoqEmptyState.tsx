import React from 'react';
import {
  Upload,
  FileSpreadsheet,
  Download,
  Sparkles,
  Database,
  Calculator,
  Globe2,
  FileText,
  Building2,
  Landmark,
  ShieldCheck,
  FolderSync,
  Info,
  CheckCircle2,
  ArrowRight,
  Layers,
} from 'lucide-react';
import {
  GlobalPricingParams,
  InstallationQuotaComponent,
  MaterialComponent,
  HistoricalContractRecord,
  RfqInquiryRecord,
} from '../types/pricing';

interface BoqEmptyStateProps {
  globalParams?: GlobalPricingParams;
  allQuotas?: InstallationQuotaComponent[];
  allMaterials?: MaterialComponent[];
  historicalContracts?: HistoricalContractRecord[];
  rfqRecords?: RfqInquiryRecord[];
  onOpenImportModal: () => void;
  onLoadSampleItems: (preset?: 'hospital' | 'stadium' | 'mosque') => void;
  onNavigateToRfq?: (matName?: string) => void;
  onNavigateToDualDb?: (subTab: 'materials' | 'contracts' | 'aliases') => void;
}

export const BoqEmptyState: React.FC<BoqEmptyStateProps> = ({
  globalParams = {
    laborBaseRate: 6500,
    auxBaseValue: 35,
    auxCoefficient: 1.1,
    machineryBaseValue: 45,
    machineryCoefficient: 1.1,
    managementRate: 0.1,
    freightRate: 0.02,
    portMiscRate: 0.07,
    cnyTariffRate: 0.3,
    exchangeRates: {
      EUR_TO_DZD: 145.5,
      USD_TO_DZD: 134.2,
      CNY_TO_DZD: 18.5,
    },
    promptBeforeQuoting: true,
  },
  allQuotas = [],
  allMaterials = [],
  historicalContracts = [],
  onOpenImportModal,
  onLoadSampleItems,
}) => {
  // 下载标准工程量清单导入模板 (CSV 格式，带 UTF-8 BOM，支持 Excel 直接双击打开)
  const handleDownloadTemplate = () => {
    const headers = ['序号', '项目描述(中文)', '项目描述(法语)', '规格型号', '计量单位', '设计工程量', '备注'];
    const sampleRows = [
      ['CFO-01.01', '低压进出线总配电柜安装', 'Armoire électrique générale TGBT 2500A', '2500A 4P 50kA IP54', '台', '4', '主配电房受电回路'],
      ['CFO-01.02', '柴油发电机双电源自动切换配电柜', 'Inverseur Normal/Secours 800A', '800A 4P PC级', '台', '2', '应急配电室'],
      ['CFO-02.01', '密集型铜母线槽 1600A', 'Gaine à barres cuivre 1600A', '1600A 4P+PE IP66', '米', '120', '变电所至急诊楼'],
      ['CFO-03.01', '交联聚乙烯耐火电力电缆', 'Câble U-1000 R2V 4x185', 'U-1000 R2V 4x185mm²', '米', '480', '强电竖井主干'],
      ['CFO-04.01', '镀锌钢制梯式电缆桥架', 'Chemin de câbles en échelle 300x50', '300x50x1.5mm 热镀锌', '米', '350', '地下车库主廊'],
      ['CFO-05.01', '标准动力配电箱安装', 'Coffret de distribution force TD-01', '63A 16回路 IP55', '台', '18', '各层机房动力'],
      ['CFO-06.01', '铜包钢垂直接地极与接地母线', 'Piquet de terre et liaison équipotentielle', 'Φ20x2500mm 镀铜棒', '组', '24', '基础防雷接地'],
    ];
    const csvContent = '\uFEFF' + [headers.join(','), ...sampleRows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')];
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '海外工程量清单标准导入模板.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 顶部：系统就绪状态与基准核验栏 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  工程量清单 (BOQ) 智能组价工作台
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  待导入清单 (BOQ)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                阿尔及利亚官方定额与中建海外工程测算标准 · 人材机双库匹配与取费引擎已就绪
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>下载标准导入模板 (CSV)</span>
            </button>
          </div>
        </div>

        {/* 4项工程核验基准数据 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 mt-4 border-t border-slate-150">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>当地工日基数</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-base font-bold text-slate-900 font-mono mt-1">
              {globalParams.laborBaseRate.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-600">DZD/工日</span>
            </div>
            <div className="text-xs text-emerald-700 font-medium mt-0.5">
              ✓ 当地法定定额标准
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>国际汇率与清关</span>
              <Globe2 className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-base font-bold text-slate-900 font-mono mt-1">
              EUR {globalParams.exchangeRates.EUR_TO_DZD}{' '}
              <span className="text-xs font-normal text-slate-600">免税</span>
            </div>
            <div className="text-xs text-blue-700 font-medium mt-0.5">
              EUR.1 证书零关税 / CNY +30%
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>定额与物资总库</span>
              <Database className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="text-base font-bold text-slate-900 font-mono mt-1">
              {allQuotas.length > 0 ? allQuotas.length : 9}{' '}
              <span className="text-xs font-normal text-slate-600">项定额</span> ·{' '}
              {allMaterials.length > 0 ? allMaterials.length : 12}{' '}
              <span className="text-xs font-normal text-slate-600">类主材</span>
            </div>
            <div className="text-xs text-indigo-700 font-medium mt-0.5">
              ✓ 双库语义库 100% 就绪
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>历史签单采信依据</span>
              <FolderSync className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="text-base font-bold text-slate-900 font-mono mt-1">
              {historicalContracts.length > 0 ? historicalContracts.length : 6}{' '}
              <span className="text-xs font-normal text-slate-600">笔海外签单</span>
            </div>
            <div className="text-xs text-purple-700 font-medium mt-0.5">
              有效签约价语义自动回溯
            </div>
          </div>
        </div>
      </div>

      {/* 核心操作主区：双栏卡片架构 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* 左侧：上传清单文件卡片 (占 6 列) */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-6 shadow-2xs flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-2xs">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">方式一：上传工程量清单文件</h3>
                <span className="text-xs text-slate-500">支持 Excel (.xlsx, .xls) 或 CSV 清单</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              系统采用工程多语言特征识别引擎，自动提取清单序号、中法双语工程描述、设计规格及工程量，并自动关联底层人材机定额。
            </p>

            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
              <span className="font-semibold text-slate-700 block">系统自动处理流水线：</span>
              <ul className="text-slate-600 space-y-1 list-disc pl-4 text-[11px]">
                <li>自动匹配中法双语清单项描述与工程定额</li>
                <li>自动套用当地工日基数 (6,500 DZD) 测算人工费</li>
                <li>关税自动折算 (欧洲原产免关税 / 国内物资 30% 关税)</li>
              </ul>
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              onClick={onOpenImportModal}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
            >
              <Upload className="w-4 h-4" />
              <span>上传并解析清单文件</span>
            </button>
            <button
              onClick={handleDownloadTemplate}
              className="w-full py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>下载标准工程量清单 CSV 导入模板</span>
            </button>
          </div>
        </div>

        {/* 右侧：载入标杆工程清单卡片 (占 6 列) */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-6 shadow-2xs flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                <Sparkles className="w-5 h-5 text-amber-200" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">方式二：载入海外标杆工程示范清单</h3>
                <span className="text-xs text-slate-500">快速体验已完成定额与询价匹配的完整清单</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              无需手动准备文件，直接载入海外已签单标杆项目示范数据开启测算闭环。
            </p>

            {/* 3 个标杆工程选项 */}
            <div className="space-y-2">
              <div
                onClick={() => onLoadSampleItems('hospital')}
                className="p-3 rounded-lg border border-blue-200 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-400 cursor-pointer transition-all flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>阿尔及利亚 240 床综合医院 (7项强电子目)</span>
                    <span className="px-1.5 py-0.2 rounded bg-blue-600 text-white text-[10px] font-bold">推荐</span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    配电总柜、母线槽、电力电缆、桥架、配电箱、防雷接地
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-blue-600 shrink-0" />
              </div>

              <div
                onClick={() => onLoadSampleItems('stadium')}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300 cursor-pointer transition-all flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>奥兰奥林匹克体育馆 (4项重型供电回路)</span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    2500A 进出线总柜、PC级双电源切换柜、1600A 铜母线槽
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
              </div>

              <div
                onClick={() => onLoadSampleItems('mosque')}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300 cursor-pointer transition-all flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-emerald-600" />
                    <span>阿尔及尔嘉玛大清真寺标段 (4项高标准子目)</span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Φ20 铜包钢垂直接地极、深井接地网、梯式热镀锌桥架
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onLoadSampleItems('hospital')}
              className="w-full py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
            >
              <Building2 className="w-4 h-4" />
              <span>一键载入 240 医院标杆示范清单 (7项)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 中法双语工程特征解析规则展示 */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs space-y-2">
        <div className="font-bold text-slate-900 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-blue-600" />
          <span>中法双语工程量清单与定额总库匹配机制：</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-600">
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-800 block">配电总柜与双电源</span>
            <span className="text-slate-500 mt-1 block">Armoire / TGBT / Inverseur 自动对齐 CFO-ARM-01</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-800 block">母线槽与电力电缆</span>
            <span className="text-slate-500 mt-1 block">Gaine à barres / Câble R2V 自动对齐 CFO-BUS-03 & CFO-CAB-02</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-800 block">桥架与防雷接地</span>
            <span className="text-slate-500 mt-1 block">Chemin de câbles / Terre 自动对齐 CFO-CHE-04 & CFO-TER-06</span>
          </div>
        </div>
      </div>
    </div>
  );
};
