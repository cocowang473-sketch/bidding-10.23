import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ClipboardList,
  Sparkles,
  RefreshCw,
  Upload,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ListChecks,
  Save,
  Shield,
  Trash2,
} from 'lucide-react';
import {
  AivlApiError,
  analyzeInstructionBody,
  getInstructions,
  importBaseData,
  patchInstructions,
  scanInstructions,
} from '../utils/aivlApi';
import {
  AivlProject,
  AttachmentStatus,
  InstructionsAttachment,
  InstructionsBaseData,
  InstructionsRecord,
  InstructionsState,
  ValidationIssue,
} from '../types/bidding';
import { statusMeta } from '../utils/aivlAdapters';
import { ChangeHistoryRecord } from '../types/history';

type SubTab = 'summary' | 'base-data' | 'attachment' | 'validation';
const INSTR_FILE_INPUT_ACCEPT = '.doc,.docx,.pdf,.xlsx,.xls,.txt';
const BASE_FIELDS: { key: keyof InstructionsBaseData; label: string }[] = [
  { key: 'project_name', label: '项目名称' },
  { key: 'employer', label: '业主' },
  { key: 'main_contractor', label: '总包方' },
  { key: 'bidder_name', label: '投标人(我方)' },
  { key: 'legal_representative', label: '法定代表人' },
  { key: 'agent_name', label: '授权代理人' },
  { key: 'scope', label: '招标范围' },
  { key: 'bid_deadline', label: '投标截止' },
  { key: 'currency', label: '计价币种' },
  { key: 'locked_quote', label: '报价形式' },
  { key: 'site_visit', label: '现场考察' },
];

interface InstructionsWorkbenchViewProps {
  project: AivlProject | null;
  backendAlert: string | null;
  record: InstructionsRecord | null;
  onRecordChange: (rec: InstructionsRecord | null) => void;
  onRequestImport: () => void;
  onComplete: (rec: InstructionsRecord) => void;
  onLogChange: (record: Omit<ChangeHistoryRecord, 'id' | 'timestamp' | 'timeAgo'>) => void;
}

export const InstructionsWorkbenchView: React.FC<InstructionsWorkbenchViewProps> = ({
  project,
  backendAlert,
  record,
  onRecordChange,
  onRequestImport,
  onComplete,
  onLogChange,
}) => {
  const [subTab, setSubTab] = useState<SubTab>('summary');
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [baseFormDirty, setBaseFormDirty] = useState(false);
  const [baseForm, setBaseForm] = useState<InstructionsBaseData>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const state: InstructionsState | undefined = record?.result;
  const attachments = state?.attachments || [];

  useEffect(() => {
    if (!project || record) return;
    (async () => {
      setLoading(true);
      try {
        const r = await getInstructions(project.id);
        onRecordChange(r);
      } catch (e) {
        setError(e instanceof AivlApiError ? e.message : (e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [project, record, onRecordChange]);

  useEffect(() => {
    setBaseForm(state?.base_data || {});
    setBaseFormDirty(false);
  }, [state?.base_data]);

  const selected = useMemo<InstructionsAttachment | null>(() => {
    if (!selectedCode) return null;
    return attachments.find((a) => a.code === selectedCode) || null;
  }, [attachments, selectedCode]);

  const stats = useMemo(() => {
    const total = attachments.length;
    const done = attachments.filter((a) => a.status === 'done').length;
    const included = attachments.filter((a) => a.included !== false).length;
    return { total, done, included };
  }, [attachments]);

  const runAction = async <T,>(fn: () => Promise<T>, onDone?: (v: T) => void) => {
    setRunning(true);
    setError(null);
    try {
      const v = await fn();
      onDone?.(v);
    } catch (e) {
      setError(e instanceof AivlApiError ? e.message : (e as Error).message || '操作失败');
    } finally {
      setRunning(false);
    }
  };

  const handleAnalyzeBody = () => {
    if (!project) return;
    runAction(() => analyzeInstructionBody(project.id), (rec) => {
      onRecordChange(rec);
      onLogChange({
        actionType: 'instructions',
        title: '完成投标须知正文结构化解读',
        description: '生成摘要、关键字段、强制规则与风险列表,已填充"摘要"面板。',
        target: '投标须知工作台',
        operator: '当前商务造价师',
      });
    });
  };

  const handleRescan = () => {
    if (!project) return;
    runAction(() => scanInstructions(project.id, true), (rec) => {
      onRecordChange(rec);
      onLogChange({
        actionType: 'instructions',
        title: '重新扫描 ZIP 附件清单',
        description: `附件数:${rec.result?.attachments?.length ?? 0}`,
        target: '投标须知工作台',
        operator: '当前商务造价师',
      });
    });
  };

  const handleBaseDataSave = () => {
    if (!project) return;
    runAction(() => patchInstructions(project.id, { base_data: baseForm }), (rec) => {
      onRecordChange(rec);
      setBaseFormDirty(false);
      setSavedAt('刚才');
      onLogChange({
        actionType: 'instructions',
        title: '保存投标须知基础数据',
        description: `${Object.values(baseForm).filter(Boolean).length} 项字段写入状态机。`,
        target: '投标须知工作台 · 基础数据',
        operator: '当前商务造价师',
      });
    });
  };

  const handleImportBaseData = async (f: File) => {
    if (!project) return;
    setImporting(true);
    setError(null);
    try {
      const rec = await importBaseData(project.id, f);
      onRecordChange(rec);
      onLogChange({
        actionType: 'instructions',
        title: `导入文件回填基础数据 · ${f.name}`,
        description: '由后端 LLM 解析并合并到项目基础数据字段。',
        target: '投标须知工作台 · 基础数据',
        operator: '当前商务造价师',
      });
    } catch (e) {
      setError(e instanceof AivlApiError ? e.message : (e as Error).message);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleAttachmentStatus = (att: InstructionsAttachment, status: AttachmentStatus) => {
    if (!project) return;
    runAction(
      () =>
        patchInstructions(project.id, {
          attachment: { code: att.code, kind: att.kind, status, included: status !== 'not_required' },
        }),
      (rec) => {
        onRecordChange(rec);
        onLogChange({
          actionType: 'instructions',
          title: `更新附件 ${att.code} 状态为「${statusMeta(status).label}」`,
          description: att.title,
          target: `投标须知 · ${att.code}`,
          operator: '当前商务造价师',
        });
      }
    );
  };

  const handleAttachmentNotes = (att: InstructionsAttachment, notes: string) => {
    if (!project) return;
    runAction(() =>
      patchInstructions(project.id, {
        attachment: { code: att.code, kind: att.kind, notes },
      })
    , (rec) => onRecordChange(rec));
  };

  const handleRunValidate = () => {
    if (!project) return;
    runAction(() => patchInstructions(project.id, { run_validate: true }), (rec) =>
      onRecordChange(rec)
    );
  };

  const handleComplete = () => {
    if (!project || !record) return;
    runAction(() => patchInstructions(project.id, { complete: true }), (rec) => {
      onRecordChange(rec);
      onComplete(rec);
    });
  };

  // ---------------- Rendering ----------------

  if (!project) {
    return (
      <div className="space-y-4">
        {backendAlert && <BackendBanner message={backendAlert} />}
        <div className="bg-white rounded-xl border border-slate-200 p-10 flex flex-col items-center gap-4 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <ClipboardList className="w-7 h-7 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">投标须知工作台</h2>
            <p className="mt-1 text-sm text-slate-500 max-w-md">
              导入招标 ZIP 后,系统自动识别"投标须知"正文与 9 份附件,驱动状态机式工作流 — 结构化摘要、
              基础数据统一、分级编制与联动校验。
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

  const instrDocLabel = state?.instruction_doc?.title || state?.instruction_doc?.path || '2.1 投标须知.doc';
  const briefReady = Boolean(state?.instruction_brief?.summary);
  const progressPct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div className="space-y-4">
      {backendAlert && <BackendBanner message={backendAlert} />}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="flex-1 min-w-0">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-rose-500 hover:text-rose-700"
            title="关闭"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <HeaderCard
        projectName={project.name}
        projectId={project.id}
        instrDocLabel={instrDocLabel}
        stats={stats}
        progressPct={progressPct}
        completed={Boolean(state?.completed)}
        running={running || loading}
        briefReady={briefReady}
        onAnalyze={handleAnalyzeBody}
        onRescan={handleRescan}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* 左侧 1/4:附件清单 */}
        <aside className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-3 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 tracking-wide uppercase">
              附件 · {stats.total}
            </h3>
            <span className="text-[10px] font-mono text-slate-400">{progressPct}%</span>
          </div>
          <nav>
            <ul className="divide-y divide-slate-100">
              <li>
                <button
                  onClick={() => {
                    setSelectedCode(null);
                    setSubTab('summary');
                  }}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-2 text-xs transition-colors ${
                    !selectedCode
                      ? 'bg-blue-50 border-l-2 border-blue-600 text-blue-800'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <ListChecks className="w-3.5 h-3.5" />
                  <span className="font-medium">摘要 & 基础数据</span>
                </button>
              </li>
              {attachments.map((a) => {
                const meta = statusMeta(a.status);
                const active = selectedCode === a.code;
                return (
                  <li key={a.code}>
                    <button
                      onClick={() => {
                        setSelectedCode(a.code);
                        setSubTab('attachment');
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center gap-2 text-xs transition-colors ${
                        active
                          ? 'bg-blue-50 border-l-2 border-blue-600'
                          : 'hover:bg-slate-50 border-l-2 border-transparent'
                      }`}
                      title={a.file_name}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dotClass}`}></span>
                      <span className="font-mono text-[10px] text-slate-400 shrink-0">
                        {a.code}
                      </span>
                      <span className="font-medium text-slate-900 truncate flex-1">{a.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* 右侧 3/4:动态内容 */}
        <section className="lg:col-span-3 space-y-4">
          <SubTabBar
            subTab={subTab}
            onChange={setSubTab}
            showValidation={Boolean(state?.validation)}
            showAttachment={Boolean(selected)}
          />

          {subTab === 'summary' && (
            <SummaryPanel state={state} briefReady={briefReady} onAnalyze={handleAnalyzeBody} />
          )}

          {subTab === 'base-data' && (
            <BaseDataPanel
              form={baseForm}
              dirty={baseFormDirty}
              onChange={(k, v) => {
                setBaseForm((prev) => ({ ...prev, [k]: v }));
                setBaseFormDirty(true);
              }}
              onSave={handleBaseDataSave}
              onImportClick={() => fileRef.current?.click()}
              importing={importing}
              savedAt={savedAt}
            />
          )}

          {subTab === 'attachment' && selected && (
            <AttachmentDetailPanel
              attachment={selected}
              hint={
                state?.instruction_brief?.attachment_hints?.find(
                  (h) => h.code === selected.code || h.kind === selected.kind
                )?.hint
              }
              onStatus={(s) => handleAttachmentStatus(selected, s)}
              onNotesBlur={(notes) => {
                if ((notes || '') !== (selected.notes || '')) {
                  handleAttachmentNotes(selected, notes);
                }
              }}
            />
          )}

          {subTab === 'validation' && (
            <ValidationPanel
              items={state?.validation?.items || []}
              allPassed={state?.validation?.all_passed}
              onRun={handleRunValidate}
              running={running}
            />
          )}

          {/* 底部:完成按钮 */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-500">
              {savedAt ? `自动保存 · ${savedAt}` : ''}
            </span>
            <button
              onClick={handleComplete}
              disabled={running || stats.total === 0 || stats.done < stats.total}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                stats.done < stats.total
                  ? `还有 ${stats.total - stats.done} 份附件未完成`
                  : '完成须知编制,写入全局参数'
              }
            >
              {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              完成须知编制并写入全局参数
            </button>
          </div>
        </section>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={INSTR_FILE_INPUT_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImportBaseData(f);
        }}
      />
    </div>
  );
};

// ---------------- Sub-components ----------------

interface HeaderCardProps {
  projectName: string;
  projectId: number;
  instrDocLabel: string;
  stats: { total: number; done: number; included: number };
  progressPct: number;
  completed: boolean;
  running: boolean;
  briefReady: boolean;
  onAnalyze: () => void;
  onRescan: () => void;
}

const HeaderCard: React.FC<HeaderCardProps> = ({
  projectName,
  projectId,
  instrDocLabel,
  stats,
  progressPct,
  completed,
  running,
  briefReady,
  onAnalyze,
  onRescan,
}) => (  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="px-5 py-4 flex items-start justify-between gap-4 flex-wrap">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-indigo-600" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-900 truncate">{projectName}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
              #{projectId}
            </span>
            {completed ? (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" />
                已完成
              </span>
            ) : briefReady ? (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                编制中 · {stats.done}/{stats.total}
              </span>
            ) : (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                待分析正文
              </span>
            )}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 truncate">
            正文来源:{instrDocLabel}
          </div>
          <div className="mt-2 h-1.5 w-72 max-w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onRescan}
          disabled={running}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          重新扫描 ZIP
        </button>
        <button
          onClick={onAnalyze}
          disabled={running}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-50"
        >
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {briefReady ? '重新分析正文' : '分析须知正文'}
        </button>
      </div>
    </div>
  </div>
);

interface SubTabBarProps {
  subTab: SubTab;
  onChange: (t: SubTab) => void;
  showValidation: boolean;
  showAttachment: boolean;
}

const SubTabBar: React.FC<SubTabBarProps> = ({ subTab, onChange, showValidation, showAttachment }) => {
  const tabs: Array<{ id: SubTab; label: string; show: boolean }> = [
    { id: 'summary', label: '摘要', show: true },
    { id: 'base-data', label: '基础数据', show: true },
    { id: 'attachment', label: '附件详情', show: showAttachment },
    { id: 'validation', label: '联动校验', show: showValidation || true },
  ];
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
      {tabs
        .filter((t) => t.show)
        .map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`px-3 py-1 rounded-md transition-colors ${
              subTab === t.id
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
    </div>
  );
};

const SummaryPanel: React.FC<{
  state: InstructionsState | undefined;
  briefReady: boolean;
  onAnalyze: () => void;
}> = ({ state, briefReady, onAnalyze }) => {
  const brief = state?.instruction_brief;
  if (!briefReady || !brief) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 flex flex-col items-center gap-3 text-center text-slate-500">
        <Sparkles className="w-8 h-8 text-slate-300" />
        <p className="text-sm">点击上方「分析须知正文」生成摘要、强制规则、附件要点与风险列表。</p>
        <button
          onClick={onAnalyze}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Sparkles className="w-3.5 h-3.5" />
          开始分析
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {brief.summary && (
        <SummaryCard title="总体摘要">
          <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{brief.summary}</p>
        </SummaryCard>
      )}
      {brief.key_fields && brief.key_fields.length > 0 && (
        <SummaryCard title="关键字段">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
            {brief.key_fields.map((f, idx) => (
              <div key={idx} className="grid grid-cols-[120px_1fr] gap-2 text-xs items-start">
                <dt className="text-slate-500">{f.label}</dt>
                <dd className="text-slate-900 font-medium">{f.value}</dd>
              </div>
            ))}
          </dl>
        </SummaryCard>
      )}
      {brief.mandatory_rules && brief.mandatory_rules.length > 0 && (
        <SummaryCard title="强制规则">
          <ul className="space-y-1.5 text-xs text-slate-800">
            {brief.mandatory_rules.map((r, idx) => (
              <li key={idx} className="flex gap-2 items-start">
                <span className="text-rose-500 shrink-0">●</span>
                <span className="leading-relaxed">{r}</span>
              </li>
            ))}
          </ul>
        </SummaryCard>
      )}
      {brief.risks && brief.risks.length > 0 && (
        <SummaryCard title="风险提示">
          <ul className="space-y-1.5 text-xs text-slate-800">
            {brief.risks.map((r, idx) => (
              <li key={idx} className="flex gap-2 items-start">
                <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{r}</span>
              </li>
            ))}
          </ul>
        </SummaryCard>
      )}
    </div>
  );
};

const SummaryCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
      <h3 className="text-xs font-bold text-slate-700 tracking-wide uppercase">{title}</h3>
    </div>
    <div className="px-4 py-3">{children}</div>
  </div>
);

const BaseDataPanel: React.FC<{
  form: InstructionsBaseData;
  dirty: boolean;
  onChange: (k: keyof InstructionsBaseData, v: string) => void;
  onSave: () => void;
  onImportClick: () => void;
  importing: boolean;
  savedAt: string | null;
}> = ({ form, dirty, onChange, onSave, onImportClick, importing, savedAt }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
      <h3 className="text-xs font-bold text-slate-700 tracking-wide uppercase">基础数据</h3>
      <div className="flex items-center gap-2">
        <button
          onClick={onImportClick}
          disabled={importing}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-50"
        >
          {importing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Upload className="w-3 h-3" />
          )}
          从文件导入分析回填
        </button>
        <button
          onClick={onSave}
          disabled={!dirty}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
        >
          <Save className="w-3 h-3" />
          保存
        </button>
      </div>
    </div>
    <div className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
        {BASE_FIELDS.map(({ key, label }) => (
          <div key={String(key)} className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-500">{label}</label>
            <input
              type="text"
              value={(form[key] || '') as string}
              onChange={(e) => onChange(key, e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-white"
            />
          </div>
        ))}
      </div>
      {savedAt && (
        <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-1.5">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          已保存 · {savedAt}
        </div>
      )}
    </div>
  </div>
);

const AttachmentDetailPanel: React.FC<{
  attachment: InstructionsAttachment;
  hint?: string;
  onStatus: (s: AttachmentStatus) => void;
  onNotesBlur: (notes: string) => void;
}> = ({ attachment, hint, onStatus, onNotesBlur }) => {
  const [notes, setNotes] = useState(attachment.notes || '');
  useEffect(() => setNotes(attachment.notes || ''), [attachment.notes]);
  const meta = statusMeta(attachment.status);
  const statusOptions: AttachmentStatus[] = ['done', 'to_prepare', 'not_required', 'skipped'];
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
              {attachment.code}
            </span>
            <span className="font-semibold text-sm text-slate-900 truncate">{attachment.title}</span>
            <span
              className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${meta.chipClass}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`}></span>
              {meta.label}
            </span>
          </div>
          {attachment.file_name && (
            <div className="mt-1 text-[11px] text-slate-500 truncate" title={attachment.file_name}>
              文件:{attachment.file_name}
            </div>
          )}
        </div>
      </div>
      <div className="p-4 space-y-4">
        {hint && (
          <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs text-blue-900 leading-relaxed">
            <div className="font-semibold mb-0.5">编制要点</div>
            {hint}
          </div>
        )}
        <div className="space-y-1.5">
          <div className="text-[11px] text-slate-500">状态</div>
          <div className="flex flex-wrap gap-1.5">
            {statusOptions.map((s) => {
              const sm = statusMeta(s);
              const active = attachment.status === s;
              return (
                <button
                  key={s}
                  onClick={() => onStatus(s)}
                  className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                    active ? sm.chipClass + ' font-semibold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${sm.dotClass}`}></span>
                  {sm.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="text-[11px] text-slate-500">备注</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => onNotesBlur(notes)}
            rows={3}
            placeholder="编制说明、承办人、依赖关系等..."
            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-white resize-y"
          />
        </div>
      </div>
    </div>
  );
};

const ValidationPanel: React.FC<{
  items: ValidationIssue[];
  allPassed?: boolean;
  onRun: () => void;
  running: boolean;
}> = ({ items, allPassed, onRun, running }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Shield className="w-3.5 h-3.5 text-slate-500" />
        <h3 className="text-xs font-bold text-slate-700 tracking-wide uppercase">联动校验</h3>
        {items.length > 0 && (
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full border ${
              allPassed
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {allPassed ? '全部通过' : `待处理 ${items.filter((i) => !i.passed).length}`}
          </span>
        )}
      </div>
      <button
        onClick={onRun}
        disabled={running}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
      >
        {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
        运行校验
      </button>
    </div>
    {items.length === 0 ? (
      <div className="p-6 text-center text-xs text-slate-500">
        尚无校验结果,点"运行校验"按名称/金额/人员/进度一致性检查。
      </div>
    ) : (
      <ul className="divide-y divide-slate-100">
        {items.map((i) => (
          <li key={i.code} className="px-4 py-2.5 flex items-start gap-3">
            {i.passed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-slate-900">{i.description}</div>
              {i.detail && <div className="mt-0.5 text-[11px] text-slate-500">{i.detail}</div>}
            </div>
            <span
              className={`text-[10px] font-mono shrink-0 ${
                i.passed ? 'text-emerald-600' : 'text-amber-600'
              }`}
            >
              {i.code}
            </span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

const BackendBanner: React.FC<{ message: string }> = ({ message }) => (
  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-start gap-2">
    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
    <span>{message}</span>
  </div>
);






