import { ProposalSection, VariableMeta, VariableValues } from '../types/proposalVariables';

export const INITIAL_VARIABLE_VALUES: VariableValues = {
  项目名称: '阿尔及利亚 240 床综合医院强电与智能化系统工程',
  招标编号: 'DZ-SANTE-2026-CFO-009',
  招标人名称: '阿尔及利亚国家卫生与人口部 (Ministère de la Santé)',
  投标人法定名称: '中国建筑第二工程局有限公司 (CSCEC-II)',
  法定代表人姓名: '石雨',
  授权委托人姓名: '张志强',
  委托人职务: '海外事业部总工程师',
  委托人身份证号: '110108198205123456',
  投标截止日期: '2026-11-20',
  投标有效期: '90',
  工期日历天: '540',
  计划开工日期: '2026-12-01',
  计划竣工日期: '2028-05-24',
  工程质量等级: '优良工程 (Conforme aux normes NFC/IEC)',
  项目经理姓名: '李振华',
  建造师注册编号: '京1112020202108892',
  投标总价: '1,286,450,000 DZD',
  投标保证金金额: '25,000,000 DZD',
  工程交付地点: '阿尔及利亚提济乌祖省 (Tizi Ouzou)',
  工程质保期: '2',
  应急响应时间: '2',
};

export const INITIAL_VARIABLE_VALUES_FR: Record<string, string> = {
  项目名称: "Travaux d'électricité CFO/CFA de l'Hôpital de 240 Lits à Tizi Ouzou",
  招标编号: 'DZ-SANTE-2026-CFO-009',
  招标人名称: "Ministère de la Santé, de la Population et de la Réforme Hospitalière",
  投标人法定名称: 'China State Construction Engineering Corp. (CSCEC-II)',
  法定代表人姓名: 'Shi Yu',
  授权委托人姓名: 'Zhang Zhiqiang',
  委托人职务: 'Ingénieur en Chef de la Division Internationale',
  委托人身份证号: '110108198205123456',
  投标截止日期: '20/11/2026 à 12h00',
  投标有效期: '90 jours',
  工期日历天: '540 jours calendaires',
  计划开工日期: '01/12/2026',
  计划竣工日期: '24/05/2028',
  工程质量等级: 'Conforme aux normes NF C 15-100 / NF C 13-100 et normes CEI',
  项目经理姓名: 'Li Zhenhua',
  建造师注册编号: 'JING-1112020202108892',
  投标总价: '1.286.450.000,00 DZD',
  投标保证金金额: '25.000.000,00 DZD',
  工程交付地点: 'Nouvelle Ville de Tizi Ouzou, Wilaya de Tizi Ouzou, Algérie',
  工程质保期: '2 ans entiers',
  应急响应时间: '2 heures',
};

export const VARIABLE_METADATA: Record<string, VariableMeta> = {
  项目名称: { key: '项目名称', label: '工程招标项目全称', category: '项目基础', type: 'text' },
  招标编号: { key: '招标编号', label: '官方招标公告编号', category: '项目基础', type: 'text' },
  招标人名称: { key: '招标人名称', label: '业主/建设单位全称', category: '项目基础', type: 'text' },
  投标人法定名称: { key: '投标人法定名称', label: '投标实体企业全称', category: '主体资质', type: 'text' },
  法定代表人姓名: { key: '法定代表人姓名', label: '法人代表签字人', category: '主体资质', type: 'text' },
  授权委托人姓名: { key: '授权委托人姓名', label: '项目被授权人姓名', category: '主体资质', type: 'text' },
  委托人职务: { key: '委托人职务', label: '被授权人公司职务', category: '主体资质', type: 'text' },
  委托人身份证号: { key: '委托人身份证号', label: '被授权人身份证件号', category: '主体资质', type: 'text' },
  投标截止日期: { key: '投标截止日期', label: '开标/投标递交截止日', category: '商务时间', type: 'date' },
  投标有效期: { key: '投标有效期', label: '投标承诺有效期 (天)', category: '商务时间', type: 'number' },
  工期日历天: { key: '工期日历天', label: '履约总工期 (日历天)', category: '商务时间', type: 'number' },
  计划开工日期: { key: '计划开工日期', label: '现场计划开工时间', category: '商务时间', type: 'date' },
  计划竣工日期: { key: '计划竣工日期', label: '现场最终竣工交付日', category: '商务时间', type: 'date' },
  工程质量等级: { key: '工程质量等级', label: '施工验收执行标准', category: '技术指标', type: 'text' },
  项目经理姓名: { key: '项目经理姓名', label: '拟任常驻项目经理', category: '主体资质', type: 'text' },
  建造师注册编号: { key: '建造师注册编号', label: '注册执业证书编号', category: '主体资质', type: 'text' },
  投标总价: { key: '投标总价', label: '投标报价综合汇总值', category: '商务时间', type: 'text' },
  投标保证金金额: { key: '投标保证金金额', label: '投标保函担保金额', category: '商务时间', type: 'text' },
  工程交付地点: { key: '工程交付地点', label: '项目现场实施地点', category: '技术指标', type: 'text' },
  工程质保期: { key: '工程质保期', label: '竣工后缺陷责任期(年)', category: '技术指标', type: 'number' },
  应急响应时间: { key: '应急响应时间', label: '维保紧急赶赴现场(小时)', category: '技术指标', type: 'number' },
};

export const INITIAL_PROPOSAL_SECTIONS: ProposalSection[] = [
  {
    id: 'SEC-01',
    code: 'COMM-01',
    title: '投标函及商务综合承诺书',
    category: '商务条款',
    summary: '载明投标报价、工期、质量标准及有效期等核心商务响应承诺。',
    templateContent: `致：[招标人名称]

我方已全面研读贵方 [项目名称]（招标编号：[招标编号]）的招标文件及全套工程量清单。在现场踏勘并核算技术经济指标后，我方郑重承诺愿以投标总报价 [投标总价] 承担本项目的全套采购、安装、调试与竣工交付。

我方在此郑重声明并承诺以下关键履约事项：
1. 投标有效期承诺：本投标文件在 [投标截止日期] 起 [投标有效期] 天内持续保持法律有效性。
2. 施工工期承诺：工程拟定施工总工期为 [工期日历天] 个日历天，计划开工日期为 [计划开工日期]，计划竣工验收日期为 [计划竣工日期]。
3. 质量标准承诺：工程质量全面达到 [工程质量等级]，严格遵循中法双语工程技术规程。
4. 核心人员承诺：拟任常驻现场项目经理为 [项目经理姓名]（执业资格证书注册编号：[建造师注册编号]），在实施期内保持全职在岗。

特此呈报！

投标人法定名称：[投标人法定名称]
法定代表人或授权委托人：[授权委托人姓名]
签署日期：[投标截止日期]`,
    isIncluded: true,
    order: 1,
  },
  {
    id: 'SEC-02',
    code: 'LEGAL-02',
    title: '法定代表人身份证明及授权委托书',
    category: '法定声明',
    summary: '出具法人代表对项目负责人的合法签字与投标签署全权授权。',
    templateContent: `法定代表人身份证明书：
本人 [法定代表人姓名] 系 [投标人法定名称] 的法定代表人。在此证明 [授权委托人姓名] 担任我单位 [委托人职务]，为参与 [项目名称] 投标的正式授权代理人。

授权委托书正文：
兹全权委托本单位员工 [授权委托人姓名]（身份证号：[委托人身份证号]）作为我方合法代理人，参与 [项目名称]（招标编号：[招标编号]）的招投标全部事宜。
代理人在投标报名、递交投标文件、商务答疑澄清、领取中标通知书及合同谈判签署中所签署的一切文件，均代表我方真实意愿并具法律效力。

本授权委托书有效期自签发之日起至 [投标截止日期] 后 90 天止。代理人无转委托权。

法定代表人（签章）：[法定代表人姓名]
被授权委托人（签字）：[授权委托人姓名]
授权单位：[投标人法定名称]`,
    isIncluded: true,
    order: 2,
  },
  {
    id: 'SEC-03',
    code: 'TECH-03',
    title: '海外工程实施进度与工期保障计划',
    category: '技术方案',
    summary: '针对海外采购周期、关税清关及现场双语交付编制的节点计划。',
    templateContent: `针对 [项目名称] 地理位置与现场施工界面，我方已结合阿尔及利亚气候与供应链周期制定严密的实施方案。

一、进度总控指标
现场总工期确定为 [工期日历天] 个日历天。计划于 [计划开工日期] 组织首批中方管理人员及机械设备进场，并于 [计划竣工日期] 前完成联合调试及综合验收。

二、工期保障与清关应急措施
1. 提前完成主材采购锁定：针对中国及欧洲原产地设备，在 [投标截止日期] 中标后 10 日内启动国际海运备货；
2. 现场常驻项目经理 [项目经理姓名] 全程统筹法标（NFC规范）与国标图纸深化，保障在 [工程交付地点] 准时交付。`,
    isIncluded: true,
    order: 3,
  },
  {
    id: 'SEC-04',
    code: 'QUAL-04',
    title: '工程质量保证及维保服务响应承诺',
    category: '质量安全',
    summary: '针对医院高可靠性供电及智能化弱电系统提供的质量与售后质保体系。',
    templateContent: `在承建 [项目名称] 过程中，我方承诺建立三级质量自检与过程验收制度。

1. 质量达标等级：严格达到 [工程质量等级]，一次交验合格率 100%。
2. 工程质量缺陷责任期：自工程竣工验收合格之日起算，整体质保期为 [工程质保期] 年。
3. 紧急故障维保响应：质保期内设立属地化售后驻点，提供 7×24 小时应急热线服务。在接到 [招标人名称] 报修通知后，专业工程师将在 [应急响应时间] 小时内赶赴 [工程交付地点] 现场处置排除故障。

承诺人：[投标人法定名称]
授权代表：[授权委托人姓名]`,
    isIncluded: true,
    order: 4,
  },
  {
    id: 'SEC-05',
    code: 'LEGAL-05',
    title: '无重大违法记录与反商业贿赂合规声明',
    category: '法定声明',
    summary: '企业在近三年内经营合规、无不良记录及廉洁招投标的法定书面声明。',
    templateContent: `我单位 [投标人法定名称] 参加贵方组织的 [项目名称]（招标编号：[招标编号]）的政府采购与招标活动。

我单位郑重声明：
1. 参加本次投标活动前三年内，在经营活动中没有重大违法记录，未被列入严重失信主体名单；
2. 在 [项目名称] 整个投标过程中，坚决杜绝串标、围标或以任何不正当手段谋取中标；
3. 本单位提交的所有资质证书、技术指标及由 [法定代表人姓名]、[授权委托人姓名] 签署的函件均真实有效。

特此声明！
投标人：[投标人法定名称]（盖章）
日期：[投标截止日期]`,
    isIncluded: true,
    order: 5,
  },
];
