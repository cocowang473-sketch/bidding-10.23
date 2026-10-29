import type { AttachmentDefinition, ValidationItem } from '../types/instructionsAttachments';

/**
 * 投标须知 9 个附件的数据
 * 基于真实的 "机电分包招标文件.zip" 中各附件的 Word 模板内容构造
 * 项目：Phoenix 智慧医疗综合体机电分包工程
 * 招标方：宏远国际工程海外分公司
 */

export const MOCK_ATTACHMENTS: AttachmentDefinition[] = [
  // ============ 附件 01：授权委托书 ============
  {
    code: '01',
    title: '附件01 授权委托书',
    shortTitle: '授权委托书',
    mode: 'auto',
    modeLabel: '自动生成',
    description: '法人授权代理人签署投标文件及参与开标、谈判议标等的全权委托书。',
    mainSources: ['企业信息库', '法定代表人库', '授权备案登记'],
    humanReview: [
      '确认代理权限、有效期',
      '代理人签字补齐，加盖法人章、公司章',
    ],
    status: 'auto_filled',
    rules: [
      '一事一授权（文件级别）',
      '法人签字 + 加盖法人章、公司章',
      '若已在招标方办理授权备案，则无需提交本附件',
    ],
    fields: [
      { key: 'company_name', label: '投标公司名称', type: 'text', value: '宏远国际工程第三分公司', source: 'auto', required: true },
      { key: 'legal_rep_name', label: '法定代表人姓名', type: 'text', value: '张国栋', source: 'auto', required: true },
      { key: 'legal_rep_id', label: '法人身份证号', type: 'text', value: '110105********1234', source: 'auto', required: true },
      { key: 'agent_name', label: '被授权代理人姓名', type: 'text', value: '李明辉', source: 'auto', required: true },
      { key: 'agent_id', label: '代理人身份证号', type: 'text', value: '110105********5678', source: 'auto', required: true },
      { key: 'agent_position', label: '代理人职务', type: 'text', value: '海外项目经理', source: 'auto' },
      { key: 'agent_phone', label: '代理人联系电话', type: 'text', value: '', source: 'manual', required: true },
      { key: 'authority_scope', label: '授权权限', type: 'textarea', value: '代表投标人办理 Phoenix 智慧医疗综合体机电分包工程 投标的全部事宜，包括但不限于：签署投标文件、参与开标、谈判议标、签订合同等。', source: 'auto' },
      { key: 'validity_period', label: '授权有效期', type: 'text', value: '自签署之日起至本项目合同签订之日止', source: 'auto' },
      { key: 'project_name', label: '项目名称', type: 'text', value: 'Phoenix 智慧医疗综合体机电分包工程', source: 'linked', required: true },
      { key: 'tender_authority', label: '招标方', type: 'text', value: '宏远国际工程海外分公司', source: 'linked', required: true },
      { key: 'sign_date', label: '签署日期', type: 'date', value: '2026-11-15', source: 'auto' },
    ],
  },

  // ============ 附件 02：投标承诺函 ============
  {
    code: '02',
    title: '附件02 投标承诺函',
    shortTitle: '投标承诺函',
    mode: 'auto',
    modeLabel: '自动生成',
    description: '承诺按投标总价施工，并声明已理解招标文件、考察现场。',
    mainSources: ['项目库', '企业库', '最终报价汇总表'],
    humanReview: [
      '小写与大写金额一致、与工程量清单总价一致',
      '币种统一为 DA（阿尔及利亚第纳尔）',
      '签字 + 公司章',
    ],
    status: 'auto_filled',
    rules: [
      '承诺的现场勘察在投标须知中仅规定可申请勘察，未证明投标人实际完成',
      '模板中不允许修改承诺内容',
      '大小写金额、币种、与工程量清单总价必须一致',
    ],
    fields: [
      { key: 'signatory_name', label: '签字人姓名', type: 'text', value: '李明辉', source: 'auto', required: true },
      { key: 'company_name', label: '公司名称', type: 'text', value: '宏远国际工程第三分公司', source: 'auto', required: true },
      { key: 'tender_authority', label: '招标方', type: 'text', value: '宏远国际工程海外分公司', source: 'linked', required: true },
      { key: 'project_name', label: '项目名称', type: 'text', value: 'Phoenix 智慧医疗综合体机电工程', source: 'linked', required: true },
      { key: 'total_price_lower', label: '工程总价（小写）', type: 'text', value: '12,450,000.00', source: 'linked', required: true, evidence: '来自工程量清单总价汇总' },
      { key: 'total_price_upper', label: '工程总价（大写）', type: 'text', value: '壹仟贰佰肆拾伍万元整', source: 'linked', required: true },
      { key: 'currency', label: '币种', type: 'text', value: 'DA（第纳尔）', source: 'auto', required: true },
      { key: 'sign_date', label: '签署日期', type: 'date', value: '2026-11-15', source: 'auto' },
    ],
  },

  // ============ 附件 03：分包商项目管理组织机构图 ============
  {
    code: '03',
    title: '附件03 分包商项目管理组织机构图',
    shortTitle: '组织机构图',
    mode: 'auto',
    modeLabel: '自动生成',
    description: '根据附件04人员配备自动生成组织架构图。支持层级自动排版、人员与岗位绑定。',
    mainSources: ['附件04 人员配备计划'],
    humanReview: [
      '层级关系、汇报对象、岗位设置是否合理',
      '与附件04 人员清单一致性校验',
    ],
    status: 'not_started',
    dependsOn: ['04'],
    rules: [
      '《投标须知》对项目组织机构图定义比较含糊，仅参考附件03',
      '因此附件03 仅作为系统生成图形，不保留独立空白模板',
      '关键岗位：项目经理 → 总工程师 → 商务/质量/安全/HSE/采购/物资/计划 7 大负责人 → 各专业工程师',
    ],
    fields: [
      { key: 'project_name', label: '项目名称', type: 'text', value: 'Phoenix 智慧医疗综合体项目', source: 'linked', required: true },
      { key: 'project_manager', label: '项目经理', type: 'text', value: '', source: 'linked', linkedTo: '04.project_manager' },
      { key: 'tech_director', label: '总工程师', type: 'text', value: '', source: 'linked', linkedTo: '04.tech_director' },
      { key: 'commercial_lead', label: '商务负责人', type: 'text', value: '', source: 'linked', linkedTo: '04.commercial_lead' },
      { key: 'quality_lead', label: '质量负责人', type: 'text', value: '', source: 'linked', linkedTo: '04.quality_lead' },
      { key: 'safety_lead', label: '安全负责人', type: 'text', value: '', source: 'linked', linkedTo: '04.safety_lead' },
      { key: 'hse_lead', label: 'HSE 负责人', type: 'text', value: '', source: 'linked' },
      { key: 'procurement_lead', label: '采购负责人', type: 'text', value: '', source: 'linked' },
      { key: 'material_lead', label: '物资负责人', type: 'text', value: '', source: 'linked' },
      { key: 'planning_lead', label: '计划负责人', type: 'text', value: '', source: 'linked' },
      { key: 'specialty_engineers', label: '各专业工程师', type: 'textarea', value: '', source: 'linked', placeholder: '强电、弱电、给排水、暖通' },
      { key: 'org_chart_image', label: '组织架构图', type: 'textarea', value: '', source: 'auto', placeholder: '系统根据附件04自动生成' },
    ],
  },

  // ============ 附件 04：施工管理人员配备计划 & 主要管理人员履历 ============
  {
    code: '04',
    title: '附件04 施工管理人员配备计划 & 主要管理人员履历',
    shortTitle: '人员配备计划',
    mode: 'auto_review',
    modeLabel: '需复核',
    description: '从人员库推荐符合资质的候选人并自动插入项目经验描述。需人工复核项目符合性与关键岗位。',
    mainSources: ['人员库（含学历/证书/业绩）', '项目业绩库', '人员在岗计划'],
    humanReview: [
      '项目经理医院项目经验核实',
      '国际项目经验（阿尔及利亚、属地分包管理）',
      '境外采购经验、关键岗位匹配性',
      '是否实际可投入、是否与其他项目时间冲突',
    ],
    status: 'in_review',
    rules: [
      '项目经理需匹配同等或以上规模的医院项目经验',
      '技术人员需具备国际项目经验',
      '现场管理人员需具备属地化分包管理经验',
      '采购管理人员需有境外采购经验',
      '关键岗位需注意业绩追溯性',
    ],
    fields: [
      { key: 'project_manager', label: '项目经理', type: 'text', value: '王建国', source: 'auto', required: true, evidence: '15 年医院项目经验' },
      { key: 'pm_experience', label: '项目经理项目经验', type: 'textarea', value: '参与国家重点医院建设 3 个（某三甲医院 800 床、某儿童医院 500 床、某肿瘤医院 400 床）；具备境外项目经验 5 年。', source: 'auto' },
      { key: 'tech_director', label: '总工程师', type: 'text', value: '李雪峰', source: 'auto', required: true },
      { key: 'commercial_lead', label: '商务负责人', type: 'text', value: '赵国栋', source: 'auto', required: true },
      { key: 'quality_lead', label: '质量负责人', type: 'text', value: '刘海燕', source: 'auto', required: true },
      { key: 'safety_lead', label: '安全负责人', type: 'text', value: '陈正东', source: 'auto', required: true },
      { key: 'procurement_lead', label: '采购负责人', type: 'text', value: '张辉', source: 'auto', required: true, evidence: '具备境外采购经验 8 年' },
      { key: 'material_lead', label: '物资负责人', type: 'text', value: '', source: 'manual' },
      { key: 'planning_lead', label: '计划负责人', type: 'text', value: '', source: 'manual' },
      { key: 'resume_files', label: '履历附件', type: 'textarea', value: '', source: 'manual', placeholder: '上传学历证书、职称证书、业绩佐证' },
    ],
  },

  // ============ 附件 05：劳动力配置计划和劳动力曲线 ============
  {
    code: '05',
    title: '附件05 劳动力配置计划和劳动力曲线',
    shortTitle: '劳动力配置计划',
    mode: 'auto_review',
    modeLabel: '需复核',
    description: '采用"规则推算 + 人工微调"自动绘图。基于进度计划生成各专业各施工阶段的劳动力曲线。',
    mainSources: ['BOQ 清单', '进度计划', '施工流程', '劳动力定额'],
    humanReview: [
      '施工阶段各工种每月/每周劳动力人数',
      '国内外劳动力配比与进出场计划',
      '签证与培训安排',
    ],
    status: 'in_progress',
    dependsOn: ['07'],
    rules: [
      '国外劳务按预算填写，考虑境外招聘工种与数量',
      '需关注签证、培训、工程绩效综合考虑',
      '施工阶段和日期需从附件07读取',
    ],
    fields: [
      { key: 'total_workers', label: '劳动力总人数', type: 'number', value: '350', source: 'auto' },
      { key: 'local_workers', label: '当地劳动力数量', type: 'number', value: '280', source: 'auto' },
      { key: 'overseas_workers', label: '境外劳动力数量', type: 'number', value: '70', source: 'auto' },
      { key: 'specialty_mix', label: '专业工种分配', type: 'textarea', value: '机电安装 45%、管道工 25%、电工 20%、辅助工 10%', source: 'auto' },
      { key: 'stage_breakdown', label: '施工阶段人员分配', type: 'textarea', value: '基础阶段（3个月）：120人\n主体施工（6个月）：350人\n装饰装修（4个月）：280人\n调试验收（2个月）：80人', source: 'auto' },
      { key: 'labor_curve', label: '劳动力曲线图', type: 'textarea', value: '', source: 'auto', placeholder: '系统根据进度计划自动生成曲线' },
      { key: 'entry_plan', label: '工人进出场计划', type: 'textarea', value: '', source: 'manual' },
      { key: 'visa_training', label: '签证与培训安排', type: 'textarea', value: '', source: 'manual' },
    ],
  },

  // ============ 附件 06：施工机械设备、机具和周转材料配备计划 ============
  {
    code: '06',
    title: '附件06 施工机械设备、机具和周转材料配备计划',
    shortTitle: '设备配备计划',
    mode: 'auto_review',
    modeLabel: '需复核',
    description: '基于施工专业生成设备、机具和周转材料清单，含租期和运输安排。',
    mainSources: ['BOQ 施工内容', '设备库', '机具及周转材料库'],
    humanReview: [
      '关键设备规格、状态、所在地点',
      '运输和交付日期',
      '上传凭证（证书、采购计划、合同、租赁合同、设备照片）',
    ],
    status: 'not_started',
    dependsOn: ['07'],
    rules: [
      '设备进场时间不晚于对应工序开始时间',
      '设备规格、功能、使用年限和状态满足安全要求',
      '当前所在地点与运输距离匹配',
      '机具与施工工程量和机械一致',
      '与附件07 进度计划一致',
    ],
    fields: [
      { key: 'equipment_list', label: '主要机械设备清单', type: 'textarea', value: '塔吊 2 台、施工升降机 2 部、混凝土泵车 1 辆、钢筋加工机械 1 套', source: 'auto' },
      { key: 'tools_list', label: '施工机具清单', type: 'textarea', value: '', source: 'auto', placeholder: '系统根据 BOQ 推荐' },
      { key: 'turnover_materials', label: '周转材料清单', type: 'textarea', value: '脚手架 2000 ㎡、模板 3000 ㎡', source: 'auto' },
      { key: 'equipment_source', label: '设备来源', type: 'textarea', value: '自有设备租用 + 新购 + 本地租赁', source: 'manual' },
      { key: 'equipment_arrival', label: '设备进场时间计划', type: 'textarea', value: '', source: 'linked', linkedTo: '07' },
      { key: 'rental_period', label: '租赁期', type: 'text', value: '', source: 'manual' },
      { key: 'proof_files', label: '佐证凭证', type: 'textarea', value: '', source: 'manual', placeholder: '证书、采购计划、合同、租赁合同、设备照片' },
    ],
  },

  // ============ 附件 07：进度计划 ============
  {
    code: '07',
    title: '附件07 进度计划',
    shortTitle: '进度计划',
    mode: 'professional',
    modeLabel: '专业软件',
    description: '需使用 P6 / Microsoft Project 制作，提供总体计划、专业进度计划、施工组织计划。',
    mainSources: ['总包进度', '合同工期', 'BOQ 施工内容', '采购计划'],
    humanReview: [
      '计划工程师建立 WBS 和逻辑关系',
      '关键节点日期、关键路径',
      '资源加载、总浮时检查',
      '基准计划确认',
    ],
    status: 'not_started',
    rules: [
      '需使用 Primavera P6 或 Microsoft Project',
      '需提供 PDF 版 + 原始计划文件',
      '附件05 和附件06 需从附件07 读取阶段和日期，避免数据矛盾',
    ],
    fields: [
      { key: 'software', label: '使用软件', type: 'select', value: 'Primavera P6', source: 'manual', options: ['Primavera P6', 'Microsoft Project'] },
      { key: 'total_duration', label: '合同总工期（日历日）', type: 'number', value: '450', source: 'linked' },
      { key: 'start_date', label: '计划开工日期', type: 'date', value: '2026-12-15', source: 'linked' },
      { key: 'end_date', label: '计划竣工日期', type: 'date', value: '2028-03-15', source: 'linked' },
      { key: 'wbs_outline', label: 'WBS 分解', type: 'textarea', value: '1. 施工准备\n2. 机电安装（强电、弱电、给排水、暖通）\n3. 调试\n4. 验收移交', source: 'auto' },
      { key: 'key_milestones', label: '关键里程碑', type: 'textarea', value: '基础完工：2027-02\n主体封顶：2027-08\n机电预埋：2027-10\n系统调试：2028-01\n竣工验收：2028-03', source: 'manual' },
      { key: 'critical_path', label: '关键路径说明', type: 'textarea', value: '', source: 'manual' },
      { key: 'pdf_file', label: '上传 P6/Project 原始文件 + PDF', type: 'textarea', value: '', source: 'manual', required: true },
    ],
  },

  // ============ 附件 08：劳务协议书 ============
  {
    code: '08',
    title: '附件08 劳务协议书',
    shortTitle: '劳务协议书',
    mode: 'manual',
    modeLabel: '手动编写',
    description: '合同条款类重点文件。重点关注：甲方供料范围、人员证件、甲方场地内部的安全管理责任。',
    mainSources: ['企业库', '法定代表人及授权人信息'],
    humanReview: [
      '甲方供料范围是否明确',
      '是否明确项目组或甲方场地内部人员的证件责任',
      '条款边界、安全管理责任',
      '双方签字确认',
    ],
    status: 'not_started',
    rules: [
      '甲方供料指标是否明确',
      '是否明确项目组或甲方场地内部人员的证件责任',
      '条款需要约束边界',
      '需明确双方签字；未签字确认将按自动完成或默认接受',
    ],
    fields: [
      { key: 'party_a', label: '甲方（我方）名称', type: 'text', value: '宏远国际工程第三分公司', source: 'auto' },
      { key: 'party_b', label: '乙方（劳务方）名称', type: 'text', value: '', source: 'manual', required: true },
      { key: 'service_scope', label: '劳务服务范围', type: 'textarea', value: '', source: 'manual', required: true },
      { key: 'material_supply', label: '甲方供料范围', type: 'textarea', value: '', source: 'manual' },
      { key: 'personnel_doc', label: '人员证件要求', type: 'textarea', value: '', source: 'manual' },
      { key: 'site_safety', label: '甲方场地内部安全管理责任', type: 'textarea', value: '', source: 'manual' },
      { key: 'payment_terms', label: '付款条款', type: 'textarea', value: '', source: 'manual' },
      { key: 'validity', label: '协议有效期', type: 'text', value: '', source: 'manual' },
      { key: 'signatures', label: '双方签字确认', type: 'text', value: '', source: 'manual', required: true },
    ],
  },

  // ============ 附件 09：保密承诺书 ============
  {
    code: '09',
    title: '附件09 保密承诺书',
    shortTitle: '保密承诺书',
    mode: 'auto',
    modeLabel: '自动生成',
    description: '承诺不泄露投标文件及项目敏感信息。',
    mainSources: ['项目库', '企业库'],
    humanReview: [
      '保密范围、年限',
      '签字部分、公司章',
    ],
    status: 'auto_filled',
    rules: [
      '承诺不泄露投标信息',
      '工程开工发出前不得泄露',
      '不得泄露敏感信息（工程指标、项目细节、人员数据等）',
    ],
    fields: [
      { key: 'project_name', label: '项目名称', type: 'text', value: 'Phoenix 智慧医疗综合体项目', source: 'linked', required: true },
      { key: 'company_name', label: '投标公司名称', type: 'text', value: '宏远国际工程第三分公司', source: 'auto', required: true },
      { key: 'business_type', label: '业务类型', type: 'text', value: '机电工程分包', source: 'auto' },
      { key: 'confidential_scope', label: '保密范围', type: 'textarea', value: '本投标文件及合同文件组成部分、项目图纸、工程量清单、技术方案、商务报价、人员配置等所有涉密信息', source: 'auto' },
      { key: 'confidential_period', label: '保密年限', type: 'text', value: '自签订本承诺之日起 5 年', source: 'auto' },
      { key: 'signatory_name', label: '签字人姓名', type: 'text', value: '李明辉', source: 'auto', required: true },
      { key: 'sign_date', label: '签署日期', type: 'date', value: '2026-11-15', source: 'auto' },
    ],
  },
];

// 一致性校验规则
export const MOCK_VALIDATIONS: ValidationItem[] = [
  {
    id: 'v1',
    rule: '项目名称、招标方、投标人在各附件中一致',
    passed: true,
    relatedAttachments: ['01', '02', '08', '09'],
  },
  {
    id: 'v2',
    rule: '附件02 小写金额与大写金额一致',
    passed: true,
    details: '12,450,000.00 → 壹仟贰佰肆拾伍万元整',
    relatedAttachments: ['02'],
  },
  {
    id: 'v3',
    rule: '附件03 组织架构与附件04 人员名单一致',
    passed: false,
    details: '附件03 中"物资负责人"岗位在附件04 中未指定人选',
    relatedAttachments: ['03', '04'],
  },
  {
    id: 'v4',
    rule: '附件05、06 施工阶段与附件07 进度一致',
    passed: false,
    details: '附件07 进度计划尚未完成，无法进行一致性校验',
    relatedAttachments: ['05', '06', '07'],
  },
  {
    id: 'v5',
    rule: '所有文件日期不晚于截标时间（2026-11-30）',
    passed: true,
    relatedAttachments: ['01', '02', '09'],
  },
  {
    id: 'v6',
    rule: '所有必填空白字段均已填写',
    passed: false,
    details: '附件04、05、06、07、08 仍有必填字段未填写',
    relatedAttachments: ['04', '05', '06', '07', '08'],
  },
];
