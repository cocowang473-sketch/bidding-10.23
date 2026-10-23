// 招标公告 8 大信息提取类型定义

// 字段数据来源
export type FieldSource =
  | 'extracted'    // 从原始文档自动提取（绿色标注）
  | 'user_filled'  // 用户手动填写
  | 'pending';     // 待填写

export interface ExtractedField {
  key: string;
  label: string;
  value: string;
  source: FieldSource;
  evidence?: string;  // 原文证据
  sourceFile?: string; // 来源文件
  sourcePage?: string; // 来源页码
  category: NoticeExtractionCategory;
}

// 8 大信息分类
export type NoticeExtractionCategory =
  | 'project_basic'      // 1. 项目基本信息
  | 'bid_timeline'       // 2. 投标关键时间与提交流程
  | 'compliance'         // 3. 文件组成与合规性要求
  | 'pricing_rules'      // 4. 报价与计价规则
  | 'boq_costing'        // 5. BOQ工程量清单与组价要素
  | 'contract_risks'     // 6. 合同条款与风险点
  | 'translation_qc'     // 7. 翻译与双语一致性
  | 'confidentiality';   // 8. 保密与信息安全

export interface NoticeCategoryMeta {
  key: NoticeExtractionCategory;
  index: number;
  title: string;
  titleEn: string;
  icon: string;
  description: string;
  color: string;
}

export interface NoticeExtractionResult {
  categories: Record<NoticeExtractionCategory, ExtractedField[]>;
  totalExtracted: number;
  totalPending: number;
  totalUserFilled: number;
  extractedAt?: string;
}

// 8 大分类元数据配置
export const NOTICE_CATEGORIES: NoticeCategoryMeta[] = [
  {
    key: 'project_basic',
    index: 1,
    title: '项目基本信息',
    titleEn: 'Project Basic Info',
    icon: 'Building2',
    description: '项目名称、业主、国家、城市、工程类型、规模等基本概况',
    color: 'blue',
  },
  {
    key: 'bid_timeline',
    index: 2,
    title: '投标关键时间与提交流程',
    titleEn: 'Bid Timeline & Submission',
    icon: 'Calendar',
    description: '投标截止时间、答疑截止、开标时间、提交方式等',
    color: 'amber',
  },
  {
    key: 'compliance',
    index: 3,
    title: '文件组成与合规性要求',
    titleEn: 'Compliance',
    icon: 'ShieldCheck',
    description: '投标文件清单、资质要求、保证金、授权文件等合规项',
    color: 'emerald',
  },
  {
    key: 'pricing_rules',
    index: 4,
    title: '报价与计价规则',
    titleEn: 'Pricing Rules',
    icon: 'Calculator',
    description: '计价方式、币种、税费规则、调整机制等报价要求',
    color: 'purple',
  },
  {
    key: 'boq_costing',
    index: 5,
    title: 'BOQ工程量清单与组价要素',
    titleEn: 'BOQ & Costing Inputs',
    icon: 'ListChecks',
    description: '工程量清单格式、计算规则、单价组成、工程量基准等',
    color: 'cyan',
  },
  {
    key: 'contract_risks',
    index: 6,
    title: '合同条款与风险点',
    titleEn: 'Contract & Risks',
    icon: 'AlertTriangle',
    description: '合同类型、工期、违约责任、保函、索赔条款等风险要点',
    color: 'red',
  },
  {
    key: 'translation_qc',
    index: 7,
    title: '翻译与双语一致性',
    titleEn: 'Translation QC',
    icon: 'Languages',
    description: '文件语言要求、翻译版本、法文/中文一致性校验要点',
    color: 'indigo',
  },
  {
    key: 'confidentiality',
    index: 8,
    title: '保密与信息安全',
    titleEn: 'Confidentiality',
    icon: 'Lock',
    description: '保密承诺、数据安全、信息披露限制、合规底线',
    color: 'slate',
  },
];
