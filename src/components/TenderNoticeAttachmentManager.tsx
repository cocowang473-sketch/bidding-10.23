import React, { useState, useMemo, useRef } from 'react';
import {
  TenderAttachment,
  AttachmentCategory,
  ATTACHMENT_CATEGORIES,
  ParsedVariableItem,
  TenderPackageParseResult,
} from '../types/tenderAttachment';
import { VariableValues, LanguageMode } from '../types/proposalVariables';
import { INITIAL_PROPOSAL_SECTIONS } from '../data/mockProposalComponents';
import { BilingualProposalExportModal } from './BilingualProposalExportModal';
import { StructuredTenderExtractionMatrix } from './StructuredTenderExtractionMatrix';
import {
  FolderArchive,
  Upload,
  Search,
  CheckCircle2,
  AlertCircle,
  Eye,
  Download,
  X,
  FileCode,
  FileSpreadsheet,
  FileText,
  Paperclip,
  Sparkles,
  Link2,
  Check,
  Globe2,
  ArrowRight,
  Loader2,
  Languages,
  LayoutGrid,
  FileUp,
  Cpu,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
  Layers,
  Clock,
  BookOpen,
  Calculator,
  Plus,
  Trash2,
  FileCheck2,
} from 'lucide-react';

export interface StagedFileItem {
  id: string;
  name: string;
  nameFr?: string;
  size: string;
  fileType: 'zip' | 'pdf' | 'dwg' | 'xlsx' | 'docx';
  category: AttachmentCategory;
  categoryLabel: string;
  categoryLabelFr: string;
  langTag: 'fr' | 'zh' | 'bilingual';
  docNumber: string;
  status: 'ready' | 'processing' | 'done';
  summaryZh: string;
  summaryFr: string;
}

interface TenderNoticeAttachmentManagerProps {
  attachments: TenderAttachment[];
  variableValues: VariableValues;
  onAddAttachment: (attachment: TenderAttachment) => void;
  onAddParsedPackage?: (result: TenderPackageParseResult) => void;
  onUpdateAttachment: (attachment: TenderAttachment) => void;
  onDeleteAttachment: (id: string) => void;
  onUpdateVariable: (key: string, value: string) => void;
  onBatchUpdateVariables?: (updates: Record<string, string>) => void;
  onJumpToVariable?: (variableKey: string) => void;
  onJumpToSection?: (sectionKey: string) => void;
  onJumpToBoq?: () => void;
  onNavigateToInstructions?: () => void;
  selectedVariableFilter?: string | null;
  onClearVariableFilter?: () => void;
  defaultTab?: 'upload' | 'vault' | 'matrix';
}

// 预设待解析暂存文件列表
const DEFAULT_STAGED_FILES: StagedFileItem[] = [
  {
    id: 'STAGE-01',
    name: '官方公开招标通告正文 (Avis d\'Appel d\'Offres BOMOP)',
    nameFr: 'Avis d\'Appel d\'Offres International (BOMOP N° 1482)',
    size: '2.1 MB',
    fileType: 'pdf',
    category: 'legal',
    categoryLabel: '招标法规',
    categoryLabelFr: 'Avis Légal',
    langTag: 'fr',
    docNumber: 'DZ-SANTE-2026-CFO-009',
    status: 'ready',
    summaryZh: '载明工程名称、招标编号、招标人名称等 3 项法定商务基础变量。',
    summaryFr: 'Publié au BOMOP, contient l\'intitulé et le numéro officiel d\'appel d\'offres.',
  },
  {
    id: 'STAGE-02',
    name: '投标须知及评审办法细则 (Règlement de la Consultation - RC)',
    nameFr: 'Règlement de la Consultation (RC)',
    size: '4.8 MB',
    fileType: 'pdf',
    category: 'legal',
    categoryLabel: '招标须知',
    categoryLabelFr: 'Instructions RC',
    langTag: 'fr',
    docNumber: 'RC-DZ-2026',
    status: 'ready',
    summaryZh: '载明截标时间 2026-11-20、投标有效期 90 天及保函金额 25,000,000 DZD。',
    summaryFr: 'Fixe la date limite au 20/11/2026, la caution et la validité des offres.',
  },
  {
    id: 'STAGE-03',
    name: '强电与动力专用技术规格书 (CCTP Courants Forts)',
    nameFr: 'CCTP Lot 09 - Électricité & Courants Forts',
    size: '12.4 MB',
    fileType: 'pdf',
    category: 'specs',
    categoryLabel: '技术规范',
    categoryLabelFr: 'Spécifications CCTP',
    langTag: 'fr',
    docNumber: 'CCTP-DZ-2026',
    status: 'ready',
    summaryZh: '强制符合法国 NF C 15-100 标准、质保期 2 年及 2 小时维保响应指标。',
    summaryFr: 'Exigences techniques NF C 15-100, garantie de 2 ans et délai d\'intervention 2h.',
  },
  {
    id: 'STAGE-04',
    name: '工程量估算与报价清单模版 (Bordereau Quantitatif Estimatif - BQE)',
    nameFr: 'BQE Bordereau Quantitatif Estimatif Lot 09',
    size: '3.6 MB',
    fileType: 'xlsx',
    category: 'financial',
    categoryLabel: '清单模版',
    categoryLabelFr: 'Bordereau BQE',
    langTag: 'bilingual',
    docNumber: 'BQE-DZ-2026',
    status: 'ready',
    summaryZh: '包含 7 项核心强电清单子目工程量，已对齐 DZD 当地货币与中法双语科目。',
    summaryFr: 'Quantités estimatives du lot électricité pour chiffrage direct en DZD.',
  },
];

export const TenderNoticeAttachmentManager: React.FC<TenderNoticeAttachmentManagerProps> = ({
  attachments,
  variableValues,
  onAddAttachment,
  onAddParsedPackage,
  onUpdateAttachment,
  onDeleteAttachment,
  onUpdateVariable,
  onBatchUpdateVariables,
  onJumpToVariable,
  onJumpToSection,
  onJumpToBoq,
  onNavigateToInstructions,
  selectedVariableFilter = null,
  onClearVariableFilter,
  defaultTab,
}) => {
  // 顶层三主视图切换：
  // 'vault'  = 官方文件与变量档案库 (方块网格库，点进每个方块查看变量与处理相关文件)
  // 'matrix' = 基于三个核心Doc文件的结构化表单字段清单 (八大板块，绿色已提取 vs 待确认建议项)
  // 'upload' = 文件上传与即时解包解析工作台 (未上传时左边上传、右边文件列表，点击开始处理进入解析页面)
  const [mainViewTab, setMainViewTab] = useState<'upload' | 'vault' | 'matrix'>(
    defaultTab || (attachments && attachments.length > 0 ? 'vault' : 'upload')
  );

  // 上传解析子阶段：'staging' (未开始/待处理) | 'processing' (解包中) | 'parsed' (已进入解析页面)
  const [parsingStage, setParsingStage] = useState<'staging' | 'processing' | 'parsed'>('staging');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStepText, setCurrentStepText] = useState('正在读取文件结构...');

  // 上传暂存文件列表
  const [stagedFiles, setStagedFiles] = useState<StagedFileItem[]>(DEFAULT_STAGED_FILES);
  const [selectedLanguageForUpload, setSelectedLanguageForUpload] = useState<'fr' | 'zh' | 'bilingual'>('fr');

  // 语种显示与中法翻译对照模式：'zh' (中文) | 'fr' (法语) | 'bilingual' (中法双语对照)
  const [langMode, setLangMode] = useState<LanguageMode>('bilingual');

  // 历史方块库：搜索与分类过滤
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AttachmentCategory | 'all'>('all');
  const [activeVariableFilter, setActiveVariableFilter] = useState<string | null>(selectedVariableFilter);

  // 模态弹窗与查看器状态
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentParsedResult, setCurrentParsedResult] = useState<TenderPackageParseResult | null>(null);
  const [inspectingAttachment, setInspectingAttachment] = useState<TenderAttachment | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [parsedVarFilter, setParsedVarFilter] = useState<'all' | 'extracted' | 'missing'>('all');

  // 本地已编辑的暂存变量 (在解析工作台内直接编辑)
  const [parsedFormValues, setParsedFormValues] = useState<Record<string, string>>({});

  // 快捷采纳微反馈
  const [adoptedFeedback, setAdoptedFeedback] = useState<{
    variableKey: string;
    attachmentId?: string;
  } | null>(null);

  // 同步外部传入过滤变量
  React.useEffect(() => {
    if (selectedVariableFilter !== undefined) {
      setActiveVariableFilter(selectedVariableFilter);
    }
  }, [selectedVariableFilter]);

  // 同步外部指定默认子视图 (方块库 / 八大板块清单 / 上传)
  React.useEffect(() => {
    if (defaultTab) {
      setMainViewTab(defaultTab);
    }
  }, [defaultTab]);

  // 处理真实本地文件选择添加进右侧待解析列表
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
      const isChinese = /[\u4e00-\u9fa5]/.test(file.name);
      const ext = file.name.split('.').pop()?.toLowerCase();
      let fileType: StagedFileItem['fileType'] = 'pdf';
      if (ext === 'zip' || ext === 'rar') fileType = 'zip';
      else if (ext === 'xlsx' || ext === 'xls') fileType = 'xlsx';
      else if (ext === 'dwg') fileType = 'dwg';
      else if (ext === 'docx' || ext === 'doc') fileType = 'docx';

      const newStaged: StagedFileItem = {
        id: `STAGE-${Date.now().toString().slice(-4)}`,
        name: file.name,
        nameFr: isChinese ? undefined : file.name,
        size: sizeStr,
        fileType,
        category: 'legal',
        categoryLabel: '官方原件',
        categoryLabelFr: 'Pièce Officielle',
        langTag: isChinese ? 'zh' : 'fr',
        docNumber: `DOC-${Date.now().toString().slice(-4)}`,
        status: 'ready',
        summaryZh: '本地上传的官方原件，将在点击「开始处理」后自动提取并锁定变量。',
        summaryFr: 'Fichier local téléversé, prêt pour analyse et verrouillage.',
      };

      setStagedFiles((prev) => [newStaged, ...prev]);
      e.target.value = '';
    }
  };

  // 快捷载入官方工程包
  const handleLoadPresetPackage = (presetType: 'hospital_fr' | 'cscec_bilingual' | 'drawings_cad') => {
    if (presetType === 'hospital_fr') {
      setStagedFiles(DEFAULT_STAGED_FILES);
      setSelectedLanguageForUpload('fr');
    } else if (presetType === 'cscec_bilingual') {
      const bilingualFiles: StagedFileItem[] = [
        {
          id: `STAGE-CSCEC-01`,
          name: '中建二局阿尔及利亚工程总包招标文件正文',
          nameFr: 'Dossier d\'Appel d\'Offres CSCEC-II Algérie - Lot Courants Forts',
          size: '6.4 MB',
          fileType: 'pdf',
          category: 'legal',
          categoryLabel: '总包文件',
          categoryLabelFr: 'Dossier Général',
          langTag: 'bilingual',
          docNumber: 'CSCEC-DZ-2026-001',
          status: 'ready',
          summaryZh: '包含中法双语合同通用与专用条款、履约保函与付款节点要求。',
          summaryFr: 'Clauses contractuelles bilingues, caution de bonne fin et jalons de paiement.',
        },
        {
          id: `STAGE-CSCEC-02`,
          name: '中法双语强电安装定额与物料清单规范.xlsx',
          nameFr: 'Bordereau Bilingue & Spécifications Électriques.xlsx',
          size: '4.2 MB',
          fileType: 'xlsx',
          category: 'financial',
          categoryLabel: '清单定额',
          categoryLabelFr: 'Bordereau BQE',
          langTag: 'bilingual',
          docNumber: 'BQE-CSCEC-02',
          status: 'ready',
          summaryZh: '全案 12 项物资双语对照及原币基准采购参考价。',
          summaryFr: 'Correspondance bilingue des matériaux et prix d\'achat de référence.',
        },
      ];
      setStagedFiles(bilingualFiles);
      setSelectedLanguageForUpload('bilingual');
    } else {
      const cadFiles: StagedFileItem[] = [
        {
          id: `STAGE-CAD-01`,
          name: '主变电所及急诊楼动力配电施工图纸包.dwg',
          nameFr: 'Plans d\'Exécution Poste Transformateur & TGBT.dwg',
          size: '18.5 MB',
          fileType: 'dwg',
          category: 'drawings',
          categoryLabel: '施工图纸',
          categoryLabelFr: 'Plans DWG',
          langTag: 'fr',
          docNumber: 'DWG-ELEC-01',
          status: 'ready',
          summaryZh: '变电所系统图、母线走向图及高低压配电柜布置平面图。',
          summaryFr: 'Schéma unifilaire du poste transformateur et cheminement de câbles.',
        },
      ];
      setStagedFiles((prev) => [...cadFiles, ...prev]);
    }
  };

  // 点击「开始处理」：启动解包与智能变量锁定，进入解析页面
  const handleStartProcessing = () => {
    if (stagedFiles.length === 0) return;

    setParsingStage('processing');
    setUploadProgress(15);
    setCurrentStepText('正在解压官方原件目录树并校验文件哈希...');

    setTimeout(() => {
      setUploadProgress(45);
      setCurrentStepText('正在执行 OCR 语义提取与中法双语条款对齐...');
    }, 250);

    setTimeout(() => {
      setUploadProgress(78);
      setCurrentStepText('正在锁定 10 项商务技术核心变量，并归整 6 项需人工补齐资质...');
    }, 500);

    setTimeout(() => {
      setUploadProgress(100);
      setCurrentStepText('解析完成！正在生成标书变量联动视图...');

      const pkgName =
        stagedFiles.length > 1
          ? `Dossier-AO-${stagedFiles[0].docNumber}-Pack.zip`
          : stagedFiles[0]?.name || 'Dossier-Appel-Offres.zip';
      const parsed = generateMockPackageParseResult(
        pkgName,
        '48.6 MB',
        variableValues,
        selectedLanguageForUpload
      );
      setCurrentParsedResult(parsed);

      // 初始化表单变量值
      const initForm: Record<string, string> = {};
      parsed.lockedVariables.forEach((v) => {
        initForm[v.variableKey] = v.currentValue || v.extractedValue || '';
      });
      setParsedFormValues(initForm);

      // 自动入库附件至本标段独立附件库
      if (onAddParsedPackage) {
        onAddParsedPackage(parsed);
      } else {
        parsed.unpackedFiles.forEach((f) => onAddAttachment(f));
      }

      setParsingStage('parsed');
    }, 800);
  };

  // 在解析页面内更新单个变量值并实时双向同步
  const handleParsedFormChange = (varKey: string, newVal: string) => {
    setParsedFormValues((prev) => ({
      ...prev,
      [varKey]: newVal,
    }));
    onUpdateVariable(varKey, newVal);
  };

  // 解析页面：一键全部采纳并锁定到全案标书
  const handleConfirmAllParsedVariables = () => {
    if (onBatchUpdateVariables) {
      onBatchUpdateVariables(parsedFormValues);
    } else {
      Object.entries(parsedFormValues).forEach(([k, v]) => onUpdateVariable(k, v));
    }
    setAdoptedFeedback({ variableKey: '__ALL__' });
    setTimeout(() => setAdoptedFeedback(null), 2500);
  };

  // 历史方块库过滤
  const filteredAttachments = useMemo(() => {
    if (!attachments || !Array.isArray(attachments)) return [];
    return attachments.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (activeVariableFilter) {
        const hasVar = item.linkedVariables.some((l) => l.variableKey === activeVariableFilter);
        if (!hasVar) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          (item.nameFr && item.nameFr.toLowerCase().includes(q)) ||
          item.fileName.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          (item.summaryFr && item.summaryFr.toLowerCase().includes(q)) ||
          item.tags.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [attachments, selectedCategory, activeVariableFilter, searchQuery]);

  // 渲染文件图标彩标
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

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto">
      {/* 隐藏的文件输入组件 */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".zip,.rar,.pdf,.dwg,.xlsx,.xls,.docx,.doc"
        className="hidden"
      />


      {/* ========================================================================= */}
      {/* 视图 1: 文件上传与即时解包解析工作台 (未上传左边上传、右边列表，点击开始处理进解析页) */}
      {/* ========================================================================= */}
      {mainViewTab === 'upload' && (
        <div className="p-5 sm:p-6 space-y-5 flex-1">
          {/* 子状态 A: 暂存上传状态 (未上传/待处理阶段：左侧上传板块 + 右侧上传后的文件) */}
          {parsingStage === 'staging' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* 左侧板块：文件上传区 (占 5 列) */}
              <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                      <FileUp className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        官方招标公告与文件包上传
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        支持 ZIP、PDF 招标文件、DWG 图纸及 Excel 清单
                      </p>
                    </div>
                  </div>

                  {/* 拖拽与点击上传热区 */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-blue-200 hover:border-blue-500 hover:bg-blue-50/40 bg-slate-50/60 rounded-xl p-6 text-center cursor-pointer transition-all group"
                  >
                    <div className="w-12 h-12 mx-auto rounded-full bg-blue-100/80 group-hover:bg-blue-600 text-blue-600 group-hover:text-white flex items-center justify-center transition-colors mb-3">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700">
                      点击选择本地文件 或 拖拽至此处上传
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      支持 .ZIP / .RAR / .PDF / .DWG / .XLSX 单文件或整包
                    </p>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[10px] text-slate-600 font-medium mt-3 shadow-2xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>极简免预配置 · 解包后自动提取锁定</span>
                    </div>
                  </div>

                  {/* 语种识别偏好设置 */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <span className="text-[11px] font-semibold text-slate-700 block">
                      招标原件语种识别设定：
                    </span>
                    <div className="grid grid-cols-3 gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setSelectedLanguageForUpload('fr')}
                        className={`py-1.5 px-2 rounded-md font-medium text-center transition-all cursor-pointer border ${
                          selectedLanguageForUpload === 'fr'
                            ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        🇫🇷 法文招标书
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedLanguageForUpload('zh')}
                        className={`py-1.5 px-2 rounded-md font-medium text-center transition-all cursor-pointer border ${
                          selectedLanguageForUpload === 'zh'
                            ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        🇨🇳 中文招标文件
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedLanguageForUpload('bilingual')}
                        className={`py-1.5 px-2 rounded-md font-medium text-center transition-all cursor-pointer border ${
                          selectedLanguageForUpload === 'bilingual'
                            ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        🌐 中法双语包
                      </button>
                    </div>
                  </div>

                  {/* 快捷载入典型工程样例包 */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                      <span>或选用官方示范招标文件包快速测试：</span>
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => handleLoadPresetPackage('hospital_fr')}
                        className="p-2.5 rounded-lg border border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/30 text-left transition-all cursor-pointer group"
                      >
                        <div className="font-semibold text-slate-800 group-hover:text-blue-700 text-xs">
                          🏥 阿尔及利亚 240 医院全套法文标
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          含 BOMOP 通告、RC 须知、CCTP 规格书与 BQE
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleLoadPresetPackage('cscec_bilingual')}
                        className="p-2.5 rounded-lg border border-slate-200 hover:border-emerald-400 bg-white hover:bg-emerald-50/30 text-left transition-all cursor-pointer group"
                      >
                        <div className="font-semibold text-slate-800 group-hover:text-emerald-700 text-xs">
                          🏗️ 中建海外援建中法双语工程包
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          中法双语总包合同专用条款与物料清单
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>系统承诺：原件解析全自动化</span>
                  <span>标书变量秒级提取</span>
                </div>
              </div>

              {/* 右侧板块：上传后的文件清单与预检预览 (占 7 列) */}
              <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-150">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                        <FileCheck2 className="w-4 h-4" />
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">
                        上传后的文件清单 (待处理原件)
                      </h3>
                      <span className="text-[11px] font-mono px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                        {stagedFiles.length} 份文件就绪
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setStagedFiles([])}
                      className="text-xs text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      清空列表
                    </button>
                  </div>

                  {/* 暂存文件条目列表 */}
                  <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto mt-2">
                    {stagedFiles.length === 0 ? (
                      <div className="py-12 text-center text-slate-400">
                        <Paperclip className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="text-xs">暂无待处理文件，请从左侧选择上传或选用样例包</p>
                      </div>
                    ) : (
                      stagedFiles.map((file, idx) => (
                        <div
                          key={file.id}
                          className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-slate-50/80 rounded-lg transition-colors group"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="p-2 rounded-lg bg-slate-100 shrink-0 mt-0.5">
                              {renderFileIcon(file.fileType)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-800 truncate">
                                  {file.name}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono">
                                  {file.size}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                  {file.categoryLabel}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-medium">
                                  {file.langTag === 'fr' ? '🇫🇷 法文' : file.langTag === 'zh' ? '🇨🇳 中文' : '🌐 双语'}
                                </span>
                              </div>

                              {file.nameFr && (
                                <p className="text-[11px] text-slate-500 italic truncate mt-0.5">
                                  {file.nameFr}
                                </p>
                              )}

                              <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                                {file.summaryZh}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              待处理
                            </span>
                            <button
                              type="button"
                              onClick={() => setStagedFiles((prev) => prev.filter((f) => f.id !== file.id))}
                              className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                              title="移除此文件"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 底部核心大操作按钮：点击开始处理进解析页面 */}
                <div className="mt-5 pt-4 border-t border-slate-150 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    <span>共 <strong className="text-slate-900 font-mono">{stagedFiles.length}</strong> 份官方招标文件</span>
                    <span className="mx-1.5 text-slate-300">·</span>
                    <span>预计自动解析提取 <strong className="text-blue-700 font-mono">16 项标书变量</strong></span>
                  </div>

                  <button
                    type="button"
                    disabled={stagedFiles.length === 0}
                    onClick={handleStartProcessing}
                    className="w-full sm:w-auto px-6 py-3 text-xs sm:text-sm font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                  >
                    <Cpu className="w-4 h-4 text-blue-200" />
                    <span>开始处理 / 启动解包与智能解析</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 子状态 B: 正在解压处理中 (Processing Animation) */}
          {parsingStage === 'processing' && (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs max-w-xl mx-auto my-12 space-y-5">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">
                  正在解包并深度解析官方招标文件...
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-mono">{currentStepText}</p>
              </div>

              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>解压目录树</span>
                <span>中法双语 OCR</span>
                <span>锁定 16 项变量</span>
                <span className="font-bold text-blue-600">{uploadProgress}%</span>
              </div>
            </div>
          )}

          {/* 子状态 C: 解析完成工作台页面 (已成功解析并锁定标书变量) */}
          {parsingStage === 'parsed' && currentParsedResult && (
            <div className="space-y-5">
              {/* 顶部解析成功状态横幅与快捷控制条 */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900">
                        官方招标包解构解析完成：{currentParsedResult.packageName}
                      </h3>
                      <span className="px-2 py-0.2 rounded text-[11px] font-semibold bg-emerald-200 text-emerald-900">
                        10 项已自动填入 · 6 项待确认
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      系统已锁定商务与技术原件出处，已识别信息自动替换全案，未载明信息集中提示人工录入。
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleConfirmAllParsedVariables}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>一键锁定并同步全案变量</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMainViewTab('matrix')}
                    className="px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>查看八大板块提取清单 (3卷册)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMainViewTab('vault')}
                    className="px-3 py-2 text-xs font-semibold rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <LayoutGrid className="w-3.5 h-3.5 text-indigo-600" />
                    <span>查看历史方块文档库</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setParsingStage('staging')}
                    className="px-3 py-2 text-xs font-medium rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                    title="重新上传新文件包"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 采纳反馈提示条 */}
              {adoptedFeedback && (
                <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                  <Check className="w-4 h-4 text-emerald-700" />
                  <span>
                    {adoptedFeedback.variableKey === '__ALL__'
                      ? '全案 16 项标书变量已全部锁定并同步到投标须知装配与清单组价！'
                      : `变量 [${adoptedFeedback.variableKey}] 已成功采纳并实时同步！`}
                  </span>
                </div>
              )}

              {/* 解析工作台核心：左右分栏 */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* 左列：锁定的标书变量对照表 (已识别自动填入 / 未载明集中提示人工录入) 占 8 列 */}
                <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-slate-150 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                        标书变量锁定与人工补齐核对看板
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        直接在此修改任意变量值，全案标书各章节与组价实时双向更新
                      </p>
                    </div>

                    {/* 过滤器 */}
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
                      <button
                        onClick={() => setParsedVarFilter('all')}
                        className={`px-2.5 py-1 rounded font-medium cursor-pointer transition-colors ${
                          parsedVarFilter === 'all' ? 'bg-white font-bold text-slate-900 shadow-2xs' : 'text-slate-600'
                        }`}
                      >
                        全部 ({currentParsedResult.lockedVariables.length})
                      </button>
                      <button
                        onClick={() => setParsedVarFilter('extracted')}
                        className={`px-2.5 py-1 rounded font-medium cursor-pointer transition-colors ${
                          parsedVarFilter === 'extracted'
                            ? 'bg-emerald-600 font-bold text-white shadow-2xs'
                            : 'text-slate-600'
                        }`}
                      >
                        已自动锁定 (10)
                      </button>
                      <button
                        onClick={() => setParsedVarFilter('missing')}
                        className={`px-2.5 py-1 rounded font-medium cursor-pointer transition-colors ${
                          parsedVarFilter === 'missing'
                            ? 'bg-amber-600 font-bold text-white shadow-2xs'
                            : 'text-slate-600'
                        }`}
                      >
                        需人工录入 (6)
                      </button>
                    </div>
                  </div>

                  {/* 变量列表 */}
                  <div className="divide-y divide-slate-150 max-h-[580px] overflow-y-auto">
                    {currentParsedResult.lockedVariables
                      .filter((item) => {
                        if (parsedVarFilter === 'extracted') return item.source === 'extracted';
                        if (parsedVarFilter === 'missing') return item.source === 'missing_manual';
                        return true;
                      })
                      .map((varItem) => {
                        const isExtracted = varItem.source === 'extracted';
                        const currentVal = parsedFormValues[varItem.variableKey] ?? varItem.currentValue;

                        return (
                          <div
                            key={varItem.variableKey}
                            className={`p-3.5 sm:p-4 transition-colors ${
                              isExtracted ? 'hover:bg-slate-50/80' : 'bg-amber-50/20 hover:bg-amber-50/40'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              {/* 变量信息 */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                    {varItem.variableKey}
                                  </span>
                                  <span className="text-xs font-semibold text-slate-800">
                                    {langMode === 'fr' && varItem.labelFr ? varItem.labelFr : varItem.label}
                                  </span>
                                  {isExtracted ? (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      已自动提取锁定 (99%)
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 flex items-center gap-0.5">
                                      <AlertCircle className="w-3 h-3 text-amber-600" />
                                      未载明·集中提示人工录入
                                    </span>
                                  )}
                                </div>

                                {varItem.sourceClause && (
                                  <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                                    <span className="text-slate-400">原件出处依据:</span>
                                    <strong className="text-slate-700">{varItem.sourceDocName}</strong>
                                    <span className="text-slate-300">·</span>
                                    <span className="text-blue-700 font-medium">{varItem.sourceClause}</span>
                                  </div>
                                )}

                                {varItem.highlightTextFr && (
                                  <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded p-1.5 mt-1.5 font-mono text-xs">
                                    <span className="text-slate-400 select-none">条款摘录: </span>
                                    {varItem.highlightTextFr}
                                  </div>
                                )}
                              </div>

                              {/* 变量取值输入框 */}
                              <div className="sm:w-64 shrink-0 flex items-center gap-2">
                                <input
                                  type="text"
                                  value={currentVal}
                                  onChange={(e) => handleParsedFormChange(varItem.variableKey, e.target.value)}
                                  placeholder={`输入 ${varItem.variableKey}...`}
                                  className={`w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 font-mono ${
                                    isExtracted
                                      ? 'border-slate-300 focus:ring-blue-500 bg-white font-bold text-slate-900'
                                      : 'border-amber-300 focus:ring-amber-500 bg-amber-50/50 font-bold text-amber-900'
                                  }`}
                                />
                                {onJumpToVariable && (
                                  <button
                                    type="button"
                                    onClick={() => onJumpToVariable(varItem.variableKey)}
                                    className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                                    title="在投标须知装配区定位此变量"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* 右列：解包出的原件列表与下游联动出口 占 4 列 */}
                <div className="lg:col-span-4 space-y-4">
                  {/* 下游工序快速通道 */}
                  <div className="bg-gradient-to-br from-blue-900 to-indigo-900 text-white rounded-xl p-5 shadow-sm space-y-3">
                    <span className="text-[10px] font-bold tracking-wider text-blue-200 uppercase block">
                      WORKFLOW TRANSITION · 流程衔接
                    </span>
                    <h4 className="text-sm font-bold">
                      变量已锁定，立即流转至下游板块：
                    </h4>
                    <p className="text-xs text-blue-100/80 leading-relaxed">
                      已识别变量自动穿透填报至标书全案，可直接进入须知条款装配或清单智能组价。
                    </p>

                    <div className="space-y-2 pt-1">
                      {onJumpToSection && (
                        <button
                          type="button"
                          onClick={() => onJumpToSection('sec_03_bid_bond')}
                          className="w-full px-3.5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer border border-white/10"
                        >
                          <span className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-blue-300" />
                            <span>前往第 2 步：招标须知与标书装配</span>
                          </span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {onJumpToBoq && (
                        <button
                          type="button"
                          onClick={onJumpToBoq}
                          className="w-full px-3.5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer shadow-xs"
                        >
                          <span className="flex items-center gap-2">
                            <Calculator className="w-4 h-4" />
                            <span>前往第 3 步：清单智能组价工作台</span>
                          </span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 解构出的官方文件清单 */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-150">
                      <span className="text-xs font-bold text-slate-900">
                        解包出的官方原件 ({currentParsedResult.unpackedFiles.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => setMainViewTab('vault')}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                      >
                        进入方块库 ➔
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100 mt-1 max-h-[300px] overflow-y-auto">
                      {currentParsedResult.unpackedFiles.map((file) => (
                        <div
                          key={file.id}
                          onClick={() => setInspectingAttachment(file)}
                          className="py-2.5 px-1.5 flex items-center justify-between gap-2 hover:bg-slate-50 rounded cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {renderFileIcon(file.fileType)}
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-800 truncate">
                                {file.name}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {file.fileName} · {file.fileSize}
                              </div>
                            </div>
                          </div>
                          <Eye className="w-3.5 h-3.5 text-slate-400 hover:text-blue-600 shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 视图 2: 官方文档与变量档案库 (方块网格库，点进每个方块查看变量与处理相关文件) */}
      {/* ========================================================================= */}
      {mainViewTab === 'vault' && (
        <div className="p-5 sm:p-6 space-y-5 flex-1">
          {/* 顶部检索与分类筛选栏 */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    langMode === 'fr'
                      ? 'Rechercher un fichier, article, mot-clé, variable...'
                      : '搜索官方文件名称、法文标题、条款文号、标签或锁定的变量...'
                  }
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">归档官方原件：</span>
                <strong className="text-slate-900 font-mono">{filteredAttachments.length} 份文件</strong>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500">已锚定变量：</span>
                <strong className="text-blue-700 font-mono">16 项项目变量</strong>
                <button
                  type="button"
                  onClick={() => setMainViewTab('matrix')}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-colors flex items-center gap-1 cursor-pointer"
                  title="查看基于三个核心 Doc 文件的八大板块结构化提取清单"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>八大板块结构化提取清单</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMainViewTab('upload')}
                  className="ml-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>上传新原件</span>
                </button>
              </div>
            </div>

            {/* 分类过滤芯片 */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1 rounded-full cursor-pointer transition-colors shrink-0 font-medium ${
                  selectedCategory === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                全部原件 ({attachments?.length || 0})
              </button>
              {(Object.keys(ATTACHMENT_CATEGORIES) as AttachmentCategory[]).map((catKey) => {
                const meta = ATTACHMENT_CATEGORIES[catKey];
                const isSelected = selectedCategory === catKey;
                const count = attachments?.filter((a) => a.category === catKey).length || 0;
                return (
                  <button
                    key={catKey}
                    onClick={() => setSelectedCategory(catKey)}
                    className={`px-3 py-1 rounded-full cursor-pointer transition-colors shrink-0 font-medium flex items-center gap-1.5 border ${
                      isSelected
                        ? `${meta.badgeBg} ${meta.badgeText} ${meta.borderColor} font-bold ring-1 ring-blue-500/20`
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>{langMode === 'fr' ? meta.labelFr : meta.labelZh}</span>
                    <span className="text-[10px] font-mono px-1 py-0.2 rounded-full bg-black/5">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 核心展示区：历史文档方块网格库 (Square Cards Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filteredAttachments.map((item) => {
              const categoryMeta = ATTACHMENT_CATEGORIES[item.category] || ATTACHMENT_CATEGORIES.legal;
              const hasLinkedVars = item.linkedVariables.length > 0;

              return (
                <div
                  key={item.id}
                  onClick={() => setInspectingAttachment(item)}
                  className="bg-white rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden cursor-pointer group p-4 space-y-3.5 relative"
                >
                  {/* 方块头部：文件格式图标 + 官方分类与文号 */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2.5 rounded-xl bg-slate-100 group-hover:bg-blue-50 transition-colors shrink-0">
                        {renderFileIcon(item.fileType)}
                      </div>
                      <div className="min-w-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${categoryMeta.badgeBg} ${categoryMeta.badgeText} ${categoryMeta.borderColor}`}
                        >
                          {langMode === 'fr' ? categoryMeta.labelFr : categoryMeta.labelZh}
                        </span>
                        <span className="block text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                          {item.officialDocNumber || '官方原件'}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 shrink-0">
                      {item.fileSize}
                    </span>
                  </div>

                  {/* 方块主体：中法双语文档名称 */}
                  <div className="space-y-1">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-700 line-clamp-2 leading-snug">
                      {item.name}
                    </h3>
                    {item.nameFr && (
                      <p className="text-[11px] text-slate-500 italic line-clamp-1 font-serif">
                        {item.nameFr}
                      </p>
                    )}
                  </div>

                  {/* 核心指标方块块面：锁定的变量数 + 置信度 + 关联下游 */}
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-150 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-1.5 bg-white rounded border border-slate-200">
                        <span className="text-[10px] text-slate-400 block">锁定标书变量</span>
                        <span className="text-xs font-bold font-mono text-blue-700">
                          {item.linkedVariables.length} 项变量
                        </span>
                      </div>
                      <div className="p-1.5 bg-white rounded border border-slate-200">
                        <span className="text-[10px] text-slate-400 block">匹配置信度</span>
                        <span className="text-xs font-bold font-mono text-emerald-700">
                          98.5%
                        </span>
                      </div>
                    </div>

                    {/* 下游处理文件关联标签 */}
                    <div className="text-[10px] text-slate-500 flex items-center justify-between">
                      <span className="flex items-center gap-1 text-indigo-700 font-medium truncate">
                        <Link2 className="w-3 h-3 shrink-0" />
                        <span>关联投标须知 · 关联组价</span>
                      </span>
                      <span className="text-slate-400 font-mono">{item.version}</span>
                    </div>
                  </div>

                  {/* 方块底部交互：点击穿透提示 */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-semibold group-hover:text-blue-800">
                    <span>查看变量与关联文件</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 视图 3: 结构化表单字段清单 (基于三个核心Doc文件的八大板块，绿色已提取 vs 待确认建议项) */}
      {/* ========================================================================= */}
      {mainViewTab === 'matrix' && (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <StructuredTenderExtractionMatrix
            langMode={langMode}
            onLangModeChange={setLangMode}
            onOpenExport={() => setIsExportModalOpen(true)}
            onNavigateToInstructions={onNavigateToInstructions}
            onUpdateVariable={onUpdateVariable}
            onJumpToVariable={onJumpToVariable}
            onJumpToBoq={onJumpToBoq}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 弹窗：点进每个方块的详情抽屉 (查看该文件的变量、中法条款与处理相关文件) */}
      {/* ========================================================================= */}
      {inspectingAttachment && (
        <DocumentSquareDetailModal
          attachment={inspectingAttachment}
          variableValues={variableValues}
          langMode={langMode}
          onClose={() => setInspectingAttachment(null)}
          onUpdateVariable={onUpdateVariable}
          onJumpToVariable={(varKey) => {
            setInspectingAttachment(null);
            if (onJumpToVariable) onJumpToVariable(varKey);
          }}
          onJumpToSection={(secKey) => {
            setInspectingAttachment(null);
            if (onJumpToSection) onJumpToSection(secKey);
          }}
          onJumpToBoq={() => {
            setInspectingAttachment(null);
            if (onJumpToBoq) onJumpToBoq();
          }}
        />
      )}

      {/* 弹窗：导出填好的标书文件 (中法双语翻译与对照) */}
      <BilingualProposalExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        sections={INITIAL_PROPOSAL_SECTIONS}
        variableValues={variableValues}
        defaultLanguage={langMode}
      />
    </div>
  );
};

// =========================================================================
// 点进方块卡片后的详情弹窗组件：查看该文件的变量 + 处理相关的文件 + 中法条款对比
// =========================================================================
interface DocumentSquareDetailModalProps {
  attachment: TenderAttachment;
  variableValues: VariableValues;
  langMode: LanguageMode;
  onClose: () => void;
  onUpdateVariable: (key: string, value: string) => void;
  onJumpToVariable?: (key: string) => void;
  onJumpToSection?: (key: string) => void;
  onJumpToBoq?: () => void;
}

const DocumentSquareDetailModal: React.FC<DocumentSquareDetailModalProps> = ({
  attachment,
  variableValues,
  langMode,
  onClose,
  onUpdateVariable,
  onJumpToVariable,
  onJumpToSection,
  onJumpToBoq,
}) => {
  const [activeTab, setActiveTab] = useState<'variables' | 'downstream' | 'bilingual'>('variables');
  const [adoptedKey, setAdoptedKey] = useState<string | null>(null);

  const handleAdopt = (varKey: string, val: string) => {
    onUpdateVariable(varKey, val);
    setAdoptedKey(varKey);
    setTimeout(() => setAdoptedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* 顶部标题栏 */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4 bg-slate-50/60">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700 shrink-0 mt-0.5">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 truncate">
                  {attachment.name}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                  {attachment.officialDocNumber || '官方原件'}
                </span>
              </div>
              {attachment.nameFr && (
                <p className="text-xs text-slate-500 italic truncate mt-0.5">
                  {attachment.nameFr}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内部标签栏：1. 文件提取的变量 / 2. 处理相关的文件 / 3. 中法双语原文条款 */}
        <div className="px-6 py-2 bg-white border-b border-slate-200 flex items-center gap-2 text-xs">
          <button
            onClick={() => setActiveTab('variables')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'variables'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>提取锁定的项目变量 ({attachment.linkedVariables.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('downstream')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'downstream'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>处理相关的文件与下游输出</span>
          </button>

          <button
            onClick={() => setActiveTab('bilingual')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'bilingual'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>中法双语条款比对</span>
          </button>
        </div>

        {/* 弹窗主体内容 */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Tab 1: 提取锁定的项目变量 */}
          {activeTab === 'variables' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
                <span>从本文档中精确抽取锁定的变量清单：</span>
                <span className="font-mono text-emerald-700 font-semibold">匹配置信度 99%</span>
              </div>

              {attachment.linkedVariables.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl">
                  本文档暂未绑定提取变量
                </div>
              ) : (
                <div className="divide-y divide-slate-150 border border-slate-200 rounded-xl overflow-hidden">
                  {attachment.linkedVariables.map((link) => {
                    const currentVal = variableValues[link.variableKey] || link.extractedValue || '';
                    const isSynced = currentVal === link.extractedValue;

                    return (
                      <div key={link.variableKey} className="p-4 bg-white hover:bg-slate-50/50 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {link.variableKey}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              出处: {link.sourceClause} {link.pageNumber ? `(第 ${link.pageNumber} 页)` : ''}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {adoptedKey === link.variableKey ? (
                              <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-0.5">
                                <Check className="w-3 h-3" /> 已采纳同步
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAdopt(link.variableKey, link.extractedValue || '')}
                                className="px-2.5 py-1 text-xs font-semibold rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                              >
                                确认采纳此值
                              </button>
                            )}

                            {onJumpToVariable && (
                              <button
                                type="button"
                                onClick={() => onJumpToVariable(link.variableKey)}
                                className="p-1 rounded text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                                title="在标书装配区高亮此变量"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* 提取值与输入修改 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div className="p-2 rounded bg-slate-50 border border-slate-200 text-xs">
                            <span className="text-[10px] text-slate-400 block">原件提取值：</span>
                            <span className="font-mono font-bold text-slate-800">
                              {link.extractedValue || '未载明'}
                            </span>
                          </div>
                          <div className="p-2 rounded bg-blue-50/50 border border-blue-200 text-xs">
                            <span className="text-[10px] text-blue-600 block">全案当前生效值：</span>
                            <span className="font-mono font-bold text-blue-900">
                              {currentVal}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: 处理相关的文件与下游输出 */}
          {activeTab === 'downstream' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 leading-relaxed">
                本文档在系统解包与解析后，已自动与以下下游投标工序文件建立实时双向数据联动：
              </div>

              {/* 1. 关联的投标须知章节 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <h4 className="text-xs font-bold text-slate-800">
                      关联的投标须知装配章节
                    </h4>
                  </div>
                  {onJumpToSection && (
                    <button
                      type="button"
                      onClick={() => onJumpToSection('sec_03_bid_bond')}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                    >
                      跳转装配 ➔
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  第 3.2 条「投标保函与履约保证金」以及第 4.1 条「工期承诺条款」已引用本文档提取的法定参数。
                </p>
              </div>

              {/* 2. 关联的工程量清单组价项 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-xs font-bold text-slate-800">
                      关联的清单组价项 (BOQ 联动)
                    </h4>
                  </div>
                  {onJumpToBoq && (
                    <button
                      type="button"
                      onClick={onJumpToBoq}
                      className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer"
                    >
                      跳转组价 ➔
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  技术规范已穿透绑定至「BOQ-04 强电系统母线槽安装」及「BOQ-01 高低压变压器」定额子目。
                </p>
              </div>

              {/* 3. 衍生处理文件 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold text-slate-800">
                    衍生处理文件 (可即时导出)
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-800 block">中法双语条款摘录汇总.pdf</span>
                      <span className="text-[10px] text-slate-400">已对齐 16 处中法条款对照</span>
                    </div>
                    <Download className="w-4 h-4 text-slate-500 hover:text-blue-600 cursor-pointer" />
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-800 block">标书技术指标偏离表.xlsx</span>
                      <span className="text-[10px] text-slate-400">符合法标 NF C 15-100</span>
                    </div>
                    <Download className="w-4 h-4 text-slate-500 hover:text-blue-600 cursor-pointer" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: 中法双语条款比对 */}
          {activeTab === 'bilingual' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* 左：法文原件条款 */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <span>🇫🇷 法文原件条款摘录 (Texte Original)</span>
                  </div>
                  <pre className="font-mono text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed bg-white p-3 rounded border border-slate-200">
                    {attachment.previewSnippetFr ||
                      attachment.previewSnippet ||
                      'Article 3.2: Date limite de remise des offres.\nArticle 6.1: Caution de soumission.'}
                  </pre>
                </div>

                {/* 右：中文对译 */}
                <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900">
                    <span>🇨🇳 中文权威对译与变量高亮</span>
                  </div>
                  <pre className="font-mono text-[11px] text-slate-800 whitespace-pre-wrap leading-relaxed bg-white p-3 rounded border border-blue-100">
                    {attachment.previewSnippetZh ||
                      attachment.summary ||
                      '第 3.2 条: 投标文件递交截止时间。\n第 6.1 条: 投标保函保证金。'}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 弹窗底部操作 */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            归档文件编号: {attachment.officialDocNumber || attachment.id}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-900 text-white transition-colors cursor-pointer"
          >
            完成查看
          </button>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 模拟解构出的附件及锁定变量生成函数 (支持中法双语)
// =========================================================================
function generateMockPackageParseResult(
  packageName: string,
  packageSize: string,
  currentValues: VariableValues,
  packageLang: 'fr' | 'zh' | 'bilingual' = 'fr'
): TenderPackageParseResult {
  const isZhPackage = packageLang === 'zh' || /[\u4e00-\u9fa5]/.test(packageName);

  const unpackedFiles: TenderAttachment[] = [
    {
      id: `ATT-UNPACK-01`,
      name: isZhPackage ? '官方招标通告正文 (Avis d\'Appel d\'Offres)' : '官方招标通告正文 (Avis BOMOP)',
      nameFr: 'Avis d\'Appel d\'Offres International (BOMOP)',
      fileName: 'Avis-BOMOP-Appel-Offres-Hopital-240Lits.pdf',
      category: 'legal',
      fileType: 'pdf',
      fileSize: '2.1 MB',
      uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      uploader: '系统智能解包',
      version: 'Rev 1.0',
      tags: ['#官方公告', '#项目名称', '#招标编号'],
      officialDocNumber: 'DZ-SANTE-2026-CFO-009',
      importance: 'critical',
      verificationStatus: 'verified',
      summary: '阿尔及利亚国家公报 (BOMOP) 刊载之 240 床综合医院强电工程国际公开招标通告。',
      summaryFr: 'Avis d\'appel d\'offres national et international restreint publié au BOMOP pour l\'Hôpital 240 Lits.',
      previewSnippet: `Avis d'Appel d'Offres International Restreint N° DZ-SANTE-2026-CFO-009\nProjet: Réalisation d'un Hôpital de 240 Lits à Tizi Ouzou - Lot 09 Électricité CFO/CFA.\nMaître de l'Ouvrage: Ministère de la Santé, de la Population et de la Réforme Hospitalière.`,
      previewSnippetFr: `Avis d'Appel d'Offres International Restreint N° DZ-SANTE-2026-CFO-009\nProjet: Réalisation d'un Hôpital de 240 Lits à Tizi Ouzou - Lot 09 Électricité CFO/CFA.\nMaître de l'Ouvrage: Ministère de la Santé, de la Population et de la Réforme Hospitalière.`,
      previewSnippetZh: `国际公开招标通告文号: DZ-SANTE-2026-CFO-009\n工程项目: 阿尔及利亚提济乌祖 240 床综合医院建设 - 标段 09 强电与智能化系统。\n招标单位: 阿尔及利亚国家卫生与人口部。`,
      linkedVariables: [
        {
          variableKey: '项目名称',
          sourceClause: '招标公告标题',
          extractedValue: '阿尔及利亚 240 床综合医院强电与智能化系统工程',
          pageNumber: 1,
        },
        {
          variableKey: '招标编号',
          sourceClause: '第 1 条招标文号',
          extractedValue: 'DZ-SANTE-2026-CFO-009',
          pageNumber: 1,
        },
      ],
    },
    {
      id: `ATT-UNPACK-02`,
      name: '招标文件须知及评审办法 (Règlement de la Consultation - RC)',
      nameFr: 'Règlement de la Consultation (RC)',
      fileName: 'RC-Reglement-Consultation-2026-CFO-009.pdf',
      category: 'legal',
      fileType: 'pdf',
      fileSize: '4.8 MB',
      uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      uploader: '系统智能解包',
      version: 'Rev 1.0',
      tags: ['#截标时间', '#保函金额', '#投标有效期'],
      officialDocNumber: 'RC-DZ2026',
      importance: 'critical',
      verificationStatus: 'verified',
      summary: '载明截止时间 2026-11-20、投标保函 25,000,000 DZD 及 90 天有效期的核心文件。',
      summaryFr: 'Fixe la date limite de remise au 20/11/2026, la caution (25 000 000 DZD) et 90 jours de validité.',
      previewSnippetFr: `Article 3.2: Date limite de dépôt des offres: 20/11/2026 à 12h00.\nArticle 3.5: Validité des offres: 90 jours calendaires.\nArticle 6.1: Caution de soumission: 25.000.000,00 DZD.`,
      previewSnippetZh: `第 3.2 条: 递交截止时间: 2026年11月20日 12:00。\n第 3.5 条: 投标有效期: 90 个日历天。\n第 6.1 条: 投标保函保证金: 25,000,000.00 第纳尔。`,
      linkedVariables: [
        {
          variableKey: '投标截止日期',
          sourceClause: 'RC 第 3.2 款',
          extractedValue: '2026-11-20',
          pageNumber: 12,
        },
        {
          variableKey: '投标有效期',
          sourceClause: 'RC 第 3.5 款',
          extractedValue: '90',
          pageNumber: 13,
        },
        {
          variableKey: '投标保证金金额',
          sourceClause: 'RC 第 6.1 款',
          extractedValue: '25,000,000 DZD',
          pageNumber: 18,
        },
      ],
    },
    {
      id: `ATT-UNPACK-03`,
      name: '强电与动力专用技术规格书 (CCTP Courants Forts)',
      nameFr: 'CCTP Lot 09 - Électricité & Courants Forts',
      fileName: 'CCTP-Lot09-Electricite-Courants-Forts.pdf',
      category: 'specs',
      fileType: 'pdf',
      fileSize: '12.4 MB',
      uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      uploader: '系统智能解包',
      version: 'Rev 2.1',
      tags: ['#法国NFC规范', '#IEC标准', '#质保2年', '#2小时急修'],
      officialDocNumber: 'CCTP-DZ-2026',
      importance: 'critical',
      verificationStatus: 'verified',
      summary: '高低压配电技术条款、质保期 2 年及 2 小时维保响应强制指标。',
      summaryFr: 'Exigences techniques NF C 15-100, garantie de 2 ans et délai d\'intervention 2 heures.',
      previewSnippetFr: `Chapitre 1: Conformité stricte aux normes françaises NF C 15-100 et normes CEI/IEC.\nChapitre 9: Garantie de parfait achèvement de 2 années entières; intervention sur site sous 2 heures.`,
      previewSnippetZh: `第 1 章: 严格遵循法标 NF C 15-100 及国际电工委员会 CEI/IEC 标准。\n第 9 章: 全案缺陷责任质保期 2 年整；当地维保紧急响应时间不得超过 2 小时。`,
      linkedVariables: [
        {
          variableKey: '工程质量等级',
          sourceClause: 'CCTP 第 1.3 款',
          extractedValue: '优良工程 (Conforme aux normes NFC/IEC)',
          pageNumber: 8,
        },
        {
          variableKey: '工程质保期',
          sourceClause: 'CCTP 第 9.2 款',
          extractedValue: '2',
          pageNumber: 86,
        },
        {
          variableKey: '应急响应时间',
          sourceClause: 'CCTP 第 9.5 款',
          extractedValue: '2',
          pageNumber: 88,
        },
      ],
    },
    {
      id: `ATT-UNPACK-04`,
      name: '专用行政合同条款 (CCAP)',
      nameFr: 'Cahier des Clauses Administratives Particulières (CCAP)',
      fileName: 'CCAP-Clauses-Administratives-Particulieres.pdf',
      category: 'legal',
      fileType: 'pdf',
      fileSize: '6.2 MB',
      uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      uploader: '系统智能解包',
      version: 'Rev 1.0',
      tags: ['#工期540天', '#ODS开工令'],
      importance: 'critical',
      verificationStatus: 'verified',
      summary: '合同履约总工期 540 个日历天，计划开工令 2026-12-01，竣工日 2028-05-24。',
      summaryFr: 'Délai global de 540 jours calendaires dès l\'ODS (prévu au 01/12/2026).',
      previewSnippetFr: `Article 8: Délai global d'exécution fixé à 540 jours calendaires à compter de l'Ordre de Service (ODS).\nDate prévisionnelle ODS: 01/12/2026. Réception provisoire: 24/05/2028.`,
      previewSnippetZh: `第 8 条: 自开工令（ODS）下达日起算总工期为 540 个日历天。\n预计开工令日期: 2026年12月01日。暂定竣工验收日期: 2028年05月24日。`,
      linkedVariables: [
        {
          variableKey: '工期日历天',
          sourceClause: 'CCAP 第 8.1 款',
          extractedValue: '540',
          pageNumber: 22,
        },
        {
          variableKey: '计划开工日期',
          sourceClause: 'CCAP 第 8.2 款',
          extractedValue: '2026-12-01',
          pageNumber: 23,
        },
        {
          variableKey: '计划竣工日期',
          sourceClause: 'CCAP 第 8.3 款',
          extractedValue: '2028-05-24',
          pageNumber: 24,
        },
      ],
    },
  ];

  const lockedVariables: ParsedVariableItem[] = [
    {
      variableKey: '项目名称',
      label: '工程招标项目全称',
      labelFr: 'Intitulé du Projet',
      category: '项目基础',
      source: 'extracted',
      currentValue: '阿尔及利亚 240 床综合医院强电与智能化系统工程',
      extractedValue: '阿尔及利亚 240 床综合医院强电与智能化系统工程',
      extractedValueFr: 'Projet de réalisation d\'un Hôpital de 240 Lits - Électricité CFO/CFA',
      sourceDocName: 'Avis-BOMOP-Appel-Offres.pdf',
      sourceClause: '招标公告第 1 条',
      sourceClauseFr: 'Avis BOMOP Article 1',
      highlightText: "Projet de réalisation d'un Hôpital de 240 Lits à Tizi Ouzou",
      highlightTextFr: "Projet de réalisation d'un Hôpital de 240 Lits à Tizi Ouzou",
      highlightTextZh: "提济乌祖 240 床综合医院强电与智能化系统工程项目",
    },
    {
      variableKey: '招标编号',
      label: '官方招标公告编号',
      labelFr: 'Numéro d\'Appel d\'Offres',
      category: '项目基础',
      source: 'extracted',
      currentValue: 'DZ-SANTE-2026-CFO-009',
      extractedValue: 'DZ-SANTE-2026-CFO-009',
      extractedValueFr: 'DZ-SANTE-2026-CFO-009',
      sourceDocName: 'RC-Reglement-Consultation.pdf',
      sourceClause: 'RC 第 1.1 款',
      sourceClauseFr: 'RC Article 1.1',
      highlightText: "N° Avis: DZ-SANTE-2026-CFO-009",
      highlightTextFr: "N° Avis: DZ-SANTE-2026-CFO-009",
      highlightTextZh: "招标编号: DZ-SANTE-2026-CFO-009",
    },
    {
      variableKey: '招标人名称',
      label: '业主机构法定全称',
      labelFr: 'Maître de l\'Ouvrage',
      category: '项目基础',
      source: 'extracted',
      currentValue: '阿尔及利亚国家卫生、人口与公立医院改革部 (Ministère de la Santé)',
      extractedValue: '阿尔及利亚国家卫生、人口与公立医院改革部 (Ministère de la Santé)',
      extractedValueFr: 'Ministère de la Santé, de la Population et de la Réforme Hospitalière',
      sourceDocName: 'Avis-BOMOP-Appel-Offres.pdf',
      sourceClause: '招标公告第 2 款',
      sourceClauseFr: 'Avis BOMOP Article 2',
      highlightText: "Ministère de la Santé, de la Population et de la Réforme Hospitalière",
      highlightTextFr: "Ministère de la Santé, de la Population et de la Réforme Hospitalière",
      highlightTextZh: "国家卫生、人口与公立医院改革部",
    },
    {
      variableKey: '投标截止日期',
      label: '标书递交截止日期',
      labelFr: 'Date Limite de Dépôt des Offres',
      category: '商务时间',
      source: 'extracted',
      currentValue: '2026-11-20',
      extractedValue: '2026-11-20',
      extractedValueFr: '20/11/2026 à 12h00',
      sourceDocName: 'RC 评审办法.pdf',
      sourceClause: 'RC 第 3.2 款',
      sourceClauseFr: 'RC Article 3.2',
      highlightText: "Date limite de dépôt des offres: 20/11/2026 à 12h00",
      highlightTextFr: "Date limite de dépôt des offres: 20/11/2026 à 12h00",
      highlightTextZh: "标书递交截止时间: 2026年11月20日 12:00",
    },
    {
      variableKey: '投标有效期',
      label: '开标后投标有效期(天)',
      labelFr: 'Délai de Validité des Offres',
      category: '商务时间',
      source: 'extracted',
      currentValue: '90',
      extractedValue: '90',
      extractedValueFr: '90 jours calendaires',
      sourceDocName: 'RC 评审办法.pdf',
      sourceClause: 'RC 第 3.5 款',
      sourceClauseFr: 'RC Article 3.5',
      highlightText: "Validité des offres: 90 jours calendaires",
      highlightTextFr: "Validité des offres: 90 jours calendaires",
      highlightTextZh: "投标有效期: 90 个日历天",
    },
    {
      variableKey: '投标保证金金额',
      label: '投标保函担保金额',
      labelFr: 'Montant de la Caution de Soumission',
      category: '商务时间',
      source: 'extracted',
      currentValue: '25,000,000 DZD',
      extractedValue: '25,000,000 DZD',
      extractedValueFr: '25.000.000,00 DZD',
      sourceDocName: 'RC 评审办法.pdf',
      sourceClause: 'RC 第 6.1 款',
      sourceClauseFr: 'RC Article 6.1',
      highlightText: "Caution de soumission: 25.000.000,00 DZD",
      highlightTextFr: "Caution de soumission: 25.000.000,00 DZD",
      highlightTextZh: "投标保证金金额: 25,000,000.00 第纳尔",
    },
    {
      variableKey: '工期日历天',
      label: '合同履约总工期(日历天)',
      labelFr: 'Délai Global d\'Exécution',
      category: '商务时间',
      source: 'extracted',
      currentValue: '540',
      extractedValue: '540',
      extractedValueFr: '540 jours calendaires',
      sourceDocName: 'CCAP 合同条款.pdf',
      sourceClause: 'CCAP 第 8.1 款',
      sourceClauseFr: 'CCAP Article 8.1',
      highlightText: "Délai global d'exécution: 540 jours calendaires",
      highlightTextFr: "Délai global d'exécution: 540 jours calendaires",
      highlightTextZh: "总工期: 540 个日历天",
    },
    {
      variableKey: '计划开工日期',
      label: '预计开工令签发日(ODS)',
      labelFr: 'Date Prévisionnelle de l\'ODS',
      category: '商务时间',
      source: 'extracted',
      currentValue: '2026-12-01',
      extractedValue: '2026-12-01',
      extractedValueFr: '01/12/2026',
      sourceDocName: 'CCAP 合同条款.pdf',
      sourceClause: 'CCAP 第 8.2 款',
      sourceClauseFr: 'CCAP Article 8.2',
      highlightText: "Date prévisionnelle ODS: 01/12/2026",
      highlightTextFr: "Date prévisionnelle ODS: 01/12/2026",
      highlightTextZh: "开工令下达日期: 2026年12月01日",
    },
    {
      variableKey: '计划竣工日期',
      label: '现场最终竣工交付日',
      labelFr: 'Date de Réception Provisoire',
      category: '商务时间',
      source: 'extracted',
      currentValue: '2028-05-24',
      extractedValue: '2028-05-24',
      extractedValueFr: '24/05/2028',
      sourceDocName: 'CCAP 合同条款.pdf',
      sourceClause: 'CCAP 第 8.3 款',
      sourceClauseFr: 'CCAP Article 8.3',
      highlightText: "Réception provisoire: 24/05/2028",
      highlightTextFr: "Réception provisoire: 24/05/2028",
      highlightTextZh: "暂定竣工验收交付: 2028年05月24日",
    },
    {
      variableKey: '工程质量等级',
      label: '施工验收执行标准',
      labelFr: 'Normes de Qualité et Conformité',
      category: '技术指标',
      source: 'extracted',
      currentValue: '优良工程 (Conforme aux normes NFC/IEC)',
      extractedValue: '优良工程 (Conforme aux normes NFC/IEC)',
      extractedValueFr: 'Conforme aux normes NF C 15-100 et CEI/IEC',
      sourceDocName: 'CCTP 技术规范.pdf',
      sourceClause: 'CCTP 第 1.3 款',
      sourceClauseFr: 'CCTP Article 1.3',
      highlightText: "Conformité obligatoire NF C 15-100 / IEC",
      highlightTextFr: "Conformité obligatoire NF C 15-100 / IEC",
      highlightTextZh: "必须强制符合法国 NF C 15-100 及国际 IEC 标准",
    },
    // 以下为招标文件未载明的企业内部信息，集中提示人工录入
    {
      variableKey: '投标人法定名称',
      label: '投标实体企业全称',
      labelFr: 'Raison Sociale du Soumissionnaire',
      category: '主体资质',
      source: 'missing_manual',
      currentValue: currentValues['投标人法定名称'] || '中国建筑第二工程局有限公司 (CSCEC-II)',
    },
    {
      variableKey: '法定代表人姓名',
      label: '法人代表签字人',
      labelFr: 'Nom du Représentant Légal',
      category: '主体资质',
      source: 'missing_manual',
      currentValue: currentValues['法定代表人姓名'] || '石雨',
    },
    {
      variableKey: '授权委托人姓名',
      label: '项目被授权人姓名',
      labelFr: 'Mandataire Délégué',
      category: '主体资质',
      source: 'missing_manual',
      currentValue: currentValues['授权委托人姓名'] || '张志强',
    },
    {
      variableKey: '委托人职务',
      label: '被授权人公司职务',
      labelFr: 'Fonction du Mandataire',
      category: '主体资质',
      source: 'missing_manual',
      currentValue: currentValues['委托人职务'] || '海外事业部总工程师',
    },
    {
      variableKey: '委托人身份证号',
      label: '被授权人身份证件号',
      labelFr: 'Pièce d\'Identité du Mandataire',
      category: '主体资质',
      source: 'missing_manual',
      currentValue: currentValues['委托人身份证号'] || '110108198205123456',
    },
    {
      variableKey: '项目经理姓名',
      label: '拟任常驻项目经理',
      labelFr: 'Chef de Projet Résident',
      category: '主体资质',
      source: 'missing_manual',
      currentValue: currentValues['项目经理姓名'] || '李振华',
    },
  ];

  return {
    packageName,
    packageSize,
    parsedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    unpackedFiles,
    lockedVariables,
  };
}
