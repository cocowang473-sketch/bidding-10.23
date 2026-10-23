import React, { useState, useMemo } from 'react';
import { ProposalSection, VariableValues, LanguageMode } from '../types/proposalVariables';
import { TenderAttachment } from '../types/tenderAttachment';
import { INITIAL_VARIABLE_VALUES_FR } from '../data/mockProposalComponents';
import { VariableHighlighter } from './VariableHighlighter';
import { VariableSidebar } from './VariableSidebar';
import { BilingualProposalExportModal } from './BilingualProposalExportModal';
import { ProposalInteractivePreview } from './ProposalInteractivePreview';
import {
  FileText,
  CheckCircle2,
  Sliders,
  Layers,
  Sparkles,
  Eye,
  Edit2,
  Copy,
  Check,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Info,
  Paperclip,
  Download,
  Globe2,
  Printer,
  ArrowRight,
} from 'lucide-react';

interface ProposalAssemblyCanvasProps {
  sections: ProposalSection[];
  variableValues: VariableValues;
  onUpdateSections: (sections: ProposalSection[]) => void;
  onUpdateVariable: (key: string, value: string) => void;
  onResetToDemoValues: () => void;
  attachments?: TenderAttachment[];
  onNavigateToAttachments?: (varKey?: string) => void;
  focusedVariable?: string | null;
  onFocusVariable?: (varKey: string | null) => void;
  projectName?: string;
  tenderCode?: string;
  defaultViewMode?: 'assembly' | 'preview';
}

export const ProposalAssemblyCanvas: React.FC<ProposalAssemblyCanvasProps> = ({
  sections,
  variableValues,
  onUpdateSections,
  onUpdateVariable,
  onResetToDemoValues,
  attachments = [],
  onNavigateToAttachments,
  focusedVariable: externalFocusedVar,
  onFocusVariable: externalOnFocusVar,
  projectName = '阿尔及利亚提济乌祖省 240 床综合医院建设项目',
  tenderCode = '240-DZ-HEALTH-2026-001',
  defaultViewMode = 'assembly',
}) => {
  const [viewMode, setViewMode] = useState<'assembly' | 'preview'>(defaultViewMode);
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    sections[0]?.id || ''
  );
  const [internalFocusedVar, setInternalFocusedVar] = useState<string | null>(null);
  const [isRawEditMode, setIsRawEditMode] = useState<boolean>(false);
  const [copiedSectionId, setCopiedSectionId] = useState<string | null>(null);
  const [langMode, setLangMode] = useState<LanguageMode>('bilingual');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const focusedVariable = externalFocusedVar !== undefined ? externalFocusedVar : internalFocusedVar;
  const setFocusedVariable = externalOnFocusVar || setInternalFocusedVar;

  // 获取当前选中的组件
  const activeSection = useMemo(() => {
    return sections.find((s) => s.id === selectedSectionId) || sections[0];
  }, [sections, selectedSectionId]);

  // 从当前选中的组件文本中提取所有 [变量名]
  const detectedVariablesInActive = useMemo(() => {
    if (!activeSection) return [];
    const regex = /\[([^\]]+)\]/g;
    const vars: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(activeSection.templateContent)) !== null) {
      const v = match[1].trim();
      if (!vars.includes(v)) {
        vars.push(v);
      }
    }
    return vars;
  }, [activeSection]);

  // 统计在当前活动组件中，有多少变量已有官方招标文件依据
  const linkedDocsCountInActive = useMemo(() => {
    return detectedVariablesInActive.filter((vk) =>
      attachments.some((att) => att.linkedVariables.some((l) => l.variableKey === vk))
    ).length;
  }, [detectedVariablesInActive, attachments]);

  // 更新当前组件的正文模板
  const handleUpdateActiveTemplate = (newContent: string) => {
    if (!activeSection) return;
    const updated = sections.map((s) =>
      s.id === activeSection.id ? { ...s, templateContent: newContent } : s
    );
    onUpdateSections(updated);
  };

  const handleCopySection = (content: string, id: string) => {
    const resolved = content.replace(/\[([^\]]+)\]/g, (_, key) => {
      return variableValues[key] || `[${key}]`;
    });
    navigator.clipboard.writeText(resolved);
    setCopiedSectionId(id);
    setTimeout(() => setCopiedSectionId(null), 2000);
  };

  // 获取法文变量值映射
  const frenchVariableValues = useMemo(() => {
    const map: Record<string, string> = { ...INITIAL_VARIABLE_VALUES_FR };
    Object.keys(variableValues).forEach((k) => {
      if (variableValues[k] && !map[k]) {
        map[k] = variableValues[k];
      }
    });
    return map;
  }, [variableValues]);

  return (
    <div className="space-y-3">
      {/* 标书编制顶层模式切换工具栏 */}
      <div className="bg-white rounded-xl border border-slate-200 p-2.5 px-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('assembly')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'assembly'
                  ? 'bg-white text-blue-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>章节组件装配与变量锁定</span>
              <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700">
                {sections.length} 模块
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'preview'
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Printer className="w-3.5 h-3.5 text-emerald-600" />
              <span>标书交互排版与打印预览</span>
              <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-bold">
                A4 · 标准PDF
              </span>
            </button>
          </div>

          <span className="hidden xl:inline text-xs text-slate-500">
            {viewMode === 'assembly'
              ? '实时提取条款中的 [变量]，支持双向修改并联动到官方原件库。'
              : '动态排版 A4 标书版面、边距、字体、自动生成封面与目录，并自定义打印标准 PDF。'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {viewMode === 'assembly' ? (
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>标书排版预览与打印</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setViewMode('assembly')}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>返回条款组件装配</span>
            </button>
          )}
        </div>
      </div>

      {viewMode === 'assembly' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col lg:flex-row min-h-[680px] h-[calc(100vh-190px)] max-h-[1080px]">
          {/* 1. 左侧：标书章节组件目录导航 (自适应宽屏 280-320px) */}
          <div className="w-full lg:w-72 xl:w-80 border-r border-slate-200 flex flex-col bg-slate-50/70 shrink-0">
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-700" />
            <h3 className="text-xs font-bold text-slate-900">标书章节组件清单</h3>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {sections.length} 个标准模块
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
          {sections.map((sec, idx) => {
            const isSelected = sec.id === selectedSectionId;
            const varCount = (sec.templateContent.match(/\[([^\]]+)\]/g) || []).length;

            return (
              <div
                key={sec.id}
                onClick={() => {
                  setSelectedSectionId(sec.id);
                  setFocusedVariable(null);
                }}
                className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-blue-50/80 border-blue-600 shadow-2xs ring-1 ring-blue-600/30'
                    : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-mono text-slate-500">
                    {String(idx + 1).padStart(2, '0')}. {sec.category}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-50 text-amber-800 font-medium">
                    {varCount} 个变量
                  </span>
                </div>
                <h4
                  className={`text-xs font-semibold line-clamp-1 ${
                    isSelected ? 'text-blue-900' : 'text-slate-800'
                  }`}
                >
                  {langMode === 'fr' ? sec.titleFr || sec.title : sec.title}
                </h4>
                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                  {langMode === 'fr' ? sec.summaryFr || sec.summary : sec.summary}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. 中间：组装工作台核心编辑与高亮预览区 */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {activeSection ? (
          <>
            {/* 编辑区顶栏 */}
            <div className="px-6 py-3 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                    {activeSection.code}
                  </span>
                  <span className="text-xs text-slate-500">{activeSection.category}</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    已自动识别 {detectedVariablesInActive.length} 个动态变量
                  </span>
                  {linkedDocsCountInActive > 0 && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-blue-700 font-medium flex items-center gap-1">
                        <Paperclip className="w-3.5 h-3.5" />
                        {linkedDocsCountInActive} 项有招标文件依据
                      </span>
                    </>
                  )}
                </div>
                <h2 className="text-base font-bold text-slate-900 mt-1">
                  {langMode === 'fr' ? activeSection.titleFr || activeSection.title : activeSection.title}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {/* 语言模式切换 */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                  <button
                    onClick={() => setLangMode('zh')}
                    className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
                      langMode === 'zh' ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    中文
                  </button>
                  <button
                    onClick={() => setLangMode('fr')}
                    className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
                      langMode === 'fr' ? 'bg-blue-600 text-white font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Français
                  </button>
                  <button
                    onClick={() => setLangMode('bilingual')}
                    className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                      langMode === 'bilingual' ? 'bg-indigo-600 text-white font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Globe2 className="w-3 h-3" />
                    <span>双语</span>
                  </button>
                </div>

                {/* 导出填好文件按钮 */}
                <button
                  onClick={() => setIsExportModalOpen(true)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>导出文件 (中/法/双语)</span>
                </button>

                <button
                  onClick={() => setIsRawEditMode(!isRawEditMode)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isRawEditMode
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                  title="在变量插值预览与源代码模板之间切换"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>{isRawEditMode ? '完成编辑' : '编辑源码'}</span>
                </button>

                <button
                  onClick={() =>
                    handleCopySection(activeSection.templateContent, activeSection.id)
                  }
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {copiedSectionId === activeSection.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {copiedSectionId === activeSection.id ? '已复制' : '复制已填条款'}
                  </span>
                </button>
              </div>
            </div>

            {/* 正文编辑 / 高亮呈现视口 */}
            <div className="flex-1 overflow-y-auto p-6">
              {isRawEditMode ? (
                <div className="space-y-2 h-full flex flex-col">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      您可以直接在此编辑模板文本，或插入新的{' '}
                      <code className="text-blue-700 font-mono">[新变量名]</code> 标记：
                    </span>
                  </div>
                  <textarea
                    value={activeSection.templateContent}
                    onChange={(e) => handleUpdateActiveTemplate(e.target.value)}
                    className="flex-1 w-full p-4 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 leading-relaxed resize-none"
                    placeholder="输入包含 [项目名称] 等变量的文本模板..."
                  />
                </div>
              ) : langMode === 'bilingual' ? (
                /* 中法双语对照预览 */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-slate-50/70 p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                    <div className="text-xs font-bold text-slate-700 pb-1 border-b border-slate-200">
                      🇨🇳 中文条款 (Texte Chinois)
                    </div>
                    <VariableHighlighter
                      content={activeSection.templateContent}
                      variableValues={variableValues}
                      focusedVariable={focusedVariable}
                      attachments={attachments}
                      onSelectVariable={(varKey) => {
                        setFocusedVariable(varKey);
                      }}
                      className="text-xs text-slate-800 leading-relaxed font-sans"
                    />
                  </div>

                  <div className="bg-blue-50/30 p-5 rounded-xl border border-blue-200 shadow-2xs space-y-2">
                    <div className="text-xs font-bold text-blue-900 pb-1 border-b border-blue-100">
                      🇫🇷 Version Française (法文译文)
                    </div>
                    <VariableHighlighter
                      content={activeSection.templateContentFr || activeSection.templateContent}
                      variableValues={frenchVariableValues}
                      focusedVariable={focusedVariable}
                      attachments={attachments}
                      onSelectVariable={(varKey) => {
                        setFocusedVariable(varKey);
                      }}
                      className="text-xs text-slate-800 leading-relaxed font-sans"
                    />
                  </div>
                </div>
              ) : langMode === 'fr' ? (
                /* 纯法文版预览 */
                <div className="bg-blue-50/30 p-6 rounded-xl border border-blue-200 shadow-2xs">
                  <VariableHighlighter
                    content={activeSection.templateContentFr || activeSection.templateContent}
                    variableValues={frenchVariableValues}
                    focusedVariable={focusedVariable}
                    attachments={attachments}
                    onSelectVariable={(varKey) => {
                      setFocusedVariable(varKey);
                    }}
                    className="text-xs text-slate-800 leading-relaxed font-sans"
                  />
                </div>
              ) : (
                /* 纯中文版预览 */
                <div className="bg-slate-50/50 p-6 rounded-xl border border-slate-200 shadow-2xs">
                  <VariableHighlighter
                    content={activeSection.templateContent}
                    variableValues={variableValues}
                    focusedVariable={focusedVariable}
                    attachments={attachments}
                    onSelectVariable={(varKey) => {
                      setFocusedVariable(varKey);
                    }}
                    className="text-xs text-slate-800 leading-relaxed font-sans"
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
            请从左侧选择一个组件进行组装与变量编辑
          </div>
        )}
      </div>

      {/* 3. 右侧：变量识别即刻修改与附件依据联动侧边栏 */}
      <VariableSidebar
        detectedVariables={detectedVariablesInActive}
        variableValues={variableValues}
        focusedVariable={focusedVariable}
        attachments={attachments}
        onUpdateVariable={onUpdateVariable}
        onFocusVariable={setFocusedVariable}
        onResetToDemoValues={onResetToDemoValues}
        onFilterAttachmentsByVariable={onNavigateToAttachments}
        componentTitle={activeSection?.title}
      />

        </div>
      ) : (
        <ProposalInteractivePreview
          sections={sections}
          variableValues={variableValues}
          projectName={projectName}
          tenderCode={tenderCode}
          onClose={() => setViewMode('assembly')}
        />
      )}

      {/* 导出填好文件模态框 */}
      <BilingualProposalExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        sections={sections}
        variableValues={variableValues}
        defaultLanguage={langMode}
      />
    </div>
  );
};
