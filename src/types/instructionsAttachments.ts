// 投标须知附件填写类型定义

// 附件生成方式分级
export type GenerationMode =
  | 'auto'           // 可自动生成（附件01、02、03、09）
  | 'auto_review'    // 系统生成后人工复核（附件04、05、06）
  | 'professional'   // 专业软件绘制（附件07）
  | 'manual';        // 合同条款编写（附件08）

// 附件状态
export type AttachmentStatus =
  | 'not_started'    // 未开始
  | 'auto_filled'    // 已自动预填
  | 'in_review'      // 待人工复核
  | 'in_progress'    // 填写中
  | 'completed'      // 已完成
  | 'needs_fix';     // 需修正

// 字段类型
export type FieldType = 'text' | 'textarea' | 'date' | 'number' | 'select';

// 字段来源
export type FieldSource = 'auto' | 'linked' | 'manual';

// 单个字段
export interface AttachmentField {
  key: string;
  label: string;
  type: FieldType;
  value: string;
  source: FieldSource;      // 来源：自动预填/字段联动/手动填写
  required?: boolean;
  options?: string[];       // select 类型的选项
  linkedTo?: string;        // 字段联动指向的其他附件字段
  evidence?: string;        // 数据来源说明
  placeholder?: string;
}

// 附件
export interface AttachmentDefinition {
  code: string;             // 附件编号（如 "01"）
  title: string;            // 附件名称
  shortTitle: string;       // 短标题
  mode: GenerationMode;
  modeLabel: string;        // 分级标签
  description: string;      // 简介
  mainSources: string[];    // 主要信息来源
  humanReview: string[];    // 需要人工复核的内容
  fields: AttachmentField[];
  status: AttachmentStatus;
  // 关联/依赖关系
  dependsOn?: string[];     // 依赖的其他附件（如附件03依赖附件04）
  // 规则
  rules?: string[];
}

export interface InstructionsWorkflow {
  attachments: AttachmentDefinition[];
  // 一致性校验结果
  validations: ValidationItem[];
}

export interface ValidationItem {
  id: string;
  rule: string;             // 校验规则描述
  passed: boolean;
  details?: string;
  relatedAttachments: string[];
}

// 生成方式元信息
export const GENERATION_MODE_META: Record<GenerationMode, {
  label: string;
  shortLabel: string;
  description: string;
}> = {
  auto: {
    label: '自动生成',
    shortLabel: '自动',
    description: '系统基于基础数据库自动预填，仅需签字确认',
  },
  auto_review: {
    label: '系统生成后人工复核',
    shortLabel: '需复核',
    description: '系统智能推荐，需人工复核与补充',
  },
  professional: {
    label: '专业软件绘制',
    shortLabel: '专业',
    description: '需使用 P6/Microsoft Project 等专业软件制作',
  },
  manual: {
    label: '合同条款编写',
    shortLabel: '手动',
    description: '需人工审查合同条款与边界责任',
  },
};
