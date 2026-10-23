import { AttachmentStatus, InstructionsState, NoticeFieldValue } from '../types/bidding';
import { VariableValues } from '../types/proposalVariables';
import { GlobalPricingParams } from '../types/pricing';

// aivl 公告字段 key → 当前平台标书变量名
export const NOTICE_FIELD_TO_VARIABLE: Record<string, string> = {
  // Green template
  project_name_zh: '项目名称',
  tenderer_name: '招标人名称',
  bid_deadline: '投标截止日期',
  commencement_date: '计划开工日期',
  delivery_date: '计划竣工日期',
  // General template
  project_name: '项目名称',
  employer: '招标人名称',
  start_date: '计划开工日期',
  // 其他可直接作为新 key 加入
};

export interface NoticeToVariablesResult {
  updated: VariableValues;
  mapped: Array<{ noticeKey: string; variableKey: string; value: string }>;
  extras: Array<{ noticeKey: string; label: string; value: string }>;
}

/** 将公告字段写入变量库。未命中映射的字段使用 `公告·{label}` 作为新 key。*/
export function noticeFieldsToVariables(
  fields: NoticeFieldValue[],
  current: VariableValues
): NoticeToVariablesResult {
  const next: VariableValues = { ...current };
  const mapped: NoticeToVariablesResult['mapped'] = [];
  const extras: NoticeToVariablesResult['extras'] = [];
  for (const f of fields) {
    if (!f || f.missing) continue;
    const value = (f.value ?? '').toString().trim();
    if (!value) continue;
    const variableKey = NOTICE_FIELD_TO_VARIABLE[f.key];
    if (variableKey) {
      next[variableKey] = value;
      mapped.push({ noticeKey: f.key, variableKey, value });
    } else {
      const extraKey = `公告·${f.label || f.key}`;
      next[extraKey] = value;
      extras.push({ noticeKey: f.key, label: extraKey, value });
    }
  }
  return { updated: next, mapped, extras };
}

/** 把 instructions 的币种/计价规则映射到可识别的 globalParams 覆盖。
 *  当前 GlobalPricingParams 不含币种/锁价字段,这里仅输出结构化摘要,具体是否要落到参数里由上层决策。
 */
export interface InstructionsPolicySummary {
  currency?: string;
  priceLockMode?: 'lump-sum' | 'variable' | 'unknown';
  foreignExchangeNote?: string;
  mandatoryRules: string[];
  patch: Partial<GlobalPricingParams>;
}

export function summarizeInstructionsPolicy(state: InstructionsState): InstructionsPolicySummary {
  const base = state.base_data || {};
  const brief = state.instruction_brief || {};
  const rules = brief.mandatory_rules || [];
  const text = [brief.summary || '', rules.join('\n'), base.locked_quote || ''].join('\n');
  const lumpSum = /固定总价|总价包干|总价锁定|lump\s*sum/i.test(text);
  const priceLockMode: 'lump-sum' | 'variable' | 'unknown' = lumpSum
    ? 'lump-sum'
    : /综合单价|可调/.test(text)
    ? 'variable'
    : 'unknown';
  const forex = (rules.find((r) => /外汇/.test(r)) || '').trim();
  const patch: Partial<GlobalPricingParams> = {};
  if (lumpSum) {
    // 固定总价场景,把 promptBeforeQuoting 置 true,提醒造价师每次报价前复核基数
    patch.promptBeforeQuoting = true;
  }
  return {
    currency: base.currency,
    priceLockMode,
    foreignExchangeNote: forex || undefined,
    mandatoryRules: rules,
    patch,
  };
}

export const ATTACHMENT_STATUS_META: Record<
  AttachmentStatus,
  { label: string; dotClass: string; chipClass: string }
> = {
  pending_decision: {
    label: '待判断',
    dotClass: 'bg-slate-300',
    chipClass: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  not_required: {
    label: '无需提交',
    dotClass: 'bg-slate-400',
    chipClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  to_prepare: {
    label: '待编制',
    dotClass: 'bg-amber-400',
    chipClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  drafting: {
    label: '编制中',
    dotClass: 'bg-blue-500 animate-pulse',
    chipClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  pending_confirm: {
    label: '待人工确认',
    dotClass: 'bg-amber-500',
    chipClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  pending_legal: {
    label: '待法务审定',
    dotClass: 'bg-indigo-500',
    chipClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  pending_p6: {
    label: '待专业软件',
    dotClass: 'bg-violet-500',
    chipClass: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  done: {
    label: '已完成',
    dotClass: 'bg-emerald-500',
    chipClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  conflict: {
    label: '冲突',
    dotClass: 'bg-rose-500',
    chipClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  skipped: {
    label: '已跳过',
    dotClass: 'bg-slate-300',
    chipClass: 'bg-slate-100 text-slate-500 border-slate-200',
  },
};

export function statusMeta(status?: AttachmentStatus) {
  if (!status) return ATTACHMENT_STATUS_META.pending_decision;
  return ATTACHMENT_STATUS_META[status] || ATTACHMENT_STATUS_META.pending_decision;
}

/** 把绿模板分组 key 转成中文章节名(当字段没有 section_title 时兜底) */
export const NOTICE_SECTION_LABEL: Record<string, string> = {
  project: '一、项目基本信息',
  timeline: '二、投标关键时间与提交流程',
  compliance: '三、文件组成与合规性要求',
  pricing: '四、报价与计价规则',
  contract: '六、合同条款与风险点',
  translation: '七、翻译与双语一致性',
  confidentiality: '八、保密与信息安全',
};
