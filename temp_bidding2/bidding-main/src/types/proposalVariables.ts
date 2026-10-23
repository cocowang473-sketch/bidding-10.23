export type LanguageMode = 'zh' | 'fr' | 'bilingual';

export interface ProposalSection {
  id: string;
  code: string;
  title: string;
  titleFr?: string; // French title
  category: '商务条款' | '法定声明' | '技术方案' | '项目管理' | '质量安全';
  summary: string;
  summaryFr?: string;
  templateContent: string; // Chinese template content with placeholders like [项目名称]
  templateContentFr?: string; // French template content with placeholders like [Intitulé du Projet] or [项目名称]
  isIncluded: boolean;
  order: number;
}

export type VariableValues = Record<string, string>;

export interface VariableMeta {
  key: string;
  label: string;
  labelFr: string; // French label (e.g. "Intitulé du Projet")
  category: '项目基础' | '商务时间' | '主体资质' | '技术指标';
  defaultValue?: string;
  defaultValueFr?: string; // French default value
  placeholder?: string;
  placeholderFr?: string;
  type: 'text' | 'date' | 'number';
}
