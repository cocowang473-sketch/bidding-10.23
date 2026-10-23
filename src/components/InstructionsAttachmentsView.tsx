import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  Search,
  Sparkles,
  CheckCircle2,
  CircleDashed,
  Edit3,
  Save,
  X,
  FileText,
  AlertTriangle,
  Users,
  Lock,
  Scale,
  Hammer,
  Wrench,
  Clock,
  Briefcase,
  ShieldCheck,
  Zap,
  Settings,
  Link2,
  Info,
  Download,
  CheckCircle,
} from 'lucide-react';
import {
  type AttachmentDefinition,
  type AttachmentField,
  type GenerationMode,
  type AttachmentStatus,
  GENERATION_MODE_META,
} from '../types/instructionsAttachments';
import { MOCK_ATTACHMENTS, MOCK_VALIDATIONS } from '../data/mockInstructionsAttachments';

// 附件图标映射
const attachmentIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  '01': ShieldCheck,
  '02': FileText,
  '03': Users,
  '04': Briefcase,
  '05': Users,
  '06': Hammer,
  '07': Clock,
  '08': Scale,
  '09': Lock,
};

// 生成方式图标
const modeIcon: Record<GenerationMode, React.ComponentType<{ className?: string }>> = {
  auto: Zap,
  auto_review: Edit3,
  professional: Settings,
  manual: Wrench,
};

// 状态元数据
const STATUS_META: Record<AttachmentStatus, { label: string; chipClass: string }> = {
  not_started: {
    label: '未开始',
    chipClass: 'bg-slate-50 text-slate-600 border-slate-200',
  },
  auto_filled: {
    label: '已预填',
    chipClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  in_review: {
    label: '待复核',
    chipClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  in_progress: {
    label: '填写中',
    chipClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  completed: {
    label: '已完成',
    chipClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  needs_fix: {
    label: '需修正',
    chipClass: 'bg-red-50 text-red-700 border-red-200',
  },
};

interface InstructionsAttachmentsViewProps {
  projectName?: string;
}

export const InstructionsAttachmentsView: React.FC<InstructionsAttachmentsViewProps> = ({ projectName }) => {
  const [attachments, setAttachments] = useState<AttachmentDefinition[]>(MOCK_ATTACHMENTS);
  const [activeCode, setActiveCode] = useState<string>('01');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const currentAttachment = useMemo(
    () => attachments.find((a) => a.code === activeCode) || attachments[0],
    [attachments, activeCode]
  );

  const handleStartEdit = (field: AttachmentField) => {
    setEditingField(field.key);
    setEditValue(field.value);
  };

  const handleSaveEdit = (field: AttachmentField) => {
    setAttachments((prev) =>
      prev.map((att) =>
        att.code === currentAttachment.code
          ? {
              ...att,
              fields: att.fields.map((f) =>
                f.key === field.key ? { ...f, value: editValue, source: editValue && f.source === 'manual' ? 'manual' : f.source } : f
              ),
            }
          : att
      )
    );
    setEditingField(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  // 附件进度统计
  const getAttachmentProgress = (att: AttachmentDefinition) => {
    const filled = att.fields.filter((f) => f.value && f.value.trim()).length;
    const total = att.fields.length;
    return { filled, total, percent: total ? Math.round((filled / total) * 100) : 0 };
  };

  const currentProgress = getAttachmentProgress(currentAttachment);

  // 右侧联动字段
  const linkedFields = currentAttachment.fields.filter((f) => f.source === 'linked');
  const autoFields = currentAttachment.fields.filter((f) => f.source === 'auto');
  const manualFields = currentAttachment.fields.filter((f) => f.source === 'manual');

  // 校验失败数量
  const validationFailCount = MOCK_VALIDATIONS.filter((v) => !v.passed).length;

  const CurrentModeIcon = modeIcon[currentAttachment.mode];
  const CurrentIcon = attachmentIconMap[currentAttachment.code] || ClipboardList;

  return (
    <div className="space-y-4">
      {/* 顶部标题栏 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">投标须知附件编制</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                9 个附件按分级编制流程推进 · 已完成{' '}
                {attachments.filter((a) => a.status === 'completed').length}/{attachments.length}
                {projectName && <span className="ml-2 text-slate-600 font-medium">· {projectName}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {validationFailCount > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>一致性校验：{validationFailCount} 项未通过</span>
              </div>
            )}
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <Download className="w-3.5 h-3.5" />
              导出附件包
            </button>
          </div>
        </div>
      </div>

      {/* 主体区域：三栏布局 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col lg:flex-row min-h-[680px] h-[calc(100vh-220px)] max-h-[1080px]">
        {/* 1. 左侧：附件清单导航 */}
        <aside className="w-full lg:w-72 xl:w-80 border-r border-slate-200 flex flex-col bg-slate-50/70 shrink-0">
          <div className="p-3.5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-blue-700" />
              <h3 className="text-xs font-bold text-slate-900">投标须知附件清单</h3>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              {attachments.length} 份附件
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
            {attachments.map((att) => {
              const Icon = attachmentIconMap[att.code] || ClipboardList;
              const progress = getAttachmentProgress(att);
              const isActive = att.code === activeCode;
              const statusMeta = STATUS_META[att.status];

              return (
                <div
                  key={att.code}
                  onClick={() => setActiveCode(att.code)}
                  className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                    isActive
                      ? 'bg-blue-50/80 border-blue-600 shadow-2xs ring-1 ring-blue-600/30'
                      : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-mono text-slate-500 flex items-center gap-1.5">
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-700' : 'text-slate-400'}`} />
                      附件 {att.code}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${statusMeta.chipClass}`}>
                      {statusMeta.label}
                    </span>
                  </div>
                  <h4
                    className={`text-xs font-semibold line-clamp-1 ${
                      isActive ? 'text-blue-900' : 'text-slate-800'
                    }`}
                  >
                    {att.shortTitle}
                  </h4>
                  <div className="flex items-center justify-between gap-2 mt-1.5">
                    <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${isActive ? 'bg-blue-500' : 'bg-slate-400'}`}
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0 tabular-nums">
                      {progress.filled}/{progress.total}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* 2. 中间：附件表单编辑区 */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {/* 顶栏 */}
          <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                  附件 {currentAttachment.code}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  <CurrentModeIcon className="w-3 h-3" />
                  {GENERATION_MODE_META[currentAttachment.mode].shortLabel}
                </span>
                <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border ${STATUS_META[currentAttachment.status].chipClass}`}>
                  {STATUS_META[currentAttachment.status].label}
                </span>
                <span className="text-xs text-slate-500">
                  进度 {currentProgress.filled}/{currentProgress.total}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
                <CurrentIcon className="w-4 h-4 text-blue-700" />
                {currentAttachment.shortTitle}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {currentAttachment.status !== 'completed' ? (
                <button className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  标记完成
                </button>
              ) : (
                <button className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" />
                  下载 Word
                </button>
              )}
            </div>
          </div>

          {/* 附件描述 */}
          <div className="px-6 py-2.5 bg-blue-50/40 border-b border-blue-100/80 flex items-start gap-2 text-xs text-blue-900">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-600" />
            <span>{currentAttachment.description}</span>
          </div>

          {/* 字段表单 */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {currentAttachment.fields.map((field) => {
              const isEditing = editingField === field.key;
              const isFocused = focusedField === field.key;
              const hasValue = field.value && field.value.trim();

              return (
                <div
                  key={field.key}
                  onMouseEnter={() => setFocusedField(field.key)}
                  onMouseLeave={() => setFocusedField(null)}
                  className={`rounded-lg border transition-colors ${
                    isFocused
                      ? 'border-blue-300 bg-blue-50/30'
                      : hasValue
                      ? 'border-slate-200 bg-white'
                      : 'border-dashed border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <div className="px-4 py-3 flex items-start gap-3">
                    {/* 来源标识 */}
                    <div className="shrink-0 mt-0.5">
                      {field.source === 'auto' && (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600" title="自动预填">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </span>
                      )}
                      {field.source === 'linked' && (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600" title="字段联动">
                          <Link2 className="w-3 h-3 text-white" />
                        </span>
                      )}
                      {field.source === 'manual' && (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-dashed border-slate-300" title="手动填写">
                          <CircleDashed className="w-3 h-3 text-slate-400" />
                        </span>
                      )}
                    </div>

                    {/* 字段内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <label className="text-xs font-semibold text-slate-700">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-0.5">*</span>}
                        </label>
                        {field.source === 'auto' && (
                          <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            自动预填
                          </span>
                        )}
                        {field.source === 'linked' && (
                          <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            字段联动{field.linkedTo && ` · ${field.linkedTo}`}
                          </span>
                        )}
                        {field.source === 'manual' && (
                          <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-white text-slate-500 border border-dashed border-slate-300">
                            手动填写
                          </span>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="flex items-start gap-2">
                          {field.type === 'textarea' ? (
                            <textarea
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              autoFocus
                              rows={3}
                              placeholder={field.placeholder || '输入字段值...'}
                              className="flex-1 px-3 py-1.5 text-sm border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 resize-y"
                            />
                          ) : field.type === 'select' ? (
                            <select
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              autoFocus
                              className="flex-1 px-3 py-1.5 text-sm border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                            >
                              {field.options?.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(field);
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              autoFocus
                              placeholder={field.placeholder || '输入字段值...'}
                              className="flex-1 px-3 py-1.5 text-sm border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                            />
                          )}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleSaveEdit(field)}
                              className="p-1.5 text-white bg-blue-600 hover:bg-blue-700 rounded"
                              title="保存 (Enter)"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1.5 text-slate-500 bg-white hover:bg-slate-100 rounded border border-slate-200"
                              title="取消 (Esc)"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => handleStartEdit(field)}
                          className={`px-3 py-1.5 text-sm rounded cursor-text transition-colors ${
                            hasValue
                              ? 'bg-slate-50 border border-slate-200 text-slate-900 hover:bg-slate-100'
                              : 'bg-white border border-dashed border-slate-300 text-slate-400 italic hover:border-blue-300 hover:bg-blue-50/30'
                          }`}
                        >
                          {hasValue ? (
                            <span className="whitespace-pre-wrap">{field.value}</span>
                          ) : (
                            <span>{field.placeholder || '点击填写...'}</span>
                          )}
                        </div>
                      )}

                      {field.evidence && !isEditing && (
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <Info className="w-3 h-3" />
                          {field.evidence}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 底部规则提示 */}
          {currentAttachment.rules && currentAttachment.rules.length > 0 && (
            <div className="px-6 py-3 border-t border-slate-200 bg-amber-50/40">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs font-semibold text-amber-900 mb-1">编制要求</div>
                  <ul className="space-y-0.5">
                    {currentAttachment.rules.map((rule, idx) => (
                      <li key={idx} className="text-xs text-amber-800 flex items-start gap-1.5">
                        <span className="text-amber-500 mt-0.5">·</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. 右侧：数据来源 + 复核要点 + 依赖关系 */}
        <aside className="w-full lg:w-72 xl:w-80 border-l border-slate-200 flex flex-col bg-slate-50/70 shrink-0">
          <div className="p-3.5 border-b border-slate-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-700" />
            <h3 className="text-xs font-bold text-slate-900">数据来源与复核</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* 分级编制方式 */}
            <div className="bg-white rounded-lg border border-slate-200 p-3">
              <div className="flex items-center gap-2 mb-2">
                <CurrentModeIcon className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-semibold text-slate-800">
                  {GENERATION_MODE_META[currentAttachment.mode].label}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {GENERATION_MODE_META[currentAttachment.mode].description}
              </p>
            </div>

            {/* 依赖关系 */}
            {currentAttachment.dependsOn && currentAttachment.dependsOn.length > 0 && (
              <div className="bg-white rounded-lg border border-slate-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-semibold text-slate-800">依赖附件</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {currentAttachment.dependsOn.map((code) => (
                    <button
                      key={code}
                      onClick={() => setActiveCode(code)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                    >
                      附件 {code}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  本附件数据来自上述附件，请先完成依赖附件
                </p>
              </div>
            )}

            {/* 主要信息来源 */}
            <div className="bg-white rounded-lg border border-slate-200 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-800">主要信息来源</span>
              </div>
              <ul className="space-y-1">
                {currentAttachment.mainSources.map((src, idx) => (
                  <li key={idx} className="text-[11px] text-slate-600 flex items-start gap-1.5">
                    <span className="text-emerald-500 mt-0.5">·</span>
                    <span>{src}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 需人工复核 */}
            <div className="bg-white rounded-lg border border-slate-200 p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-xs font-semibold text-slate-800">需人工复核</span>
              </div>
              <ul className="space-y-1">
                {currentAttachment.humanReview.map((item, idx) => (
                  <li key={idx} className="text-[11px] text-slate-600 flex items-start gap-1.5">
                    <span className="text-amber-500 mt-0.5">·</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 字段来源分布 */}
            <div className="bg-white rounded-lg border border-slate-200 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-semibold text-slate-800">字段来源分布</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    自动预填
                  </span>
                  <span className="font-mono text-slate-700">{autoFields.length}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    字段联动
                  </span>
                  <span className="font-mono text-slate-700">{linkedFields.length}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2 h-2 rounded-full border border-dashed border-slate-400"></span>
                    手动填写
                  </span>
                  <span className="font-mono text-slate-700">{manualFields.length}</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
