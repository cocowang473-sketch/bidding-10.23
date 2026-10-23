export type CurrencyType = 'EUR' | 'USD' | 'CNY' | 'DZD' | 'XOF';

export interface SupplierQuote {
  supplierId: string;
  supplierName: string;
  unitPrice: number;
  currency: CurrencyType;
  originCountry: string; // e.g. "中国" | "法国" | "阿尔及利亚"
  leadTimeDays: number;
  isLowestPrice: boolean;
  quotedDate: string; // e.g. "2026-08-15"
  notes?: string;
}

export interface MaterialComponent {
  id: string;
  code: string;
  standardNameZh: string; // 统一标准名称 (中文)
  standardNameFr: string; // 统一标准名称 (法语)
  synonyms: string[]; // 别名模糊匹配库 (如 "进出线柜", "低压柜", "配电屏")
  spec: string;
  unit: string;
  defaultOrigin: string; // 产地 (如 "中国", "欧洲", "当地")
  currency: CurrencyType;
  basePrice: number; // 当前采纳单价 (原币)
  imageUrl: string; // 材料配图字段，提供设备外观与技术构造图鉴
  supplierQuotes: SupplierQuote[];
  lastSignedProject: string; // 如 "240 医院项目"
  lastSignedDate: string; // 签单时间 (判断是否1年内)
  isRecentOneYear: boolean;
  category: '电气设备' | '电缆母线' | '辅材管道' | '暖通消防' | '智能化弱电';
}

export interface InstallationQuotaComponent {
  id: string;
  quotaCode: string;
  nameZh: string; // 中文定额名称
  nameFr: string; // 法语定额名称
  unit: string;
  laborContent: number; // 人工含量 (工日/单位)
  auxiliaryContent: number; // 辅材用量基数 (如 35)
  auxiliaryCoeff: number; // 辅材测算系数 (如 1.1)
  machineryContent: number; // 机械含量基数
  machineryCoeff: number; // 机械测算系数 (如 1.1)
  craftNotes: string; // 工艺工法说明
  referenceProject: string; // "240 医院项目"
}

// 4 种材料单价获取渠道类型
export type PriceAcquisitionChannel =
  | 'ai_market' // 渠道 1: 大模型分析市场价格
  | 'historical_project' // 渠道 2: 往期历史项目签单数据
  | 'local_pricebook' // 渠道 3: 当地官方造价信息价格表
  | 'vendor_rfq' // 渠道 4: 发送邮件给供应商并接收回函
  | 'manual'; // 人工录入/调参

// 多渠道单价明细选项（供比选看板使用）
export interface MultiChannelPriceOption {
  channel: PriceAcquisitionChannel;
  channelName: string;
  sourceTitle: string; // 如 "Gemini 国际大宗及机电指数估算" / "HT-CSCEC-ALG-2025-081 签单" / "阿尔及利亚工程信息价2026Q2" / "正泰防爆电气海外部回函"
  priceOriginal: number;
  currency: CurrencyType;
  origin: string;
  deliveryTerms?: string;
  applyTariff: boolean;
  convertedPriceDzd: number; // 同口径清关到港折合 DZD 单价
  confidenceScore: number; // 置信度 0-100%
  dateOrValidity: string; // 时效说明
  reasoningOrRemarks: string; // 依据/技术说明
  isRecommended?: boolean; // 是否推荐
}

export interface BoqItem {
  id: string;
  itemNo: string; // 清单序号 (如 010101)
  descriptionZh: string; // 中文描述
  descriptionFr: string; // 法语描述 (如 "Armoire d'alimentation TGBT 2500A")
  spec: string; // 规格型号
  unit: string; // 单位
  quantity: number; // 工程量
  
  // 双数据库匹配结果
  matchStatus: 'matched' | 'partial' | 'unmatched';
  matchConfidence: number; // 匹配置信度 (0-100%)
  
  // 1. 安装费 (定额库) 匹配
  matchedQuotaId?: string;
  laborDays: number; // 人工工日
  auxContent: number;
  machContent: number;
  customLaborBase?: number; // 单独项目基数 (若未重写则继承全局 6500)
  customAuxCoeff?: number; // 人工调整辅材系数
  customMachCoeff?: number; // 人工调整机械系数
  
  // 2. 主材费 (采购库) 匹配
  matchedMaterialId?: string;
  materialPriceOriginal: number; // 原币价格
  materialCurrency: CurrencyType; // 币种 (CNY, EUR, USD, DZD)
  materialOrigin: string; // 产地
  applyTariff: boolean; // 是否加收30%关税 (CNY加收，EUR/USD免税)
  selectedSupplierName?: string;
  materialImageUrl?: string;
  
  // 4 渠道单价获取溯源
  priceChannel?: PriceAcquisitionChannel;
  priceChannelDetails?: string;
  
  // 算量结果 (均以 DZD 当地货币核算)
  laborCostDzd: number;
  auxCostDzd: number;
  machCostDzd: number;
  installationCostDzd: number; // 安装费小计
  
  materialCostDzd: number; // 主材费 (含汇率、关税、运费港杂)
  directCostDzd: number; // 人材机直接费小计
  managementCostDzd: number; // 综合取费 (管理费)
  unitPriceDzd: number; // 综合单价 (DZD)
  totalPriceDzd: number; // 综合合价 (DZD)
}

export interface GlobalPricingParams {
  laborBaseRate: number; // 人工定额固定基数 (默认 6500 DZD/工日)
  auxBaseValue: number; // 辅材基础数值 (默认 35)
  auxCoefficient: number; // 辅材测算系数 (默认 1.1)
  machineryBaseValue: number; // 机械基础数值
  machineryCoefficient: number; // 机械测算系数 (默认 1.1)
  managementRate: number; // 综合取费/管理费率 (默认 0.10 即 10%)
  freightRate: number; // 国际运费率 (默认 0.02 即 2%)
  portMiscRate: number; // 出口港杂费率 (默认 0.07 即 7%)
  cnyTariffRate: number; // 人民币加收关税 (默认 0.30 即 30%)
  
  // 汇率配置 (折算为当地货币 迪纳尔 DZD)
  exchangeRates: {
    EUR_TO_DZD: number; // 欧元 -> 迪纳尔 (默认 145.5)
    USD_TO_DZD: number; // 美元 -> 迪纳尔 (默认 134.2)
    CNY_TO_DZD: number; // 人民币 -> 迪纳尔 (默认 18.5)
  };
  
  promptBeforeQuoting: boolean; // 每次报价前是否向人工询问基数更新
}

export interface SupplierReplyDetail {
  supplierName: string;
  supplierEmail: string;
  quotedPrice: number;
  currency: CurrencyType;
  replyAttachmentName: string;
  origin: string;
  leadTime: string;
  parsedAt: string;
  quoteDetails?: string;
  paymentTerms?: string;
  validityDays?: number;
  isRecommended?: boolean;
  generatedResponse?: {
    type: 'award' | 'negotiate' | 'clarify';
    subject: string;
    body: string;
    status: 'draft' | 'sent';
    sentAt?: string;
  };
}

// 供应商类别
export type VendorCategoryType = 'equipment' | 'service' | 'subcontractor' | 'distributor' | 'international';

// 邮件正文模板定义
export interface EmailTemplateItem {
  id: string;
  name: string;
  category: VendorCategoryType;
  categoryLabel: string;
  badge: string;
  description: string;
  defaultCurrency: CurrencyType;
  subjectTemplate: string;
  bodyTemplate: string;
  isCustom?: boolean;
  isDefault?: boolean;
  updatedAt?: string;
}

// 历史签单记录
export interface HistoricalContractRecord {
  id: string;
  contractNo: string;
  projectName: string;
  materialName: string;
  materialSpec: string;
  category: string;
  unitPrice: number;
  currency: CurrencyType;
  supplierName: string;
  quantity: number;
  unit: string;
  deliveryTerms: string;
  signDate: string;
  isRecentOneYear: boolean;
  verified: boolean;
  importBatch?: string;
}

// 物资别名映射
export interface MaterialAliasMapping {
  materialId: string;
  standardNameZh: string;
  standardNameFr: string;
  code: string;
  category: string;
  spec: string;
  synonyms: string[];
  updatedAt: string;
}

export interface RfqInquiryRecord {
  id: string;
  inquiryNo: string;
  materialName: string;
  materialSpec: string;
  quantityNeeded: number;
  unit: string;
  sendDate: string;
  status: 'draft' | 'sent' | 'replied' | 'adopted';
  targetSuppliers: string[];
  targetSupplierEmails?: string[];
  emailSubject?: string;
  emailBody?: string;
  perSupplierEmails?: Record<
    string,
    {
      recipientEmail: string;
      subject: string;
      body: string;
      templateType: string;
    }
  >;
  imageUrl?: string; // 邮件中附带物资技术规格与外观实物图样
  deliveryPort?: string;
  targetCurrency?: CurrencyType;
  linkedBoqItemId?: string; // 关联的量单项，用于采纳后直接回填
  replySummary?: {
    supplierName: string;
    quotedPrice: number;
    currency: CurrencyType;
    replyAttachmentName: string;
    origin: string;
    leadTime: string;
    parsedAt: string;
    quoteDetails?: string;
  };
  supplierReplies?: SupplierReplyDetail[];
  isAdoptedToHistoryDb: boolean;
}
