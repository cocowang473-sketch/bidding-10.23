import React, { useState, useEffect, useMemo } from 'react';
import {
  RfqInquiryRecord,
  CurrencyType,
  SupplierReplyDetail,
  EmailTemplateItem,
} from '../types/pricing';
import {
  EMAIL_TEMPLATES,
  EmailTemplateDef,
  getRecommendedTemplateId,
  generateDedicatedSupplierEmail,
  REPLY_OPTIONS,
  GeneratedReplyOption,
} from '../utils/rfqEmailTemplates';
import {
  X,
  Mail,
  Send,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Building2,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Check,
  Plus,
  Globe,
  Search,
  ExternalLink,
  UserPlus,
  RotateCcw,
  FileText,
  Edit3,
  Copy,
  Layers,
  ArrowRight,
  MessageSquare,
  Upload,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';

interface SendEmailRfqModalProps {
  isOpen: boolean;
  prefillItem?: {
    name: string;
    spec: string;
    unit: string;
    quantity: number;
    imageUrl?: string;
    boqItemId?: string;
  } | null;
  onClose: () => void;
  onSendRfq: (record: RfqInquiryRecord) => void;
  onAdoptImmediately?: (record: RfqInquiryRecord) => void;
  availableTemplates?: EmailTemplateItem[];
}

export interface SupplierItem {
  id: string;
  name: string;
  email: string;
  country: string;
  tag?: string;
  isCustom?: boolean;
}

const DEFAULT_SUPPLIERS: SupplierItem[] = [
  { id: 'SUP-01', name: '正泰电气海外事业部', email: 'chint.overseas@chint.com', country: '中国', tag: '在库合规' },
  { id: 'SUP-02', name: '施耐德电气法国海外部 (Schneider)', email: 'schneider.projects.dz@se.com', country: '法国', tag: '免关税原产' },
  { id: 'SUP-03', name: '远东电缆国际贸易分公司', email: 'fareast.intl@fe-cable.com', country: '中国', tag: '特种电缆' },
  { id: 'SUP-04', name: '宝胜电缆海外部', email: 'baosheng.export@baosheng.com', country: '中国', tag: '在库合规' },
  { id: 'SUP-05', name: 'ENICAB 阿尔及利亚电缆制造厂', email: 'contact@enicab.dz', country: '阿尔及利亚', tag: '属地现货' },
];

// 全球认证供应商网络搜索候选知识库 (按物资类别与工程标准匹配)
const WEB_SUPPLIERS_DATABASE = [
  {
    name: 'ABB 电气成套海外事业部 (ABB Europe)',
    email: 'export.switchgear@abb.com',
    country: '瑞士/欧洲',
    tariffStatus: '免关税 (欧洲直发)',
    certifications: 'IEC 61439-2 · ISO 9001 · 具备北非医用供电业绩',
    matchKeywords: ['柜', '配电', '开关', 'armoire', 'tgbt', 'cellule'],
    advantage: '欧洲原产成套配电柜，直达阿尔及尔港，免征 30% 进口关税',
  },
  {
    name: '西门子北非机电成套工程部 (Siemens MENA)',
    email: 'projects.algeria@siemens.com',
    country: '德国/阿尔及利亚',
    tariffStatus: '免关税 (地中海自贸区)',
    certifications: 'NFC-15100 · SIVACON S8 抽屉柜 · 医疗纯净供电认证',
    matchKeywords: ['柜', '配电', '智能', 'switchgear', 'armoire'],
    advantage: '在阿尔及利亚设有技术常驻支持中心，可提供现场联合调试',
  },
  {
    name: '罗格朗阿尔及利亚本土工程分部 (Legrand Algérie)',
    email: 'contact@legrand.dz',
    country: '法国/阿尔及利亚',
    tariffStatus: '当地现货 / 免关税',
    certifications: '法标 NFC 认证 · ISO 14001 · 本地现货库',
    matchKeywords: ['箱', '配电箱', 'coffret', '插座', '开关', '桥架'],
    advantage: '本地仓储现货，交期仅需 7-14 天，解决工期加急需求',
  },
  {
    name: '中天科技海缆与特种电缆海外部 (ZTT Cable)',
    email: 'overseas.cable@ztt.cn',
    country: '中国',
    tariffStatus: '国内直发出口',
    certifications: 'IEC 60502 · 低烟无卤耐火阻燃 B1 级',
    matchKeywords: ['电缆', 'câble', '铜', '线缆', '接地'],
    advantage: '高性价比阻燃电缆，大型基建集装箱整柜直发',
  },
  {
    name: '阿尔及利亚本土电气集成商 SOTELEC (Algérie)',
    email: 'commercial@sotelec-dz.com',
    country: '阿尔及利亚',
    tariffStatus: '当地结算 (DZD 无外汇清关延误)',
    certifications: '阿尔及利亚工业部认证 · 本地成套厂',
    matchKeywords: ['柜', '箱', '配电', 'armoire', 'coffret', '母线'],
    advantage: '本地第纳尔直接结算，无国际海运与清关滞港风险',
  },
  {
    name: '硕特电气法国自动化 (Socomec France)',
    email: 'inquiry.export@socomec.com',
    country: '法国',
    tariffStatus: '免关税 (欧盟原产证明)',
    certifications: 'IEC 60947-6-1 · 医用自动双电源转换开关 (ATS)',
    matchKeywords: ['双电源', 'ats', '切换', 'inverseur', '发电机'],
    advantage: '专注医院 ICU/手术室双电源切换柜，毫秒级自启动切换',
  },
  {
    name: '江苏大全封闭母线成套系统',
    email: 'daquan.export@daquan.com',
    country: '中国',
    tariffStatus: '国内直发出口',
    certifications: 'IP66 防护 · 环氧树脂整体浇注 · IEC 61439-6',
    matchKeywords: ['母线', '母线槽', 'gaine', 'barres', '干线'],
    advantage: '大容量 1600A-5000A 密集绝缘母线槽，耐震级机械强度',
  },
];

export const SendEmailRfqModal: React.FC<SendEmailRfqModalProps> = ({
  isOpen,
  prefillItem,
  onClose,
  onSendRfq,
  onAdoptImmediately,
}) => {
  if (!isOpen) return null;

  const [step, setStep] = useState<'compose' | 'sent_and_reply'>('compose');
  const [materialName, setMaterialName] = useState(
    prefillItem?.name || '低压进出线配电柜 (Armoire TGBT)'
  );
  const [materialSpec, setMaterialSpec] = useState(
    prefillItem?.spec || '额定电流 2500A, 分断能力 65kA, 抽出式主进线, Form 4b 隔离'
  );
  const [quantity, setQuantity] = useState(prefillItem?.quantity || 4);
  const [unit, setUnit] = useState(prefillItem?.unit || '台');
  const [imageUrl, setImageUrl] = useState(
    prefillItem?.imageUrl ||
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80'
  );

  const [deliveryPort, setDeliveryPort] = useState(
    '阿尔及利亚阿尔及尔港 (Port d’Alger, CIF)'
  );
  const [deadlineDate, setDeadlineDate] = useState('2026-10-25');
  const [preferredCurrency, setPreferredCurrency] = useState<CurrencyType>('EUR');

  // 动态供应商列表
  const [suppliersList, setSuppliersList] = useState<SupplierItem[]>(DEFAULT_SUPPLIERS);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([
    '正泰电气海外事业部',
    '施耐德电气法国海外部 (Schneider)',
  ]);

  // 新增供应商子面板状态 ('none' | 'manual' | 'web')
  const [supplierAddMode, setSupplierAddMode] = useState<'none' | 'manual' | 'web'>('none');

  // 手动新增供应商表单
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualCountry, setManualCountry] = useState('中国');
  const [manualTag, setManualTag] = useState('新准入合规');

  // 网络搜索关键词
  const [webSearchQuery, setWebSearchQuery] = useState('');

  // 当前正在预览/编辑专属邮件的供应商（单商单信）
  const [activeEditingSupplierName, setActiveEditingSupplierName] = useState<string>(
    selectedSuppliers[0] || '正泰电气海外事业部'
  );

  // 每家供应商的专属邮件配置 { [supplierName]: { templateId, subject, body, isCustomEdited } }
  const [perSupplierConfigs, setPerSupplierConfigs] = useState<
    Record<
      string,
      {
        templateId: EmailTemplateDef['id'];
        subject: string;
        body: string;
        isCustomEdited: boolean;
      }
    >
  >({});

  // 发送与回复状态
  const [isSending, setIsSending] = useState(false);
  const [sentRecord, setSentRecord] = useState<RfqInquiryRecord | null>(null);

  // 供应商回复比选：当前查看的供应商回复
  const [activeReplySupplierName, setActiveReplySupplierName] = useState<string>('');

  // 一键回复状态：回复类型、回复草稿、发送状态
  const [selectedReplyType, setSelectedReplyType] = useState<
    'award' | 'negotiate' | 'clarify'
  >('award');
  const [replyDraftSubject, setReplyDraftSubject] = useState<string>('');
  const [replyDraftBody, setReplyDraftBody] = useState<string>('');
  const [hasSentReplyFeedback, setHasSentReplyFeedback] = useState<boolean>(false);

  // 当外部 prefillItem 改变时更新状态
  useEffect(() => {
    if (prefillItem) {
      setMaterialName(prefillItem.name);
      setMaterialSpec(prefillItem.spec);
      setQuantity(prefillItem.quantity);
      setUnit(prefillItem.unit);
      if (prefillItem.imageUrl) setImageUrl(prefillItem.imageUrl);
      setStep('compose');
      setWebSearchQuery(prefillItem.name.slice(0, 4));
    }
  }, [prefillItem]);

  // 保证 activeEditingSupplierName 在已选供应商中
  useEffect(() => {
    if (selectedSuppliers.length > 0 && !selectedSuppliers.includes(activeEditingSupplierName)) {
      setActiveEditingSupplierName(selectedSuppliers[0]);
    }
  }, [selectedSuppliers, activeEditingSupplierName]);

  // 获取当前正在编辑的供应商对象
  const activeEditingSupplier = useMemo(() => {
    return (
      suppliersList.find((s) => s.name === activeEditingSupplierName) || {
        id: 'tmp',
        name: activeEditingSupplierName,
        email: 'commercial@supplier.com',
        country: '中国',
        tag: '供应商',
      }
    );
  }, [suppliersList, activeEditingSupplierName]);

  // 初始化或获取当前供应商的专属邮件配置
  const currentSupplierEmailConfig = useMemo(() => {
    if (!activeEditingSupplierName) return null;

    const existing = perSupplierConfigs[activeEditingSupplierName];
    if (existing) return existing;

    const recommendedTemplateId = getRecommendedTemplateId(activeEditingSupplier.country);
    const generated = generateDedicatedSupplierEmail({
      supplierName: activeEditingSupplier.name,
      supplierEmail: activeEditingSupplier.email,
      supplierCountry: activeEditingSupplier.country,
      templateId: recommendedTemplateId,
      materialName,
      materialSpec,
      quantity,
      unit,
      deliveryPort,
      deadlineDate,
      currency: preferredCurrency,
    });

    return {
      templateId: recommendedTemplateId,
      subject: generated.subject,
      body: generated.fullContent,
      isCustomEdited: false,
    };
  }, [
    perSupplierConfigs,
    activeEditingSupplierName,
    activeEditingSupplier,
    materialName,
    materialSpec,
    quantity,
    unit,
    deliveryPort,
    deadlineDate,
    preferredCurrency,
  ]);

  // 切换供应商的多选勾选
  const toggleSupplier = (name: string) => {
    if (selectedSuppliers.includes(name)) {
      if (selectedSuppliers.length === 1) return; // 至少保留一家
      setSelectedSuppliers(selectedSuppliers.filter((s) => s !== name));
    } else {
      setSelectedSuppliers([...selectedSuppliers, name]);
      // 为新添加的供应商生成默认配置
      const supObj = suppliersList.find((s) => s.name === name);
      if (supObj && !perSupplierConfigs[name]) {
        const tId = getRecommendedTemplateId(supObj.country);
        const generated = generateDedicatedSupplierEmail({
          supplierName: supObj.name,
          supplierEmail: supObj.email,
          supplierCountry: supObj.country,
          templateId: tId,
          materialName,
          materialSpec,
          quantity,
          unit,
          deliveryPort,
          deadlineDate,
          currency: preferredCurrency,
        });
        setPerSupplierConfigs((prev) => ({
          ...prev,
          [name]: {
            templateId: tId,
            subject: generated.subject,
            body: generated.fullContent,
            isCustomEdited: false,
          },
        }));
      }
    }
  };

  // 手动新增供应商
  const handleAddManualSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualEmail.trim()) return;

    const newSupplier: SupplierItem = {
      id: `SUP-MANUAL-${Date.now().toString().slice(-4)}`,
      name: manualName.trim(),
      email: manualEmail.trim(),
      country: manualCountry,
      tag: manualTag,
      isCustom: true,
    };

    setSuppliersList((prev) => [newSupplier, ...prev]);
    setSelectedSuppliers((prev) => [newSupplier.name, ...prev]);
    setActiveEditingSupplierName(newSupplier.name);
    setManualName('');
    setManualEmail('');
    setSupplierAddMode('none');
  };

  // 从网络库中采纳供应商
  const handleAdoptWebSupplier = (webSupplier: (typeof WEB_SUPPLIERS_DATABASE)[0]) => {
    const exists = suppliersList.some((s) => s.name === webSupplier.name);
    if (!exists) {
      const newSupplier: SupplierItem = {
        id: `SUP-WEB-${Date.now().toString().slice(-4)}`,
        name: webSupplier.name,
        email: webSupplier.email,
        country: webSupplier.country,
        tag: '网络准入',
        isCustom: true,
      };
      setSuppliersList((prev) => [newSupplier, ...prev]);
    }
    if (!selectedSuppliers.includes(webSupplier.name)) {
      setSelectedSuppliers((prev) => [...prev, webSupplier.name]);
    }
    setActiveEditingSupplierName(webSupplier.name);
  };

  // 网络检索结果过滤
  const filteredWebSuppliers = useMemo(() => {
    const q = (webSearchQuery || materialName).toLowerCase();
    return WEB_SUPPLIERS_DATABASE.filter((ws) => {
      const matchText =
        ws.name.toLowerCase().includes(q) ||
        ws.country.toLowerCase().includes(q) ||
        ws.advantage.toLowerCase().includes(q) ||
        ws.certifications.toLowerCase().includes(q) ||
        ws.matchKeywords.some((k) => q.includes(k) || k.includes(q));
      return matchText;
    });
  }, [webSearchQuery, materialName]);

  // 更新当前供应商的模板
  const handleSelectTemplate = (templateId: EmailTemplateDef['id']) => {
    const generated = generateDedicatedSupplierEmail({
      supplierName: activeEditingSupplier.name,
      supplierEmail: activeEditingSupplier.email,
      supplierCountry: activeEditingSupplier.country,
      templateId,
      materialName,
      materialSpec,
      quantity,
      unit,
      deliveryPort,
      deadlineDate,
      currency: preferredCurrency,
    });

    setPerSupplierConfigs((prev) => ({
      ...prev,
      [activeEditingSupplierName]: {
        templateId,
        subject: generated.subject,
        body: generated.fullContent,
        isCustomEdited: false,
      },
    }));
  };

  // 一键将当前模板应用至所有选中供应商
  const handleApplyTemplateToAll = (templateId: EmailTemplateDef['id']) => {
    const newConfigs = { ...perSupplierConfigs };
    selectedSuppliers.forEach((sName) => {
      const supObj = suppliersList.find((s) => s.name === sName);
      if (supObj) {
        const generated = generateDedicatedSupplierEmail({
          supplierName: supObj.name,
          supplierEmail: supObj.email,
          supplierCountry: supObj.country,
          templateId,
          materialName,
          materialSpec,
          quantity,
          unit,
          deliveryPort,
          deadlineDate,
          currency: preferredCurrency,
        });
        newConfigs[sName] = {
          templateId,
          subject: generated.subject,
          body: generated.fullContent,
          isCustomEdited: false,
        };
      }
    });
    setPerSupplierConfigs(newConfigs);
  };

  // 修改当前供应商的主题
  const handleUpdateSubject = (newSubject: string) => {
    setPerSupplierConfigs((prev) => ({
      ...prev,
      [activeEditingSupplierName]: {
        ...(prev[activeEditingSupplierName] || currentSupplierEmailConfig!),
        subject: newSubject,
        isCustomEdited: true,
      },
    }));
  };

  // 修改当前供应商的正文
  const handleUpdateBody = (newBody: string) => {
    setPerSupplierConfigs((prev) => ({
      ...prev,
      [activeEditingSupplierName]: {
        ...(prev[activeEditingSupplierName] || currentSupplierEmailConfig!),
        body: newBody,
        isCustomEdited: true,
      },
    }));
  };

  // 重置当前供应商为模板标准正文
  const handleResetCurrentBodyToTemplate = () => {
    const templateId = currentSupplierEmailConfig?.templateId || 'domestic_export';
    handleSelectTemplate(templateId);
  };

  // 发送询价邮件（向各供应商分别投递独立邮件）
  const handleSendEmails = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSuppliers.length === 0) return;

    setIsSending(true);

    // 组织每家供应商独立邮件结构
    const builtPerSupplierEmails: Record<
      string,
      {
        recipientEmail: string;
        subject: string;
        body: string;
        templateType: string;
      }
    > = {};

    selectedSuppliers.forEach((sName) => {
      const supObj = suppliersList.find((s) => s.name === sName);
      const conf = perSupplierConfigs[sName] || {
        templateId: supObj ? getRecommendedTemplateId(supObj.country) : 'domestic_export',
        subject: `[正式商务询价] 宏远国际工程集团海外 Phoenix 智慧医疗综合体项目关于【${materialName}】设备采购报价邀请函 (致 ${sName})`,
        body: '',
        isCustomEdited: false,
      };

      const finalBody =
        conf.body ||
        generateDedicatedSupplierEmail({
          supplierName: sName,
          supplierEmail: supObj?.email || 'sales@supplier.com',
          supplierCountry: supObj?.country || '中国',
          templateId: conf.templateId,
          materialName,
          materialSpec,
          quantity,
          unit,
          deliveryPort,
          deadlineDate,
          currency: preferredCurrency,
        }).fullContent;

      builtPerSupplierEmails[sName] = {
        recipientEmail: supObj?.email || 'sales@supplier.com',
        subject: conf.subject,
        body: finalBody,
        templateType: conf.templateId,
      };
    });

    // 针对选中的供应商模拟各家回复明细（单价、货币、原产地、供货周期、附件文档）
    const simulatedReplies: SupplierReplyDetail[] = selectedSuppliers.map((sName, idx) => {
      const supObj = suppliersList.find((s) => s.name === sName);
      const country = supObj?.country || '中国';
      const isEur = country.includes('法国') || country.includes('欧洲') || country.includes('瑞士');
      const isDzd = country.includes('阿尔及利亚');

      let quotedPrice = 56000;
      let curr: CurrencyType = 'CNY';
      let origin = '中国制造 (加征30%关税)';
      let leadTime = '出厂备货 30 天，海运集装箱 35 天';

      if (isEur) {
        quotedPrice = 8900;
        curr = 'EUR';
        origin = '法国原产 (持 EUR.1 证书免征关税)';
        leadTime = '出厂 4 周，马赛港直发阿尔及尔港 10 天';
      } else if (isDzd) {
        quotedPrice = 1250000;
        curr = 'DZD';
        origin = '阿尔及利亚本土成套厂 (本地结算免关税)';
        leadTime = '保税库现货，现场发运仅需 7-10 天';
      } else {
        quotedPrice = 52000 - idx * 1500;
        curr = 'CNY';
        origin = '中国扬州/温州基地 (国内直发)';
        leadTime = '出厂备货 25 天，国际海运 35 天';
      }

      return {
        supplierName: sName,
        supplierEmail: supObj?.email || 'sales@supplier.com',
        quotedPrice,
        currency: curr,
        replyAttachmentName: `Offre_${sName.slice(0, 6)}_${materialName.slice(0, 8)}.pdf`,
        origin,
        leadTime,
        parsedAt: new Date().toLocaleTimeString('zh-CN'),
        quoteDetails: `AI 附件解析完毕：单价已提取，原产地证明与出厂检验合格证齐全。`,
        paymentTerms: isEur ? '信用证 L/C 60天' : isDzd ? '现款提货/本地本票' : 'T/T 电汇 (30%预付+70%见提单)',
        validityDays: 60,
        isRecommended: idx === 0,
      };
    });

    setTimeout(() => {
      setIsSending(false);
      const newRecord: RfqInquiryRecord = {
        id: `RFQ-${Date.now().toString().slice(-4)}`,
        inquiryNo: `RFQ-HYI-${Date.now().toString().slice(-4)}`,
        materialName,
        materialSpec,
        quantityNeeded: quantity,
        unit,
        sendDate: new Date().toLocaleDateString('zh-CN'),
        status: 'replied',
        targetSuppliers: selectedSuppliers,
        targetSupplierEmails: selectedSuppliers.map((name) => {
          const s = suppliersList.find((item) => item.name === name);
          return s ? s.email : name;
        }),
        emailSubject: `[正式商务询价/Demande de Cotation] 宏远国际工程集团海外 Phoenix 智慧医疗综合体项目关于【${materialName}】设备采购报价邀请函`,
        emailBody: builtPerSupplierEmails[selectedSuppliers[0]]?.body || '',
        perSupplierEmails: builtPerSupplierEmails,
        imageUrl,
        deliveryPort,
        targetCurrency: preferredCurrency,
        linkedBoqItemId: prefillItem?.boqItemId,
        replySummary: {
          supplierName: simulatedReplies[0].supplierName,
          quotedPrice: simulatedReplies[0].quotedPrice,
          currency: simulatedReplies[0].currency,
          replyAttachmentName: simulatedReplies[0].replyAttachmentName,
          origin: simulatedReplies[0].origin,
          leadTime: simulatedReplies[0].leadTime,
          parsedAt: simulatedReplies[0].parsedAt,
          quoteDetails: simulatedReplies[0].quoteDetails,
        },
        supplierReplies: simulatedReplies,
        isAdoptedToHistoryDb: false,
      };

      setSentRecord(newRecord);
      onSendRfq(newRecord);
      setActiveReplySupplierName(simulatedReplies[0].supplierName);
      setStep('sent_and_reply');

      // 自动初始化第一份 AI 回复草稿
      generateReplyDraftForSupplier(simulatedReplies[0], 'award');
    }, 1200);
  };

  // 为特定供应商生成指定类型的回复函草稿
  const generateReplyDraftForSupplier = (
    replyDetail: SupplierReplyDetail,
    replyType: 'award' | 'negotiate' | 'clarify'
  ) => {
    setSelectedReplyType(replyType);
    setHasSentReplyFeedback(false);
    const option = REPLY_OPTIONS.find((o) => o.type === replyType) || REPLY_OPTIONS[0];
    const subject = option.generateSubject(materialName, replyDetail.supplierName);
    const body = option.generateBody({
      materialName,
      supplierName: replyDetail.supplierName,
      quotedPrice: replyDetail.quotedPrice,
      currency: replyDetail.currency,
      unit,
      quantity,
      leadTime: replyDetail.leadTime,
    });
    setReplyDraftSubject(subject);
    setReplyDraftBody(body);
  };

  // 发送回复函操作
  const handleSendReplyEmail = () => {
    setHasSentReplyFeedback(true);
    // 更新当前供应商的回复函状态
    if (sentRecord && sentRecord.supplierReplies) {
      const updatedReplies = sentRecord.supplierReplies.map((r) => {
        if (r.supplierName === activeReplySupplierName) {
          return {
            ...r,
            generatedResponse: {
              type: selectedReplyType,
              subject: replyDraftSubject,
              body: replyDraftBody,
              status: 'sent' as const,
              sentAt: new Date().toLocaleTimeString('zh-CN'),
            },
          };
        }
        return r;
      });
      setSentRecord({
        ...sentRecord,
        supplierReplies: updatedReplies,
      });
    }
  };

  const handleAdoptAndClose = () => {
    if (sentRecord && onAdoptImmediately) {
      onAdoptImmediately(sentRecord);
    }
    onClose();
  };

  // 当前在 Step 2 查看的供应商回复对象
  const currentActiveReply = useMemo(() => {
    if (!sentRecord?.supplierReplies || sentRecord.supplierReplies.length === 0) {
      return null;
    }
    return (
      sentRecord.supplierReplies.find((r) => r.supplierName === activeReplySupplierName) ||
      sentRecord.supplierReplies[0]
    );
  }, [sentRecord, activeReplySupplierName]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] my-auto">
        {/* 顶部标题栏 */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-blue-700 text-white shadow-xs">
              <Mail className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">
                  {step === 'compose'
                    ? '供应商正式商务询价函编制与背对背发信工作台'
                    : '询价函发送成功 · 供应商报价比对与回函工作台'}
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800">
                  阿尔及利亚 Phoenix 智慧医疗综合体项目 (Projet Phoenix)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {step === 'compose'
                  ? '支持单商单函专属编制 · 多样化采购模板 · 随信附带工程实物与技术图样'
                  : '供应商附件智能解析 · 一键生成多类型商务回复函 · 造价工程师人工审核采纳入库'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容展示区 */}
        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-5">
          {step === 'compose' ? (
            <form onSubmit={handleSendEmails} className="space-y-5">
              {/* 1. 供应商选择与收件企业邮箱设置 */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-150 pb-2.5">
                  <div>
                    <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <Building2 className="w-3.5 h-3.5 text-blue-700" />
                      <span>选择收件供应商企业邮箱 (支持多家背对背同时询价)</span>
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      系统将为每家选中的供应商生成并投递独立的正式商务函件，绝不合并抄送，确保商业保密。
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSupplierAddMode(supplierAddMode === 'manual' ? 'none' : 'manual')
                      }
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                        supplierAddMode === 'manual'
                          ? 'bg-blue-50 border-blue-300 text-blue-700'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <UserPlus className="w-3 h-3 text-blue-600" />
                      <span>手动新增在库供应商</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setSupplierAddMode(supplierAddMode === 'web' ? 'none' : 'web')
                      }
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                        supplierAddMode === 'web'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Globe className="w-3 h-3 text-emerald-600" />
                      <span>网络智能搜索与匹配</span>
                    </button>
                  </div>
                </div>

                {/* 子面板 1: 手动新增供应商 */}
                {supplierAddMode === 'manual' && (
                  <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-blue-900 flex items-center gap-1 text-[11px]">
                        <UserPlus className="w-3 h-3 text-blue-700" />
                        <span>手动录入在库合作供应商</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setSupplierAddMode('none')}
                        className="text-slate-400 hover:text-slate-600 text-[11px] cursor-pointer"
                      >
                        收起
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-slate-600 block mb-0.5">供应商企业全称 *</label>
                        <input
                          type="text"
                          placeholder="例如: 中国电建海外装备分公司 / 特变电工"
                          value={manualName}
                          onChange={(e) => setManualName(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-600 block mb-0.5">企业接收邮箱 *</label>
                        <input
                          type="email"
                          placeholder="sales@tbea.com"
                          value={manualEmail}
                          onChange={(e) => setManualEmail(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-600 block mb-0.5">所属国家/地区</label>
                        <select
                          value={manualCountry}
                          onChange={(e) => setManualCountry(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-800"
                        >
                          <option value="中国">中国 (国内直发)</option>
                          <option value="法国">法国 (欧盟免关税)</option>
                          <option value="阿尔及利亚">阿尔及利亚 (本地现货)</option>
                          <option value="德国">德国 (欧盟免关税)</option>
                          <option value="瑞士">瑞士 (欧洲直发)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-500">
                        录入后将自动写入本地在库供应商名单，并加入本次询价勾选列表。
                      </span>
                      <button
                        type="button"
                        onClick={handleAddManualSupplier}
                        disabled={!manualName.trim() || !manualEmail.trim()}
                        className="px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded font-medium text-[11px] disabled:opacity-40 cursor-pointer shadow-xs"
                      >
                        保存并添加到收件人
                      </button>
                    </div>
                  </div>
                )}

                {/* 子面板 2: 网络搜索候选供应商知识库 */}
                {supplierAddMode === 'web' && (
                  <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-emerald-700" />
                        <span className="font-semibold text-emerald-950 text-[11px]">
                          全球国际工程合规供应商智能检索推荐
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSupplierAddMode('none')}
                        className="text-slate-400 hover:text-slate-600 text-[11px] cursor-pointer"
                      >
                        收起
                      </button>
                    </div>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="搜索全球供应商名称、物资类别、标准（如 ABB, 配电柜, 电缆, 法国, 阿尔及利亚等）"
                        value={webSearchQuery}
                        onChange={(e) => setWebSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded text-slate-900"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto">
                      {filteredWebSuppliers.map((ws, idx) => {
                        const isAdded = suppliersList.some((s) => s.name === ws.name);
                        const isSelected = selectedSuppliers.includes(ws.name);
                        return (
                          <div
                            key={idx}
                            className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1 hover:border-emerald-300 transition-colors flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-slate-900 truncate">{ws.name}</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 shrink-0">
                                  {ws.country}
                                </span>
                              </div>
                              <span className="font-mono text-[10px] text-blue-700 block truncate">
                                ✉ {ws.email}
                              </span>
                              <p className="text-[10px] text-emerald-800 line-clamp-1 mt-0.5">
                                认证: {ws.certifications}
                              </p>
                              <p className="text-[10px] text-slate-500 line-clamp-1">
                                优势: {ws.advantage}
                              </p>
                            </div>

                            <div className="pt-1.5 flex items-center justify-between border-t border-slate-100 mt-1">
                              <span className="text-[9px] text-emerald-700 font-medium">
                                {ws.tariffStatus}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAdoptWebSupplier(ws)}
                                className={`px-2 py-0.5 text-[10px] rounded font-medium transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-100 text-emerald-800 font-semibold'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                }`}
                              >
                                {isSelected ? '✓ 已加入收件' : '+ 采纳并加入'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 供应商多选卡片流 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {suppliersList.map((s) => {
                    const isChecked = selectedSuppliers.includes(s.name);
                    const isCurrentlyEditing = activeEditingSupplierName === s.name;
                    return (
                      <div
                        key={s.name}
                        onClick={() => toggleSupplier(s.name)}
                        className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isChecked
                            ? 'bg-blue-50/70 border-blue-300 text-blue-950 font-medium'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded text-blue-700 pointer-events-none"
                          />
                          <div className="truncate">
                            <span className="block truncate text-xs">{s.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono block truncate">
                              {s.email}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {s.tag && (
                            <span className="text-[9px] bg-blue-100 text-blue-800 px-1 py-0.2 rounded">
                              {s.tag}
                            </span>
                          )}
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded">
                            {s.country}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>
                    已选择 <strong className="text-blue-800 font-mono">{selectedSuppliers.length}</strong> 家供应商
                  </span>
                  <span>下方将为每一家生成专属的正式商务询价函</span>
                </div>
              </div>

              {/* 2. 单商单信专属邮件编辑与模板选择区 */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-150 pb-2.5">
                  <div>
                    <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <Edit3 className="w-3.5 h-3.5 text-blue-700" />
                      <span>单商单信专属邮件内容编制与模板设置</span>
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      点击供应商标签切换对应函件，支持针对不同国别选用差异化商务模板，并可自由修改正文与落款。
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetCurrentBodyToTemplate}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3 text-slate-500" />
                      <span>恢复当前模板标准正文</span>
                    </button>
                  </div>
                </div>

                {/* 供应商选项卡 Tabs (单商单信切换) */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100">
                  {selectedSuppliers.map((sName) => {
                    const sup = suppliersList.find((s) => s.name === sName);
                    const isActive = activeEditingSupplierName === sName;
                    const conf = perSupplierConfigs[sName];
                    const templateName =
                      EMAIL_TEMPLATES.find((t) => t.id === conf?.templateId)?.badge || '标准函件';

                    return (
                      <button
                        key={sName}
                        type="button"
                        onClick={() => setActiveEditingSupplierName(sName)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                          isActive
                            ? 'bg-blue-700 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <Building2 className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                        <span>{sName}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-normal ${
                            isActive ? 'bg-blue-800 text-blue-100' : 'bg-white text-slate-600'
                          }`}
                        >
                          {templateName}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* 模板选择工具栏 */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 text-[11px]">当前邮件模板：</span>
                      <div className="flex items-center gap-1 flex-wrap">
                        {EMAIL_TEMPLATES.map((tmpl) => {
                          const isCurrent =
                            (currentSupplierEmailConfig?.templateId || 'domestic_export') === tmpl.id;
                          return (
                            <button
                              key={tmpl.id}
                              type="button"
                              onClick={() => handleSelectTemplate(tmpl.id)}
                              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                                isCurrent
                                  ? 'bg-blue-700 text-white shadow-2xs font-semibold'
                                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {tmpl.name.split(' ')[0]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleApplyTemplateToAll(
                          currentSupplierEmailConfig?.templateId || 'domestic_export'
                        )
                      }
                      className="text-[11px] text-blue-700 hover:text-blue-900 font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>一键应用当前模板至所有选中的供应商</span>
                    </button>
                  </div>

                  <p className="text-[10px] text-slate-500">
                    {
                      EMAIL_TEMPLATES.find(
                        (t) => t.id === (currentSupplierEmailConfig?.templateId || 'domestic_export')
                      )?.description
                    }
                  </p>
                </div>

                {/* 邮件信头参数 (发件人、收件人、主题) */}
                <div className="space-y-2 bg-slate-50/50 p-3 rounded-lg border border-slate-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block mb-0.5">发件方 (项目官方采购邮箱)：</span>
                      <span className="font-mono text-slate-800 bg-white px-2 py-1 rounded border border-slate-200 block truncate">
                        procurement.dz@cscec2.com.cn (宏远国际工程集团有限公司 海外工程采购中心)
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block mb-0.5">收件人 (本函专属发送目标)：</span>
                      <span className="font-mono text-blue-800 bg-blue-50 px-2 py-1 rounded border border-blue-200 block truncate font-semibold">
                        {activeEditingSupplier.email} ({activeEditingSupplier.name})
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-600 block mb-0.5 font-medium">
                      邮件主题 (单商专属标题，支持编辑) *
                    </label>
                    <input
                      type="text"
                      value={currentSupplierEmailConfig?.subject || ''}
                      onChange={(e) => handleUpdateSubject(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 font-semibold"
                    />
                  </div>
                </div>

                {/* 邮件正文编辑区 */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-slate-700 font-semibold flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>邮件正文完整内容 (包含开头称谓、技术清单要求、结尾敬语与官方落款，支持实时修改)</span>
                    </label>
                    {currentSupplierEmailConfig?.isCustomEdited && (
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                        已手动编辑个性化条款
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={12}
                    value={currentSupplierEmailConfig?.body || ''}
                    onChange={(e) => handleUpdateBody(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50/30 border border-slate-300 rounded-lg text-slate-800 font-sans leading-relaxed focus:bg-white focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* 3. 询价物资技术规格与工程实物图样 */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-150 pb-2">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5 text-xs">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>物资标准实物图样与技术附图 (Technical Drawings & Sample Photos)</span>
                  </span>
                  <span className="text-[11px] text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200 font-medium">
                    随信附带工程实物样照与接口图样附件
                  </span>
                </div>

                <div className="flex gap-4 items-start">
                  {/* 材料配图字段：支持用户上传 */}
                  <div className="w-28 shrink-0">
                    <span className="text-slate-500 block mb-1">随信发送附图:</span>
                    <label
                      className="w-28 h-28 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 relative group cursor-pointer block"
                      title="点击上传技术规格实物图样"
                    >
                      <img
                        src={imageUrl}
                        alt={materialName}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-slate-900/60 text-white text-[9px] py-0.5 text-center">
                        技术规格图样
                      </div>
                      <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/60 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 text-white text-[10px] font-semibold gap-1">
                        <Upload className="w-3.5 h-3.5" />
                        <span>更换图样</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const result = ev.target?.result;
                            if (typeof result === 'string') setImageUrl(result);
                          };
                          reader.readAsDataURL(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                      点击替换 · 支持 JPG/PNG
                    </p>
                  </div>

                  {/* 详细参数 */}
                  <div className="flex-1 space-y-2">
                    <div>
                      <label className="text-slate-600 block mb-0.5 font-medium">物资标准名称 *</label>
                      <input
                        type="text"
                        required
                        value={materialName}
                        onChange={(e) => setMaterialName(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-semibold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="text-slate-600 block mb-0.5 font-medium">技术规格与材质标准</label>
                      <textarea
                        rows={2}
                        value={materialSpec}
                        onChange={(e) => setMaterialSpec(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-700"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-slate-600 block mb-0.5 font-medium">需求数量</label>
                        <input
                          type="number"
                          value={quantity}
                          onChange={(e) => setQuantity(Number(e.target.value) || 0)}
                          className="w-full px-2 py-1 border rounded font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-slate-600 block mb-0.5 font-medium">单位</label>
                        <input
                          type="text"
                          value={unit}
                          onChange={(e) => setUnit(e.target.value)}
                          className="w-full px-2 py-1 border rounded"
                        />
                      </div>
                      <div>
                        <label className="text-slate-600 block mb-0.5 font-medium">建议报价币种</label>
                        <select
                          value={preferredCurrency}
                          onChange={(e) => setPreferredCurrency(e.target.value as any)}
                          className="w-full px-2 py-1 border rounded font-semibold"
                        >
                          <option value="EUR">EUR (免关税)</option>
                          <option value="CNY">CNY (需核算国内加征30%关税)</option>
                          <option value="USD">USD (国际外汇)</option>
                          <option value="DZD">DZD (阿尔及利亚当地第纳尔)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">目的港口条款:</span>
                    <span className="font-semibold text-slate-800">{deliveryPort}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">要求回复截止时间:</span>
                    <span className="font-semibold text-slate-800 font-mono">{deadlineDate}</span>
                  </div>
                </div>

                {/* 随信附带文件 */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                    <span>系统自动挂载附件清单：</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-[10px]">
                      📎 Phoenix智慧医疗综合体强电技术规格要求_Spécifications.pdf
                    </span>
                    <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-[10px]">
                      📎 物资技术构造与实物图样_Drawings.jpg
                    </span>
                  </div>
                </div>
              </div>

              {/* 底部按钮 */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer font-medium"
                >
                  取消
                </button>

                <button
                  type="submit"
                  disabled={isSending}
                  className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 ${isSending ? 'animate-bounce' : ''}`} />
                  <span>
                    {isSending
                      ? '正在向各供应商独立邮箱投递专属商务函件...'
                      : `向选中的 ${selectedSuppliers.length} 家供应商独立发送商务询价邮件`}
                  </span>
                </button>
              </div>
            </form>
          ) : (
            /* STEP 2: 邮件发送成功并展示供应商回复与解析 */
            <div className="space-y-5">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-bold text-emerald-950 text-sm">
                    询价邮件已成功发出，并已接收到供应商最新报价回复！
                  </h4>
                  <p className="text-emerald-800 text-xs mt-0.5">
                    询价单编号：<span className="font-mono font-semibold">{sentRecord?.inquiryNo}</span> · 已分别向 {selectedSuppliers.length} 家供应商企业邮箱发送独立商务函件并接收到回复报价。
                  </p>
                </div>
              </div>

              {/* 多供应商报价对比与切换 Tabs */}
              {sentRecord?.supplierReplies && sentRecord.supplierReplies.length > 0 && (
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-150 pb-2.5">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>供应商回复报价单解析与比选 (切换查看各家回函)：</span>
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      共接收 {sentRecord.supplierReplies.length} 家报价
                    </span>
                  </div>

                  {/* 供应商切换标签 */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {sentRecord.supplierReplies.map((reply) => {
                      const isActive = activeReplySupplierName === reply.supplierName;
                      return (
                        <button
                          key={reply.supplierName}
                          type="button"
                          onClick={() => {
                            setActiveReplySupplierName(reply.supplierName);
                            generateReplyDraftForSupplier(reply, selectedReplyType);
                          }}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                            isActive
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span>{reply.supplierName}</span>
                          <span className="font-mono text-emerald-700">
                            {reply.quotedPrice.toLocaleString()} {reply.currency}
                          </span>
                          {reply.isRecommended && (
                            <span className="bg-emerald-600 text-white text-[9px] px-1 py-0.2 rounded font-normal">
                              综合推荐
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* 当前选中的供应商回复详情卡片 */}
                  {currentActiveReply && (
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-lg border border-slate-150">
                        <div>
                          <span className="text-slate-500 block text-[10px]">回复供应商:</span>
                          <span className="font-bold text-slate-900 text-xs">
                            {currentActiveReply.supplierName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {currentActiveReply.supplierEmail}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-500 block text-[10px]">回复报价单价:</span>
                          <span className="font-mono font-bold text-emerald-700 text-base">
                            {currentActiveReply.quotedPrice.toLocaleString()}{' '}
                            {currentActiveReply.currency} / {unit}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-500 block text-[10px]">原产地及关税待遇:</span>
                          <span className="text-xs text-slate-800 font-medium">
                            {currentActiveReply.origin}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-500 block text-[10px]">供货周期及付款:</span>
                          <span className="text-xs text-slate-800">
                            {currentActiveReply.leadTime}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] px-1">
                        <span className="text-slate-500">
                          附件文档: <strong className="font-mono text-blue-700">{currentActiveReply.replyAttachmentName}</strong>
                        </span>
                        <span className="text-slate-400 font-mono">
                          解析完成时间: {currentActiveReply.parsedAt}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 核心功能：一键生成邮件回复内容 (AI 商务回复函生成，支持实时编辑) */}
              {currentActiveReply && (
                <div className="p-4 bg-white rounded-xl border border-blue-200 shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-100 pb-2.5">
                    <div>
                      <span className="font-bold text-blue-950 flex items-center gap-1.5 text-xs">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span>根据供应商回复一键生成邮件回复内容 (支持自由编辑修改)</span>
                      </span>
                      <p className="text-[11px] text-blue-800 mt-0.5">
                        针对当前选中的供应商【{currentActiveReply.supplierName}】，智能生成正式商务回信并支持在线调整。
                      </p>
                    </div>

                    {hasSentReplyFeedback && (
                      <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <Check className="w-3.5 h-3.5" /> 已向该供应商发送商务回复函！
                      </span>
                    )}
                  </div>

                  {/* 回复函类型选择 */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {REPLY_OPTIONS.map((opt) => {
                      const isSelected = selectedReplyType === opt.type;
                      return (
                        <div
                          key={opt.type}
                          onClick={() => generateReplyDraftForSupplier(currentActiveReply, opt.type)}
                          className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50/80 border-blue-400 text-blue-950 shadow-2xs'
                              : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-bold text-xs">{opt.title}</span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-blue-100 text-blue-800 font-semibold">
                              {opt.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 line-clamp-2">
                            {opt.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* 回信主题 */}
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-0.5 font-medium">
                      回复邮件主题 (可编辑) *
                    </label>
                    <input
                      type="text"
                      value={replyDraftSubject}
                      onChange={(e) => setReplyDraftSubject(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-semibold text-slate-900 bg-white"
                    />
                  </div>

                  {/* 回信正文编辑区 */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] text-slate-700 font-semibold flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        <span>回复函完整正文 (包含抬头、论述要点、结尾敬语与官方落款，支持逐字编辑)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          generateReplyDraftForSupplier(currentActiveReply, selectedReplyType)
                        }
                        className="text-[11px] text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>重新生成初始模版</span>
                      </button>
                    </div>

                    <textarea
                      rows={8}
                      value={replyDraftBody}
                      onChange={(e) => setReplyDraftBody(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 font-sans leading-relaxed bg-white focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500">
                      收件邮箱：<strong className="font-mono text-blue-800">{currentActiveReply.supplierEmail}</strong>
                    </span>

                    <button
                      type="button"
                      onClick={handleSendReplyEmail}
                      className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer text-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>向 {currentActiveReply.supplierName} 发送回复函</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 核心风控机制提示 */}
              <div className="p-3 bg-blue-50/80 rounded-lg border border-blue-200 text-blue-900 text-xs flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">造价工程师二次确认入库机制：</span>
                  <p className="mt-0.5 text-blue-800 text-[11px]">
                    邮件询价返回的最新价格与商务条件，在造价工程师人工审核采纳后，将自动沉淀写入材料历史库，并实时同步回填至当前项目工程量清单（CFO 量单）对应项中执行综合单价测算。
                  </p>
                </div>
              </div>

              {/* 动作区 */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer text-xs font-medium"
                >
                  暂不采纳，返回查看
                </button>

                <button
                  type="button"
                  onClick={handleAdoptAndClose}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer text-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>造价工程师人工审核确认 · 一键采纳回填并入库</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
