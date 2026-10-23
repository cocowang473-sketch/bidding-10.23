import React, { useState, useMemo } from 'react';
import { ProposalSection, VariableValues, LanguageMode } from '../types/proposalVariables';
import { INITIAL_VARIABLE_VALUES_FR } from '../data/mockProposalComponents';
import {
  X,
  FileText,
  Download,
  Copy,
  Check,
  Globe2,
  Printer,
  Sparkles,
  FileCheck,
} from 'lucide-react';

interface BilingualProposalExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sections: ProposalSection[];
  variableValues: VariableValues;
  defaultLanguage?: LanguageMode;
}

export const BilingualProposalExportModal: React.FC<BilingualProposalExportModalProps> = ({
  isOpen,
  onClose,
  sections,
  variableValues,
  defaultLanguage = 'bilingual',
}) => {
  const [selectedLang, setSelectedLang] = useState<LanguageMode>(defaultLanguage);
  const [copied, setCopied] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string>('all');

  // 构建针对法语版标书的变量取值映射
  const frenchVariableValues = useMemo(() => {
    const map: Record<string, string> = { ...INITIAL_VARIABLE_VALUES_FR };
    // 如果用户在中文变量中修改了数值，且有对应值，做智能兼容
    Object.keys(variableValues).forEach((k) => {
      if (variableValues[k] && !map[k]) {
        map[k] = variableValues[k];
      }
    });
    return map;
  }, [variableValues]);

  // 生成解析替换后的标书条款内容
  const resolvedSections = useMemo(() => {
    return sections.map((sec) => {
      // 1. 中文插值解析
      const zhContent = sec.templateContent.replace(/\[([^\]]+)\]/g, (_, key) => {
        return variableValues[key] || `[${key}]`;
      });

      // 2. 法语插值解析
      const frContent = (sec.templateContentFr || sec.templateContent).replace(
        /\[([^\]]+)\]/g,
        (_, key) => {
          return frenchVariableValues[key] || variableValues[key] || `[${key}]`;
        }
      );

      return {
        ...sec,
        resolvedZh: zhContent,
        resolvedFr: frContent,
      };
    });
  }, [sections, variableValues, frenchVariableValues]);

  // 获取当前查看/导出的全文文本
  const fullDocumentText = useMemo(() => {
    const list =
      activeSectionId === 'all'
        ? resolvedSections
        : resolvedSections.filter((s) => s.id === activeSectionId);

    if (selectedLang === 'zh') {
      return list
        .map((s) => `========================================\n${s.code} - ${s.title}\n========================================\n\n${s.resolvedZh}`)
        .join('\n\n\n');
    }
    if (selectedLang === 'fr') {
      return list
        .map((s) => `========================================\n${s.code} - ${s.titleFr || s.title}\n========================================\n\n${s.resolvedFr}`)
        .join('\n\n\n');
    }
    // 双语对照版
    return list
      .map(
        (s) =>
          `================================================================================\n【中文版】${s.code} - ${s.title}\n【VERSION FRANÇAISE】${s.code} - ${s.titleFr || s.title}\n================================================================================\n\n[中文条款 / Texte Chinois]:\n${s.resolvedZh}\n\n[法文对照 / Traduction Française]:\n${s.resolvedFr}`
      )
      .join('\n\n\n');
  }, [resolvedSections, selectedLang, activeSectionId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(fullDocumentText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([fullDocumentText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const langSuffix = selectedLang === 'zh' ? '中文版' : selectedLang === 'fr' ? 'Version-Francaise' : '中法双语对照版';
    a.download = `投标商务与法定文件-${langSuffix}-240床医院.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* 顶部标题栏 */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
              <Globe2 className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                导出填好的标书文件 (中法双语翻译与对照)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                支持导出纯中文版、法文官方版（Version Française）或中法双语对照版。
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 语种切换与章节选择栏 */}
        <div className="px-6 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* 语种选择标签 */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setSelectedLang('zh')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedLang === 'zh'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🇨🇳 中文版</span>
            </button>
            <button
              onClick={() => setSelectedLang('fr')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedLang === 'fr'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🇫🇷 Version Française (法文版)</span>
            </button>
            <button
              onClick={() => setSelectedLang('bilingual')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedLang === 'bilingual'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span>🌐 中法双语并排对照</span>
            </button>
          </div>

          {/* 筛选章节 */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500">导出范围：</span>
            <select
              value={activeSectionId}
              onChange={(e) => setActiveSectionId(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="all">全套商务与法定标书 (共 {sections.length} 个标准模块)</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 预览视口 */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs font-sans text-xs leading-relaxed text-slate-800 space-y-6">
            {(activeSectionId === 'all'
              ? resolvedSections
              : resolvedSections.filter((s) => s.id === activeSectionId)
            ).map((sec) => (
              <div key={sec.id} className="border-b border-slate-100 pb-6 last:border-none last:pb-0 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono font-bold text-[11px]">
                      {sec.code}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      {selectedLang === 'fr' ? sec.titleFr || sec.title : sec.title}
                    </h3>
                    {selectedLang === 'bilingual' && sec.titleFr && (
                      <span className="text-xs text-slate-500 italic">/ {sec.titleFr}</span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400">{sec.category}</span>
                </div>

                {/* 内容渲染 */}
                {selectedLang === 'zh' ? (
                  <div className="p-4 bg-slate-50/70 rounded-lg border border-slate-200 whitespace-pre-wrap font-sans text-xs text-slate-800 leading-relaxed">
                    {sec.resolvedZh}
                  </div>
                ) : selectedLang === 'fr' ? (
                  <div className="p-4 bg-blue-50/30 rounded-lg border border-blue-100 whitespace-pre-wrap font-sans text-xs text-slate-800 leading-relaxed">
                    {sec.resolvedFr}
                  </div>
                ) : (
                  /* 双语对照 */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="text-[11px] font-bold text-slate-700 mb-2 pb-1 border-b border-slate-200 flex items-center gap-1">
                        <span>🇨🇳 中文正文 (Texte Chinois)</span>
                      </div>
                      <div className="whitespace-pre-wrap text-xs text-slate-800 leading-relaxed">
                        {sec.resolvedZh}
                      </div>
                    </div>

                    <div className="p-3.5 bg-blue-50/30 rounded-lg border border-blue-200">
                      <div className="text-[11px] font-bold text-blue-900 mb-2 pb-1 border-b border-blue-100 flex items-center gap-1">
                        <span>🇫🇷 法文译文 (Version Française)</span>
                      </div>
                      <div className="whitespace-pre-wrap text-xs text-slate-800 leading-relaxed">
                        {sec.resolvedFr}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 底部操作条 */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <FileCheck className="w-4 h-4 text-emerald-600" />
            <span>
              已将变量自动映射为对应语种法定值，可直接用于阿尔及利亚及国际法标工程递交。
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCopy}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已复制全文' : '复制全文'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载填好的标书文档 (.txt / .docx)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
