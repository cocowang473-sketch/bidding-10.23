import React from 'react';
import { NoticeFieldValue } from '../types/bidding';

interface FieldGroupCardProps {
  title: string;
  fields: NoticeFieldValue[];
  compact?: boolean;
}

export const FieldGroupCard: React.FC<FieldGroupCardProps> = ({ title, fields, compact }) => {
  if (!fields.length) return null;
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <h3 className="text-xs font-bold text-slate-700 tracking-wide uppercase">{title}</h3>
      </div>
      <dl className={`divide-y divide-slate-100 ${compact ? '' : ''}`}>
        {fields.map((f) => {
          const isMissing = f.missing || !f.value;
          const value = (f.value ?? '').toString().trim();
          return (
            <div
              key={f.key}
              className="grid grid-cols-[140px_1fr] gap-3 px-4 py-2.5 items-start"
            >
              <dt className="text-[11px] text-slate-500 leading-5" title={f.key}>
                {f.label || f.key}
              </dt>
              <dd className="text-xs leading-5 min-w-0">
                {isMissing ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-dashed border-amber-300 bg-amber-50 text-amber-700 text-[10px] font-medium">
                    待补齐
                  </span>
                ) : (
                  <div className="text-slate-900 font-medium whitespace-pre-wrap break-words">
                    {value}
                    {f.evidence && (
                      <div
                        className="mt-0.5 text-[10px] text-slate-400 italic line-clamp-2"
                        title={f.evidence}
                      >
                        证据:{f.evidence}
                      </div>
                    )}
                  </div>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
};
