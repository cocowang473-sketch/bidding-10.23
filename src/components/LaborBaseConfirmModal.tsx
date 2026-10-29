import React, { useState } from 'react';
import { HelpCircle, Check, X, AlertCircle } from 'lucide-react';

interface LaborBaseConfirmModalProps {
  isOpen: boolean;
  currentBaseRate: number;
  onConfirm: (confirmedRate: number) => void;
  onCancel: () => void;
}

export const LaborBaseConfirmModal: React.FC<LaborBaseConfirmModalProps> = ({
  isOpen,
  currentBaseRate,
  onConfirm,
  onCancel,
}) => {
  const [rate, setRate] = useState<number>(currentBaseRate);
  const [useCustom, setUseCustom] = useState<boolean>(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-150 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
              <HelpCircle className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-semibold text-slate-900">
              人工费定额固定基数确认
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50/70 border border-blue-100 rounded-lg p-3 text-xs text-blue-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">投标组价定额管理规范：</p>
              <p className="text-blue-700 mt-0.5">
                人工费定额价根据人工工日乘以项目执行基数得出，每次组价测算前系统提供最新用工基数核验确认。
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-700 block">
              当前项目执行的人工基数 (DZD/工日)：
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setUseCustom(false);
                  setRate(6500);
                }}
                className={`p-3 text-left border rounded-lg transition-all cursor-pointer ${
                  !useCustom && rate === 6500
                    ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">默认固定基数</span>
                  {!useCustom && rate === 6500 && (
                    <Check className="w-3.5 h-3.5 text-blue-600" />
                  )}
                </div>
                <div className="text-lg font-bold text-slate-900 mt-1 font-mono tabular-nums">
                  6,500 <span className="text-xs font-normal text-slate-500">DZD</span>
                </div>
                <span className="text-xs text-slate-400 mt-0.5 block">Phoenix 智慧医疗综合体项目基准值</span>
              </button>

              <button
                type="button"
                onClick={() => setUseCustom(true)}
                className={`p-3 text-left border rounded-lg transition-all cursor-pointer ${
                  useCustom
                    ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">输入更新基数</span>
                  {useCustom && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </div>
                <div className="text-lg font-bold text-slate-900 mt-1">
                  自定义调整
                </div>
                <span className="text-xs text-slate-400 mt-0.5 block">根据近期汇率/工资调整</span>
              </button>
            </div>

            {useCustom && (
              <div className="pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={rate}
                    onChange={(e) => setRate(Number(e.target.value) || 0)}
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono tabular-nums"
                    placeholder="输入新基数数值，例如 6800"
                  />
                  <span className="text-xs font-medium text-slate-600 shrink-0">
                    DZD / 工日
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  本次测算将以 <span className="font-semibold text-slate-800 font-mono tabular-nums">{rate} DZD</span> 重新计算所有清单项的人工费定额。
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-150 flex items-center justify-end gap-2.5">
          <button
            onClick={onCancel}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(rate)}
            className="px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>确认并开始双库匹配组价</span>
          </button>
        </div>
      </div>
    </div>
  );
};
