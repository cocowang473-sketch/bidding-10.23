import React, { useRef, useEffect } from 'react';
import { VariableValues, VariableMeta } from '../types/proposalVariables';
import { TenderAttachment } from '../types/tenderAttachment';
import { VARIABLE_METADATA } from '../data/mockProposalComponents';
import {
  Sliders,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RotateCcw,
  Calendar,
  Type,
  Hash,
  Layers,
  ChevronRight,
  Info,
  Paperclip,
  ExternalLink,
  ShieldCheck,
  Plus,
} from 'lucide-react';

interface VariableSidebarProps {
  detectedVariables: string[]; // 变量列表 (按当前选中的组件识别)
  variableValues: VariableValues;
  focusedVariable: string | null;
  attachments?: TenderAttachment[];
  onUpdateVariable: (key: string, value: string) => void;
  onFocusVariable: (key: string | null) => void;
  onResetToDemoValues: () => void;
  onViewAttachmentDetail?: (attachment: TenderAttachment) => void;
  onFilterAttachmentsByVariable?: (varKey: string) => void;
  componentTitle?: string;
}

export const VariableSidebar: React.FC<VariableSidebarProps> = ({
  detectedVariables,
  variableValues,
  focusedVariable,
  attachments = [],
  onUpdateVariable,
  onFocusVariable,
  onResetToDemoValues,
  onViewAttachmentDetail,
  onFilterAttachmentsByVariable,
  componentTitle,
}) => {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // 当外部点击文本中的变量高亮徽章时，自动滚动并聚焦到侧边栏对应的输入框
  useEffect(() => {
    if (focusedVariable && inputRefs.current[focusedVariable]) {
      const el = inputRefs.current[focusedVariable];
      el?.focus();
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focusedVariable]);

  const filledCount = detectedVariables.filter(
    (k) => (variableValues[k] || '').trim() !== ''
  ).length;

  const totalCount = detectedVariables.length;

  return (
    <aside className="w-80 lg:w-96 bg-white border-l border-slate-200 flex flex-col h-full shadow-xs">
      {/* 顶部标题与进度 */}
      <div className="p-4 border-b border-slate-150 bg-slate-50/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-blue-100 text-blue-700">
              <Sliders className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              组件变量实时编辑区
            </h3>
          </div>
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-100">
            {filledCount}/{totalCount} 项
          </span>
        </div>

        {componentTitle && (
          <p className="text-xs text-slate-600 mt-1 truncate">
            当前关联组件：<span className="font-semibold text-slate-800">{componentTitle}</span>
          </p>
        )}
      </div>

      {/* 变量输入控件列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {detectedVariables.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <span>当前选中的组件中未检测到动态变量标记</span>
          </div>
        ) : (
          detectedVariables.map((varKey) => {
            const meta: VariableMeta = VARIABLE_METADATA[varKey] || {
              key: varKey,
              label: varKey,
              category: '项目基础',
              type: 'text',
            };

            const value = variableValues[varKey] || '';
            const isFilled = value.trim() !== '';
            const isFocused = focusedVariable === varKey;

            // 查找关联到该变量的招标文件原件
            const linkedAttachments = attachments.filter((att) =>
              att.linkedVariables.some((l) => l.variableKey === varKey)
            );

            // 获取该变量提取到的推荐数值依据
            const primaryLink = linkedAttachments[0]?.linkedVariables.find(
              (l) => l.variableKey === varKey
            );

            return (
              <div
                key={varKey}
                className={`p-3 rounded-lg border transition-all ${
                  isFocused
                    ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-600/20 shadow-xs'
                    : isFilled
                    ? 'border-slate-200 bg-white hover:border-slate-300'
                    : 'border-amber-300 bg-amber-50/30'
                }`}
                onClick={() => onFocusVariable(varKey)}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-amber-900 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-200">
                      [{varKey}]
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      {meta.label}
                    </span>
                  </div>

                  {isFilled ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <span className="text-[10px] text-amber-700 font-medium">待填</span>
                  )}
                </div>

                {/* 动态输入框 */}
                <div className="relative mt-1">
                  {meta.type === 'date' ? (
                    <div className="flex items-center">
                      <input
                        ref={(el) => {
                          inputRefs.current[varKey] = el;
                        }}
                        type="date"
                        value={value}
                        onChange={(e) => onUpdateVariable(varKey, e.target.value)}
                        onFocus={() => onFocusVariable(varKey)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                      />
                    </div>
                  ) : meta.type === 'number' ? (
                    <div className="flex items-center">
                      <input
                        ref={(el) => {
                          inputRefs.current[varKey] = el;
                        }}
                        type="number"
                        value={value}
                        onChange={(e) => onUpdateVariable(varKey, e.target.value)}
                        onFocus={() => onFocusVariable(varKey)}
                        placeholder={`请输入${meta.label}...`}
                        className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                      />
                    </div>
                  ) : (
                    <input
                      ref={(el) => {
                        inputRefs.current[varKey] = el;
                      }}
                      type="text"
                      value={value}
                      onChange={(e) => onUpdateVariable(varKey, e.target.value)}
                      onFocus={() => onFocusVariable(varKey)}
                      placeholder={`请输入${meta.label}...`}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  )}
                </div>

                {/* 招标文件附件关联指示条 (Linked Tender Notice Attachments) */}
                {linkedAttachments.length > 0 ? (
                  <div className="mt-2 pt-2 border-t border-slate-100 bg-slate-50/70 -mx-3 -mb-1 px-3 py-1.5 rounded-b-lg space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1 text-slate-600">
                        <Paperclip className="w-3 h-3 text-blue-600 shrink-0" />
                        <span className="font-semibold text-slate-700">
                          依据官方原件 ({linkedAttachments.length}份)
                        </span>
                      </div>
                      {onFilterAttachmentsByVariable && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onFilterAttachmentsByVariable(varKey);
                          }}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5 cursor-pointer"
                        >
                          <span>查看原件库</span>
                          <ChevronRight className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>

                    <div className="text-[10px] text-slate-500 truncate">
                      {primaryLink?.sourceClause ? (
                        <span>
                          条款：<strong className="text-slate-700">{primaryLink.sourceClause}</strong>
                        </span>
                      ) : (
                        <span>{linkedAttachments[0].name}</span>
                      )}
                    </div>

                    {/* 推荐提取值与一键采纳快捷按钮 */}
                    {primaryLink?.extractedValue && (
                      <div className="flex items-center justify-between pt-0.5 text-[10px]">
                        <span className="text-slate-500 truncate">
                          原件值: <code className="font-mono text-blue-700 font-semibold">{primaryLink.extractedValue}</code>
                        </span>
                        {value.trim() !== primaryLink.extractedValue.trim() ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateVariable(varKey, primaryLink.extractedValue!);
                            }}
                            className="px-1.5 py-0.2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded font-semibold cursor-pointer flex items-center gap-0.5 transition-colors"
                            title="采纳官方招标文档中提取的推荐值"
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>采纳</span>
                          </button>
                        ) : (
                          <span className="text-emerald-600 font-medium flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            一致
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                    <span>暂无官方附件依据</span>
                    {onFilterAttachmentsByVariable && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onFilterAttachmentsByVariable(varKey);
                        }}
                        className="text-slate-400 hover:text-blue-600 cursor-pointer flex items-center gap-0.5"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>挂接附件</span>
                      </button>
                    )}
                  </div>
                )}

                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                  <span>全标书同名变量实时双向同步</span>
                  {value && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateVariable(varKey, '');
                      }}
                      className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      清空
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 底部快捷操作条 */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>点击正文任意高亮变量，光标将自动定位到输入框</span>
        </div>

        <button
          onClick={onResetToDemoValues}
          className="w-full py-2 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          <span>恢复阿尔及利亚 240 医院标准预设值</span>
        </button>
      </div>
    </aside>
  );
};
