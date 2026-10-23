import React, { useState, useMemo } from 'react';
import { ProposalSection, VariableValues } from '../types/proposalVariables';
import { VariableHighlighter } from './VariableHighlighter';
import { VariableSidebar } from './VariableSidebar';
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
} from 'lucide-react';

interface ProposalAssemblyCanvasProps {
  sections: ProposalSection[];
  variableValues: VariableValues;
  onUpdateSections: (sections: ProposalSection[]) => void;
  onUpdateVariable: (key: string, value: string) => void;
  onResetToDemoValues: () => void;
}

export const ProposalAssemblyCanvas: React.FC<ProposalAssemblyCanvasProps> = ({
  sections,
  variableValues,
  onUpdateSections,
  onUpdateVariable,
  onResetToDemoValues,
}) => {
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    sections[0]?.id || ''
  );
  const [focusedVariable, setFocusedVariable] = useState<string | null>(null);
  const [isRawEditMode, setIsRawEditMode] = useState<boolean>(false);
  const [copiedSectionId, setCopiedSectionId] = useState<string | null>(null);

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

  // 更新当前组件的正文模板
  const handleUpdateActiveTemplate = (newContent: string) => {
    if (!activeSection) return;
    const updated = sections.map((s) =>
      s.id === activeSection.id ? { ...s, templateContent: newContent } : s
    );
    onUpdateSections(updated);
  };

  const handleCopySection = (content: string, id: string) => {
    // 将变量插值后复制
    const resolved = content.replace(/\[([^\]]+)\]/g, (_, key) => {
      return variableValues[key] || `[${key}]`;
    });
    navigator.clipboard.writeText(resolved);
    setCopiedSectionId(id);
    setTimeout(() => setCopiedSectionId(null), 2000);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col lg:flex-row min-h-[680px] h-[calc(100vh-140px)] max-h-[1080px]">
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
            // 计算该组件内的变量数
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
                  {sec.title}
                </h4>
                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                  {sec.summary}
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
            <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
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
                </div>
                <h2 className="text-base font-bold text-slate-900 mt-1">
                  {activeSection.title}
                </h2>
              </div>

              <div className="flex items-center gap-2">
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
                  <span>{isRawEditMode ? '完成模板编辑' : '编辑原始模板'}</span>
                </button>

                <button
                  onClick={() =>
                    handleCopySection(activeSection.templateContent, activeSection.id)
                  }
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1.5"
                  title="复制替换变量后的正式条款文本"
                >
                  {copiedSectionId === activeSection.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {copiedSectionId === activeSection.id ? '已复制条款' : '复制已填条款'}
                  </span>
                </button>
              </div>
            </div>

            {/* 提示条 */}
            <div className="px-6 py-2 bg-amber-50/60 border-b border-amber-100/80 flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-amber-500"></span>
                <span>
                  <strong>变量识别模式已激活：</strong>正文中黄色标记为动态变量，点击即可在右侧输入框即刻修改。
                </span>
              </div>
              <span className="text-[11px] text-amber-800">
                支持格式：<code className="font-mono bg-amber-100 px-1 rounded">[变量名称]</code>
              </span>
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
              ) : (
                <div className="bg-slate-50/50 p-6 rounded-xl border border-slate-200 shadow-2xs">
                  <VariableHighlighter
                    content={activeSection.templateContent}
                    variableValues={variableValues}
                    focusedVariable={focusedVariable}
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

      {/* 3. 右侧：变量识别即刻修改侧边栏 */}
      <VariableSidebar
        detectedVariables={detectedVariablesInActive}
        variableValues={variableValues}
        focusedVariable={focusedVariable}
        onUpdateVariable={onUpdateVariable}
        onFocusVariable={setFocusedVariable}
        onResetToDemoValues={onResetToDemoValues}
        componentTitle={activeSection?.title}
      />
    </div>
  );
};
