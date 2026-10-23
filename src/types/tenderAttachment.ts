export type AttachmentCategory =
  | 'drawings' // 施工与深化图纸 (Plans & Drawings, DWG, CAD, PDF)
  | 'legal' // 法定资质与商务条款 (Legal, Administrative, CCAP, RC)
  | 'specs' // 技术规范与技术要求 (Technical Specifications, CCTP, Norms)
  | 'addenda' // 招标答疑与补遗公告 (Addenda, Clarifications, Avis)
  | 'financial'; // 财务保函与清单文件 (Financial, BOQ template, Cautionnement)

export type AttachmentImportance = 'critical' | 'required' | 'reference';

export interface VariableAttachmentLink {
  variableKey: string; // 对应 project variable 的 key，如 "投标保证金金额"
  sourceClause?: string; // 依据条款编号，如 "RC 须知第 6.1 款"
  extractedValue?: string; // 从该附件提取到的推荐或法定数值，如 "25,000,000 DZD"
  pageNumber?: number; // 所在页码，如 18
  highlightText?: string; // 关键原句摘录，支持双语
  note?: string; // 造价工程师备注
}

export interface TenderAttachment {
  id: string;
  name: string; // 文件业务标题，如 "技术规格书 (CCTP) - 强电与动力配电专篇"
  nameFr?: string; // 法语原标题
  fileName: string; // 真实物理文件名，如 "CCTP-Lot09-Courants-Forts.pdf"
  category: AttachmentCategory;
  fileType: 'pdf' | 'dwg' | 'docx' | 'xlsx' | 'zip' | 'image';
  fileSize: string;
  uploadedAt: string;
  uploader: string;
  version: string;
  tags: string[];
  summary: string;
  summaryFr?: string;
  linkedVariables: VariableAttachmentLink[];
  importance: AttachmentImportance;
  verificationStatus: 'verified' | 'pending' | 'review_needed';
  previewSnippet?: string; // 预览摘要文本
  previewSnippetZh?: string; // 中文译文
  previewSnippetFr?: string; // 法语原文
  officialDocNumber?: string; // 官方文号，如 "N° Avis DZ-2026-09"
}

export interface CategoryMeta {
  key: AttachmentCategory;
  labelZh: string;
  labelFr: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
}

export const ATTACHMENT_CATEGORIES: Record<AttachmentCategory, CategoryMeta> = {
  drawings: {
    key: 'drawings',
    labelZh: '施工图纸与深化设计',
    labelFr: 'Plans & Dessins d\'Exécution',
    description: '电气施工平面图、配电系统单线图、弱电弱机房大样及BIM模型',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    borderColor: 'border-indigo-200',
  },
  legal: {
    key: 'legal',
    labelZh: '法定资质与商务条款',
    labelFr: 'Règlement & CCAP',
    description: '招标文件须知 (RC)、专用行政条款 (CCAP)、法人资质及反腐合规声明要求',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    borderColor: 'border-blue-200',
  },
  specs: {
    key: 'specs',
    labelZh: '技术规范与技术标准',
    labelFr: 'CCTP & Normes Techniques',
    description: '技术专用条款 (CCTP)、法国NFC标准、IEC电工委员会标准与设备品牌清单',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    borderColor: 'border-emerald-200',
  },
  addenda: {
    key: 'addenda',
    labelZh: '答疑澄清与补遗公告',
    labelFr: 'Additifs & Clarifications',
    description: '官方开标前答疑纪要、截标延期通告、招标人澄清函与勘误补遗',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    borderColor: 'border-purple-200',
  },
  financial: {
    key: 'financial',
    labelZh: '财务保函与清单模版',
    labelFr: 'Bordereau & Cautionnement',
    description: '官方工程量清单标准格式、投标保函与履约保函格式、付款与调价机制',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    borderColor: 'border-amber-200',
  },
};

export interface ParsedVariableItem {
  variableKey: string;
  label: string;
  labelFr?: string;
  category: '项目基础' | '商务时间' | '主体资质' | '技术指标';
  source: 'extracted' | 'missing_manual'; // 'extracted' (原文件提取已填入) | 'missing_manual' (原文件未载明，人工填入)
  currentValue: string;
  extractedValue?: string;
  extractedValueFr?: string;
  sourceDocName?: string;
  sourceClause?: string;
  sourceClauseFr?: string;
  pageNumber?: number;
  highlightText?: string;
  highlightTextFr?: string;
  highlightTextZh?: string;
  userEditedValue?: string;
}

export interface TenderPackageParseResult {
  packageName: string;
  packageSize: string;
  parsedAt: string;
  unpackedFiles: TenderAttachment[];
  lockedVariables: ParsedVariableItem[];
}

