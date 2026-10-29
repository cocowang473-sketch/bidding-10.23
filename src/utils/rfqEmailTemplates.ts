import { CurrencyType, EmailTemplateItem, VendorCategoryType } from '../types/pricing';

export interface EmailTemplateDef {
  id: string;
  name: string;
  badge: string;
  description: string;
  defaultCurrency: CurrencyType;
  recommendedFor: string[];
}

// 预设系统变量插槽（供用户点击一键插入正文模板）
export interface PresetVariableDef {
  label: string;
  variable: string;
  desc: string;
  example: string;
}

export const PRESET_EMAIL_VARIABLES: PresetVariableDef[] = [
  { label: '供应商名称', variable: '{{供应商名称}}', desc: '收件供应商企业全称', example: '施耐德电气 (Schneider Electric)' },
  { label: '询价材料清单', variable: '{{询价材料清单}}', desc: '物资名称、规格、数量与单位', example: '接地裸铜绞线 50mm² (规格: 国标/IEC 50mm²，数量: 260 米)' },
  { label: '项目名称', variable: '{{项目名称}}', desc: '当前工程项目标段全称', example: '阿尔及利亚 Phoenix 智慧医疗综合体标段' },
  { label: '报价截止日期', variable: '{{报价截止日期}}', desc: '报价回函最后有效期限', example: '2026-08-20' },
  { label: '交货地点与条款', variable: '{{交货地点与条款}}', desc: '交货港口与贸易术语 (如 CIF/DAP)', example: 'CIF 阿尔及尔港 (Port d’Alger)' },
  { label: '技术标准规范', variable: '{{技术标准规范}}', desc: '工程适用设计标准规范', example: 'IEC 61439-2 / 法规 NFC-15100' },
  { label: '采购单位名称', variable: '{{采购单位名称}}', desc: '宏远国际工程集团海外采购部', example: '宏远国际工程集团有限公司 (HYI Group) 海外工程事业部' },
  { label: '联系人及电话', variable: '{{联系人及电话}}', desc: '造价采购工程师联络方式', example: '李工 (+86-10-6789-8800 / procurement.dz@cscec2.com.cn)' },
  { label: '期望报价币种', variable: '{{期望报价币种}}', desc: '结算币种', example: 'EUR' },
];

// 预设按供应商类别维护的高标准邮件模板
export const DEFAULT_EMAIL_TEMPLATES: EmailTemplateItem[] = [
  {
    id: 'tpl-equipment-mfg',
    name: '设备制造厂商采购模板 (重点: 型式试验/图纸接口/原厂质保)',
    category: 'equipment',
    categoryLabel: '设备厂商',
    badge: '设备厂商',
    description: '适用于高低压配电柜、柴油发电机、变压器等重资产设备制造商，严格考核出厂检验、原厂技术图样及海运防潮。',
    defaultCurrency: 'CNY',
    subjectTemplate: '[正式设备询价/Inquiry] {{项目名称}} - 关于【{{询价材料清单}}】制造采购报价邀请函 (致 {{供应商名称}})',
    bodyTemplate: `致：{{供应商名称}} 海外工程与大型项目事业部：

您好！
我司（{{采购单位名称}}）现承接北非阿尔及利亚重点公共工程标段——“{{项目名称}}”。根据业主监理规范及机电深化设计要求，贵司在电气与动力设备制造领域具有良好业界声誉，特正式邀请贵司就本工程所需关键成套设备参与竞争性比选报价。

一、 询价物资清单与规格明细：
{{询价材料清单}}
适用技术标准：{{技术标准规范}}

二、 商务与履约技术核心要求：
1. 技术接口核对：随信附带工程实物样照与深化图样附件，请严格核算柜体外形尺寸、母线排搭接孔距及进出线电缆预留位置。
2. 质量认证与试验：需随报价单提供该系列设备第三方独立型式试验报告 (Type Test Report) 及 ISO 9001 质量认证。
3. 海运防护与防腐：设备包装须符合国际海运适航标准（全密闭集装箱、真空防潮袋及防盐雾喷塑处理），附熏蒸合格证明。
4. 交货地点与港口：{{交货地点与条款}}
5. 期望结算币种：{{期望报价币种}}

三、 报价时效与回函方式：
请贵司于 {{报价截止日期}} 前，将加盖公章的正式报价单（含单价分项拆分表、外形尺寸图及供货周期）回复至我司。

采购工程师联系方式：{{联系人及电话}}
顺祝商祺！
{{采购单位名称}}`,
    isDefault: true,
  },
  {
    id: 'tpl-service-contractor',
    name: '工程服务与技术承包商模板 (重点: 现场督导/调试工日/资质)',
    category: 'service',
    categoryLabel: '服务承包商',
    badge: '服务承包商',
    description: '适用于机电设备安装督导、系统调试合闸、防雷接地检测等技术服务类服务商，明确工日单价与现场安全资质。',
    defaultCurrency: 'DZD',
    subjectTemplate: '[工程技术服务询价] {{项目名称}} - 【{{询价材料清单}}】现场调试与技术服务报价邀请 (致 {{供应商名称}})',
    bodyTemplate: `致：{{供应商名称}} 工程技术服务部：

您好！
针对我司执行的“{{项目名称}}”，为确保变配电系统与重要强电负荷顺利通过阿尔及利亚国家电力公司 (Sonelgaz) 与监理单位联合验收，现就以下专项技术服务向贵司开展商务询价：

一、 委托服务范围与标的：
{{询价材料清单}}
遵循规范：{{技术标准规范}}

二、 专项服务条款与考核要求：
1. 现场督导工程师要求：派驻工程师须持有对应专业高级资质，具备中/法双语沟通能力，熟悉当地并网规范。
2. 计费模式：请分别提供【工日人天单价 (含食宿交通)】与【总包统包包干总价】两种方案报价。
3. 服务工期与配合地点：{{交货地点与条款}}
4. 结算方式与币种：{{期望报价币种}}，提供正规技术服务发票。

请贵司于 {{报价截止日期}} 前回传正式服务报价方案及工程师资质证书复印件。

联系人：{{联系人及电话}}
顺祝商祺！
{{采购单位名称}}`,
    isDefault: true,
  },
  {
    id: 'tpl-subcontractor-labor',
    name: '分包劳务商专项模板 (重点: 双语带班/合规用工/包工包料节点)',
    category: 'subcontractor',
    categoryLabel: '分包劳务',
    badge: '分包劳务',
    description: '适用于海外属地分包、电缆敷设桥架安装劳务团队，考核工签合规、包工包料界限与节点工期。',
    defaultCurrency: 'DZD',
    subjectTemplate: '[专业工程分包询价] {{项目名称}} - 关于【{{询价材料清单}}】安装施工分包报价邀请 (致 {{供应商名称}})',
    bodyTemplate: `致：{{供应商名称}} 劳务与工程分包部：

您好！
我司“{{项目名称}}”强电工程现场施工在即，现就以下施工分包标段邀请贵司参与竞争性商务比选：

一、 分包工作内容与工程量：
{{询价材料清单}}

二、 分包履约管理核心要求：
1. 资质与海外工签：所有进场作业人员须具备合法工程签证或当地合法就业许可，严格遵守我司海外项目安全文明施工条例。
2. 工器具与机械：请明确自带工具机具范围，我司仅提供现场施工用电接口与主材供应。
3. 质量标准：须达到优良工程标准，严格执行 {{技术标准规范}}，一次性通过监理及业主质检。
4. 施工地点：{{交货地点与条款}}
5. 结算币种：{{期望报价币种}}

请贵司于 {{报价截止日期}} 前提交盖章的工日单价或定额总价报价表。

联系人：{{联系人及电话}}
顺祝商祺！
{{采购单位名称}}`,
    isDefault: true,
  },
  {
    id: 'tpl-material-distributor',
    name: '材料贸易商通用模板 (重点: 港口集拼/批量折扣/现货交期)',
    category: 'distributor',
    categoryLabel: '材料贸易商',
    badge: '材料贸易商',
    description: '适用于电缆、电线、桥架辅材及五金贸易商，重点考察现货库存、批量阶梯折扣、出厂检验及集装箱拼箱装运。',
    defaultCurrency: 'CNY',
    subjectTemplate: '[批量物资采购询价] {{项目名称}} - 【{{询价材料清单}}】批量现货报价邀请函 (致 {{供应商名称}})',
    bodyTemplate: `致：{{供应商名称}} 销售与物资贸易部负责人：

您好！
我司（{{采购单位名称}}）因海外重点工程“{{项目名称}}”建设需要，现需集中采购一批高品质工程物资：

一、 采购物资明细：
{{询价材料清单}}
设计标准：{{技术标准规范}}

二、 贸易交货与批量商务条款：
1. 批量专项折扣：鉴于本次采购量较大且后续有追加计划，请贵司在常规渠道价基础上提供工程批量专项阶梯优惠。
2. 交货地点与港口：{{交货地点与条款}}
3. 包装要求：远洋海运适航集装箱包装，随箱提供完整中英文装箱单 (Packing List) 及原厂出厂证明。
4. 报价币种：{{期望报价币种}}

请贵司于 {{报价截止日期}} 前将加盖业务章的正式报价回函发送至我司指定邮箱。

联系人：{{联系人及电话}}
顺祝商祺！
{{采购单位名称}}`,
    isDefault: true,
  },
  {
    id: 'tpl-international-oem',
    name: '国际原厂直供模板 (重点: EUR.1 免税证明/法标 NFC/外币结算)',
    category: 'international',
    categoryLabel: '国际原厂',
    badge: '国际免税原厂',
    description: '适用于法国、德国等欧洲原产设备商，严格落实 EUR.1 原产地免关税单证、法标 NFC 15-100、外币直接电汇。',
    defaultCurrency: 'EUR',
    subjectTemplate: '[Demande de Cotation / RFQ] {{项目名称}} - Fourniture de 【{{询价材料清单}}】 (Réf: {{供应商名称}})',
    bodyTemplate: `À l'attention de la Direction Commerciale & Grands Projets, {{供应商名称}} :

Messieurs,
Dans le cadre de la réalisation du Projet “{{项目名称}}” en Algérie, l'entreprise générale {{采购单位名称}} vous consulte pour la fourniture des équipements ci-dessous :

1. Désignation & Quantités :
{{询价材料清单}}
Normes applicables : {{技术标准规范}}

2. Conditions Douanières & Commerciales Importantes :
- Lieu de livraison : {{交货地点与条款}}
- Franchise douanière (EUR.1) : Conformément aux accords Euro-Méditerranée, les équipements d'origine européenne bénéficient de l'exonération des droits de douane. La remise d'un certificat EUR.1 officiel sera impérativement exigée.
- Conformité normative : Certificats NFC-15100 et IEC 61439 exigés.
- Devise de cotation : {{期望报价币种}} (ferme et non révisable)

Date limite de remise d'offre : {{报价截止日期}}.
Contact Projet : {{联系人及电话}}

Salutations distinguées,
{{采购单位名称}}`,
    isDefault: true,
  },
];

// 将带有预设变量模板的文本替换为实际值
export function renderTemplateWithVariables(
  templateText: string,
  variables: {
    supplierName?: string;
    materialList?: string;
    projectName?: string;
    deadlineDate?: string;
    deliveryPort?: string;
    techStandard?: string;
    buyerName?: string;
    contactInfo?: string;
    currency?: string;
  }
): string {
  const {
    supplierName = '供应商合作伙伴',
    materialList = '工程量清单指定材料设备',
    projectName = '宏远国际海外 Phoenix 智慧医疗综合体标段',
    deadlineDate = '2026-08-20',
    deliveryPort = 'CIF 阿尔及尔港 (Port d’Alger)',
    techStandard = 'IEC 61439-2 / 法国标准 NFC 15-100',
    buyerName = '宏远国际工程集团有限公司 (HYI Group) 海外工程事业部',
    contactInfo = '李工 (+86-10-6789-8800 / procurement.dz@cscec2.com.cn)',
    currency = 'EUR',
  } = variables;

  return templateText
    .replace(/\{\{供应商名称\}\}/g, supplierName)
    .replace(/\{\{询价材料清单\}\}/g, materialList)
    .replace(/\{\{项目名称\}\}/g, projectName)
    .replace(/\{\{报价截止日期\}\}/g, deadlineDate)
    .replace(/\{\{交货地点与条款\}\}/g, deliveryPort)
    .replace(/\{\{技术标准规范\}\}/g, techStandard)
    .replace(/\{\{采购单位名称\}\}/g, buyerName)
    .replace(/\{\{联系人及电话\}\}/g, contactInfo)
    .replace(/\{\{期望报价币种\}\}/g, currency);
}

export const EMAIL_TEMPLATES: EmailTemplateDef[] = [
  {
    id: 'tpl-equipment-mfg',
    name: '设备制造厂商采购模板 (型式试验/图纸接口/原厂质保)',
    badge: '设备厂商',
    description: '适用于高低压配电柜、柴油发电机、变压器等重资产设备制造商，严格考核出厂检验、原厂技术图样及海运防潮。',
    defaultCurrency: 'CNY',
    recommendedFor: ['中国', '国内'],
  },
  {
    id: 'tpl-international-oem',
    name: '国际原厂直供模板 (EUR.1 免税证明/法标 NFC/外币结算)',
    badge: '国际免税原厂',
    description: '适用于法国、德国等欧洲原产设备商，严格落实 EUR.1 原产地免关税单证、法标 NFC 15-100、外币直接电汇。',
    defaultCurrency: 'EUR',
    recommendedFor: ['法国', '瑞士', '德国', '欧洲'],
  },
  {
    id: 'tpl-service-contractor',
    name: '工程服务承包商模板 (现场督导/调试工日/资质)',
    badge: '服务承包商',
    description: '适用于安装督导、系统调试合闸等技术服务类服务商，明确工日单价与现场安全资质。',
    defaultCurrency: 'DZD',
    recommendedFor: ['阿尔及利亚', '本地', '属地'],
  },
  {
    id: 'tpl-subcontractor-labor',
    name: '分包劳务商专项模板 (双语带班/合规用工/包工包料节点)',
    badge: '分包劳务',
    description: '适用于海外属地分包、电缆敷设桥架安装劳务团队，考核工签合规、包工包料界限与节点工期。',
    defaultCurrency: 'DZD',
    recommendedFor: ['劳务', '分包'],
  },
  {
    id: 'tpl-material-distributor',
    name: '材料贸易商通用模板 (港口集拼/批量折扣/现货交期)',
    badge: '材料贸易商',
    description: '适用于电缆、电线、桥架辅材及五金贸易商，重点考察现货库存、批量阶梯折扣、出厂检验及集装箱拼箱装运。',
    defaultCurrency: 'CNY',
    recommendedFor: ['贸易', '通用'],
  },
];

export function getRecommendedTemplateId(country: string): string {
  if (country.includes('中国')) return 'tpl-equipment-mfg';
  if (country.includes('法国') || country.includes('瑞士') || country.includes('德国') || country.includes('欧洲')) {
    return 'tpl-international-oem';
  }
  if (country.includes('阿尔及利亚') || country.includes('本地')) {
    return 'tpl-service-contractor';
  }
  return 'tpl-equipment-mfg';
}

export interface GenerateEmailParams {
  supplierName: string;
  supplierEmail: string;
  supplierCountry: string;
  templateId: string;
  materialName: string;
  materialSpec: string;
  quantity: number;
  unit: string;
  deliveryPort: string;
  deadlineDate: string;
  projectName?: string;
  currency?: CurrencyType;
  customTemplate?: EmailTemplateItem;
}

export interface DedicatedEmailResult {
  subject: string;
  greeting: string;
  body: string;
  closing: string;
  signature: string;
  fullContent: string;
}

export function generateDedicatedSupplierEmail(params: GenerateEmailParams): DedicatedEmailResult {
  const {
    supplierName,
    supplierEmail,
    supplierCountry,
    templateId,
    materialName,
    materialSpec,
    quantity,
    unit,
    deliveryPort,
    deadlineDate,
    projectName = '宏远国际海外 Phoenix 智慧医疗综合体标段',
    currency = 'EUR',
    customTemplate,
  } = params;

  // 如果提供了具体模板定义或在默认模板库中查找到
  const matchedTemplate =
    customTemplate ||
    DEFAULT_EMAIL_TEMPLATES.find((t) => t.id === templateId) ||
    DEFAULT_EMAIL_TEMPLATES[0];

  if (matchedTemplate) {
    const materialListStr = `【${materialName}】 (规格型号: ${materialSpec || '标准设计型号'}，需求数量: ${quantity} ${unit})`;
    const renderedSubject = renderTemplateWithVariables(matchedTemplate.subjectTemplate, {
      supplierName,
      materialList: materialListStr,
      projectName,
      deadlineDate,
      deliveryPort,
      techStandard: 'IEC 61439-2 / 法国标准 NFC 15-100',
      buyerName: '宏远国际工程集团有限公司 (HYI Group) 海外工程事业部',
      contactInfo: '李工 (+86-10-6789-8800 / procurement.dz@cscec2.com.cn)',
      currency: currency || matchedTemplate.defaultCurrency,
    });

    const renderedBody = renderTemplateWithVariables(matchedTemplate.bodyTemplate, {
      supplierName,
      materialList: materialListStr,
      projectName,
      deadlineDate,
      deliveryPort,
      techStandard: 'IEC 61439-2 / 法国标准 NFC 15-100',
      buyerName: '宏远国际工程集团有限公司 (HYI Group) 海外工程事业部',
      contactInfo: '李工 (+86-10-6789-8800 / procurement.dz@cscec2.com.cn)',
      currency: currency || matchedTemplate.defaultCurrency,
    });

    const greetingLine = renderedBody.split('\n')[0] || `致：${supplierName} 商务团队：`;
    const closing = '顺祝商祺！\nSalutations distinguées / Best regards,';
    const signature = `宏远国际工程集团有限公司 (HYI Group)
海外工程事业部 招标采购与供应链管理中心
项目执行单位：${projectName} 项目部机电物资采购组
官方采购邮箱: procurement.dz@cscec2.com.cn
国际通讯专线: +86-10-6789-8800 / +213-21-987-654`;

    return {
      subject: renderedSubject,
      greeting: greetingLine,
      body: renderedBody,
      closing,
      signature,
      fullContent: renderedBody,
    };
  }

  let subject = '';
  let greeting = '';
  let bodyLines: string[] = [];
  const closing = '顺祝商祺！\nSalutations distinguées / Best regards,';
  const signature = `宏远国际工程集团有限公司 (HYI Group)
海外工程事业部 招标采购与供应链管理中心
项目执行单位：${projectName} 项目部机电物资采购组
官方采购邮箱: procurement.dz@cscec2.com.cn
国际通讯专线: +86-10-6789-8800 / +213-21-987-654`;

  switch (templateId) {
    case 'domestic_export':
      subject = `[正式商务询价/Inquiry] ${projectName} - 关于【${materialName}】设备采购报价邀请函 (致 ${supplierName})`;
      greeting = `致：${supplierName} 海外工程与外贸事业部负责人：`;
      bodyLines = [
        `您好！`,
        `我司（宏远国际工程集团有限公司）现承建北非重点标杆工程——“${projectName}”。经项目评标委员会审议，贵司在电气与机电设备制造领域具备优秀的制造履约实力，现正式邀请贵司就本工程所需关键物资参与竞争性比选报价。`,
        ``,
        `一、 采购标的物与技术标准要求：`,
        `1. 采购物资名称：${materialName}`,
        `2. 规格型号及材质标准：${materialSpec}`,
        `3. 本期采购需求量：${quantity} ${unit}`,
        `4. 期望报价币种：人民币 (CNY) 或 美元 (USD) 原币报价（注：由国内启运至北非港口需由我方按现行财税制度核算关税与清关港杂）`,
        ``,
        `二、 国际物流与交付条件：`,
        `1. 交付港口条件：${deliveryPort}`,
        `2. 运输包装要求：须符合国际远洋海运适航标准（全密闭集装箱/防潮真空木箱包装，附熏蒸证明）`,
        `3. 随货单证要求：提供装箱单、商业发票、增值税出口退税备案联及国家质检出厂合格证`,
        ``,
        `三、 物资技术实物图样与标准核查说明：`,
        `为确保国际工程技术参数精准对接，本函已随信附送《物资技术实物图样与技术构造图》、《工程技术规格说明书》（详见邮件附件）。请贵司工程技术人员务必严格对照附图标准复核内部元器件配置及接口尺寸。`,
        ``,
        `四、 报价截止时间及回复方式：`,
        `请贵司于 ${deadlineDate} 前，将加盖公章的正式报价单扫描件（附 Excel 详细单价拆分表）直接回复至本企业邮箱。报价单内请注明单价有效期（建议不低于 60 天）及出厂备货周期。`,
      ];
      break;

    case 'european_origin':
      subject = `[Demande de Cotation Officielle / RFQ] ${projectName} - Fourniture de 【${materialName}】 (Réf: ${supplierName})`;
      greeting = `À l'attention de la Direction Commerciale & Grands Projets, ${supplierName} :`;
      bodyLines = [
        `Messieurs,`,
        `Dans le cadre de la réalisation du Projet Centre Médical Phoenix en Algérie, entreprise générale HYI Group (Hongyuan International Engineering Group), nous avons le plaisir de vous consulter pour la fourniture des équipements électriques ci-après :`,
        ``,
        `1. Désignation du Matériel : ${materialName}`,
        `2. Spécifications Techniques : ${materialSpec}`,
        `3. Quantité Requise : ${quantity} ${unit}`,
        `4. Devise de Cotation Souhaitée : Euros (€ / EUR) ferme et non révisable`,
        ``,
        `Conditions Commerciales et Réglementaires Importantes :`,
        `- Lieu de Livraison : Rendu ${deliveryPort}`,
        `- Origine et Franchise Douanière : Conformément aux accords de libre-échange Euro-Méditerranée, les équipements d'origine européenne bénéficient d'une exonération de droits de douane. La fourniture d'un Certificat de Circulation des Marchandises EUR.1 authentique sera strictement exigée avec les documents d'expédition.`,
        `- Conformité Normative : Les matériels doivent impérativement satisfaire aux normes NFC-15100 et IEC 61439-2 (spéciale établissements de santé).`,
        ``,
        `Plans et Pièces Jointes :`,
        `Veuillez trouver en pièces jointes les fiches techniques d'approbation et schémas d'exécution pour vérification de conformité.`,
        ``,
        `Délai de Remise d'Offre :`,
        `Votre meilleure offre technique et commerciale (devis chiffré et délais de fabrication usine) est attendue au plus tard le ${deadlineDate}.`,
      ];
      break;

    case 'local_algeria':
      subject = `[Consultation Commerciale Locale / Projet Phoenix] Demande de Prix pour 【${materialName}】 (Destinataire: ${supplierName})`;
      greeting = `À l'attention du Service Marchés & Ventes Entreprises, ${supplierName} Algérie :`;
      bodyLines = [
        `Madame, Monsieur,`,
        `Le Bureau de Projet HYI Group Algérie (Projet Centre Médical Phoenix) sollicite par la présente votre meilleure proposition commerciale pour la fourniture locale de :`,
        ``,
        `1. Désignation : ${materialName}`,
        `2. Spécification & Référence : ${materialSpec}`,
        `3. Quantité demandée : ${quantity} ${unit}`,
        `4. Modalité de Cotation : En Dinars Algériens (DZD) Toutes Taxes Comprises (TTC) et Hors Taxes (HT)`,
        ``,
        `Conditions Locales :`,
        `- Disponibilité en stock local / Délai de livraison chantier : ${deliveryPort}`,
        `- Facturation : Facture Proforma réglementaire avec NIF/NIS/RC pour paiement bancaire en Algérie`,
        `- Fiches d'échantillons : Photos techniques jointes au présent courriel`,
        ``,
        `Merci de nous retourner votre facture proforma avant le ${deadlineDate}.`,
      ];
      break;

    case 'general_intl':
    default:
      subject = `[正式商务询价/Inquiry] ${projectName} - 关于【${materialName}】的商务报价邀请函`;
      greeting = `致：${supplierName} 商务拓展团队 / Dear Bidding Team :`;
      bodyLines = [
        `您好！`,
        `宏远国际工程集团有限公司（HYI Group）现就海外大型综合医疗工程“${projectName}”，向贵公司发出正式询价邀请：`,
        ``,
        `1. 采购物资品名：${materialName}`,
        `2. 规格技术要求：${materialSpec}`,
        `3. 需求总量：${quantity} ${unit}`,
        `4. 交付港口与贸易条款：${deliveryPort}`,
        `5. 期望币种：${currency}`,
        ``,
        `技术附图说明：`,
        `随信附带工程设备实物图样与标准技术清单，请作为报价核心技术依据核对。`,
        ``,
        `请于 ${deadlineDate} 前将正式盖章报价单回复至本项目采购专用邮箱。`,
      ];
      break;
  }

  const fullContent = `${greeting}

${bodyLines.join('\n')}

${closing}

${signature}`;

  return {
    subject,
    greeting,
    body: bodyLines.join('\n'),
    closing,
    signature,
    fullContent,
  };
}

export interface GeneratedReplyOption {
  type: 'award' | 'negotiate' | 'clarify';
  title: string;
  badge: string;
  description: string;
  generateSubject: (materialName: string, supplierName: string) => string;
  generateBody: (params: {
    materialName: string;
    supplierName: string;
    quotedPrice: number;
    currency: CurrencyType;
    unit: string;
    quantity: number;
    leadTime: string;
    projectName?: string;
  }) => string;
}

export const REPLY_OPTIONS: GeneratedReplyOption[] = [
  {
    type: 'award',
    title: '采纳中选通知及合同起草洽谈函',
    badge: '推荐中选',
    description: '确认采纳该供应商报价，通知其入选并邀请提交合同草案、企业资质及银行账户信息。',
    generateSubject: (matName, supName) =>
      `Re: [报价采纳与合同洽谈邀请] 阿尔及利亚 Phoenix 智慧医疗综合体项目关于【${matName}】的采购确认函 (致 ${supName})`,
    generateBody: ({ materialName, supplierName, quotedPrice, currency, unit, quantity, leadTime, projectName = '宏远国际海外 Phoenix 智慧医疗综合体项目' }) =>
      `致：${supplierName} 商务与签约管理团队：

您好！

非常感谢贵司针对我司“${projectName}”关于【${materialName}】所提交的正式商务报价单。

经项目部评标小组与机电技术委员会综合评定：
贵司所报【${materialName}】设备方案技术指标完全满足工程规范要求，且综合单价（${quotedPrice.toLocaleString()} ${currency} / ${unit}）具备优良性价比，供货周期（${leadTime}）符合项目工期节点计划。我司已正式确认拟采纳贵司方案作为本标段优选供货商！

为推进后续签约与生产排期，请贵司在接到本函后 2 个工作日内提供以下文件：
1. 贵司授权签字人信息及法人授权委托书
2. 正式采购合同草案及技术协议初稿
3. 贵司银行账户结算信息与合规纳税证明文件

我司项目法务与采购工程师将与贵司对接具体条款。期待与贵司携手打造优质国际样板工程！

顺祝商祺！
宏远国际工程集团有限公司 (HYI Group)
海外工程事业部 招标采购供应链管理中心
联系电话: +86-10-6789-8800 / procurement.dz@cscec2.com.cn`,
  },
  {
    type: 'negotiate',
    title: '商务二次还价与批量折扣商洽函',
    badge: '价格优化',
    description: '感谢报价但指出受业主投资总控约束，结合大批量采购规模商请 3%-5% 专项优惠折扣。',
    generateSubject: (matName, supName) =>
      `Re: [商务优化与二次商洽函] 关于【${matName}】采购单价商洽备忘录 (致 ${supName})`,
    generateBody: ({ materialName, supplierName, quotedPrice, currency, unit, quantity, projectName = '宏远国际海外 Phoenix 智慧医疗综合体项目' }) =>
      `致：${supplierName} 商务拓展及大客户营销部：

您好！

感谢贵司迅速回复我司“${projectName}”采购询价函。我们认真审阅了贵司提交的【${materialName}】报价方案（当前报价：${quotedPrice.toLocaleString()} ${currency} / ${unit}）。

经我司造价工程师与项目总经济师成本核算，鉴于以下两点关键商务要素：
1. 本标段为阿尔及利亚公共工程部投资的重点民生工程，业主批复概算严格，当前报价与我司目标预算存在约 3%~5% 差距；
2. 本次采购规模较大（${quantity} ${unit}），且医院二期工程及周边同类配套标段后续仍有可观复购需求，具备长期战略合作价值。

为此，特诚挚商请贵司领导层予以特别支持，在现有报价基础上给予 3%~5% 批量专项工程优惠折扣，或在付款节点上适当降低预付款比例、延长质保尾款账期。

如贵司能于 48 小时内反馈最终优惠方案，我司将优先把贵司列为最终决标候选人！

顺祝商祺！
宏远国际工程集团有限公司 (HYI Group)
海外工程事业部 成本控制与商务部
联系电话: +86-10-6789-8800 / procurement.dz@cscec2.com.cn`,
  },
  {
    type: 'clarify',
    title: '技术规格澄清与资质补充确认函',
    badge: '技术核对',
    description: '针对工程图样与法标认证要求，请供应商技术人员限期补充型式试验报告与海运包装方案。',
    generateSubject: (matName, supName) =>
      `Re: [技术澄清与标准核对函] 关于【${matName}】工程技术图样与型式试验补充澄清 (致 ${supName})`,
    generateBody: ({ materialName, supplierName, projectName = '宏远国际海外 Phoenix 智慧医疗综合体项目' }) =>
      `致：${supplierName} 技术支持部与质量保障中心：

您好！

关于贵司就“${projectName}”【${materialName}】所报方案，我司海外技术专家组已完成初步技术初审。为确保现场监理与当地实验室一次性验收通过，特请贵司协助补充澄清并提供以下支撑材料：

1. 技术附图与接口核对：请对照我司随函发送的工程实物图纸，确认箱体外形尺寸、铜排搭接端子孔距与现场土建预留基础 100% 吻合；
2. 国际认证证书：请补充提供近 3 年内第三方独立权威机构出具的型式试验报告 (Type Test Report) 及 ISO 9001 证书复印件；
3. 海运防护方案：请明确针对地中海高盐雾潮湿环境，设备柜体表面喷塑厚度及内部防潮吸湿袋配置方案。

请贵司于 3 个工作日内将盖章的技术澄清说明及技术资料扫描件回传。感谢贵司的专业配合！

顺祝商祺！
宏远国际工程集团有限公司 (HYI Group)
海外工程事业部 机电技术与深化设计组
技术联系邮箱: tech.dz@cscec2.com.cn`,
  },
];
