// 招标公告 / 投标须知 相关类型(与 aivl FastAPI 返回结构对齐)

export type NoticeTemplateMode = 'green_template' | 'llm_general';

export interface NoticeFieldValue {
  key: string;
  label: string;
  value: string | null;
  section?: string;
  section_title?: string;
  evidence?: string;
  missing?: boolean;
}

export interface AtomicRequirement {
  text: string;
  evidence?: string;
  params?: Record<string, string | number | boolean | null>;
  category?: string;
}

export interface OpenQuestion {
  text: string;
  reason?: string;
}

export interface FocusHit {
  keyword: string;
  snippet: string;
  position?: number;
}

export interface NoticeAnalysisResult {
  source?: string;
  template_mode?: NoticeTemplateMode;
  template_locked?: boolean;
  fields: NoticeFieldValue[];
  atomic_requirements?: AtomicRequirement[];
  open_questions?: OpenQuestion[];
  focus_hits?: FocusHit[];
  supplement_docs?: Array<{ path: string; title?: string }>;
  updated_at?: string;
  error?: string;
}

// —— 投标须知 ——

export type AttachmentStatus =
  | 'pending_decision'
  | 'not_required'
  | 'to_prepare'
  | 'drafting'
  | 'pending_confirm'
  | 'pending_legal'
  | 'pending_p6'
  | 'done'
  | 'conflict'
  | 'skipped';

export interface InstructionsAttachment {
  code: string;             // A01、A02...
  kind: string;             // power_of_attorney 等
  title: string;
  file_name?: string;
  category?: string;
  category_label?: string;
  status?: AttachmentStatus;
  status_label?: string;
  included?: boolean;
  notes?: string;
  form_data?: Record<string, unknown>;
  decision?: Record<string, unknown>;
  depends_on?: string[];
}

export interface InstructionsBaseData {
  project_name?: string;
  employer?: string;
  main_contractor?: string;
  bidder_name?: string;
  legal_representative?: string;
  agent_name?: string;
  scope?: string;
  bid_deadline?: string;
  currency?: string;
  locked_quote?: string;
  site_visit?: string;
  [k: string]: string | undefined;
}

export interface InstructionBrief {
  summary?: string;
  key_fields?: Array<{ key: string; label: string; value: string }>;
  sections?: Array<{ title: string; points: string[] }>;
  mandatory_rules?: string[];
  attachment_hints?: Array<{ code?: string; kind?: string; hint: string }>;
  risks?: string[];
}

export interface ValidationIssue {
  code: string;
  description: string;
  passed: boolean;
  detail?: string;
}

export interface InstructionsState {
  workflow_step?: number;
  workflow_version?: number;
  workflow_steps?: Array<{ key: string; title: string; desc?: string }>;
  instruction_doc?: { path?: string; title?: string };
  attachments: InstructionsAttachment[];
  conditions?: Record<string, string | boolean | null>;
  base_data?: InstructionsBaseData;
  instruction_brief?: InstructionBrief;
  validation?: { items: ValidationIssue[]; all_passed?: boolean };
  completed?: boolean;
  links?: Array<{ title: string; url: string }>;
}

export interface InstructionsRecord {
  status: 'in_progress' | 'done' | string;
  result?: InstructionsState;
  updated_at?: string;
}

// —— aivl 项目 ——

export interface AivlProject {
  id: number;
  name: string;
  status?: string;
  settings_json?: Record<string, unknown>;
  zip_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AivlAuthToken {
  token: string;
  expires_at?: string;
  user?: { username: string; display_name?: string };
}

export interface AivlHealth {
  ok: boolean;
  llm_configured: boolean;
  model: string;
  mail_configured?: boolean;
}

// —— 招标文件结构 ——

export interface BiddingFile {
  name: string;
  path: string;
  type: 'file';
  size?: number;
  extension?: string;
  content?: string; // 文件内容（文本类型）
}

export interface BiddingFolder {
  name: string;
  path: string;
  type: 'folder';
  children: (BiddingFile | BiddingFolder)[];
}

export type BiddingFileNode = BiddingFile | BiddingFolder;
