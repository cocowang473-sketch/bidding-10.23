// ============================================================================
// 《2.1 投标须知》附件 01—09 结构化编制、处理建议与一致性校验模型
// 依据招标方规定：必须原样使用标准格式，系统保留版式和固定条款，
// 仅填写空白字段、表格数据及指定补充内容，严禁改写模板正文。
// ============================================================================

export type AttachmentNature =
  | 'standard_text' // 标准文本类：系统预填，人工确认，签字盖章
  | 'personnel_data' // 人员数据类：从人员库匹配生成，重点校验履历和项目经验
  | 'plan_calculation' // 计划测算类：根据进度、工程量及施工方案联动生成，人工调整
  | 'legal_commitment' // 法律承诺类：仅辅助填充，必须由法务或负责人审定
  | 'professional_plan'; // 专业计划类：系统生成基础数据，使用指定专业软件形成正式成果

export type AutomationLevel =
  | 'high' // 高
  | 'medium_high' // 中高
  | 'medium' // 中
  | 'medium_low' // 中低
  | 'low'; // 低

export type AttachmentProcessStatus =
  | 'ready' // 已完成/可输出
  | 'pending_review' // 待人工/法务复核
  | 'in_progress' // 编制计算中
  | 'exempted' // 条件免交（如已备案）
  | 'draft'; // 草稿生成中

export interface AttachmentMeta {
  code: string; // "附件01" ~ "附件09"
  id: string; // "att-01" ~ "att-09"
  name: string; // 附件名称
  nature: AttachmentNature;
  natureLabel: string;
  automation: AutomationLevel;
  automationLabel: string;
  primaryDataSource: string;
  requiredManualAction: string;
  status: AttachmentProcessStatus;
  summary: string;
  controlRequirements: string;
}

// ----------------------------------------------------------------------------
// 附件01：授权委托书数据
// ----------------------------------------------------------------------------
export interface Attachment01Data {
  filingStatus: 'registered' | 'unregistered' | 'pending_verify'; // 是否已办理授权备案
  legalRepresentative: {
    name: string;
    company: string;
    title: string;
  };
  authorizedAgent: {
    name: string;
    idNumber: string;
    gender: string;
    age: number;
    department: string;
    title: string;
    validityPeriod: string; // 授权有效期 (如 90 天)
    signDate: string;
  };
  clientName: string;
  projectName: string;
  supplementaryDocs: Array<{
    name: string;
    required: boolean;
    status: 'uploaded' | 'missing' | 'exempted';
  }>;
  subDelegationForbidden: boolean; // 无转委托权锁定
  needsSubmission: boolean;
}

// ----------------------------------------------------------------------------
// 附件02：投标承诺函数据
// ----------------------------------------------------------------------------
export interface Attachment02Data {
  projectName: string;
  engineeringName: string;
  clientName: string;
  bidderCompanyName: string;
  signatoryName: string;
  totalPriceNumeric: number;
  totalPriceFormatted: string; // "1,286,450,000.00 DZD"
  totalPriceWordsZh: string; // "壹拾贰亿捌仟陆佰肆拾伍万阿尔及利亚第纳尔整"
  currency: string; // "阿尔及利亚第纳尔（DA / DZD）"
  signDate: string;
  siteVisitConfirmation: 'confirmed_visited' | 'risk_assessed_by_data' | 'pending_legal_clarification';
  siteVisitNotes: string;
  amountConsistencyChecks: {
    numberMatchesWords: boolean;
    matchesBoqTotal: boolean;
    matchesSubitemSummary: boolean;
    matchesOverallCostTable: boolean;
  };
}

// ----------------------------------------------------------------------------
// 附件03：项目管理组织机构图节点
// ----------------------------------------------------------------------------
export interface OrgChartNode {
  id: string;
  roleName: string;
  personName: string;
  level: number; // 1: 项目经理, 2: 核心负责人, 3: 专业工程师/现场管人员
  department: string;
  isVacant: boolean; // 是否空缺标红
  multiRoleWarning?: string; // 一人多岗提示
  linkedAttachment04PersonId?: string;
}

// ----------------------------------------------------------------------------
// 附件04：管理人员计划及详细履历
// ----------------------------------------------------------------------------
export interface PersonnelItem {
  id: string;
  orderNumber: number;
  role: string;
  name: string;
  dob: string;
  degree: string;
  major: string;
  workingYears: number;
  nationality: string;
  currentCountry: string;
  currentProject: string;
  currentPosition?: string; // 当前岗位
  tenureYears: number; // 任职年限
  // 核心核查 4 大规则：
  hasHospitalExp: boolean; // 医院项目经验
  sameOrLargerHospitalScale?: string; // 同等或更大规模项目经验 (e.g. >=200床)
  hospitalExpNote?: string;
  hasAlgeriaExp: boolean; // 阿尔及利亚工作经验
  algeriaExpYears?: number;
  algeriaExpNote?: string;
  hasLocalSubcontractExp: boolean; // 属地化分包管理经验
  localSubcontractNote?: string;
  hasOverseasProcurementExp: boolean; // 境外采购经验
  overseasProcurementNote?: string;
  certificates: string[];
  certificateValidity?: string; // 证书及有效期
  availabilityDate: string; // 可到岗日期
  timeConflict: boolean; // 是否存在同期项目占用
  timeConflictDetails?: string; // 同期项目占用详情
  resumeUploaded: boolean; // 简历文件
  performanceProofUploaded: boolean; // 业绩证明
  passportStatus: 'valid' | 'renewing' | 'pending' | 'exempted_local';
  passportValidity?: string;
  visaStatus: 'valid_work_visa' | 'commercial_visa' | 'pending_application' | 'exempted_local';
  visaValidity?: string;
  interviewRequired?: boolean; // 是否需要面试 (关键管理人员标注)
  interviewConfirmed?: boolean; // 确认关键人员可参加面试
  actualAvailabilityConfirmed?: boolean; // 项目负责人核查实际可投入
}

// ----------------------------------------------------------------------------
// 附件05：劳动力配置计划及劳动力曲线 (参数测算 + 人工调整 + 自动绘图)
// ----------------------------------------------------------------------------
export interface LaborCalculationParameters {
  totalEngineeringWorkdays: number; // 专业工程量总工日 (如 21,550 工日)
  productivityIndex: number; // 劳动生产率 (如 1.05)
  shiftHours: number; // 每班工作时长 (如 8 小时/班)
  shiftsCount: number; // 班次数量 (如 1 班 / 1.5 班)
  chineseRatio: number; // 中国工人比例 (40%)
  localRatio: number; // 当地工人比例 (60%)
  peakLimit: number; // 高峰人数限制 (180 人)
  compressionRatio: number; // 工期压缩系数 (如 1.00，支持 0.85 ~ 1.20)
  entryDate: string; // 进场动员日期
  exitDate: string; // 退场完工日期
}

export interface MobilizationStageItem {
  id: string;
  stageName: string;
  timeRange: string;
  startMonth: number;
  endMonth: number;
  workDescription: string;
  entryAction: string;
  exitAction: string;
  chineseCount: number;
  localCount: number;
  totalStageCount: number;
}

export interface LaborTradeItem {
  id: string;
  tradeName: string;
  category: 'electrical' | 'hvac_plumbing' | 'low_voltage' | 'welding_pipe' | 'auxiliary';
  stage1Count: number; // 准备与前期预埋 (第1-3月)
  stage2Count: number; // 机电管线与设备主安装高峰 (第4-10月)
  stage3Count: number; // 终端设备安装与专项系统 (第11-14月)
  stage4Count: number; // 单机调试与系统联调 (第15-16月)
  stage5Count: number; // 验收移交与维保 (第17-18月)
  peakCount: number;
  avgCount: number;
}

export interface LaborProofDocument {
  id: string;
  type: 'passport' | 'visa' | 'training' | 'dispatch' | 'roster';
  typeName: string;
  fileName: string;
  fileSize: string;
  uploadDate: string;
  associatedCount: number; // 关联中方人员数
  status: 'verified' | 'uploaded' | 'pending';
  fileUrl?: string;
  auditRemark: string;
}

export interface LaborPlanData {
  calculationParams: LaborCalculationParameters;
  stages: MobilizationStageItem[];
  trades: LaborTradeItem[];
  timelineMonths: string[];
  monthlyTotalWorkers: number[]; // 18 个月的人数数组，用于绘制曲线
  timelineWeeks: string[]; // 78 周时间轴
  weeklyTotalWorkers: number[]; // 78 周的人数数组
  peakWorkersCount: number;
  avgWorkersCount: number;
  chineseRatio: number; // 40%
  localRatio: number; // 60%
  chineseWorkerBreakdown: {
    headquartersDispatched: number; // 总部选派人数
    projectTransferred: number; // 其他项目调派人数
    passportReady: number; // 已办理护照人数
    visaReady: number; // 已办理签证人数
    trainingPassed: number; // 已通过培训考试人数
    totalCount: number; // 合计人数
  };
  localLaborPlan: {
    directHired: number; // 属地直接招募人数
    subcontracted: number; // 当地分包班组人数
    algerianForemenCount: number; // 阿尔及利亚当地工长人数
    laborBureauFilingNo: string; // 阿国劳工局合规备案号
    localInsuranceCoverageRate: number; // 属地工伤法定社会保险覆盖率 (100%)
  };
  proofDocuments: LaborProofDocument[];
  linkedWithSchedule07: boolean;
  scheduleNeedsRecalculation: boolean; // 进度变更后是否提示重新计算
  lastRecalculatedTime?: string;
}

// ----------------------------------------------------------------------------
// 附件06：施工机械设备、机具和周转材料配备计划
// ----------------------------------------------------------------------------
export type EquipmentSourceCategory =
  | 'domestic_existing' // 国内已有设备发运
  | 'domestic_new' // 国内新采购
  | 'algeria_transferred' // 阿尔及利亚其他在施项目调拨
  | 'algeria_local_purchase' // 阿尔及利亚当地采购
  | 'algeria_local_lease'; // 阿尔及利亚当地租赁

export interface EquipmentItem {
  id: string;
  orderNumber: number;
  name: string;
  model: string;
  ageYears: number;
  quantity: number;
  unit: string;
  currentLocation: string;
  planEntryDate: string;
  associatedProcedure: string; // 对应工序
  procedureStartDate: string;
  sourceCategory: EquipmentSourceCategory;
  sourceCategoryLabel: string;
  sourceExplanation: string;
  quantityExplanation: string;
  timingValidationPassed: boolean; // 进场时间不得晚于对应工序开始时间
  proofUploaded: boolean;
}

// ----------------------------------------------------------------------------
// 附件07：进度计划 (P6 / MS Project 专业编制)
// ----------------------------------------------------------------------------
export interface WbsTaskDraft {
  id: string;
  code: string;
  name: string;
  durationDays: number;
  startDate: string;
  endDate: string;
  predecessor: string;
  department: string;
  isKeyMilestone: boolean;
  isCriticalPath: boolean;
  resourceConstraint: string;
  platformImplementationDesc: string; // 平台如何串联实现该需求
  flowToAttachments: string; // 驱动附件05劳动力与附件06设备进场
}

// ----------------------------------------------------------------------------
// 附件08：劳务协议书 (法务重点审查)
// ----------------------------------------------------------------------------
export interface Attachment08LegalCheck {
  partyA: string;
  partyB: string;
  unifiedSocialCode: string;
  legalRep: string;
  authorizedPerson: string;
  signDate: string;
  isBodyLocked: boolean; // 正文原则上锁定，不进行AI改写
  legalCheckItems: {
    // 1. 是否确实使用甲方用工指标
    usesClientLaborQuota: boolean;
    usesClientLaborQuotaNote: string;
    // 2. 是否存在人员安排至非甲方单位工作情形
    assignedToNonClientUnits: boolean;
    assignedToNonClientUnitsNote: string;
    // 3. 代付及直接扣款机制是否接受
    acceptsDirectDeduction: boolean;
    acceptsDirectDeductionNote: string;
    // 4. 赔偿责任是否需要设置边界
    liabilityBoundarySet: boolean;
    liabilityBoundaryNote: string;
  };
  legalReviewer: string;
  legalReviewStatus: 'under_review' | 'approved_with_conditions' | 'pending_clarification';
}

// ----------------------------------------------------------------------------
// 附件09：保密承诺书与外发脱敏控制
// ----------------------------------------------------------------------------
export interface Attachment09Data {
  projectName: string;
  engineeringName: string;
  bidderName: string;
  legalRepName: string;
  signatoryName: string;
  signDate: string;
  coreObligationsConfirmed: boolean;
  coreObligations: string[];
  conflictResolutionMeasures: string[];
  rfqRedactionFirewall: {
    autoRedactProjectName: boolean; // 询价文件自动去除项目名称
    autoRedactClientName: boolean; // 去除业主名称
    autoRedactAddress: boolean; // 去除具体工程地址与图纸标识
    onlySendTechnicalParameters: boolean; // 仅发送必要技术参数
    requireManagerApproval: boolean; // 外发前由负责人审批
    auditLogCount: number; // 已记录的外发脱敏日志数
  };
}

// ============================================================================
// 初始静态数据：附件01—09 元信息定义
// ============================================================================
export const ATTACHMENTS_METADATA_LIST: AttachmentMeta[] = [
  {
    code: '附件01',
    id: 'att-01',
    name: '授权委托书',
    nature: 'standard_text',
    natureLabel: '',
    automation: 'high',
    automationLabel: '高（弹窗问询触发）',
    primaryDataSource: '企业信息库、法定代表人库、授权代理人信息',
    requiredManualAction: '确认代理权限、有效期；法定代表人签字并加盖法人章、公司章',
    status: 'ready',
    summary: '仅针对未在招标方办理授权备案的投标人提交；代理人严禁转委托权。',
    controlRequirements: '弹窗问询备案状态；未备案全自动预填；必须由法人签字盖章并附带身份证证明。',
  },
  {
    code: '附件02',
    id: 'att-02',
    name: '投标承诺函',
    nature: 'standard_text',
    natureLabel: '',
    automation: 'high',
    automationLabel: '高（结果驱动）',
    primaryDataSource: '项目库、企业库、最终锁定报价汇总表',
    requiredManualAction: '确认承诺内容与现场考察事实；代表人签字、公司盖章',
    status: 'ready',
    summary: '自动带入项目名称、公司、签署人及总造价，严格校验大小写与币种统一性。',
    controlRequirements: '小写金额与大写完全一致；与BOQ及汇总表一致；币种统一为阿尔及利亚第纳尔（DA）。',
  },
  {
    code: '附件03',
    id: 'att-03',
    name: '分包商项目管理组织机构图',
    nature: 'standard_text',
    natureLabel: '',
    automation: 'medium_high',
    automationLabel: '中高（附件04强依赖）',
    primaryDataSource: '人员库、岗位配置方案、附件04人员名单',
    requiredManualAction: '确认层级、汇报关系、岗位设置和人员是否真实可投入',
    status: 'ready',
    summary: '由附件04确定的人员和岗位自动生成结构图；附件04未配置时拒绝凭空出图并提示阻断。',
    controlRequirements: '与附件04人员名单保持100%一致性；附件04为空时阻断出图；支持导出矢量图。',
  },
  {
    code: '附件04',
    id: 'att-04',
    name: '施工管理人员配备计划及主要管理人员履历',
    nature: 'personnel_data',
    natureLabel: '',
    automation: 'medium_high',
    automationLabel: '中高（人员库推荐）',
    primaryDataSource: '人员简历库、项目业绩库、人员在岗计划',
    requiredManualAction: '确认管理人员档案与实际到岗可行性，锁定到岗时间及面试承诺',
    status: 'ready',
    summary: '根据《投标须知》要求从企业人才库导入拟派管理人员，生成规范履历表并锁定到岗档期。',
    controlRequirements: '项目经理具备医院经验；管理人员具备阿尔及利亚及属地化经验；无同期在建项目时间冲突。',
  },
  {
    code: '附件05',
    id: 'att-05',
    name: '劳动力配置计划和劳动力曲线',
    nature: 'plan_calculation',
    natureLabel: '',
    automation: 'medium',
    automationLabel: '中（参数测算）',
    primaryDataSource: 'BOQ、进度计划、施工部署、劳动生产率参数',
    requiredManualAction: '调整峰值人数、工种组合、中国工人来源；补充护照、签证、培训凭证',
    status: 'ready',
    summary: '根据附件07进度与工程量联动计算各阶段人数，动态生成劳动力配置表与走势曲线。',
    controlRequirements: '中方与当地劳动力比例合理（40%:60%）；与附件07工期严格联动；中国工人护照签证完备。',
  },
  {
    code: '附件06',
    id: 'att-06',
    name: '施工机械设备、机具和周转材料配备计划',
    nature: 'plan_calculation',
    natureLabel: '',
    automation: 'medium',
    automationLabel: '中（设备库匹配）',
    primaryDataSource: 'BOQ、施工方案、设备库、库存及项目调拨信息',
    requiredManualAction: '确认数量、设备状态、所在地点、调拨可行性和进场日期；上传凭证',
    status: 'ready',
    summary: '匹配设备清单及进场时间，按5种来源分类；倒排校验进场时间不晚于对应工序开始时间。',
    controlRequirements: '设备进场时间不得晚于对应工序开始时间；与方案及附件07进度计划保持一致。',
  },
  {
    code: '附件07',
    id: 'att-07',
    name: '进度计划 (流程串联控制台)',
    nature: 'professional_plan',
    natureLabel: '',
    automation: 'medium_low',
    automationLabel: '中低（专业软件）',
    primaryDataSource: '总包进度、合同工期、BOQ、施工部署、采购周期',
    requiredManualAction: '计划工程师调整逻辑、工期、资源、关键路径并导出P6/Project正式文件',
    status: 'ready',
    summary: '展现平台如何将需求串联实现；向附件05输出工种负荷，向附件06倒排设备进场。',
    controlRequirements: '深化设计、设备选型、采购、海运、清关、施工、调试全周期闭环；总工期540天不可逾越。',
  },
  {
    code: '附件08',
    id: 'att-08',
    name: '劳务协议书',
    nature: 'legal_commitment',
    natureLabel: '',
    automation: 'low',
    automationLabel: '低（法务把关）',
    primaryDataSource: '企业库、法定代表人及授权人信息',
    requiredManualAction: '法务审查适用场景、责任边界、代付扣款、人员安全和赔偿责任；双方签字盖章',
    status: 'pending_review',
    summary: '仅预填双方主体信息；正文原则锁定不AI篡改；四项核心风险经法务审定后签署。',
    controlRequirements: '严禁AI未经法务同意自动改写正文；核查用工指标、非甲方工作、代付款直接扣除风险。',
  },
  {
    code: '附件09',
    id: 'att-09',
    name: '保密承诺书',
    nature: 'standard_text',
    natureLabel: '',
    automation: 'high',
    automationLabel: '高（自动预填+外发脱敏）',
    primaryDataSource: '项目库、企业库',
    requiredManualAction: '确认保密范围和期限；特别确认不得向供应商泄露；材料询价前严格脱敏',
    status: 'ready',
    summary: '自动预填项目工程与签署信息，正文锁定；集成材料询价外发脱敏防火墙，化解履约冲突。',
    controlRequirements: '严格突出7大核心保密义务；询价脱敏5项措施执行；外发审批留痕。',
  },
];

// ============================================================================
// 初始预设完整业务数据
// ============================================================================
export const INITIAL_ATTACHMENT_01: Attachment01Data = {
  filingStatus: 'unregistered', // 默认状态：未在招标方备案，需自动生成并提交
  legalRepresentative: {
    name: '石雨',
    company: '宏远国际工程集团有限公司 (HYI Group)',
    title: '法定代表人 / 董事长',
  },
  authorizedAgent: {
    name: '张志强',
    idNumber: '110108198205123456',
    gender: '男',
    age: 44,
    department: '国际工程事业部',
    title: '阿尔及利亚国家分公司总工程师兼全权代表',
    validityPeriod: '自截标之日起 90 日历天',
    signDate: '2025-03-20',
  },
  clientName: '阿尔及利亚国家卫生与人口部 (Ministère de la Santé)',
  projectName: 'Phoenix 智慧医疗综合体项目',
  supplementaryDocs: [
    { name: '代理人身份证原件正反面复印件 (加盖公章)', required: true, status: 'uploaded' },
    { name: '法定代表人身份证明书原件', required: true, status: 'uploaded' },
    { name: '未办理现场备案专项说明函', required: true, status: 'uploaded' },
  ],
  subDelegationForbidden: true,
  needsSubmission: true,
};

export const INITIAL_ATTACHMENT_02: Attachment02Data = {
  projectName: 'Phoenix 智慧医疗综合体项目',
  engineeringName: '机电工程 (Lot N° 09 : Électricité CFO/CFA)',
  clientName: '阿尔及利亚国家卫生与人口部',
  bidderCompanyName: '宏远国际工程集团有限公司',
  signatoryName: '张志强 (全权代表)',
  totalPriceNumeric: 1286450000.0,
  totalPriceFormatted: '1,286,450,000.00 DZD',
  totalPriceWordsZh: '壹拾贰亿捌仟陆佰肆拾伍万阿尔及利亚第纳尔整 (TTC 含19%增值税)',
  currency: '阿尔及利亚第纳尔（DA / DZD）',
  signDate: '2025-03-21',
  siteVisitConfirmation: 'confirmed_visited', // 已完成现场踏勘与技术核查
  siteVisitNotes: '已由阿尔及尔北部常驻技术团队于 2025年2月18日完成现场踏勘并签署回执备查。',
  amountConsistencyChecks: {
    numberMatchesWords: true,
    matchesBoqTotal: true,
    matchesSubitemSummary: true,
    matchesOverallCostTable: true,
  },
};

export const INITIAL_ATTACHMENT_03_NODES: OrgChartNode[] = [
  { id: 'org-1', roleName: '常驻项目经理', personName: '李振华', level: 1, department: '项目指挥部', isVacant: false, linkedAttachment04PersonId: 'p-01' },
  { id: 'org-2', roleName: '设计负责人 (深化设计)', personName: '陈伟平', level: 2, department: '技术深化部', isVacant: false, linkedAttachment04PersonId: 'p-02' },
  { id: 'org-3', roleName: '技术负责人 (总工程师)', personName: '张志强', level: 2, department: '工程技术部', isVacant: false, linkedAttachment04PersonId: 'p-03' },
  { id: 'org-4', roleName: '商务负责人 (造价合约)', personName: '王丽娟', level: 2, department: '商务合约部', isVacant: false, linkedAttachment04PersonId: 'p-04' },
  { id: 'org-5', roleName: '现场施工负责人', personName: '赵铁生', level: 2, department: '施工管理部', isVacant: false, linkedAttachment04PersonId: 'p-05' },
  { id: 'org-6', roleName: '质量管理负责人 (QC)', personName: '孙德荣', level: 2, department: '质量安全部', isVacant: false, linkedAttachment04PersonId: 'p-06' },
  { id: 'org-7', roleName: 'HSE与环境负责人', personName: 'Krimo Meziane (属地工程师)', level: 2, department: 'HSE管理部', isVacant: false, linkedAttachment04PersonId: 'p-07' },
  { id: 'org-8', roleName: '境外采购与物资负责人', personName: '黄博文', level: 2, department: '采购物流部', isVacant: false, linkedAttachment04PersonId: 'p-08' },
  { id: 'org-9', roleName: '综合进度计划工程师 (P6)', personName: '周文博', level: 2, department: '计划控制部', isVacant: false, linkedAttachment04PersonId: 'p-09' },
  { id: 'org-10', roleName: '强电变配电专业工程师', personName: '刘晓峰', level: 3, department: '电气专业组', isVacant: false },
  { id: 'org-11', roleName: '弱电智能化专工 (医疗特种)', personName: '方敏', level: 3, department: '智能化专业组', isVacant: false },
  { id: 'org-12', roleName: '属地劳务分包工长班组 (200人)', personName: 'Mustapha Benali 等', level: 3, department: '现场作业班组', isVacant: false },
];

// ============================================================================
// 企业人才库 (Enterprise Talent Pool)：可智能匹配导入到附件04
// ============================================================================
export const ENTERPRISE_TALENT_POOL: PersonnelItem[] = [
  {
    id: 'p-01',
    orderNumber: 1,
    role: '项目经理 (Chef de Projet)',
    name: '李振华',
    dob: '1979-08-15',
    degree: '土木与机电工程硕士',
    major: '建筑电气与智能化',
    workingYears: 22,
    nationality: '中国 (持有阿尔及利亚长期工作居留)',
    currentCountry: '阿尔及利亚',
    currentProject: '奥兰综合体育场机电收尾 (已具备投入本项目时间)',
    currentPosition: '机电项目经理',
    tenureYears: 16,
    hasHospitalExp: true,
    sameOrLargerHospitalScale: '康斯坦丁300床大学教学医院机电总承包 (规模达300床，超本项目200床要求)',
    hospitalExpNote: '曾任阿尔及利亚康斯坦丁 300 床大学教学医院机电总承包项目经理 (规模超过本项目)',
    hasAlgeriaExp: true,
    algeriaExpYears: 11,
    algeriaExpNote: '在阿常驻工作 11 年，熟悉当地 DLEP/DSP 验收流程与法规',
    hasLocalSubcontractExp: true,
    localSubcontractNote: '成功管理超过 500 名属地工人和 8 家阿尔及利亚本土电气分包商',
    hasOverseasProcurementExp: true,
    overseasProcurementNote: '主导法标变压器 (Schneider/Legrand) 国际海运与清关全流程',
    certificates: ['一级建造师 (机电工程)', '国际项目管理师 (PMP)', '法标 NF C 15-100 高级电气资质认证'],
    certificateValidity: '一级建造师注册有效期至 2028-06-30；PMP 有效期至 2027-12-31',
    availabilityDate: '2025-04-01',
    timeConflict: false,
    timeConflictDetails: '奥兰项目已进入最终验收签认期，4月1日起100%全职投入本项目',
    resumeUploaded: true,
    performanceProofUploaded: true,
    passportStatus: 'valid',
    passportValidity: '因公普通护照有效至 2029-05-18',
    visaStatus: 'valid_work_visa',
    visaValidity: '阿尔及利亚长期工作居留证有效至 2026-11-30',
    interviewRequired: true,
    interviewConfirmed: true,
    actualAvailabilityConfirmed: true,
  },
  {
    id: 'p-02',
    orderNumber: 2,
    role: '技术负责人 / 总工程师 (Directeur Technique)',
    name: '张志强',
    dob: '1981-05-12',
    degree: '工学学士',
    major: '电气工程及其自动化',
    workingYears: 20,
    nationality: '中国',
    currentCountry: '阿尔及利亚',
    currentProject: '阿尔及尔布迈丁机场T4航站楼供电总承包',
    currentPosition: '供电技术总监',
    tenureYears: 14,
    hasHospitalExp: true,
    sameOrLargerHospitalScale: '安纳巴心血管专科医院 (280床) 手术室孤立电源(IT系统)深化设计',
    hospitalExpNote: '主持安纳巴心血管专科医院手术室孤立电源 (IT系统) 深化设计',
    hasAlgeriaExp: true,
    algeriaExpYears: 9,
    algeriaExpNote: '阿尔及利亚驻场 9 年，多次通过法国 SOCOTEC 与 VERITAS 验评',
    hasLocalSubcontractExp: true,
    localSubcontractNote: '组织编制中法双语技术交底卡与现场施工工法标准',
    hasOverseasProcurementExp: false,
    certificates: ['电气高级工程师', 'BIM 一级建造师', 'SOCOTEC 质量检查员'],
    certificateValidity: '高级工程师职称在册；SOCOTEC资质有效',
    availabilityDate: '2025-04-01',
    timeConflict: false,
    timeConflictDetails: '机场项目已送电完成，4月1日完成移交',
    resumeUploaded: true,
    performanceProofUploaded: true,
    passportStatus: 'valid',
    passportValidity: '因公护照有效至 2028-10-12',
    visaStatus: 'valid_work_visa',
    visaValidity: '阿尔及利亚工作签证有效至 2026-08-31',
    interviewRequired: true,
    interviewConfirmed: true,
    actualAvailabilityConfirmed: true,
  },
  {
    id: 'p-03',
    orderNumber: 3,
    role: '商务合约负责人 (Responsable Commercial)',
    name: '王丽娟',
    dob: '1985-11-20',
    degree: '管理学硕士',
    major: '工程造价与国际商务',
    workingYears: 16,
    nationality: '中国',
    currentCountry: '阿尔及利亚',
    currentProject: '已全职锁定本医院项目',
    tenureYears: 10,
    hasHospitalExp: true,
    hospitalExpNote: '全程负责阿尔及尔军方医院 5% 保函、15% 动员预付款结算及索赔',
    hasAlgeriaExp: true,
    algeriaExpNote: '熟悉阿国公共采购法典与 19% TVA 免税退税清算',
    hasLocalSubcontractExp: true,
    localSubcontractNote: '把关当地属地化劳务协议与计价单价',
    hasOverseasProcurementExp: true,
    overseasProcurementNote: '精通国际信用证 (L/C) 结算与海关清关免税函办理',
    certificates: ['注册一级造价工程师', '国际商务师'],
    availabilityDate: '2025-03-25',
    timeConflict: false,
    resumeUploaded: true,
    performanceProofUploaded: true,
    passportStatus: 'valid',
    visaStatus: 'valid_work_visa',
  },
  {
    id: 'p-04',
    orderNumber: 4,
    role: '境外采购与物流经理 (Responsable Achat International)',
    name: '黄博文',
    dob: '1987-03-10',
    degree: '国际物流管理学士',
    major: '供应链管理',
    workingYears: 14,
    nationality: '中国',
    currentCountry: '中国 (常驻海外采购中心)',
    currentProject: '北非医疗设备采购统筹组',
    tenureYears: 9,
    hasHospitalExp: true,
    hospitalExpNote: '完成 3 个海外三甲医院医疗气体与洁净配电设备成套采购',
    hasAlgeriaExp: true,
    algeriaExpNote: '深谙阿尔及利亚商检法规、银行自由兑换结算与马赛-阿尔及尔航线',
    hasLocalSubcontractExp: false,
    hasOverseasProcurementExp: true,
    overseasProcurementNote: '已锁定施耐德、西门子原产地证明 (CO) 及欧标验货机制',
    certificates: ['国际采购师 (CPPM)', '海关报关员证书'],
    availabilityDate: '2025-04-10',
    timeConflict: false,
    resumeUploaded: true,
    performanceProofUploaded: true,
    passportStatus: 'valid',
    visaStatus: 'valid_work_visa',
  },
  {
    id: 'p-05',
    orderNumber: 5,
    role: 'HSE与环境保护工程师 (Ingénieur HSE)',
    name: 'Krimo Meziane',
    dob: '1984-07-22',
    degree: '工业安全与环境硕士',
    major: 'HSE',
    workingYears: 15,
    nationality: '阿尔及利亚 (当地高级工程师)',
    currentCountry: '阿尔及利亚',
    currentProject: '阿尔及尔北部工程协会注册工程师',
    tenureYears: 8,
    hasHospitalExp: true,
    hospitalExpNote: '熟悉医院施工期粉尘隔离、医用气体安全防爆规程',
    hasAlgeriaExp: true,
    algeriaExpNote: '精通阿尔及利亚劳动保护法与工伤保险报备',
    hasLocalSubcontractExp: true,
    localSubcontractNote: '负责现场 200 名属地工人三级安全教育与阿语法语交底',
    hasOverseasProcurementExp: false,
    certificates: ['阿国国家安全工程师资格认证', 'NEBOSH 国际安全证书'],
    availabilityDate: '2025-04-01',
    timeConflict: false,
    resumeUploaded: true,
    performanceProofUploaded: true,
    passportStatus: 'valid',
    visaStatus: 'valid_work_visa',
  },
  {
    id: 'p-06',
    orderNumber: 6,
    role: '设计负责人 (深化设计总工)',
    name: '陈伟平',
    dob: '1982-09-14',
    degree: '建筑电气硕士',
    major: '建筑电气与暖通',
    workingYears: 18,
    nationality: '中国',
    currentCountry: '阿尔及利亚',
    currentProject: '阿尔及尔北部大学附属医院机电深化组',
    tenureYears: 12,
    hasHospitalExp: true,
    hospitalExpNote: '主持2所北非大型综合医院全套BIM管综深化设计与法标防烟排风校核',
    hasAlgeriaExp: true,
    algeriaExpNote: '在阿从事深化设计8年，熟悉阿尔及利亚DLEP审查及CTC报审标准',
    hasLocalSubcontractExp: true,
    localSubcontractNote: '组织编制属地工程师法文图纸技术交底与现场交底',
    hasOverseasProcurementExp: false,
    certificates: ['注册电气工程师 (供配电)', 'BIM高级建模师'],
    availabilityDate: '2025-04-01',
    timeConflict: false,
    resumeUploaded: true,
    performanceProofUploaded: true,
    passportStatus: 'valid',
    visaStatus: 'valid_work_visa',
  },
  {
    id: 'p-07',
    orderNumber: 7,
    role: '现场施工负责人 (Directeur de Chantier)',
    name: '赵铁生',
    dob: '1978-04-25',
    degree: '工学学士',
    major: '机电一体化',
    workingYears: 23,
    nationality: '中国',
    currentCountry: '阿尔及利亚',
    currentProject: '奥兰体育中心机电项目 (已完工移交)',
    tenureYears: 15,
    hasHospitalExp: true,
    hospitalExpNote: '负责阿尔及利亚布利达军方专科医院机电现场安装施工全过程',
    hasAlgeriaExp: true,
    algeriaExpNote: '驻阿12年，精通属地施工组织、阿国劳工法及工人工资结算',
    hasLocalSubcontractExp: true,
    localSubcontractNote: '曾带领超600名属地工人与当地班组完成多项重点公建',
    hasOverseasProcurementExp: false,
    certificates: ['一级建造师 (机电工程)', '高级施工员证'],
    availabilityDate: '2025-04-01',
    timeConflict: false,
    resumeUploaded: true,
    performanceProofUploaded: true,
    passportStatus: 'valid',
    visaStatus: 'valid_work_visa',
  },
  {
    id: 'p-08',
    orderNumber: 8,
    role: '质量管理负责人 (Responsable QC)',
    name: '孙德荣',
    dob: '1983-06-18',
    degree: '工学学士',
    major: '工业自动化',
    workingYears: 17,
    nationality: '中国',
    currentCountry: '阿尔及利亚',
    currentProject: '阿尔及尔歌剧院机电维保项目',
    tenureYears: 11,
    hasHospitalExp: true,
    hospitalExpNote: '主导安纳巴中心医院手术室洁净度与气密配电质检验收，获法标认证',
    hasAlgeriaExp: true,
    algeriaExpNote: '在阿10年，多次主导通过法国SOCOTEC与VERITAS第三方质量验评',
    hasLocalSubcontractExp: true,
    localSubcontractNote: '建立属地班组三检制与实测实量数字化质量看板',
    hasOverseasProcurementExp: false,
    certificates: ['质量管理体系国家注册审核员', '中级质量工程师'],
    availabilityDate: '2025-04-05',
    timeConflict: false,
    resumeUploaded: true,
    performanceProofUploaded: true,
    passportStatus: 'valid',
    visaStatus: 'valid_work_visa',
  },
  {
    id: 'p-09',
    orderNumber: 9,
    role: '综合进度计划工程师 (Ingénieur Planning P6)',
    name: '周文博',
    dob: '1988-12-03',
    degree: '管理学硕士',
    major: '工程管理',
    workingYears: 12,
    nationality: '中国',
    currentCountry: '阿尔及利亚',
    currentProject: '阿尔及尔北部在建基础设施项目',
    tenureYears: 8,
    hasHospitalExp: true,
    hospitalExpNote: '编审3所海外三甲医院一级至五级P6进度计划与关键路径动态分析',
    hasAlgeriaExp: true,
    algeriaExpNote: '精通FIDIC条款下阿国公共工程工期索赔与延期分析',
    hasLocalSubcontractExp: true,
    localSubcontractNote: '将总进度计划拆解为属地班组周滚动工作计划并实时追踪',
    hasOverseasProcurementExp: true,
    overseasProcurementNote: '将长周期设备海运清关节点与现场安装关键路径严密咬合',
    certificates: ['Oracle Primavera P6认证专家', '一级建造师'],
    availabilityDate: '2025-03-28',
    timeConflict: false,
    resumeUploaded: true,
    performanceProofUploaded: true,
    passportStatus: 'valid',
    visaStatus: 'valid_work_visa',
  },
  {
    id: 'p-10',
    orderNumber: 10,
    role: '强电变配电专业工程师 (Ingénieur Électricité)',
    name: '刘晓峰',
    dob: '1990-03-15',
    degree: '工学学士',
    major: '供配电技术',
    workingYears: 11,
    nationality: '中国',
    currentCountry: '阿尔及利亚',
    currentProject: '已完成前期技术评估',
    tenureYears: 7,
    hasHospitalExp: true,
    hospitalExpNote: '全程负责综合医院 30kV/400V 变电所安装与双路市电并网调试',
    hasAlgeriaExp: true,
    algeriaExpNote: '熟练掌握阿尔及利亚国网 Sonelgaz 接入验收标准与高压安全规程',
    hasLocalSubcontractExp: true,
    localSubcontractNote: '指导属地电工班组完成高压电缆头制作与母线槽安装',
    hasOverseasProcurementExp: false,
    certificates: ['高级电工技师证', '法标电气操作许可 (Habilitation Électrique)'],
    availabilityDate: '2025-04-01',
    timeConflict: false,
    resumeUploaded: true,
    performanceProofUploaded: true,
    passportStatus: 'valid',
    visaStatus: 'valid_work_visa',
  },
  {
    id: 'p-11',
    orderNumber: 11,
    role: '弱电智能化与医疗IT专工 (Ingénieur CFA & IT Médical)',
    name: '方敏',
    dob: '1991-08-22',
    degree: '工学学士',
    major: '智能建筑工程',
    workingYears: 10,
    nationality: '中国',
    currentCountry: '阿尔及利亚',
    currentProject: '北非医疗智能化集成项目部',
    tenureYears: 6,
    hasHospitalExp: true,
    hospitalExpNote: '专精医院洁净手术室IT隔离电源绝缘监测、呼叫对讲与精密弱电集成',
    hasAlgeriaExp: true,
    algeriaExpNote: '熟悉阿国电信监管与医院综合布线法国标准',
    hasLocalSubcontractExp: true,
    localSubcontractNote: '现场培训属地弱电技术人员与系统测试工程师',
    hasOverseasProcurementExp: false,
    certificates: ['弱电系统集成高级工程师', '施耐德医疗IT系统认证专家'],
    availabilityDate: '2025-04-10',
    timeConflict: false,
    resumeUploaded: true,
    performanceProofUploaded: true,
    passportStatus: 'valid',
    visaStatus: 'valid_work_visa',
  },
];

export const INITIAL_ATTACHMENT_04_PERSONNEL: PersonnelItem[] = [...ENTERPRISE_TALENT_POOL];

export const INITIAL_ATTACHMENT_05_LABOR: LaborPlanData = {
  calculationParams: {
    totalEngineeringWorkdays: 21550, // 专业工程量总工日
    productivityIndex: 1.05, // 劳动生产率
    shiftHours: 8, // 每班 8 小时
    shiftsCount: 1.0, // 正常单班制 (关键抢工期 1.5 班)
    chineseRatio: 0.4, // 中方核心骨干 40%
    localRatio: 0.6, // 阿国属地工人 60%
    peakLimit: 180, // 高峰人数上限限制
    compressionRatio: 1.0, // 工期压缩系数 (初始 1.00)
    entryDate: '2025-04-01',
    exitDate: '2026-09-30',
  },
  stages: [
    {
      id: 'stg-1',
      stageName: '阶段一：前期准备与预埋施工',
      timeRange: '第 1 ~ 3 个月 (2025/04 ~ 2025/06)',
      startMonth: 1,
      endMonth: 3,
      workDescription: '临时供电、基础接地极敷设、结构预埋暗管与套管留洞',
      entryAction: '中方技术骨干18人先期进场，属地土建配合电工27人动员进场',
      exitAction: '结构预埋班组分批转入下道工序',
      chineseCount: 24,
      localCount: 48,
      totalStageCount: 72,
    },
    {
      id: 'stg-2',
      stageName: '阶段二：综合管廊与桥架敷设高峰',
      timeRange: '第 4 ~ 6 个月 (2025/07 ~ 2025/09)',
      startMonth: 4,
      endMonth: 6,
      workDescription: '全院电缆桥架安装、母线槽吊装、干线电缆敷设与配电箱就位',
      entryAction: '桥架敷设与电缆拉设大兵团进场，高峰期集中投入属地电工93人',
      exitAction: '骨干桥架工序完成后，普通辅助工分批退场',
      chineseCount: 62,
      localCount: 93,
      totalStageCount: 155,
    },
    {
      id: 'stg-3',
      stageName: '阶段三：变电所与主设备安装峰值',
      timeRange: '第 7 ~ 10 个月 (2025/10 ~ 2026/01)',
      startMonth: 7,
      endMonth: 10,
      workDescription: '30kV变压器、高低压配电柜、柴油发电机组就位与精密母线接线',
      entryAction: '中方66名核心技工全部到位，属地专业班组达99人，达到全周期最高峰165人',
      exitAction: '重型设备安装工种开始分阶段有序组织退场',
      chineseCount: 66,
      localCount: 99,
      totalStageCount: 165,
    },
    {
      id: 'stg-4',
      stageName: '阶段四：洁净医疗IT与终端弱电安装',
      timeRange: '第 11 ~ 14 个月 (2026/02 ~ 2026/05)',
      startMonth: 11,
      endMonth: 14,
      workDescription: '手术室IT隔离电源系统、医用气体信号、安防监控、楼控传感器精密安装',
      entryAction: '弱电智能化与医疗IT专工全面顶上，属地普通拉线工人逐步退场',
      exitAction: '大面积弱电线缆敷设班组完成退场',
      chineseCount: 42,
      localCount: 46,
      totalStageCount: 88,
    },
    {
      id: 'stg-5',
      stageName: '阶段五：全负荷联调、法国SOCOTEC验评与移交',
      timeRange: '第 15 ~ 18 个月 (2026/06 ~ 2026/09)',
      startMonth: 15,
      endMonth: 18,
      workDescription: '高低压送电受电、备用电源自投试验、消防联动调试、竣工档案与维保移交',
      entryAction: '调试工程师与消安验收专班驻场把关',
      exitAction: '除保留8名常驻保修人员外，其余施工队伍全员退场回国或转入下一项目',
      chineseCount: 12,
      localCount: 16,
      totalStageCount: 28,
    },
  ],
  trades: [
    { id: 'tr-1', tradeName: '高低压变配电安装技工', category: 'electrical', stage1Count: 8, stage2Count: 28, stage3Count: 16, stage4Count: 10, stage5Count: 4, peakCount: 28, avgCount: 13 },
    { id: 'tr-2', tradeName: '弱电智能化与医疗IT调试工', category: 'low_voltage', stage1Count: 4, stage2Count: 22, stage3Count: 30, stage4Count: 18, stage5Count: 6, peakCount: 30, avgCount: 16 },
    { id: 'tr-3', tradeName: '电缆桥架与穿线安装工 (属地为主)', category: 'auxiliary', stage1Count: 25, stage2Count: 65, stage3Count: 35, stage4Count: 10, stage5Count: 5, peakCount: 65, avgCount: 28 },
    { id: 'tr-4', tradeName: '柴油发电机与UPS应急电源技工', category: 'electrical', stage1Count: 2, stage2Count: 12, stage3Count: 14, stage4Count: 8, stage5Count: 2, peakCount: 14, avgCount: 8 },
    { id: 'tr-5', tradeName: '接地防雷与消防联动工', category: 'welding_pipe', stage1Count: 12, stage2Count: 18, stage3Count: 12, stage4Count: 6, stage5Count: 2, peakCount: 18, avgCount: 10 },
    { id: 'tr-6', tradeName: '质量安全巡检员与后勤支持', category: 'auxiliary', stage1Count: 6, stage2Count: 10, stage3Count: 8, stage4Count: 6, stage5Count: 4, peakCount: 10, avgCount: 7 },
  ],
  timelineMonths: [
    'M1 (25/04)', 'M2 (25/05)', 'M3 (25/06)', 'M4 (25/07)', 'M5 (25/08)', 'M6 (25/09)',
    'M7 (25/10)', 'M8 (25/11)', 'M9 (25/12)', 'M10 (26/01)', 'M11 (26/02)', 'M12 (26/03)',
    'M13 (26/04)', 'M14 (26/05)', 'M15 (26/06)', 'M16 (26/07)', 'M17 (26/08)', 'M18 (26/09)',
  ],
  monthlyTotalWorkers: [
    45, 58, 72, 115, 138, 155, 165, 160, 148, 132, 120, 105, 88, 70, 52, 40, 28, 18
  ],
  timelineWeeks: Array.from({ length: 78 }, (_, i) => `W${i + 1}`),
  weeklyTotalWorkers: [
    38, 42, 45, 50, 54, 58, 62, 68, 72, 85, 98, 115, 122, 130, 138, 145, 150, 155,
    160, 162, 165, 165, 164, 162, 160, 158, 154, 150, 148, 145, 140, 136, 132, 128, 125, 120,
    115, 110, 105, 100, 95, 92, 88, 82, 78, 74, 70, 65, 60, 56, 52, 48, 45, 42,
    40, 38, 35, 32, 30, 28, 26, 25, 24, 22, 20, 19, 18, 18, 18, 16, 15, 14, 12, 12, 10, 10, 8, 8
  ],
  peakWorkersCount: 165, // 第 7 个月达到峰值 165 人
  avgWorkersCount: 94,
  chineseRatio: 0.4, // 40% 中方核心关键骨干
  localRatio: 0.6, // 60% 阿尔及利亚当地工人
  chineseWorkerBreakdown: {
    headquartersDispatched: 35, // 总部选派人数
    projectTransferred: 31, // 其他项目调派人数
    passportReady: 66, // 已办理护照人数
    visaReady: 66, // 已办理签证人数
    trainingPassed: 66, // 已通过培训考试人数
    totalCount: 66, // 合计人数 (35 + 31 = 66)
  },
  localLaborPlan: {
    directHired: 45, // 属地直接招募人数 (技术小工与普工)
    subcontracted: 54, // 属地分包班组人数 (具有阿国资质电气安装队)
    algerianForemenCount: 6, // 阿尔及利亚当地工长人数 (中法双语带班)
    laborBureauFilingNo: 'DZ-WILAYA-ALGN-EMP-2025-0448', // 阿国劳工局合规备案号
    localInsuranceCoverageRate: 100, // 属地工伤与社保合规覆盖率 100%
  },
  proofDocuments: [
    {
      id: 'doc-pass-01',
      type: 'passport',
      typeName: '中国工人护照全套扫描证明',
      fileName: 'HYI_Algeria_66_Passports_BatchScan.pdf',
      fileSize: '42.8 MB',
      uploadDate: '2025-03-12',
      associatedCount: 66,
      status: 'verified',
      auditRemark: '66名技工护照有效期均在2027年12月以后，满足阿国入境与在岗至少2年要求。',
    },
    {
      id: 'doc-visa-01',
      type: 'visa',
      typeName: '阿尔及利亚工作签证与劳工配额批文',
      fileName: 'Algerian_Work_Permit_Quota_Approval_2025.pdf',
      fileSize: '15.2 MB',
      uploadDate: '2025-03-15',
      associatedCount: 66,
      status: 'verified',
      auditRemark: '阿尔及利亚劳工部已核发 66 名中方机电技术人员劳务配额批文，签证已贴签。',
    },
    {
      id: 'doc-train-01',
      type: 'training',
      typeName: '境外施工安全与法标电工培训合格证书',
      fileName: 'International_Safety_NFC15100_Exam_Records.pdf',
      fileSize: '18.6 MB',
      uploadDate: '2025-03-18',
      associatedCount: 66,
      status: 'verified',
      auditRemark: '全员通过出境前涉外安全培训、防恐演练及法国 NF C 15-100 电工实操考核（合格率100%）。',
    },
    {
      id: 'doc-dispatch-01',
      type: 'dispatch',
      typeName: '集团总部派驻公函与内部跨项目调派证明',
      fileName: 'HQ_Dispatch_Official_Notice_HYI_2025_089.pdf',
      fileSize: '6.4 MB',
      uploadDate: '2025-03-19',
      associatedCount: 66,
      status: 'verified',
      auditRemark: '明确 35 名由总部直选精锐派出，31 名由奥兰与阿尔及尔收尾项目平稳调派。',
    },
    {
      id: 'doc-roster-01',
      type: 'roster',
      typeName: '中方 66 人详细人员花名册与履历备案表',
      fileName: 'Attachment05_Chinese_Labor_66_Roster_Detailed.xlsx',
      fileSize: '2.8 MB',
      uploadDate: '2025-03-20',
      associatedCount: 66,
      status: 'verified',
      auditRemark: '含人员工种、年龄、身份证号、阿国既往项目经历及技能等级登记。',
    },
  ],
  linkedWithSchedule07: true,
  scheduleNeedsRecalculation: false,
  lastRecalculatedTime: '2025-03-21 09:30',
};

export const INITIAL_ATTACHMENT_06_EQUIPMENT: EquipmentItem[] = [
  {
    id: 'eq-01',
    orderNumber: 1,
    name: '车载式液压高空升降作业平台 (16m)',
    model: 'Genie Z-45/25J',
    ageYears: 2,
    quantity: 4,
    unit: '台',
    currentLocation: '阿尔及利亚布迈丁在施项目基地',
    planEntryDate: '2025-06-01',
    associatedProcedure: '综合管廊桥架及高顶电气布线',
    procedureStartDate: '2025-06-10',
    sourceCategory: 'algeria_transferred',
    sourceCategoryLabel: '阿尔及利亚在施项目调拨',
    sourceExplanation: '由布迈丁机场收尾项目完好调拨，已通过阿国安全年检',
    quantityExplanation: '满足手术部、大厅及住院部多工作面流水展开',
    timingValidationPassed: true,
    proofUploaded: true,
  },
  {
    id: 'eq-02',
    orderNumber: 2,
    name: '智能变压器交直流耐压及介损测试仪',
    model: 'Megger Delta 4000',
    ageYears: 1,
    quantity: 2,
    unit: '套',
    currentLocation: '中国上海总部国际调配中心',
    planEntryDate: '2025-09-15',
    associatedProcedure: '高低压变配电房设备安装及母线绝缘耐压调试',
    procedureStartDate: '2025-10-01',
    sourceCategory: 'domestic_existing',
    sourceCategoryLabel: '国内已有设备发运',
    sourceExplanation: '空运发运至阿尔及尔机场清关，备品备件齐全',
    quantityExplanation: '满足 2 组主变与备用发电机组同步绝缘耐压测试',
    timingValidationPassed: true,
    proofUploaded: true,
  },
  {
    id: 'eq-03',
    orderNumber: 3,
    name: '多功能液压母线弯排机与铜排冲孔机',
    model: 'Alfra AEP-1',
    ageYears: 2,
    quantity: 3,
    unit: '台',
    currentLocation: '阿尔及尔当地租赁商 (LocaMat DZ)',
    planEntryDate: '2025-07-20',
    associatedProcedure: '配电柜进出线密集母线槽加工拼装',
    procedureStartDate: '2025-08-01',
    sourceCategory: 'algeria_local_lease',
    sourceCategoryLabel: '阿尔及利亚当地租赁',
    sourceExplanation: '已与当地大型机具商签订意向协议，含随叫随到维保支持',
    quantityExplanation: '每个配电所配置 1 台以确保加工进度',
    timingValidationPassed: true,
    proofUploaded: true,
  },
  {
    id: 'eq-04',
    orderNumber: 4,
    name: '福禄克光纤熔接机与 Fluke DSX-8000 认证分析仪',
    model: 'Fluke Networks DSX-8000',
    ageYears: 1,
    quantity: 4,
    unit: '套',
    currentLocation: '国内新采购并发运',
    planEntryDate: '2025-11-01',
    associatedProcedure: '综合布线、医疗内网与数据中心机房联调',
    procedureStartDate: '2025-11-15',
    sourceCategory: 'domestic_new',
    sourceCategoryLabel: '国内新采购发运',
    sourceExplanation: '原厂出具校准证书及出厂检验单，海运抵阿',
    quantityExplanation: '4个弱电分标段并行测试出具测试报告',
    timingValidationPassed: true,
    proofUploaded: true,
  },
  {
    id: 'eq-05',
    orderNumber: 5,
    name: '低噪声移动式柴油临时动力发电机组 (350kVA)',
    model: 'Cummins C350 D5',
    ageYears: 3,
    quantity: 2,
    unit: '台',
    currentLocation: '阿尔及利亚阿尔及尔北部当地仓储',
    planEntryDate: '2025-04-15',
    associatedProcedure: '现场施工临时供电保障与夜间作业',
    procedureStartDate: '2025-04-20',
    sourceCategory: 'algeria_local_purchase',
    sourceCategoryLabel: '阿尔及利亚当地采购',
    sourceExplanation: '从当地柴油发电机正规代理商采购成套设备',
    quantityExplanation: '一用一备，确保施工用电不间断',
    timingValidationPassed: true,
    proofUploaded: true,
  },
];

export const INITIAL_ATTACHMENT_07_WBS: WbsTaskDraft[] = [
  {
    id: 'wbs-1',
    code: '1.0',
    name: '施工深化设计与图纸报审 (BIM/CCTP对齐)',
    durationDays: 60,
    startDate: '2025-04-01',
    endDate: '2025-05-30',
    predecessor: '-',
    department: '深化技术部',
    isKeyMilestone: true,
    isCriticalPath: true,
    resourceConstraint: 'BIM中法双语团队',
    platformImplementationDesc: '平台从标书技术规格书(CCTP)自动析出电气负荷参数，驱动BIM管综排布',
    flowToAttachments: '输出设备管线选型清单，驱动后续附件06订购',
  },
  {
    id: 'wbs-2',
    code: '2.0',
    name: '进口重型电气设备选型报审与外商订货',
    durationDays: 45,
    startDate: '2025-05-01',
    endDate: '2025-06-15',
    predecessor: '1.0',
    department: '采购物流部',
    isKeyMilestone: true,
    isCriticalPath: true,
    resourceConstraint: '法标原厂排产周期',
    platformImplementationDesc: '平台自动化比选施耐德/西门子法标变压器与高低压配电柜生产周期',
    flowToAttachments: '联动附件06明确国内发运设备发运时间窗口',
  },
  {
    id: 'wbs-3',
    code: '3.0',
    name: '国际海运、阿尔及尔港口清关与内陆运输',
    durationDays: 75,
    startDate: '2025-06-15',
    endDate: '2025-08-30',
    predecessor: '2.0',
    department: '物流与清关组',
    isKeyMilestone: false,
    isCriticalPath: true,
    resourceConstraint: '阿国免税函免检批复',
    platformImplementationDesc: '串联国际货运提单与阿国卫生部免税批文流水线，设置45天清关缓冲',
    flowToAttachments: '确保现场施工不发生设备待料停工，保障工期闭环',
  },
  {
    id: 'wbs-4',
    code: '4.0',
    name: '强电暗埋管线及避雷接地网施工',
    durationDays: 90,
    startDate: '2025-05-15',
    endDate: '2025-08-15',
    predecessor: '1.0',
    department: '施工管理部',
    isKeyMilestone: false,
    isCriticalPath: false,
    resourceConstraint: '配合土建结构同步',
    platformImplementationDesc: '自动匹配土建主体浇筑节点，流水化下达预留预埋施工任务包',
    flowToAttachments: '驱动附件05第一阶段属地基础杂工与接地技工进场',
  },
  {
    id: 'wbs-5',
    code: '5.0',
    name: '综合管廊桥架安装与干线电缆敷设',
    durationDays: 120,
    startDate: '2025-07-01',
    endDate: '2025-10-30',
    predecessor: '4.0',
    department: '电气专业组',
    isKeyMilestone: false,
    isCriticalPath: true,
    resourceConstraint: '高空升降作业平台',
    platformImplementationDesc: '平台根据BQE清单电缆总量（4.5万米）自动测算每日穿线定额与工作面展开',
    flowToAttachments: '触发附件05第7个月达到165人劳动力高峰，调用附件06高空平台',
  },
  {
    id: 'wbs-6',
    code: '6.0',
    name: '中心配电所变压器、高低压成套开关柜就位',
    durationDays: 60,
    startDate: '2025-09-01',
    endDate: '2025-10-30',
    predecessor: '3.0, 5.0',
    department: '变配电专组',
    isKeyMilestone: true,
    isCriticalPath: true,
    resourceConstraint: '吊装机具及土建地坪验收',
    platformImplementationDesc: '海运清关到货后无缝对接变配电室移交，由中方骨干技工实施精密吊装',
    flowToAttachments: '调用附件06耐压测试仪与母线冲孔机进场作业',
  },
  {
    id: 'wbs-7',
    code: '7.0',
    name: '医疗洁净手术部特种隔离电源 (IT) 安装',
    durationDays: 75,
    startDate: '2025-10-15',
    endDate: '2025-12-30',
    predecessor: '6.0',
    department: '医疗特种组',
    isKeyMilestone: false,
    isCriticalPath: true,
    resourceConstraint: '无尘洁净配合施工',
    platformImplementationDesc: '平台专项匹配医用绝缘监视仪与特种防静电接地网参数，杜绝电磁干扰',
    flowToAttachments: '联动附件04医疗特种工程师现场技术指导',
  },
  {
    id: 'wbs-8',
    code: '8.0',
    name: '柴油发电机组安装与市电自动切换 (ATS) 联动',
    durationDays: 45,
    startDate: '2025-11-01',
    endDate: '2025-12-15',
    predecessor: '6.0',
    department: '动力机电组',
    isKeyMilestone: false,
    isCriticalPath: false,
    resourceConstraint: '消音及排烟机房完成',
    platformImplementationDesc: '实现0.5秒内全院应急生命支持负荷自动切投测验',
    flowToAttachments: '调用附件06当地采购的发电机组进行二次并网调试',
  },
  {
    id: 'wbs-9',
    code: '9.0',
    name: '弱电智能化管线、终端传感器与机房工程',
    durationDays: 90,
    startDate: '2025-11-15',
    endDate: '2026-02-15',
    predecessor: '5.0',
    department: '智能化专组',
    isKeyMilestone: false,
    isCriticalPath: false,
    resourceConstraint: '精装修隐蔽工程验收',
    platformImplementationDesc: '平台自动化核验综合布线点位与医院HIS系统、楼宇自控(BMS)点位表',
    flowToAttachments: '驱动附件06福禄克DSX-8000测试仪全面进场认证',
  },
  {
    id: 'wbs-10',
    code: '10.0',
    name: '全负荷通电单机调试与法国 SOCOTEC 验收',
    durationDays: 60,
    startDate: '2026-02-15',
    endDate: '2026-04-15',
    predecessor: '7.0, 8.0, 9.0',
    department: '调试验收组',
    isKeyMilestone: true,
    isCriticalPath: true,
    resourceConstraint: '正式市政电网接入',
    platformImplementationDesc: '串联法国SOCOTEC第三方检验机构标准清单，平台自动归集调试数据形成质检包',
    flowToAttachments: '劳动力进入第4阶段单机调试（退场低技能属地工人）',
  },
  {
    id: 'wbs-11',
    code: '11.0',
    name: '全院智能化系统综合联调及试运行',
    durationDays: 60,
    startDate: '2026-04-16',
    endDate: '2026-06-15',
    predecessor: '10.0',
    department: '调试验收组',
    isKeyMilestone: false,
    isCriticalPath: true,
    resourceConstraint: '院方医护人员到位',
    platformImplementationDesc: '模拟满负荷断电与极端工况，自动出具全院双语试运行报告',
    flowToAttachments: '直接产出标书最终交付物中的试运行合规记录',
  },
  {
    id: 'wbs-12',
    code: '12.0',
    name: '竣工验收移交、档案归档与2年质保交底',
    durationDays: 30,
    startDate: '2026-06-16',
    endDate: '2026-07-15',
    predecessor: '11.0',
    department: '项目指挥部',
    isKeyMilestone: true,
    isCriticalPath: true,
    resourceConstraint: '卫生部接收委员会',
    platformImplementationDesc: '平台一键归集全套中法双语竣工图纸、设备操作手册与质保责任书',
    flowToAttachments: '实现从投标承诺到最终工程移交的完整闭环',
  },
];

export const INITIAL_ATTACHMENT_08_LEGAL: Attachment08LegalCheck = {
  partyA: '阿尔及利亚国家卫生与人口部项目指挥部',
  partyB: '宏远国际工程集团有限公司',
  unifiedSocialCode: '91110000101123456X',
  legalRep: '石雨',
  authorizedPerson: '张志强',
  signDate: '2025-03-22',
  isBodyLocked: true, // 正文严格锁定，禁止 AI 改写正文条款
  legalCheckItems: {
    usesClientLaborQuota: true,
    usesClientLaborQuotaNote: '经核实，中方 66 名核心人员确需依托招标方出具的批文配额向阿国劳工部申请外籍工作许可证。',
    assignedToNonClientUnits: false, // 坚决否决外派其他单位风险
    assignedToNonClientUnitsNote: '我方所有派驻人员全部封闭用于本医院项目，严禁以任何形式外包或借调给非甲方单位。',
    acceptsDirectDeduction: true,
    acceptsDirectDeductionNote: '接受在极端工伤未赔付等法定仲裁后直接从应付进度款中扣除，但要求设置15个工作日书面申诉抗辩期。',
    liabilityBoundarySet: true,
    liabilityBoundaryNote: '赔偿责任严格以直接经济损失为限，排除第三方间接损失和不可抗力自然灾害免责条款。',
  },
  legalReviewer: '海外法务合规部 (高级法务总监 刘浩)',
  legalReviewStatus: 'approved_with_conditions',
};

export const INITIAL_ATTACHMENT_09_CONFIDENTIAL: Attachment09Data = {
  projectName: 'Phoenix 智慧医疗综合体项目',
  engineeringName: '机电工程',
  bidderName: '宏远国际工程集团有限公司',
  legalRepName: '石雨',
  signatoryName: '张志强',
  signDate: '2025-03-21',
  coreObligationsConfirmed: true,
  coreObligations: [
    '1. 招标及履约资料仅用于本项目，未经书面授权严禁用于任何其他商业目的；',
    '2. 未经招标方书面授权，不得以任何直接或间接形式向第三方披露；',
    '3. 投标实体所有项目参与员工均承担法定连带保密义务；',
    '4. 无论本项目最终是否中标，在工程竣工验收并移交前均持续承担保密责任；',
    '5. 严禁向外部材料设备供应商泄露本工程项目背景、业主信息与具体地址；',
    '6. 本保密承诺书属于投标文件及后续施工承包合同不可分割之组成部分；',
    '7. 如因泄密导致招标方利益受损，投标人承担全部经济损失与法律连带责任。',
  ],
  conflictResolutionMeasures: [
    '1. 询价文件自动去除项目名称、业主名称、具体工程地址及官方图纸标识；',
    '2. 仅向供应商发送设备采购所必需的中法双语技术参数指标 (CCTP)；',
    '3. 任何外发询价文件在发出前必须经项目负责人与商务负责人双重审批留痕；',
    '4. 严格保留外发脱敏文件、收件供应商名单及审批日志归档备查；',
    '5. 如特定关键主材确需披露项目背景，须先行取得招标方书面特别授权。',
  ],
  rfqRedactionFirewall: {
    autoRedactProjectName: true,
    autoRedactClientName: true,
    autoRedactAddress: true,
    onlySendTechnicalParameters: true,
    requireManagerApproval: true,
    auditLogCount: 14,
  },
};
