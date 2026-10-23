import React from 'react';
import { VariableValues } from '../types/proposalVariables';
import { Edit3, AlertCircle } from 'lucide-react';

interface VariableHighlighterProps {
  content: string;
  variableValues: VariableValues;
  focusedVariable?: string | null;
  onSelectVariable: (varKey: string) => void;
  className?: string;
}

export const VariableHighlighter: React.FC<VariableHighlighterProps> = ({
  content,
  variableValues,
  focusedVariable,
  onSelectVariable,
  className = '',
}) => {
  // 正则匹配 [变量名] 格式，例如 [项目名称], [投标截止日期]
  const regex = /\[([^\]]+)\]/g;
  const parts: React.ReactNode[] = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const matchIndex = match.index;
    const fullMatch = match[0]; // e.g. "[项目名称]"
    const varKey = match[1].trim(); // e.g. "项目名称"

    // 1. 推入变量前的普通文本
    if (matchIndex > lastIndex) {
      parts.push(content.substring(lastIndex, matchIndex));
    }

    const value = variableValues[varKey];
    const isFilled = value !== undefined && value.trim() !== '';
    const isFocused = focusedVariable === varKey;

    // 2. 推入高亮可点击变量控件
    parts.push(
      <button
        type="button"
        key={`${varKey}-${matchIndex}`}
        onClick={(e) => {
          e.stopPropagation();
          onSelectVariable(varKey);
        }}
        title={`点击在侧边栏即刻修改变量: [${varKey}]`}
        className={`inline-flex items-center gap-1 mx-0.5 px-1.5 py-0.5 rounded text-xs font-medium cursor-pointer transition-all ${
          isFocused
            ? 'ring-2 ring-blue-600 bg-blue-100 text-blue-900 font-semibold shadow-xs'
            : isFilled
            ? 'bg-amber-100/90 hover:bg-amber-200 text-amber-950 border border-amber-300/80 shadow-2xs'
            : 'bg-red-100 hover:bg-red-200 text-red-900 border border-red-300 animate-pulse'
        }`}
      >
        <span className="font-mono underline decoration-amber-400 decoration-1 underline-offset-2">
          {isFilled ? value : `[待填: ${varKey}]`}
        </span>
        <Edit3 className="w-2.5 h-2.5 opacity-60 text-amber-800 shrink-0" />
      </button>
    );

    lastIndex = matchIndex + fullMatch.length;
  }

  // 3. 推入剩余文本
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }

  return (
    <div className={`whitespace-pre-wrap leading-relaxed ${className}`}>
      {parts}
    </div>
  );
};
