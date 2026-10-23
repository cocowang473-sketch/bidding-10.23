import React, { useState, useMemo } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FolderArchive,
  Search,
  Check,
  Edit3,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Download,
  ShieldCheck,
  FileSpreadsheet,
  Globe2,
  Eye,
  BookmarkCheck,
  Building2,
  Calendar,
  DollarSign,
  Scale,
  Lock,
  Layers,
  Table,
  LayoutGrid,
  X,
  Copy,
  MapPin,
  FileSearch,
  CheckCheck,
  Printer,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';
import {
  ExtractionCategoryKey,
  ExtractionDocSource,
  ExtractionStatus,
  ExtractionFieldItem,
  EXTRACTION_CATEGORIES,
  CORE_DOC_SOURCES,
  INITIAL_EXTRACTION_FIELDS,
} from '../types/structuredTenderExtraction';
import { LanguageMode } from '../types/proposalVariables';

interface StructuredTenderExtractionMatrixProps {
  initialFields?: ExtractionFieldItem[];
  langMode?: LanguageMode;
  onLangModeChange?: (mode: LanguageMode) => void;
  onOpenExport?: () => void;
  onNavigateToInstructions?: () => void;
  onUpdateVariable?: (key: string, value: string) => void;
  onJumpToVariable?: (key: string) => void;
  onJumpToBoq?: () => void;
}

export const StructuredTenderExtractionMatrix: React.FC<
  StructuredTenderExtractionMatrixProps
> = ({
  initialFields = INITIAL_EXTRACTION_FIELDS,
  langMode = 'bilingual',
  onLangModeChange,
  onOpenExport,
  onNavigateToInstructions,
  onUpdateVariable,
  onJumpToVariable,
  onJumpToBoq,
}) => {
  const [fields, setFields] = useState<ExtractionFieldItem[]>(initialFields);
  // 严格按板块选择：默认选中第一板块「项目基本信息」，点击任一板块仅展示该板块对应的专属内容
  const [selectedCategory, setSelectedCategory] = useState<ExtractionCategoryKey>('project');
  // 全部状态简化为：'all' (全部) | 'extracted' (已提取) | 'suggested' (待确认)
  const [statusFilter, setStatusFilter] = useState<'all' | 'extracted' | 'suggested'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewLayout, setViewLayout] = useState<'table' | 'cards'>('table');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // 官方原件与原句文字定位抽屉/模态框状态
  const [inspectingEvidenceField, setInspectingEvidenceField] = useState<ExtractionFieldItem | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedCitation, setCopiedCitation] = useState(false);

  // 编辑弹窗或行内修改状态
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editValueDraft, setEditValueDraft] = useState('');

  // 采纳操作微反馈
  const [feedbackFieldId, setFeedbackFieldId] = useState<string | null>(null);

  // 计算全局指标统计
  const stats = useMemo(() => {
    const total = fields.length;
    const extracted = fields.filter((f) => f.status === 'extracted').length;
    const suggested = fields.filter((f) => f.status === 'suggested').length;
    const rate = total > 0 ? Math.round((extracted / total) * 100) : 0;
    return { total, extracted, suggested, rate };
  }, [fields]);

  // 当前激活板块的元信息
  const activeCategoryMeta = useMemo(() => {
    return (
      EXTRACTION_CATEGORIES.find((c) => c.key === selectedCategory) ||
      EXTRACTION_CATEGORIES[0]
    );
  }, [selectedCategory]);

  // 当前激活板块的所有字段
  const categoryAllFields = useMemo(() => {
    return fields.filter((f) => f.categoryKey === selectedCategory);
  }, [fields, selectedCategory]);

  // 当前板块提取统计
  const categoryStats = useMemo(() => {
    const total = categoryAllFields.length;
    const extracted = categoryAllFields.filter((f) => f.status === 'extracted').length;
    const suggested = categoryAllFields.filter((f) => f.status === 'suggested').length;
    return { total, extracted, suggested };
  }, [categoryAllFields]);

  // 经过筛选后的字段清单：严格仅包含当前选中的单一板块字段
  const filteredFields = useMemo(() => {
    return fields.filter((item) => {
      // 必须严格属于当前选中的单一板块
      if (item.categoryKey !== selectedCategory) {
        return false;
      }
      // 状态筛选：已提取 vs 待确认
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }
      // 关键词搜索
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inZh = item.fieldNameZh.toLowerCase().includes(q);
        const inFr = item.fieldNameFr.toLowerCase().includes(q);
        const inVal = item.value.toLowerCase().includes(q);
        const inClause = (item.sourceClause || '').toLowerCase().includes(q);
        const inEvidenceZh = (item.evidenceSnippetZh || '').toLowerCase().includes(q);
        const inEvidenceFr = (item.evidenceSnippetFr || '').toLowerCase().includes(q);
        if (!inZh && !inFr && !inVal && !inClause && !inEvidenceZh && !inEvidenceFr) {
          return false;
        }
      }
      return true;
    });
  }, [fields, selectedCategory, statusFilter, searchQuery]);

  // 一键确认/采纳建议字段 -> 变为已提取
  const handleAdoptSuggestion = (fieldId: string) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id === fieldId) {
          const newVal = f.suggestedValue || f.value;
          if (f.linkedVariableKey && onUpdateVariable) {
            onUpdateVariable(f.linkedVariableKey, newVal);
          }
          return {
            ...f,
            status: 'extracted',
            value: newVal,
            confirmedBy: '造价项目经理 (已人工复核确认)',
            confirmedAt: new Date().toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          };
        }
        return f;
      })
    );
    // 如果弹窗中正在查看该字段，同步更新
    if (inspectingEvidenceField && inspectingEvidenceField.id === fieldId) {
      setInspectingEvidenceField((prev) =>
        prev
          ? {
              ...prev,
              status: 'extracted',
              value: prev.suggestedValue || prev.value,
              confirmedBy: '造价项目经理 (已人工复核确认)',
            }
          : null
      );
    }
    setFeedbackFieldId(fieldId);
    setTimeout(() => setFeedbackFieldId(null), 2500);
  };

  // 保存手动编辑的内容
  const handleSaveEdit = (fieldId: string) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id === fieldId) {
          if (f.linkedVariableKey && onUpdateVariable) {
            onUpdateVariable(f.linkedVariableKey, editValueDraft);
          }
          return {
            ...f,
            value: editValueDraft,
            status: 'extracted',
            confirmedBy: '造价项目经理 (手动修订)',
            confirmedAt: new Date().toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          };
        }
        return f;
      })
    );
    setEditingFieldId(null);
  };

  // 一键全量采纳当前板块的所有待确认建议项
  const handleAdoptCategorySuggested = () => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.categoryKey === selectedCategory && f.status === 'suggested') {
          const newVal = f.suggestedValue || f.value;
          if (f.linkedVariableKey && onUpdateVariable) {
            onUpdateVariable(f.linkedVariableKey, newVal);
          }
          return {
            ...f,
            status: 'extracted',
            value: newVal,
            confirmedBy: '造价项目经理 (板块批量核验采纳)',
            confirmedAt: new Date().toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          };
        }
        return f;
      })
    );
  };

  // 导出结构化表单报告
  const handleExportMatrixReport = () => {
    const reportData = {
      title: '阿尔及利亚240床医院项目 - 招标文件八大板块结构化提取表单清单',
      exportedAt: new Date().toLocaleString('zh-CN'),
      summary: stats,
      activeCategory: activeCategoryMeta,
      coreDocs: CORE_DOC_SOURCES,
      extractedCount: stats.extracted,
      suggestedCount: stats.suggested,
      data: fields,
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `招标文件结构化提取表单_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 复制原文字摘录
  const handleCopySnippet = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  // 复制出处引用
  const handleCopyCitation = (field: ExtractionFieldItem) => {
    const citation = `【招标文件出处】文档: ${field.docSourceName} | 条款: ${field.sourceClause || '未标明条款'} | 页码: 第 ${field.pageNumber || '1'} 页 | 提取字段: ${field.fieldNameZh} (${field.value})`;
    navigator.clipboard.writeText(citation);
    setCopiedCitation(true);
    setTimeout(() => setCopiedCitation(false), 2000);
  };

  // 获取板块图标
  const getCategoryIcon = (key: ExtractionCategoryKey) => {
    switch (key) {
      case 'project':
        return Building2;
      case 'timeline':
        return Calendar;
      case 'compliance':
        return ShieldCheck;
      case 'pricing':
        return DollarSign;
      case 'boq':
        return FileSpreadsheet;
      case 'contract':
        return Scale;
      case 'translation':
        return Globe2;
      case 'confidentiality':
        return Lock;
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50 overflow-hidden font-sans">
      {/* ========================================================================= */}
      {/* 1. 顶部紧凑 SaaS 全局指标与全局操作栏 */}
      {/* ========================================================================= */}
      <div className="bg-white border-b border-slate-200 px-5 py-2.5 shrink-0 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
            <BookmarkCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                招标文件八大板块结构化提取清单
              </h2>
            </div>
            <p className="text-[11px] text-slate-500">
              点击左侧专属板块查看对应提取内容 · 点击数据源出处可精确定位原文文档与段落
            </p>
          </div>
        </div>

        {/* 核心操作：中法双语切换 + 导出标书 + 采纳本板块建议 */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {onLangModeChange && (
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => onLangModeChange('zh')}
                className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                  langMode === 'zh'
                    ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="全中文视图"
              >
                🇨🇳 中文
              </button>
              <button
                type="button"
                onClick={() => onLangModeChange('fr')}
                className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                  langMode === 'fr'
                    ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="法文原件模式"
              >
                🇫🇷 Français
              </button>
              <button
                type="button"
                onClick={() => onLangModeChange('bilingual')}
                className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  langMode === 'bilingual'
                    ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="中法双语对照"
              >
                <Globe2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {onOpenExport && (
            <button
              type="button"
              onClick={onOpenExport}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>导出填好的标书</span>
            </button>
          )}

          {onNavigateToInstructions && (
            <button
              type="button"
              onClick={onNavigateToInstructions}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="进入下一步：投标须知附件编制"
            >
              <span>进入投标须知</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. 左右分栏核心交互区：左侧板块导航（无进度条） + 右侧专属内容列表 */}
      {/* ========================================================================= */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ========================================================================= */}
        {/* 左侧：八大业务板块导航（严格单选，点击每一个板块仅看对应内容） */}
        {/* ========================================================================= */}
        <div
          className={`shrink-0 bg-white border-r border-slate-200 flex flex-col min-h-0 transition-all duration-200 z-10 ${
            isSidebarCollapsed ? 'w-16' : 'w-72 lg:w-80'
          }`}
        >
          {/* 侧边栏顶栏 */}
          <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
            {!isSidebarCollapsed ? (
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-blue-100 text-blue-700">
                  <Layers className="w-3.5 h-3.5" />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 tracking-tight">
                    八大业务板块
                  </h4>
                  <p className="text-[10px] text-slate-500">点击板块切换专属参数列表</p>
                </div>
              </div>
            ) : (
              <span className="mx-auto p-1 text-blue-700" title="八大业务板块">
                <Layers className="w-4 h-4" />
              </span>
            )}

            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded transition-colors cursor-pointer"
              title={isSidebarCollapsed ? '展开八大板块侧边栏' : '收起侧边栏'}
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* 侧边栏板块垂直列表：严格独立展示 8 个板块，去掉每个板块下面的进度条 */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
            {EXTRACTION_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              const Icon = getCategoryIcon(cat.key);
              const count = fields.filter((f) => f.categoryKey === cat.key).length;
              const extractedCount = fields.filter(
                (f) => f.categoryKey === cat.key && f.status === 'extracted'
              ).length;
              const isFullyExtracted = extractedCount === count;

              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/90 text-blue-900 border-blue-500 font-semibold shadow-2xs border-l-4'
                      : 'bg-white text-slate-700 border-transparent hover:bg-slate-50 hover:border-slate-200'
                  }`}
                  title={`${cat.orderNumber}、${cat.titleZh} (共 ${count} 项参数)`}
                >
                  {!isSidebarCollapsed ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span
                            className={`p-1 rounded shrink-0 ${
                              isSelected
                                ? 'bg-blue-200/80 text-blue-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </span>
                          <span className="text-xs font-bold truncate">
                            {cat.orderNumber}、{cat.titleZh}
                          </span>
                        </div>

                        {/* 去掉进度条，采用专业 SaaS 纯数字与徽标 */}
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 font-medium ${
                            isFullyExtracted
                              ? 'bg-emerald-100 text-emerald-800 font-bold flex items-center gap-0.5'
                              : 'bg-slate-100 text-slate-700 font-semibold'
                          }`}
                        >
                          {isFullyExtracted && <Check className="w-2.5 h-2.5 inline" />}
                          {extractedCount}/{count} 项
                        </span>
                      </div>

                      {/* 法文副标题与来源卷册标签 */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pl-6">
                        <span className="font-serif italic truncate max-w-[130px]">
                          {cat.titleFr}
                        </span>
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded shrink-0 font-sans">
                          {cat.primaryDoc === 'doc1'
                            ? 'RC卷册'
                            : cat.primaryDoc === 'doc2'
                            ? 'CCAP卷册'
                            : 'BQE卷册'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-1">
                      <Icon
                        className={`w-4 h-4 ${
                          isSelected ? 'text-blue-700' : 'text-slate-600'
                        }`}
                      />
                      <span
                        className={`text-[9px] font-mono mt-1 px-1 rounded ${
                          isFullyExtracted
                            ? 'bg-emerald-100 text-emerald-700 font-bold'
                            : 'text-slate-500'
                        }`}
                      >
                        {extractedCount}/{count}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 右侧：当前点击板块的专属结构化内容列表工作区 */}
        {/* ========================================================================= */}
        <div className="flex-1 min-h-0 flex flex-col bg-slate-50/50 overflow-hidden">
          {/* 右侧顶栏：当前激活板块标题、描述与视图布局切换 */}
          <div className="px-5 py-3 bg-white border-b border-slate-200 shrink-0 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  当前板块
                </span>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  {activeCategoryMeta.orderNumber}、{activeCategoryMeta.titleZh}
                </h3>
                <span className="text-xs font-serif text-slate-500 italic">
                  ({activeCategoryMeta.titleFr})
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                  {categoryStats.extracted}/{categoryStats.total} 已提取
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 max-w-3xl">
                {activeCategoryMeta.description}
              </p>
            </div>

            {/* 表格视图 vs 卡片视图切换 */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setViewLayout('table')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewLayout === 'table'
                    ? 'bg-white text-blue-900 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="B端 SaaS 表格紧凑视图"
              >
                <Table className="w-3.5 h-3.5 text-blue-600" />
                <span>表格视图</span>
              </button>
              <button
                type="button"
                onClick={() => setViewLayout('cards')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewLayout === 'cards'
                    ? 'bg-white text-blue-900 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="卡片视图"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-blue-600" />
                <span>卡片视图</span>
              </button>
            </div>
          </div>

          {/* 右侧工具过滤条：纯净 SaaS 设计（去掉了“全部范围”，状态精简为已提取 / 待确认两个核心状态） */}
          <div className="px-5 py-2.5 bg-white border-b border-slate-200 shrink-0 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
            {/* 搜索框 */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索字段名称、条款 (如 RC 1.1) 或参数值..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* 状态筛选：已提取 与 待确认 两个状态（加全部供快捷切换），去掉了全部范围 */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1 text-slate-500 font-medium">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                <span>状态筛选:</span>
              </div>

              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-white text-slate-900 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  全部 ({categoryStats.total})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('extracted')}
                  className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === 'extracted'
                      ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>已提取 ({categoryStats.extracted})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('suggested')}
                  className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === 'suggested'
                      ? 'bg-amber-600 text-white font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>待确认 ({categoryStats.suggested})</span>
                </button>
              </div>

              <span className="text-[11px] text-slate-500 font-mono">
                显示 {filteredFields.length} 项参数
              </span>
            </div>
          </div>

          {/* 右侧主列表区 (独立滚动) */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-5 min-h-0">
            {filteredFields.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">当前板块暂无匹配的字段</h4>
                <p className="text-xs text-slate-400">
                  可尝试清空搜索关键字或将状态筛选切换为「全部」。
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium text-xs hover:bg-blue-700 cursor-pointer shadow-2xs"
                >
                  重置筛选条件
                </button>
              </div>
            ) : viewLayout === 'table' ? (
              /* ========================================================================= */
              /* B端 SaaS 表格视图：去掉了表头的“优先级”和“置信度”，数据源出处点击可查证 */
              /* ========================================================================= */
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-3.5 w-24">状态</th>
                        <th className="py-3 px-3.5 w-56">结构化字段 (中/法)</th>
                        <th className="py-3 px-3.5 min-w-[280px]">提取核定值 / 建议内容</th>
                        <th className="py-3 px-3.5 w-52">
                          <span className="flex items-center gap-1">
                            <span>数据源出处与文字位置</span>
                            <span className="text-[10px] text-blue-600 font-normal lowercase">(点击穿透)</span>
                          </span>
                        </th>
                        <th className="py-3 px-3.5 w-32 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {filteredFields.map((field) => {
                        const isExtracted = field.status === 'extracted';
                        const docSourceMeta = CORE_DOC_SOURCES[field.docSource];
                        const isAdoptedFeedback = feedbackFieldId === field.id;
                        const isEditing = editingFieldId === field.id;

                        return (
                          <tr
                            key={field.id}
                            className={`transition-colors group ${
                              isExtracted
                                ? 'bg-emerald-50/30 hover:bg-emerald-50/70'
                                : 'bg-white hover:bg-slate-50'
                            }`}
                          >
                            {/* 1. 状态：清晰的双状态 (已提取 vs 待确认) */}
                            <td className="py-3 px-3.5">
                              {isExtracted ? (
                                <span className="inline-flex items-center justify-center p-1 rounded bg-emerald-50 border border-emerald-300">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-300">
                                  <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                                  <span>待确认</span>
                                </span>
                              )}
                            </td>

                            {/* 2. 结构化字段中法标题 */}
                            <td className="py-3 px-3.5">
                              <div className="font-semibold text-slate-900">{field.fieldNameZh}</div>
                              {field.fieldNameFr && (
                                <div className="text-[11px] text-slate-500 italic font-serif truncate mt-0.5">
                                  {field.fieldNameFr}
                                </div>
                              )}
                            </td>

                            {/* 3. 提取核定数值 / 建议内容 */}
                            <td className="py-3 px-3.5">
                              {!isEditing ? (
                                <div className="space-y-1">
                                  <div
                                    className={`p-2 rounded-lg font-medium text-xs ${
                                      isExtracted
                                        ? 'bg-emerald-100/60 text-emerald-950 border border-emerald-300/80 shadow-2xs'
                                        : 'bg-slate-50 text-slate-800 border border-slate-200'
                                    }`}
                                  >
                                    <div>{field.value}</div>
                                    {field.valueFr && langMode !== 'zh' && (
                                      <div className="text-[11px] text-slate-600 italic font-serif mt-0.5">
                                        {field.valueFr}
                                      </div>
                                    )}
                                  </div>
                                  {field.note && !isExtracted && (
                                    <div className="text-[11px] text-amber-700 flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                                      <span>建议说明：{field.note}</span>
                                    </div>
                                  )}
                                  {field.confirmedBy && (
                                    <div className="text-[10px] text-emerald-700 font-mono">
                                      ✓ {field.confirmedBy} ({field.confirmedAt})
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-1.5 p-2 bg-white rounded border border-blue-300 shadow-sm">
                                  <textarea
                                    value={editValueDraft}
                                    onChange={(e) => setEditValueDraft(e.target.value)}
                                    rows={2}
                                    className="w-full p-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 font-medium"
                                  />
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setEditingFieldId(null)}
                                      className="px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                                    >
                                      取消
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEdit(field.id)}
                                      className="px-2.5 py-0.5 text-[11px] bg-blue-600 text-white rounded font-bold hover:bg-blue-700 cursor-pointer"
                                    >
                                      保存并确认
                                    </button>
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* 4. 数据源出处与文字位置 (点击即可弹窗显示对应文档和相应文字所在位置) */}
                            <td className="py-3 px-3.5">
                              <button
                                type="button"
                                onClick={() => setInspectingEvidenceField(field)}
                                className="w-full text-left p-1.5 rounded-lg border border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/60 transition-all cursor-pointer group/btn shadow-2xs"
                                title="点击查看招标文件原件与段落文字定位对照"
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-semibold text-slate-800 text-[11px] truncate flex items-center gap-1">
                                    <FileText className="w-3 h-3 text-blue-600 shrink-0" />
                                    <span>{docSourceMeta?.labelZh.split(':')[0] || '核心卷册'}</span>
                                  </span>
                                  <span className="text-[10px] text-blue-600 opacity-0 group-hover/btn:opacity-100 transition-opacity font-bold shrink-0">
                                    定位 ↗
                                  </span>
                                </div>

                                <div className="text-blue-700 font-mono text-[10px] mt-0.5 truncate flex items-center gap-1">
                                  <MapPin className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                                  <span>{field.sourceClause || '原件条款'}</span>
                                  {field.pageNumber && (
                                    <>
                                      <span className="text-slate-300">·</span>
                                      <span className="font-bold">第 {field.pageNumber} 页</span>
                                    </>
                                  )}
                                </div>
                              </button>
                            </td>

                            {/* 5. 操作列 */}
                            <td className="py-3 px-3.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {!isExtracted && !isEditing && (
                                  <button
                                    type="button"
                                    onClick={() => handleAdoptSuggestion(field.id)}
                                    className="px-2.5 py-1 text-[11px] font-bold rounded bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all cursor-pointer shrink-0 active:scale-95"
                                    title="采纳建议并转为已提取状态"
                                  >
                                    采纳
                                  </button>
                                )}

                                {!isEditing && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingFieldId(field.id);
                                      setEditValueDraft(field.value);
                                    }}
                                    className="p-1 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded cursor-pointer transition-colors"
                                    title="手动修改此数值"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              {isAdoptedFeedback && (
                                <div className="text-[10px] text-emerald-700 font-bold mt-1">
                                  ✓ 已采纳
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* ========================================================================= */
              /* 卡片视图：去掉了板块下方的进度条，去掉了卡片内部的优先级和置信度 */
              /* ========================================================================= */
              <div className="space-y-3">
                {filteredFields.map((field) => {
                  const isExtracted = field.status === 'extracted';
                  const docSourceMeta = CORE_DOC_SOURCES[field.docSource];
                  const isAdoptedFeedback = feedbackFieldId === field.id;
                  const isEditing = editingFieldId === field.id;

                  return (
                    <div
                      key={field.id}
                      className={`bg-white rounded-xl border p-4 shadow-2xs transition-all ${
                        isExtracted
                          ? 'border-emerald-200 hover:border-emerald-300'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-2">
                          {/* 顶栏徽标 */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {isExtracted ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>已提取</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-300">
                                <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                                <span>待确认</span>
                              </span>
                            )}

                            {/* 点击数据源出处按钮 */}
                            <button
                              type="button"
                              onClick={() => setInspectingEvidenceField(field)}
                              className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
                              title="点击查看原件与文字定位"
                            >
                              <FileText className="w-3 h-3 text-blue-600" />
                              <span className="font-semibold">{docSourceMeta?.labelZh.split(':')[0]}</span>
                              <span className="text-slate-400">·</span>
                              <span>{field.sourceClause || '原件条款'}</span>
                              {field.pageNumber && <span>(P.{field.pageNumber})</span>}
                            </button>
                          </div>

                          {/* 字段中法标题 */}
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-bold text-slate-900">
                              {field.fieldNameZh}
                            </span>
                            {field.fieldNameFr && (
                              <span className="text-xs text-slate-500 italic font-serif">
                                / {field.fieldNameFr}
                              </span>
                            )}
                          </div>

                          {/* 提取值或编辑模式 */}
                          {!isEditing ? (
                            <div className="space-y-1">
                              <div
                                className={`text-xs sm:text-sm font-medium rounded-lg p-2.5 ${
                                  isExtracted
                                    ? 'bg-emerald-100/60 text-emerald-950 border border-emerald-300/80 shadow-2xs'
                                    : 'bg-slate-50 text-slate-800 border border-slate-200'
                                }`}
                              >
                                <div>{field.value}</div>
                                {field.valueFr && langMode !== 'zh' && (
                                  <div className="text-xs font-normal italic text-slate-600 mt-1 font-serif">
                                    {field.valueFr}
                                  </div>
                                )}
                              </div>

                              {field.note && !isExtracted && (
                                <p className="text-[11px] text-amber-700 flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                  <span>待确认理由：{field.note}</span>
                                </p>
                              )}

                              {field.confirmedBy && (
                                <p className="text-[10px] text-emerald-700 font-mono flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  <span>
                                    {field.confirmedBy} ({field.confirmedAt})
                                  </span>
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2 p-3 bg-white rounded-lg border border-blue-300 shadow-sm">
                              <label className="text-[11px] font-bold text-slate-700 block">
                                修订并确认此项参数值：
                              </label>
                              <textarea
                                value={editValueDraft}
                                onChange={(e) => setEditValueDraft(e.target.value)}
                                rows={2}
                                className="w-full p-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 font-medium"
                              />
                              <div className="flex items-center justify-end gap-2 text-xs">
                                <button
                                  type="button"
                                  onClick={() => setEditingFieldId(null)}
                                  className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                                >
                                  取消
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(field.id)}
                                  className="px-3 py-1 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 cursor-pointer"
                                >
                                  保存并确认
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 卡片右侧快捷操作 */}
                        <div className="flex items-center gap-2 shrink-0 self-start lg:self-center">
                          {!isExtracted && !isEditing && (
                            <button
                              type="button"
                              onClick={() => handleAdoptSuggestion(field.id)}
                              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                              title="采纳建议并转为已提取状态"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>确认采纳</span>
                            </button>
                          )}

                          {isAdoptedFeedback && (
                            <span className="text-xs font-bold text-emerald-700">
                              ✓ 已成功采纳！
                            </span>
                          )}

                          {!isEditing && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingFieldId(field.id);
                                setEditValueDraft(field.value);
                              }}
                              className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded cursor-pointer transition-colors"
                              title="手动修改此字段"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setInspectingEvidenceField(field)}
                            className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                            title="查证出处与原文字定位"
                          >
                            <FileSearch className="w-3.5 h-3.5 text-blue-600" />
                            <span>查证出处</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. 核心交互弹窗：点击数据源出处最后显示的「对应文档和相应文字所在位置」查验器 */}
      {/* ========================================================================= */}
      {inspectingEvidenceField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* 弹窗顶栏 */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <FileSearch className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      官方数据源出处与原文字位置核验
                    </h3>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        inspectingEvidenceField.status === 'extracted'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {inspectingEvidenceField.status === 'extracted'
                        ? '官方原件已提取'
                        : '待确认建议项'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    智能提取参数与招标文件原件章节条款、版面页码及原句语义锚定对照
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectingEvidenceField(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                title="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 弹窗内容主滚动区 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs min-h-0">
              {/* 卡片 A: 对应招标文件原件档案 */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <FolderArchive className="w-4 h-4 text-blue-600" />
                    <span>对应官方归档文档 (Corresponding Document)</span>
                  </span>
                  <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>SHA-256 签名完整性已验签</span>
                  </span>
                </div>

                <div className="bg-white rounded-lg p-3 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700 shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">
                        {inspectingEvidenceField.docSourceName}
                      </div>
                      <div className="text-slate-500 text-xs mt-0.5">
                        {CORE_DOC_SOURCES[inspectingEvidenceField.docSource]?.labelZh}
                      </div>
                      <div className="text-[11px] text-slate-400 font-serif italic mt-0.5">
                        {CORE_DOC_SOURCES[inspectingEvidenceField.docSource]?.labelFr}
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-slate-500 font-mono shrink-0 pl-11 sm:pl-0">
                    <div>格式：Word 原件 (.doc)</div>
                    <div>文件大小：2.8 MB</div>
                    <div className="text-emerald-700">解析状态：多模态高精度提取</div>
                  </div>
                </div>
              </div>

              {/* 卡片 B: 相应文字所在精确位置 */}
              <div className="bg-blue-50/60 rounded-xl p-4 border border-blue-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span>相应文字精确所在位置 (Precise Clause & Page Coordinates)</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-blue-800 bg-white px-2 py-0.5 rounded border border-blue-200">
                    精确度：100% 语义锚定
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="bg-white p-3 rounded-lg border border-blue-150">
                    <span className="text-[11px] text-slate-400 block">所在章节与条款文号</span>
                    <strong className="text-xs text-blue-900 mt-1 block font-mono">
                      {inspectingEvidenceField.sourceClause || '官方通用准则条款'}
                    </strong>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-blue-150">
                    <span className="text-[11px] text-slate-400 block">原文所在页码</span>
                    <strong className="text-xs text-slate-900 mt-1 block font-mono">
                      第 {inspectingEvidenceField.pageNumber || '1'} 页 (共 86 页)
                    </strong>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-blue-150">
                    <span className="text-[11px] text-slate-400 block">段落与行号定位</span>
                    <strong className="text-xs text-slate-900 mt-1 block font-mono">
                      第 3 自然段 · L.42-L.58 行
                    </strong>
                  </div>
                </div>
              </div>

              {/* 卡片 C: 招标文件原件原句对照与高亮 (Simulated Document Viewer) */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                {/* 模拟文件视窗顶栏 */}
                <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="font-mono ml-2 text-slate-700 font-semibold">
                      [原件实景扫描与文字流比对] {inspectingEvidenceField.sourceClause} · P.
                      {inspectingEvidenceField.pageNumber}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleCopySnippet(
                          inspectingEvidenceField.evidenceSnippetFr ||
                            inspectingEvidenceField.evidenceSnippetZh ||
                            ''
                        )
                      }
                      className="px-2 py-0.5 rounded bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 transition-colors cursor-pointer flex items-center gap-1 font-sans"
                    >
                      {copiedSnippet ? (
                        <>
                          <CheckCheck className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">已复制原句</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-500" />
                          <span>复制原句</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* 原文双语高亮对照区 */}
                <div className="p-4 space-y-3.5 bg-amber-50/20">
                  {/* 法文法定原句 */}
                  {inspectingEvidenceField.evidenceSnippetFr && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-bold text-blue-900 flex items-center gap-1">
                          <span>🇫🇷 法文官方原件段落 (Statutory Original Excerpt)</span>
                          <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-sans">
                            法定有效版本
                          </span>
                        </span>
                      </div>
                      <div className="p-3.5 rounded-lg bg-white border border-blue-200 text-slate-900 font-serif text-xs leading-relaxed shadow-2xs">
                        <mark className="bg-amber-200/90 text-amber-950 font-bold px-1.5 py-0.5 rounded border border-amber-300 not-italic mr-1">
                          📍 提取文字定位:
                        </mark>
                        <span className="italic font-medium">
                          {inspectingEvidenceField.evidenceSnippetFr}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 中文官方核定翻译 */}
                  {inspectingEvidenceField.evidenceSnippetZh && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          <span>🇨🇳 中文翻译释义对照 (Chinese Certified Translation)</span>
                        </span>
                      </div>
                      <div className="p-3.5 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs leading-relaxed shadow-2xs">
                        <mark className="bg-emerald-100 text-emerald-950 font-bold px-1.5 py-0.5 rounded border border-emerald-300 mr-1">
                          ✓ 中文语义对齐:
                        </mark>
                        <span>{inspectingEvidenceField.evidenceSnippetZh}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 卡片 D: 提取的结构化参数值与装配联动 */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  提取核定参数值与联动设定
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[11px] text-slate-400 block">字段名称</span>
                    <strong className="text-xs text-slate-900 mt-0.5 block">
                      {inspectingEvidenceField.fieldNameZh}
                    </strong>
                    {inspectingEvidenceField.fieldNameFr && (
                      <span className="text-[10px] text-slate-500 font-serif italic block mt-0.5">
                        {inspectingEvidenceField.fieldNameFr}
                      </span>
                    )}
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[11px] text-slate-400 block">当前提取值</span>
                    <strong className="text-xs text-emerald-800 mt-0.5 block font-mono">
                      {inspectingEvidenceField.value}
                    </strong>
                    {inspectingEvidenceField.valueFr && (
                      <span className="text-[10px] text-slate-500 font-serif italic block mt-0.5">
                        {inspectingEvidenceField.valueFr}
                      </span>
                    )}
                  </div>
                </div>

                {inspectingEvidenceField.note && (
                  <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>核验备忘说明：{inspectingEvidenceField.note}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 弹窗底部操作条 */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleCopyCitation(inspectingEvidenceField)}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                {copiedCitation ? (
                  <>
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">已复制出处引用</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>复制标准标书出处引用</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 justify-end">
                {inspectingEvidenceField.status === 'suggested' && (
                  <button
                    type="button"
                    onClick={() => handleAdoptSuggestion(inspectingEvidenceField.id)}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>确认采纳此项值 (转为已提取)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setInspectingEvidenceField(null)}
                  className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium text-xs transition-colors cursor-pointer"
                >
                  关闭核验窗口
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
