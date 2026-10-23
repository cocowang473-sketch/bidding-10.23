import React, { useMemo, useState } from 'react';
import {
  FileSearch,
  Sparkles,
  RefreshCw,
  Lock,
  Loader2,
  AlertTriangle,
  Target,
  CheckCircle2,
  HelpCircle,
  Upload,
  Variable,
  Trash2,
  FileText,
} from 'lucide-react';
import {
  AivlApiError,
  analyzeNotice,
} from '../utils/aivlApi';
import {
  AivlProject,
  NoticeAnalysisResult,
  NoticeFieldValue,
  NoticeTemplateMode,
} from '../types/bidding';
import { NOTICE_SECTION_LABEL } from '../utils/aivlAdapters';
import { FieldGroupCard } from './FieldGroupCard';

interface NoticeAnalysisViewProps {
  project: AivlProject | null;
  zipFileName: string | null;
  backendAlert: string | null;
  result: NoticeAnalysisResult | null;
  onResultChange: (res: NoticeAnalysisResult | null) => void;
  onRequestImport: () => void;
  onWriteToVariables: (res: NoticeAnalysisResult) => void;
  onResetProject: () => void;
}

export const NoticeAnalysisView: React.FC<NoticeAnalysisViewProps> = ({
  project,
  zipFileName,
  backendAlert,
  result,
  onResultChange,
  onRequestImport,
  onWriteToVariables,
  onResetProject,
}) => {
  const [mode, setMode] = useState<NoticeTemplateMode>(
    (result?.template_mode as NoticeTemplateMode) || 'green_template'
  );
  const [focusKeywords, setFocusKeywords] = useState('');
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  const locked = Boolean(result?.template_locked);

  const grouped = useMemo(() => {
    const map = new Map<string, { title: string; fields: NoticeFieldValue[] }>();
    for (const f of result?.fields || []) {
      const sectionKey = f.section || 'other';
      const sectionTitle =
        f.section_title ||
        NOTICE_SECTION_LABEL[sectionKey] ||
        (sectionKey === 'other' ? '其他字段' : sectionKey);
      if (!map.has(sectionKey)) map.set(sectionKey, { title: sectionTitle, fields: [] });
      map.get(sectionKey)!.fields.push(f);
    }
    return Array.from(map.values());
  }, [result]);

  const totalFields = result?.fields?.length || 0;
  const missingCount = result?.fields?.filter((f) => f.missing || !f.value).length || 0;
  const filledCount = totalFields - missingCount;

  const canRun = Boolean(project && !running);

  const runAnalyze = async () => {
    if (!project) return;
    setRunning(true);
    setRunError(null);
    try {
      const res = await analyzeNotice(project.id, {
        template_mode: mode,
        focus_keywords: focusKeywords.trim() || undefined,
      });
      onResultChange(res);
      if (res.template_mode) setMode(res.template_mode as NoticeTemplateMode);
    } catch (e) {
      setRunError(e instanceof AivlApiError ? e.message : (e as Error).message || '分析失败');
    } finally {
      setRunning(false);
    }
  };

  // —— 空态:还没导入 ZIP ——
  if (!project) {
    return (
      <div className="space-y-4">
        {backendAlert && <BackendBanner message={backendAlert} />}
        <div className="bg-white rounded-xl border border-slate-200 p-10 flex flex-col items-center gap-4 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
            <FileSearch className="w-7 h-7 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">招标公告智能解读</h2>
            <p className="mt-1 text-sm text-slate-500 max-w-md">
              导入机电分包招标文件 ZIP,系统将基于绿模板或通用模板自动抽取 20+ 结构化字段,
              并把结果一键回填到标书变量库。
            </p>
          </div>
          <button
            onClick={onRequestImport}
            className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm"
          >
            <Upload className="w-4 h-4" />
            导入招标文件 ZIP
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {backendAlert && <BackendBanner message={backendAlert} />}

      {/* 顶部:标段上下文 + 模板切换 + 操作区 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-slate-900 truncate">
                  {project.name}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                  #{project.id}
                </span>
                {result ? (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    已分析 · {filledCount}/{totalFields} 字段
                    {missingCount > 0 && ` · 待补齐 ${missingCount}`}
                  </span>
                ) : (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    待分析
                  </span>
                )}
              </div>
              <div className="mt-1 text-[11px] text-slate-500 truncate">
                {zipFileName
                  ? `已导入 ${zipFileName}`
                  : result?.source
                  ? `公告原文:${result.source}`
                  : '尚未导入 ZIP(项目创建自上一次会话)'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onRequestImport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              title="重新导入或切换招标 ZIP"
            >
              <Upload className="w-3.5 h-3.5" />
              重新导入
            </button>
            <button
              onClick={() => {
                if (window.confirm('确认清除当前项目?本地保存的 projectId 将被移除,但后端项目保留。')) {
                  onResetProject();
                }
              }}
              className="inline-flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-700 text-slate-500"
              title="清除当前项目绑定"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 模板切换 + 关键词 + 开始分析 */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
              <ModeButton
                active={mode === 'green_template'}
                disabled={locked}
                onClick={() => setMode('green_template')}
                label="基础模板"
                hint="与解读表绿字段对齐"
              />
              <ModeButton
                active={mode === 'llm_general'}
                disabled={locked}
                onClick={() => setMode('llm_general')}
                label="通用字段模板"
                hint="LLM 20 通用字段"
              />
            </div>
            {locked && (
              <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded text-slate-500 bg-slate-100 border border-slate-200">
                <Lock className="w-3 h-3" />
                已锁定
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="聚焦关键词(可选,逗号分隔)"
                value={focusKeywords}
                onChange={(e) => setFocusKeywords(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-white w-56"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {result && (
              <button
                onClick={() => onWriteToVariables(result)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700"
              >
                <Variable className="w-3.5 h-3.5" />
                一键回填标书变量
              </button>
            )}
            <button
              onClick={runAnalyze}
              disabled={!canRun}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {running ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : result ? (
                <RefreshCw className="w-3.5 h-3.5" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {running ? '分析中...' : result ? '重新分析' : '开始分析'}
            </button>
          </div>
        </div>

        {runError && (
          <div className="px-5 py-2.5 border-t border-rose-200 bg-rose-50 text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="min-w-0">
              <span className="font-semibold">分析失败:</span> {runError}
            </span>
          </div>
        )}
      </div>

      {/* 没有分析结果时的占位 */}
      {!result && !running && (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 flex flex-col items-center gap-3 text-center text-slate-500">
          <Sparkles className="w-8 h-8 text-slate-300" />
          <div className="text-sm">
            点击右上「开始分析」,后端将调用大模型解析招标通告 .doc 原文并抽取结构化字段。
          </div>
        </div>
      )}

      {/* 主体双栏 */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {grouped.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
                后端未返回字段(可能是文档未命中模板,尝试切换"通用字段模板"重新分析)
              </div>
            ) : (
              grouped.map((g) => <FieldGroupCard key={g.title} title={g.title} fields={g.fields} />)
            )}
          </div>

          <div className="space-y-4">
            {/* 关键词命中 */}
            {result.focus_hits && result.focus_hits.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-700 tracking-wide uppercase">
                    关注关键词命中 · {result.focus_hits.length}
                  </h3>
                </div>
                <ul className="p-3 space-y-2">
                  {result.focus_hits.map((h, idx) => (
                    <li key={idx} className="text-[11px] bg-blue-50/50 border border-blue-100 rounded-lg px-2.5 py-1.5">
                      <div className="font-semibold text-blue-800">{h.keyword}</div>
                      <div className="mt-0.5 text-slate-700 line-clamp-3" title={h.snippet}>
                        {h.snippet}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 原子要求 */}
            {result.atomic_requirements && result.atomic_requirements.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <h3 className="text-xs font-bold text-slate-700 tracking-wide uppercase">
                    原子要求 · {result.atomic_requirements.length}
                  </h3>
                </div>
                <ul className="p-3 space-y-2">
                  {result.atomic_requirements.map((a, idx) => (
                    <li
                      key={idx}
                      className="text-[11px] border border-slate-100 rounded-lg px-2.5 py-1.5"
                    >
                      <div className="text-slate-900 leading-relaxed">{a.text}</div>
                      {a.evidence && (
                        <div className="mt-1 text-[10px] text-slate-400 italic line-clamp-2">
                          证据:{a.evidence}
                        </div>
                      )}
                      {a.category && (
                        <span className="mt-1 inline-block text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                          {a.category}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 待确认问题 */}
            {result.open_questions && result.open_questions.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                  <h3 className="text-xs font-bold text-slate-700 tracking-wide uppercase">
                    待确认问题 · {result.open_questions.length}
                  </h3>
                </div>
                <ul className="p-3 space-y-2">
                  {result.open_questions.map((q, idx) => (
                    <li
                      key={idx}
                      className="text-[11px] bg-amber-50/40 border border-amber-100 rounded-lg px-2.5 py-1.5"
                    >
                      <div className="text-slate-900">{q.text}</div>
                      {q.reason && (
                        <div className="mt-0.5 text-[10px] text-amber-700/80">{q.reason}</div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface ModeButtonProps {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
}

const ModeButton: React.FC<ModeButtonProps> = ({ active, disabled, onClick, label, hint }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={hint}
    className={`px-3 py-1 rounded-md transition-colors text-xs ${
      active
        ? 'bg-white text-blue-700 shadow-sm font-semibold'
        : 'text-slate-500 hover:text-slate-700'
    } disabled:cursor-not-allowed disabled:opacity-60`}
  >
    {label}
  </button>
);

const BackendBanner: React.FC<{ message: string }> = ({ message }) => (
  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-start gap-2">
    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
    <span>{message}</span>
  </div>
);
