import { TenderAttachment } from './tenderAttachment';
import { VariableValues, ProposalSection } from './proposalVariables';
import { BoqItem, RfqInquiryRecord } from './pricing';

export type TenderStage = 'notice' | 'instructions' | 'pricing';
export type TenderStatus = 'draft' | 'in_progress' | 'ready' | 'submitted';

export interface TenderProject {
  id: string; // 唯一标段ID，如 "TENDER-DZ-2026-001"
  name: string; // 标段名称 (中文)，如 "阿尔及利亚 240 床综合医院强电与智能化系统工程"
  nameFr?: string; // 标段名称 (法文)，如 "Projet Hôpital 240 Lits à Tizi Ouzou - Lot 09 Électricité CFO/CFA"
  code: string; // 招标编号，如 "DZ-SANTE-2026-CFO-009"
  client: string; // 招标人/业主全称，如 "阿尔及利亚国家卫生与人口部 (Ministère de la Santé)"
  country: string; // 国家/地区，如 "阿尔及利亚 (Algérie)"
  currency: string; // 结算币种，如 "DZD"
  deadline: string; // 截标日期，如 "2026-11-20"
  status: TenderStatus; // 标段推进状态
  statusLabel: string;
  category: '医疗建筑' | '公共市政' | '商业综合体' | '基础设施' | '海外援建';
  createdAt: string;
  updatedAt: string;
  description: string;
  packageFileName?: string;
  packageFileSize?: string;
  // 每个标段独立隔离的三个核心作业板块数据
  currentStep: TenderStage; // 当前所处流程阶段：'notice' (招标公告) | 'instructions' (投标须知) | 'pricing' (清单组价)
  attachments: TenderAttachment[]; // 标书文件与附件原件包 (本标独有)
  variableValues: VariableValues; // 锁定的项目变量值 (本标独有)
  proposalSections: ProposalSection[]; // 标书章节条款与组件 (本标独有)
  boqItems: BoqItem[]; // 工程量清单与组价明细 (本标独有)
  rfqRecords: RfqInquiryRecord[]; // 本标发起的供应商询价记录 (本标独有)
}
