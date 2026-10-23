export interface ProposalSection {
  id: string;
  code: string;
  title: string;
  category: '商务条款' | '法定声明' | '技术方案' | '项目管理' | '质量安全';
  summary: string;
  templateContent: string; // Contains placeholders like [项目名称], [投标截止日期]
  isIncluded: boolean;
  order: number;
}

export type VariableValues = Record<string, string>;

export type LanguageMode = 'zh' | 'fr' | 'bilingual';

export interface VariableMeta {
  key: string;
  label: string;
  category: '项目基础' | '商务时间' | '主体资质' | '技术指标';
  defaultValue?: string;
  placeholder?: string;
  type: 'text' | 'date' | 'number';
}
