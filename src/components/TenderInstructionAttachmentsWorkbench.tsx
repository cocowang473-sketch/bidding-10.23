import React, { useState, useMemo } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  UserCheck,
  Calendar,
  DollarSign,
  TrendingUp,
  Truck,
  Scale,
  Lock,
  Layers,
  ArrowRight,
  Download,
  Printer,
  Copy,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Users,
  Search,
  Filter,
  Eye,
  Check,
  AlertTriangle,
  Building,
  FileSpreadsheet,
  Clock,
  Sparkles,
  Info,
  ShieldAlert,
  SlidersHorizontal,
  X,
  FileCheck,
  BookmarkCheck,
  UserPlus,
  Trash2,
  RotateCcw,
  GitBranch,
  Network,
  EyeOff,
  Building2,
  ListChecks,
  Unlock,
  Globe2,
} from 'lucide-react';
import {
  AttachmentMeta,
  ATTACHMENTS_METADATA_LIST,
  INITIAL_ATTACHMENT_01,
  INITIAL_ATTACHMENT_02,
  INITIAL_ATTACHMENT_03_NODES,
  INITIAL_ATTACHMENT_04_PERSONNEL,
  INITIAL_ATTACHMENT_05_LABOR,
  INITIAL_ATTACHMENT_06_EQUIPMENT,
  INITIAL_ATTACHMENT_07_WBS,
  INITIAL_ATTACHMENT_08_LEGAL,
  INITIAL_ATTACHMENT_09_CONFIDENTIAL,
  ENTERPRISE_TALENT_POOL,
  PersonnelItem,
  EquipmentItem,
  EquipmentSourceCategory,
  OrgChartNode,
} from '../types/tenderInstructionAttachments';
import { ProposalSection, VariableValues, LanguageMode } from '../types/proposalVariables';
import { INITIAL_PROPOSAL_SECTIONS, INITIAL_VARIABLE_VALUES_FR } from '../data/mockProposalComponents';
import { Attachment05LaborWorkbench } from './Attachment05LaborWorkbench';

interface TenderInstructionAttachmentsWorkbenchProps {
  variableValues: VariableValues;
  onUpdateVariable?: (key: string, value: string) => void;
  langMode?: LanguageMode;
  onNavigateToBoq?: () => void;
  onOpenPreview?: () => void;
  sections?: ProposalSection[];
  onUpdateSections?: (sections: ProposalSection[]) => void;
  onNavigateToTalentHub?: () => void;
}

export const TenderInstructionAttachmentsWorkbench: React.FC<
  TenderInstructionAttachmentsWorkbenchProps
> = ({
  variableValues,
  onUpdateVariable,
  langMode: initialLangMode = 'bilingual',
  onNavigateToBoq,
  onOpenPreview,
  sections = INITIAL_PROPOSAL_SECTIONS,
  onUpdateSections,
  onNavigateToTalentHub,
}) => {
  // 当前选中的附件 ID (att-01 ~ att-09)
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string | null>('att-01');

  // 语言模式 (中文 / 法文 / 双语)
  const [docLangMode, setDocLangMode] = useState<LanguageMode>(initialLangMode);

  // 变量锁定状态映射 (key -> boolean)
  const [lockedVariables, setLockedVariables] = useState<Record<string, boolean>>({
    项目名称: true,
    招标编号: true,
    招标人名称: true,
    投标人法定名称: true,
    法定代表人姓名: true,
    授权委托人姓名: true,
    投标总价: true,
    工程总价大写: true,
  });

  // 当前聚焦高亮的变量
  const [focusedVariableKey, setFocusedVariableKey] = useState<string | null>(null);

  // =========================================================================
  // 附件01：授权委托书状态 & 弹窗询问控制
  // =========================================================================
  const [att01Data, setAtt01Data] = useState(INITIAL_ATTACHMENT_01);
  const [isAtt01ModalOpen, setIsAtt01ModalOpen] = useState(false);
  const [modalPendingStatus, setModalPendingStatus] = useState<'registered' | 'unregistered' | 'pending_verify'>(
    att01Data.filingStatus
  );

  // 附件02：现场考察承诺确认状态
  const [att02Data, setAtt02Data] = useState(INITIAL_ATTACHMENT_02);

  // =========================================================================
  // 附件04：人员清单与人才库联动控制
  // =========================================================================
  const [personnelList, setPersonnelList] = useState<PersonnelItem[]>(INITIAL_ATTACHMENT_04_PERSONNEL);
  const [isTalentPoolModalOpen, setIsTalentPoolModalOpen] = useState(false);
  const [selectedTalentIds, setSelectedTalentIds] = useState<string[]>(
    INITIAL_ATTACHMENT_04_PERSONNEL.map((p) => p.id)
  );
  const [talentSearchKeyword, setTalentSearchKeyword] = useState('');
  const [talentFilterExp, setTalentFilterExp] = useState<'all' | 'hospital' | 'algeria' | 'subcontract' | 'procurement'>('all');
  const [experienceFilter, setExperienceFilter] = useState<'all' | 'hospital' | 'algeria' | 'subcontract' | 'procurement'>('all');

  // 附件04：官方模板字段表格 vs 后台扩展结构化核验模式
  const [personnelViewMode, setPersonnelViewMode] = useState<'template_table' | 'structured_audit'>('template_table');
  // 项目经理详细履历及业绩附件模态窗状态
  const [isPmCvModalOpen, setIsPmCvModalOpen] = useState(false);
  // 项目负责人是否已最终确认人员名单与无时间冲突
  const [isPersonnelConfirmedByDirector, setIsPersonnelConfirmedByDirector] = useState(false);
  // 智能推荐反馈提示
  const [recommendationToast, setRecommendationToast] = useState<string | null>(null);
  // 查看单个人员结构化档案详情
  const [inspectingPerson, setInspectingPerson] = useState<PersonnelItem | null>(null);

  // 附件05：劳动力计划
  const [laborData, setLaborData] = useState(INITIAL_ATTACHMENT_05_LABOR);

  // 附件06：施工设备
  const [equipmentList, setEquipmentList] = useState(INITIAL_ATTACHMENT_06_EQUIPMENT);
  const [equipSourceFilter, setEquipSourceFilter] = useState<EquipmentSourceCategory | 'all'>('all');

  // =========================================================================
  // 附件07：进度计划 WBS 与平台落地实施流程串联视窗
  // =========================================================================
  const [wbsTasks, setWbsTasks] = useState(INITIAL_ATTACHMENT_07_WBS);
  const [wbsViewTab, setWbsViewTab] = useState<'workflow' | 'table'>('workflow');

  // 附件08：法务协议四项确认
  const [att08Data, setAtt08Data] = useState(INITIAL_ATTACHMENT_08_LEGAL);

  // =========================================================================
  // 附件09：保密与脱敏
  // =========================================================================
  const [att09Data, setAtt09Data] = useState(INITIAL_ATTACHMENT_09_CONFIDENTIAL);
  const [isRfqRedactionModalOpen, setIsRfqRedactionModalOpen] = useState(false);

  // 一致性核验弹窗/抽屉
  const [isConsistencyModalOpen, setIsConsistencyModalOpen] = useState(false);

  // 复制反馈
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(id);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  // 切换选中附件：点击附件01时立即弹出询问核验弹窗！
  const handleSelectAttachment = (id: string) => {
    setSelectedAttachmentId(id);
    if (id === 'att-01') {
      setModalPendingStatus(att01Data.filingStatus);
      setIsAtt01ModalOpen(true);
    }
  };

  // 附件01：从弹窗应用备案选择状态
  const handleConfirmAtt01Status = () => {
    const isReg = modalPendingStatus === 'registered';
    setAtt01Data({
      ...att01Data,
      filingStatus: modalPendingStatus,
      needsSubmission: !isReg,
    });
    setIsAtt01ModalOpen(false);
  };

  // 切换变量锁定状态
  const handleToggleLockVariable = (key: string) => {
    setLockedVariables((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // 更新变量值
  const handleVariableChange = (key: string, val: string) => {
    if (onUpdateVariable) {
      onUpdateVariable(key, val);
    }
  };

  // 附件04：从人才库导入选定人员
  const handleImportTalentSelection = () => {
    const selected = ENTERPRISE_TALENT_POOL.filter((t) => selectedTalentIds.includes(t.id));
    setPersonnelList(selected);
    setIsTalentPoolModalOpen(false);
  };

  // 附件04：一键匹配全部推荐班底
  const handleQuickImportRecommended = () => {
    setPersonnelList([...ENTERPRISE_TALENT_POOL]);
    setSelectedTalentIds(ENTERPRISE_TALENT_POOL.map((p) => p.id));
    setIsTalentPoolModalOpen(false);
  };

  // 附件04：根据《投标须知》规则智能推荐拟派班底并进行关键核查
  const handleApplyTenderNoticeRules = () => {
    // 规则 1: 项目经理优先匹配同等或更大体量医院项目经验（张建国：具备阿尔及利亚塞提夫300床综合医院经验，同等体量达标）；
    // 规则 2: 管理人员优先具备阿尔及利亚工作经验（李维远、王志强、陈大山等常驻北非）；
    // 规则 3: 现场管理人员优先具备属地化分包管理经验；
    // 规则 4: 采购管理人员重点核查境外采购经验；
    // 规则 5: 关键管理人员标注“是否需要面试”（项目经理、机电总工、商务负责人等）；
    // 规则 6: 项目经理自动生成详细工作经历和业绩附件；
    const recommended = ENTERPRISE_TALENT_POOL.map((p) => {
      const isKey = p.role.includes('项目经理') || p.role.includes('技术负责人') || p.role.includes('总工程师') || p.role.includes('商务经理') || p.role.includes('HSE');
      return {
        ...p,
        interviewRequired: isKey,
        interviewConfirmed: true,
        actualAvailabilityConfirmed: false,
      };
    });
    setPersonnelList(recommended);
    setSelectedTalentIds(recommended.map((r) => r.id));
    setIsPersonnelConfirmedByDirector(false);
    setRecommendationToast('已根据《投标须知》6项推荐规则智能匹配拟派人员班底！项目经理已匹配同等医院业绩，关键岗位已标注“需要面试”。请由项目负责人完成最终实际投入与时间冲突确认。');
    setTimeout(() => setRecommendationToast(null), 6000);
  };

  // 附件04：清空当前人员配备（用于测试附件03阻断提醒）
  const handleClearPersonnel = () => {
    setPersonnelList([]);
    setSelectedTalentIds([]);
  };

  // 附件04：单项移除人员
  const handleRemovePerson = (id: string) => {
    setPersonnelList((prev) => prev.filter((p) => p.id !== id));
    setSelectedTalentIds((prev) => prev.filter((tid) => tid !== id));
  };

  // 附件03 动态组织架构图：严格依赖附件04人员名单
  const dynamicOrgNodes = useMemo<OrgChartNode[]>(() => {
    if (personnelList.length === 0) return [];

    const pm = personnelList.find((p) => p.role.includes('项目经理')) || personnelList[0];
    const techLead = personnelList.find((p) => p.role.includes('技术负责人') || p.role.includes('总工程师'));
    const designLead = personnelList.find((p) => p.role.includes('设计负责人') || p.role.includes('深化'));
    const commLead = personnelList.find((p) => p.role.includes('商务'));
    const constrLead = personnelList.find((p) => p.role.includes('施工') || p.role.includes('现场'));
    const qcLead = personnelList.find((p) => p.role.includes('质量') || p.role.includes('QC'));
    const hseLead = personnelList.find((p) => p.role.includes('HSE') || p.role.includes('环境'));
    const procLead = personnelList.find((p) => p.role.includes('采购') || p.role.includes('物流'));
    const planLead = personnelList.find((p) => p.role.includes('进度') || p.role.includes('计划'));
    const elecEng = personnelList.find((p) => p.role.includes('强电') || p.role.includes('电气'));
    const itEng = personnelList.find((p) => p.role.includes('弱电') || p.role.includes('智能化'));

    const nodes: OrgChartNode[] = [
      {
        id: 'dyn-org-1',
        roleName: pm ? pm.role.split('(')[0].trim() : '常驻项目经理',
        personName: pm ? pm.name : '（未指定）',
        level: 1,
        department: '项目指挥部',
        isVacant: !pm,
        linkedAttachment04PersonId: pm?.id,
      },
    ];

    const leads = [
      { role: '技术负责人 (总工)', person: techLead, dept: '工程技术部' },
      { role: '设计负责人 (深化)', person: designLead, dept: '技术深化部' },
      { role: '商务负责人 (造价)', person: commLead, dept: '商务合约部' },
      { role: '现场施工负责人', person: constrLead, dept: '施工管理部' },
      { role: '质量管理负责人 (QC)', person: qcLead, dept: '质量安全部' },
      { role: 'HSE与环境负责人', person: hseLead, dept: 'HSE管理部' },
      { role: '境外采购负责人', person: procLead, dept: '采购物流部' },
      { role: '计划控制负责人 (P6)', person: planLead, dept: '计划控制部' },
    ];

    leads.forEach((l, idx) => {
      nodes.push({
        id: `dyn-org-lead-${idx}`,
        roleName: l.role,
        personName: l.person ? l.person.name : '（待配备）',
        level: 2,
        department: l.dept,
        isVacant: !l.person,
        linkedAttachment04PersonId: l.person?.id,
      });
    });

    const specialists = [
      { role: '强电变配电专业工程师', person: elecEng, dept: '电气专业组' },
      { role: '弱电智能化与医疗IT专工', person: itEng, dept: '智能化专业组' },
      { role: '属地劳务分包工长班组 (200人)', person: { name: 'Mustapha Benali 等属地工长' }, dept: '现场作业班组' },
    ];

    specialists.forEach((s, idx) => {
      nodes.push({
        id: `dyn-org-spec-${idx}`,
        roleName: s.role,
        personName: s.person ? s.person.name : '（待配备）',
        level: 3,
        department: s.dept,
        isVacant: !s.person,
      });
    });

    return nodes;
  }, [personnelList]);

  // 当前激活的附件元数据
  const currentAttachmentMeta = useMemo(() => {
    return (
      ATTACHMENTS_METADATA_LIST.find((a) => a.id === selectedAttachmentId) ||
      ATTACHMENTS_METADATA_LIST[0]
    );
  }, [selectedAttachmentId]);


  // 人员列表
  const filteredPersonnel = useMemo(() => {
    return personnelList;
  }, [personnelList]);

  // 人才库筛选
  const filteredTalentPool = useMemo(() => {
    return ENTERPRISE_TALENT_POOL.filter((t) => {
      const matchKwd =
        !talentSearchKeyword ||
        t.name.includes(talentSearchKeyword) ||
        t.role.includes(talentSearchKeyword) ||
        t.major.includes(talentSearchKeyword);
      if (!matchKwd) return false;
      if (talentFilterExp === 'hospital') return t.hasHospitalExp;
      if (talentFilterExp === 'algeria') return t.hasAlgeriaExp;
      if (talentFilterExp === 'subcontract') return t.hasLocalSubcontractExp;
      if (talentFilterExp === 'procurement') return t.hasOverseasProcurementExp;
      return true;
    });
  }, [talentSearchKeyword, talentFilterExp]);

  // 设备筛选
  const filteredEquipment = useMemo(() => {
    if (equipSourceFilter === 'all') return equipmentList;
    return equipmentList.filter((e) => e.sourceCategory === equipSourceFilter);
  }, [equipmentList, equipSourceFilter]);

  // =========================================================================
  // 文本公文渲染辅助函数：高亮替换 [变量名]
  // =========================================================================
  const renderDocumentWithVariables = (rawText: string) => {
    const parts = rawText.split(/(\[[^\]]+\])/g);
    return parts.map((part, idx) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        const varKey = part.slice(1, -1).trim();
        const liveVal = variableValues[varKey] || part;
        const isLocked = !!lockedVariables[varKey];
        const isFocused = focusedVariableKey === varKey;

        return (
          <span
            key={idx}
            onClick={() => setFocusedVariableKey(varKey)}
            title={`点击在右侧面板修改预填: ${varKey}`}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-mono text-xs cursor-pointer transition-all mx-0.5 ${
              isFocused
                ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-300'
                : isLocked
                ? 'bg-blue-100 text-blue-900 border border-blue-200 font-semibold'
                : 'bg-blue-50 text-blue-900 border border-blue-200 font-semibold hover:bg-blue-100'
            }`}
          >
            {isLocked && <Lock className="w-2.5 h-2.5 text-blue-700 inline shrink-0" />}
            <span>{liveVal}</span>
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  // 提取文本中的变量列表
  const extractVariablesFromText = (text: string): string[] => {
    const regex = /\[([^\]]+)\]/g;
    const list: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const v = match[1].trim();
      if (!list.includes(v)) {
        list.push(v);
      }
    }
    return list;
  };

  // 附件01：授权委托书正文模板（中法双语）
  const att01TemplateZh = `法定代表人授权委托书 (PROCURATION)

致：[招标人名称]
项目名称：[项目名称]
招标编号：[招标编号]

本授权委托书声明：
[投标人法定名称]（统一社会信用代码：91110000101123456X）之法定代表人 [法定代表人姓名]，现正式代表本公司授权委派本公司 [委托人职务] [授权委托人姓名]（身份证号：[委托人身份证号]）为本公司的合法全权投标代理人。

该代理人有权以本公司名义处理上述 [项目名称] 投标报名、签署并提交投标文件、澄清答疑、进行商务谈判、签署合同以及执行与本项目投标相关之一切事务。
本公司对被授权代理人在其授权权限范围内所签署之一切文件及处理之一切合法事项，均予以承认并承担全部法律责任。

★ 法定强制限制声明：本代理人无转委托权。
授权有效期：自签署之日起 [投标有效期] 日历天。

投标人全称（加盖公章）：[投标人法定名称]
法定代表人（签字并盖章）：[法定代表人姓名]
被授权代理人（亲笔签字）：[授权委托人姓名]
签署日期：[签署日期]`;

  const att01TemplateFr = `PROCURATION / DÉLÉGATION DE POUVOIR

À l'attention de : [招标人名称]
Projet : [项目名称]
Avis d'Appel d'Offres N° : [招标编号]

Je soussigné, [法定代表人姓名], agissant en qualité de Représentant Légal de la société [投标人法定名称], donne par la présente plein pouvoir et procuration à Monsieur [授权委托人姓名] (Fonction : [委托人职务], Pièce d'identité N° : [委托人身份证号]) afin de nous représenter pour toutes les démarches relatives à l'appel d'offres susmentionné.

Le mandataire est habilité à signer l'offre, négocier et conclure les actes contractuels afférents.
Clause de non-subdélégation : Le mandataire ne dispose d'aucun droit de subdélégation.
Validité de la procuration : [投标有效期] jours calendaires.

Cachet et signature de l'entreprise : [投标人法定名称]
Le Représentant Légal : [法定代表人姓名]
Le Mandataire : [授权委托人姓名]
Date : [签署日期]`;

  // 附件02：投标承诺函正文模板
  const att02TemplateZh = `投标承诺函 (LETTRE DE SOUMISSION)

致：[招标人名称]
项目名称：[项目名称]
分项工程：[工程名称]

我方（[投标人法定名称]）经认真研读 [项目名称]（招标编号：[招标编号]）之招标文件、技术规格书及工程量清单（BQE），愿以总造价：
投标总报价（小写）：[投标总价]
投标总报价（大写）：[工程总价大写]
币种：阿尔及利亚第纳尔（DA / DZD）
承担本项目全部机电采购、运输、安装、调试与质量保修工作。

我方在此确认以下履约承诺：
1. 质量规范：全面满足法国 NF C 15-100 标准及招标文件技术要求；
2. 承诺有效期：本承诺书自投标截止日起 [投标有效期] 天内保持约束力；
3. 施工工期：总工期 [工期日历天] 天，保证按期竣工交付；
4. 现场踏勘：我方已全面掌握现场施工环境与地质气候条件；
5. 本承诺函一经签署，即构成合同不可分割之组成部分。

投标人全称（公章）：[投标人法定名称]
全权签署代表（签字）：[授权委托人姓名]
签署日期：[签署日期]`;

  // 附件08：劳务协议书正文模板
  const att08TemplateZh = `劳务协议书 (PROTOCOLE D'ACCORD DE MAIN-D'ŒUVRE)

甲方（用工总包方）：[甲方名称]
乙方（劳务分包方）：[乙方名称]
统一社会信用代码：[统一社会信用代码]
法定代表人：[法定代表人]
授权签约代表：[授权代理人]

经甲乙双方充分协商，就阿尔及利亚现场施工劳务分包事项达成协议：
第一条 劳务指标归属：中方 66 名核心技工指标严格使用甲方在阿国劳工部核准的外籍配额，所有派驻人员仅限用于本项目，严禁外派至非甲方单位。
第二条 薪酬发放与代付扣款：乙方必须足额发放工人工资。如发生拖欠或工伤未赔付，甲方在履行 15 个工作日抗辩期后，有权自进度款中直接代付扣款。
第三条 赔偿责任边界：双方赔偿责任严格以直接经济损失为限，排除第三方间接损失。

甲方（公章）：[甲方名称]      乙方（公章）：[乙方名称]
授权代表（签字）：[法定代表人]  授权代表（签字）：[授权代理人]
签署日期：[签署日期]`;

  // 附件09：保密承诺书正文模板
  const att09TemplateZh = `保密承诺书 (ENGAGEMENT DE CONFIDENTIALITÉ)

致：[招标人名称]
项目名称：[项目名称]
工程名称：[工程名称]
投标人名称：[投标人名称]
法定代表人：[法定代表人]
全权签署人：[全权签署人]
签署日期：[签署日期]

我方作为上述工程的正式投标人，在此郑重向招标方出具不可撤销之保密承诺：
一、专属用途：招标及履约资料仅用于本项目，未经书面授权严禁用于任何其他商业目的；
二、严禁披露：未经书面正式授权，不得以任何直接或间接形式向第三方披露本项目信息；
三、全员连带：投标实体所有参与本工程的管理人员、技术专家及员工均承担法定连带保密义务；
四、全程有效：无论本项目最终是否中标，在工程竣工验收并移交前均持续承担保密责任；
五、★ 核心供应商防泄密条款：严禁向任何材料设备供应商泄露本工程官方背景、业主名称与图纸信息；
六、合同组成：本保密承诺书属于投标文件及后续施工承包合同不可分割之组成部分；
七、追偿责任：如因泄密导致招标方利益受损，我方承担全部直接经济损失与法律赔偿责任。

承诺人全称（公章）：[投标人名称]
法定代表人（签字）：[法定代表人]
全权签署人（签字）：[全权签署人]
签署日期：[签署日期]`;

  // 获取当前正在编辑的文档正文与变量列表
  const currentDocumentText = useMemo(() => {
    if (selectedAttachmentId === 'att-01') {
      return docLangMode === 'fr' ? att01TemplateFr : att01TemplateZh;
    }
    if (selectedAttachmentId === 'att-02') {
      return att02TemplateZh;
    }
    if (selectedAttachmentId === 'att-08') {
      return att08TemplateZh;
    }
    if (selectedAttachmentId === 'att-09') {
      return att09TemplateZh;
    }
    return '';
  }, [selectedAttachmentId, docLangMode]);

  const currentDocumentVariables = useMemo(() => {
    return extractVariablesFromText(currentDocumentText);
  }, [currentDocumentText]);

  // 判断当前页面是否属于“文档正文 + 变量就地预填”布局
  const isDocumentAndVariablesMode = useMemo(() => {
    if (selectedAttachmentId === 'att-01') return att01Data.filingStatus !== 'registered';
    if (selectedAttachmentId === 'att-02') return true;
    if (selectedAttachmentId === 'att-08') return true;
    if (selectedAttachmentId === 'att-09') return true;
    return false;
  }, [selectedAttachmentId, att01Data.filingStatus]);

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-800 rounded-xl border border-blue-200 shadow-2xs overflow-hidden">
      {/* ========================================================================= */}
      {/* 1. 顶栏：投标须知附件与标书文档装配工作台 (专业蓝色单色调，去五颜六色，去黑色) */}
      {/* ========================================================================= */}
      <div className="bg-white border-b border-blue-200 px-5 py-3 shadow-2xs shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <BookmarkCheck className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-blue-950 tracking-tight">
                  《2.1 投标须知》附件编制与标书文档装配工作台
                </h2>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* 截标倒计时提醒 */}
            <div className="px-3 py-1.5 rounded-lg bg-blue-50/60 border border-blue-200 text-blue-900 text-xs font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>截标送达：</span>
              <strong className="font-mono text-blue-950 font-bold">2025年3月23日 17:30</strong>
            </div>

            {onOpenPreview && (
              <button
                type="button"
                onClick={onOpenPreview}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>排版预览与PDF打印</span>
              </button>
            )}

            {onNavigateToBoq && (
              <button
                type="button"
                onClick={onNavigateToBoq}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                title="进入下一步：清单智能组价台"
              >
                <span>进入组价台</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. 核心工作区：左侧集成清单 (附件01~09 + 标书核心章节) + 右侧工作看板 */}
      {/* ========================================================================= */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* 左侧：法定附件 01—09 与 标书核心章节清单导航 (以浅蓝灰底色区分板块) */}
        <div className="w-72 lg:w-80 shrink-0 bg-blue-50/20 border-r border-blue-200 flex flex-col min-h-0">
          <div className="p-3 border-b border-blue-200 bg-blue-50/60 flex items-center justify-between shrink-0">
            <span className="text-xs font-bold text-blue-950 tracking-tight flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-700" />
              <span>编制文档与附件清单</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 font-bold">
              共 9 个法定附件
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 min-h-0">
            {ATTACHMENTS_METADATA_LIST.map((att) => {
              const isSelected = selectedAttachmentId === att.id;
              const isAtt01Exempted = att.id === 'att-01' && att01Data.filingStatus === 'registered';
              const isAtt01Pending = att.id === 'att-01' && att01Data.filingStatus === 'pending_verify';
              const isAtt03Blocked = att.id === 'att-03' && personnelList.length === 0;

              return (
                <div
                  key={att.id}
                  onClick={() => {
                    handleSelectAttachment(att.id);
                    if (att.id === 'att-01') {
                      setModalPendingStatus(att01Data.filingStatus);
                      setIsAtt01ModalOpen(true);
                    }
                  }}
                  className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50 border-blue-500 font-bold text-blue-950 shadow-2xs ring-1 ring-blue-300'
                      : 'bg-white border-blue-100 hover:bg-blue-50/60 hover:border-blue-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                      <span className="font-mono text-blue-700">{att.code}</span>
                      <span>{att.name.replace(/^附件\d+\s*/, '')}</span>
                    </span>

                    {isAtt01Exempted ? (
                      <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-1.5 py-0.2 rounded border border-blue-200">
                        已备案·免交
                      </span>
                    ) : isAtt01Pending ? (
                      <span className="text-[10px] font-bold text-sky-800 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-300">
                        待核实
                      </span>
                    ) : isAtt03Blocked ? (
                      <span className="text-[10px] font-bold text-blue-900 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-300">
                        需先配人
                      </span>
                    ) : null}
                  </div>

                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                    {att.summary}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 右侧：工作主面板 */}
        <div className="flex-1 bg-slate-50/60 flex flex-col min-h-0 overflow-y-auto p-4 lg:p-5">
          {/* ========================================================================= */}
          {/* 附件01：备案核验状态条与流程入口 (无论任何状态均在顶部清晰展现) */}
          {/* ========================================================================= */}
          {selectedAttachmentId === 'att-01' && (
            <div className="mb-4 bg-white rounded-xl border border-blue-200 p-4 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      附件01
                    </span>
                    <h3 className="text-sm font-bold text-blue-950 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-blue-700" />
                      <span>法定代表人身份证明及授权委托书</span>
                    </h3>
                  </div>
                  <p className="text-xs text-blue-800/80 mt-1">
                    根据《投标须知》规定：仅未在招标方办理授权备案的投标人须提交纸质盖章文件；已办理备案者，系统自动免予提交纸质正文并归档备查凭证。
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setModalPendingStatus(att01Data.filingStatus);
                    setIsAtt01ModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>核验备案状态 / 切换流程</span>
                </button>
              </div>

              {/* 备案核验具体状态徽标 */}
              <div className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-200 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">当前备案状态：</span>
                  {att01Data.filingStatus === 'registered' ? (
                    <span className="font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded border border-blue-300 font-mono flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />
                      <span>已在招标方办理备案 (免予提交纸质正文)</span>
                    </span>
                  ) : att01Data.filingStatus === 'unregistered' ? (
                    <span className="font-bold text-blue-950 bg-blue-50 px-2 py-0.5 rounded border border-blue-300 font-mono flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-blue-700" />
                      <span>未办理备案 (自动生成标准公文与变量就地预填)</span>
                    </span>
                  ) : (
                    <span className="font-bold text-sky-900 bg-sky-50 px-2 py-0.5 rounded border border-sky-300 font-mono flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-sky-700" />
                      <span>无法确认 / 存疑状态 (标记待核实，备用公文兜底)</span>
                    </span>
                  )}
                </div>
                {att01Data.filingStatus === 'registered' && (
                  <span className="text-[11px] font-mono text-blue-700">
                    备案档案号: DZ-DEP-2024-BEIAN-8892
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* A. 章节正文装配 或 需预填的标准文本类附件：展示【文档原样排版 + 变量就地预填】双栏视窗 */}
          {/* ========================================================================= */}
          {isDocumentAndVariablesMode ? (
            <div className="space-y-4">
              {/* 顶部标题与状态条 (与全站附件统一样式：徽标 + 标题 + 描述 + 右侧操作) */}
              {selectedAttachmentId !== 'att-01' && (
                <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {currentAttachmentMeta?.code}
                        </span>
                        <h3 className="text-sm font-bold text-blue-950 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-blue-700" />
                          <span>{currentAttachmentMeta?.name}</span>
                        </h3>
                      </div>
                      <p className="text-xs text-blue-800/80 mt-1">
                        {currentAttachmentMeta?.summary || '标准公文格式锁定 · 填入空白变量即完成装配。'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* 中法双语切换 */}
                      <div className="flex items-center bg-blue-50/60 p-0.5 rounded-lg border border-blue-200 text-xs">
                        <button
                          type="button"
                          onClick={() => setDocLangMode('zh')}
                          className={`px-2 py-1 rounded font-medium cursor-pointer ${
                            docLangMode === 'zh' ? 'bg-white text-blue-900 font-bold shadow-2xs' : 'text-slate-600'
                          }`}
                        >
                          中文
                        </button>
                        <button
                          type="button"
                          onClick={() => setDocLangMode('fr')}
                          className={`px-2 py-1 rounded font-medium cursor-pointer ${
                            docLangMode === 'fr' ? 'bg-white text-blue-900 font-bold shadow-2xs' : 'text-slate-600'
                          }`}
                        >
                          Français
                        </button>
                        <button
                          type="button"
                          onClick={() => setDocLangMode('bilingual')}
                          className={`px-2 py-1 rounded font-medium cursor-pointer ${
                            docLangMode === 'bilingual' ? 'bg-white text-blue-900 font-bold shadow-2xs' : 'text-slate-600'
                          }`}
                        >
                          双语
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyText(currentDocumentText, 'doc-copy')}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white hover:bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1 cursor-pointer"
                      >
                        {copyFeedback === 'doc-copy' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copyFeedback === 'doc-copy' ? '已复制全文' : '复制正文'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}


              {/* 核心双栏排版：左侧公文原样纸质视窗 + 右侧变量就地预填面板 */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* 左侧：A4 纸张公文原样排版视窗 (白底，清爽蓝边框) */}
                <div className="lg:col-span-7 bg-white rounded-xl border border-blue-200 p-6 md:p-8 shadow-2xs space-y-4">
                  <div className="text-center border-b border-blue-100 pb-4">
                    <h2 className="text-base font-bold text-blue-950 tracking-wide font-serif">
                      {currentAttachmentMeta?.name}
                    </h2>
                    <p className="text-[11px] text-blue-600 font-mono mt-1">
                      DOCUMENT OFFICIEL · CONFORME AUX PRESCRIPTIONS DU DOSSIER D'APPEL D'OFFRES
                    </p>
                  </div>

                  {/* 格式化公文正文，高亮变量 */}
                  <div className="text-xs text-slate-800 leading-relaxed font-serif whitespace-pre-wrap space-y-3">
                    {renderDocumentWithVariables(currentDocumentText)}
                  </div>

                  <div className="pt-6 border-t border-blue-100 flex items-center justify-between text-[11px] text-blue-700/70">
                    <span>* 招标方提供的标准公文模板，正文条款已严格锁定，变量自动回填。</span>
                    <span className="font-mono">第 1 页 / 共 1 页</span>
                  </div>
                </div>

                {/* 右侧：变量锁定与结构化就地预填面板 (以浅蓝底色板块区分) */}
                <div className="lg:col-span-5 bg-blue-50/30 rounded-xl border border-blue-200 p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-blue-200/80">
                    <div>
                      <h4 className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-blue-700" />
                        <span>文档变量锁定与就地预填</span>
                      </h4>
                      <p className="text-[11px] text-blue-800/80 mt-0.5">
                        共识别 {currentDocumentVariables.length} 项变量，在此修改即时双向同步正文
                      </p>
                    </div>

                    <span className="text-[10px] font-mono font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
                      在线双向同步
                    </span>
                  </div>

                  {/* 变量输入列表 */}
                  <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
                    {currentDocumentVariables.map((vKey) => {
                      const curVal = variableValues[vKey] || '';
                      const isLocked = !!lockedVariables[vKey];
                      const isFocused = focusedVariableKey === vKey;

                      return (
                        <div
                          key={vKey}
                          className={`p-2.5 rounded-lg border transition-all ${
                            isFocused
                              ? 'bg-blue-50/70 border-blue-400 ring-1 ring-blue-300'
                              : 'bg-white border-blue-200'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-bold text-blue-950 font-mono flex items-center gap-1">
                              <span>[{vKey}]</span>
                            </span>

                            <button
                              type="button"
                              onClick={() => handleToggleLockVariable(vKey)}
                              className={`text-[10px] font-mono px-1.5 py-0.2 rounded border flex items-center gap-1 cursor-pointer ${
                                isLocked
                                  ? 'bg-blue-100 text-blue-900 border-blue-300'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                            >
                              {isLocked ? (
                                <>
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>已锁定</span>
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-2.5 h-2.5" />
                                  <span>可编辑</span>
                                </>
                              )}
                            </button>
                          </div>

                          <input
                            type="text"
                            disabled={isLocked}
                            value={curVal}
                            onChange={(e) => handleVariableChange(vKey, e.target.value)}
                            onFocus={() => setFocusedVariableKey(vKey)}
                            placeholder={`请输入 ${vKey} 的法定预填值...`}
                            className={`w-full px-2.5 py-1.5 rounded border text-xs outline-none transition-colors ${
                              isLocked
                                ? 'bg-slate-50 text-slate-500 border-slate-200 cursor-not-allowed'
                                : 'bg-white text-slate-900 border-blue-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* ========================================================================= */}
          {/* B. 附件01：若已办理授权备案，展示免交流程结果与留存备查材料 */}
          {/* ========================================================================= */}
          {selectedAttachmentId === 'att-01' && att01Data.filingStatus === 'registered' && (
            <div className="bg-white rounded-xl border border-blue-200 p-8 text-center space-y-4 shadow-2xs">
              <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center mx-auto border border-blue-200">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div className="max-w-xl mx-auto space-y-2">
                <span className="text-xs font-bold text-blue-900 bg-blue-100 px-2.5 py-1 rounded border border-blue-300 font-mono">
                  已核验官方备案凭证 · 条件免予提交纸质正文
                </span>
                <h4 className="text-base font-bold text-blue-950 mt-2">
                  已在招标方办理授权备案 · 本附件无需打印盖章提交
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  依据《2.1 投标须知》第 4.2 条，已办理授权备案的投标人直接凭官方备案记录核验。系统已自动在投标资审卷册中归档备案证明（官方登记编号：<strong className="font-mono text-blue-950">DZ-DEP-2024-BEIAN-8892</strong>，有效期至 2026-12-31）。
                </p>
              </div>

              {/* 备案备查材料留存卡片 */}
              <div className="max-w-md mx-auto p-4 rounded-xl bg-blue-50/50 border border-blue-200 text-left text-xs space-y-2">
                <div className="font-bold text-blue-950 flex items-center justify-between">
                  <span>备查留存档案归集清单</span>
                  <span className="text-[10px] text-blue-700 font-mono">状态: 100% 完备</span>
                </div>
                <div className="space-y-1.5 text-slate-600 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span>1. 官方授权备案证明函 (原件扫描件)</span>
                    <span className="text-blue-800 font-mono">已归档</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>2. 法定代表人身份证明书</span>
                    <span className="text-blue-800 font-mono">已归档</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>3. 免予提交法定代表人授权委托书说明函</span>
                    <span className="text-blue-800 font-mono">已生成</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setModalPendingStatus(att01Data.filingStatus);
                    setIsAtt01ModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-semibold cursor-pointer"
                >
                  重新核验 / 变更备案状态
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyText('免予提交法定代表人授权委托书说明函 (编号：DZ-DEP-2024-BEIAN-8892)', 'att01-memo')}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                >
                  导出免提交说明函
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* C. 附件03：项目管理组织机构图 (强阻断校验) */}
          {/* ========================================================================= */}
          {selectedAttachmentId === 'att-03' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        附件03
                      </span>
                      <h4 className="text-sm font-bold text-blue-950 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-blue-700" />
                        <span>项目管理机构组织网络图</span>
                      </h4>
                    </div>
                    <p className="text-xs text-blue-800/80 mt-1">
                      根据《投标须知》要求：组织机构图必须严格基于施工管理人员配备表（附件04）真实名单自动生成，层级与人员 100% 吻合，严禁凭空虚构。
                    </p>
                  </div>

                  <div>
                    {personnelList.length > 0 ? (
                      <span className="text-[11px] font-mono font-bold text-blue-900 bg-blue-100 px-2.5 py-1 rounded border border-blue-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />
                        <span>与附件04一致性: 100% 匹配 ({personnelList.length} 人在岗)</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded border border-amber-300 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                        <span>附件04未配置人员 · 阻断出图</span>
                      </span>
                    )}
                  </div>
                </div>

                {personnelList.length === 0 ? (
                  <div className="bg-blue-50/40 rounded-xl border-2 border-dashed border-blue-300 p-8 text-center space-y-4">
                    <div className="w-12 h-12 bg-white text-blue-700 rounded-full flex items-center justify-center mx-auto border border-blue-200 shadow-2xs">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="max-w-md mx-auto space-y-1.5">
                      <h4 className="text-sm font-bold text-blue-950">
                        ⚠️ 阻断提醒：附件04尚未配备施工管理人员，组织机构图无法生成！
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        《2.1 投标须知》第 5.3 条要求：组织机构图必须严格基于施工管理人员配备表（附件04）的真实名单生成，层级与人员必须 100% 吻合，严禁凭空虚构。
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setSelectedAttachmentId('att-04')}
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>前往附件04配置人员</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleQuickImportRecommended}
                        className="px-4 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-semibold text-xs cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>一键从企业人才库匹配并出图</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-blue-50/20 rounded-xl border border-blue-200 space-y-4">
                    {/* 第 1 层级：项目经理 (深蓝高层级卡片) */}
                    <div className="flex justify-center">
                      <div className="p-3 bg-blue-900 text-white rounded-xl shadow-md text-center w-64 border border-blue-800">
                        <span className="text-[10px] uppercase tracking-wider text-blue-200 font-semibold block">
                          最高现场指挥 (Level 1)
                        </span>
                        <strong className="text-sm font-bold block mt-0.5">
                          {dynamicOrgNodes[0]?.roleName}：{dynamicOrgNodes[0]?.personName}
                        </strong>
                        <span className="text-[10px] text-blue-200 font-mono">
                          (已绑定附件04拟派专家)
                        </span>
                      </div>
                    </div>

                    <div className="w-px h-4 bg-blue-200 mx-auto" />

                    {/* 第 2 层级：核心职能负责人网格 (柔和浅蓝背景卡片) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {dynamicOrgNodes.slice(1, 9).map((node) => (
                        <div
                          key={node.id}
                          className="p-2.5 rounded-lg border text-center transition-all bg-white border-blue-200 shadow-2xs hover:border-blue-300"
                        >
                          <span className="text-[10px] text-blue-700 block font-medium">
                            {node.department}
                          </span>
                          <strong className="text-xs text-blue-950 block mt-0.5">
                            {node.roleName}
                          </strong>
                          <div className="text-xs font-semibold text-slate-700 mt-1">
                            {node.personName}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="w-px h-4 bg-blue-200 mx-auto" />

                    {/* 第 3 层级：专业工程师与班组 (干净白底浅蓝边框卡片) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {dynamicOrgNodes.slice(9).map((node) => (
                        <div
                          key={node.id}
                          className="p-2.5 rounded-lg bg-white border border-blue-200 text-center shadow-2xs hover:border-blue-300"
                        >
                          <span className="text-[10px] text-blue-700 block">{node.department}</span>
                          <strong className="text-xs text-blue-950 block mt-0.5">
                            {node.roleName}
                          </strong>
                          <div className="text-xs font-semibold text-slate-700 mt-1">
                            {node.personName}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* D. 附件04：施工管理人员配备计划及主要管理人员履历 (人员库驱动半自动生成) */}
          {/* ========================================================================= */}
          {selectedAttachmentId === 'att-04' && (
            <div className="space-y-4">
              {/* 顶部控制台与规则执行操作条 */}
              <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-2xs space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        附件04
                      </span>
                      <h4 className="text-sm font-bold text-blue-950 flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-blue-700" />
                        <span>施工管理人员配备计划及主要管理人员履历</span>
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {/* 跳转进入企业人才库 */}
                    {onNavigateToTalentHub && (
                      <button
                        type="button"
                        onClick={onNavigateToTalentHub}
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 text-blue-800 border border-blue-200 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5 text-blue-700" />
                        <span>企业人才库 (简历提取/档期)</span>
                      </button>
                    )}

                    {/* 从人才库挑选 */}
                    <button
                      type="button"
                      onClick={() => setIsTalentPoolModalOpen(true)}
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-blue-50 text-blue-800 border border-blue-200 text-xs cursor-pointer flex items-center gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>匹配导入</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleQuickImportRecommended}
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-blue-50 text-blue-800 border border-blue-200 text-xs cursor-pointer flex items-center gap-1"
                      title="重置为默认官方名单"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>重置</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleClearPersonnel}
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-red-50 text-red-700 border border-red-200 text-xs cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>清空</span>
                    </button>
                  </div>
                </div>

                {/* 智能推荐与规则提示浮条 */}
                {recommendationToast && (
                  <div className="p-3 bg-blue-50 border border-blue-300 rounded-lg text-xs text-blue-950 flex items-start gap-2 animate-in fade-in">
                    <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <strong>推荐规则执行完毕：</strong> {recommendationToast}
                    </div>
                    <button
                      type="button"
                      onClick={() => setRecommendationToast(null)}
                      className="text-blue-500 hover:text-blue-800 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* 项目负责人审核确认条 (招标文件强约束：最终名单必须由项目负责人确认，并检查人员是否实际可投入、是否与其他项目时间冲突) */}
                <div className={`p-3 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                  isPersonnelConfirmedByDirector
                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                    : 'bg-amber-50/70 border-amber-300 text-amber-950'
                }`}>
                  <div className="flex items-start sm:items-center gap-2">
                    <input
                      type="checkbox"
                      id="director-confirmation"
                      checked={isPersonnelConfirmedByDirector}
                      onChange={(e) => setIsPersonnelConfirmedByDirector(e.target.checked)}
                      className="mt-0.5 sm:mt-0 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="director-confirmation" className="text-xs cursor-pointer select-none leading-relaxed">
                      <strong>【项目负责人法定审核与投入承诺】</strong>
                      项目负责人已复核全部 {personnelList.length} 位拟派人员档案：确认无同期在建项目时间冲突、均可在 2025-06-01 前实际到岗投入履约，关键人员确认可按招标人要求赴阿尔及利亚参加甲方面试。
                    </label>
                  </div>

                  <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold shrink-0 self-start sm:self-auto border ${
                    isPersonnelConfirmedByDirector
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}>
                    {isPersonnelConfirmedByDirector ? '已由负责人最终确认生效' : '待项目负责人审核签署'}
                  </span>
                </div>

                {/* 视图双模态切换与过滤工具栏 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                  <div className="flex items-center gap-1 bg-blue-50/70 p-0.5 rounded-lg border border-blue-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setPersonnelViewMode('template_table')}
                      className={`px-3 py-1.5 rounded font-medium flex items-center gap-1.5 cursor-pointer transition-all ${
                        personnelViewMode === 'template_table'
                          ? 'bg-white text-blue-950 font-bold shadow-2xs'
                          : 'text-blue-800 hover:text-blue-950'
                      }`}
                    >
                      <ListChecks className="w-3.5 h-3.5 text-blue-600" />
                      <span>官方投标报表视图 (招标文件附件04格式)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPersonnelViewMode('structured_audit')}
                      className={`px-3 py-1.5 rounded font-medium flex items-center gap-1.5 cursor-pointer transition-all ${
                        personnelViewMode === 'structured_audit'
                          ? 'bg-white text-blue-950 font-bold shadow-2xs'
                          : 'text-blue-800 hover:text-blue-950'
                      }`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                      <span>后台扩展结构化核验视图 (14项核心字段)</span>
                    </button>
                  </div>
                </div>

                {/* 空状态 */}
                {personnelList.length === 0 ? (
                  <div className="p-8 text-center bg-blue-50/30 rounded-xl border border-dashed border-blue-200 space-y-3">
                    <Users className="w-10 h-10 text-blue-400 mx-auto" />
                    <div className="space-y-1">
                      <strong className="text-sm font-bold text-blue-950 block">
                        当前尚未从企业人才库导入拟派管理人员
                      </strong>
                      <p className="text-xs text-blue-700/80">
                        提示：当本附件未配备人员时，附件03组织机构图将处于阻断保护状态。
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={handleApplyTenderNoticeRules}
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>一键执行《投标须知》规则推荐</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsTalentPoolModalOpen(true)}
                        className="px-4 py-2 rounded-lg bg-white hover:bg-blue-50 text-blue-800 border border-blue-200 font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>从企业人才库手动挑选</span>
                      </button>
                    </div>
                  </div>
                ) : personnelViewMode === 'template_table' ? (
                  /* ========================================================================= */
                  /* 模式 1: 官方投标报表视图 (招标文件附件04格式) */
                  /* 模板字段包括：序号、岗位、人员姓名、出生日期、学历、专业、工作年限、是否需要面试、可投入状态 */
                  /* ========================================================================= */
                  <div className="border border-blue-200 rounded-xl overflow-hidden shadow-2xs">
                    <div className="bg-blue-900 text-white px-4 py-2.5 flex items-center justify-between text-xs">
                      <div className="font-semibold flex items-center gap-2">
                        <span>ANNEXE 04 : LISTE ET CV DU PERSONNEL D'ENCADREMENT DE CHANTIER</span>
                        <span className="font-normal opacity-80">(附件04：施工现场管理人员配备表)</span>
                      </div>
                      <span className="font-mono text-blue-200">共 {filteredPersonnel.length} 人</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-blue-50/80 text-blue-950 font-bold border-b border-blue-200">
                          <tr>
                            <th className="p-2.5 w-12 text-center">序号</th>
                            <th className="p-2.5 min-w-[140px]">拟任岗位</th>
                            <th className="p-2.5 min-w-[90px]">姓名</th>
                            <th className="p-2.5 min-w-[95px]">出生日期</th>
                            <th className="p-2.5 min-w-[80px]">学历</th>
                            <th className="p-2.5 min-w-[110px]">专业</th>
                            <th className="p-2.5 w-20 text-center">工作年限</th>
                            <th className="p-2.5 min-w-[130px]">是否需要面试</th>
                            <th className="p-2.5 min-w-[150px]">投入可行性与档期</th>
                            <th className="p-2.5 w-24 text-center">附件及操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-100 bg-white">
                          {filteredPersonnel.map((person) => {
                            const isPm = person.role.includes('项目经理');
                            const isKey = person.interviewRequired ?? isPm;

                            return (
                              <tr
                                key={person.id}
                                className={`transition-colors hover:bg-blue-50/40 ${
                                  isPm ? 'bg-blue-50/25 font-medium' : ''
                                }`}
                              >
                                <td className="p-2.5 text-center font-mono font-bold text-blue-800">
                                  {person.orderNumber}
                                </td>
                                <td className="p-2.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <strong className="text-blue-950">{person.role}</strong>
                                    {isPm && (
                                      <span className="text-[10px] bg-blue-100 text-blue-900 px-1.5 py-0.2 rounded border border-blue-300 font-bold font-mono">
                                        同等医院业绩达标
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-2.5">
                                  <span className="font-bold text-blue-950 text-sm block">{person.name}</span>
                                  <span className="text-[10px] text-slate-500 font-mono">{person.nationality}</span>
                                </td>
                                <td className="p-2.5 font-mono text-slate-700">{person.dob}</td>
                                <td className="p-2.5 text-slate-800">{person.degree}</td>
                                <td className="p-2.5 text-slate-800">{person.major}</td>
                                <td className="p-2.5 text-center font-mono font-bold text-blue-950">
                                  {person.workingYears} 年
                                </td>
                                <td className="p-2.5">
                                  {isKey ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                                      <UserCheck className="w-3 h-3 text-amber-700" />
                                      <span>需要面试 (可参加)</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200">
                                      <span>无需面试</span>
                                    </span>
                                  )}
                                </td>
                                <td className="p-2.5">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5">
                                      {person.timeConflict ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 px-1.5 py-0.2 rounded border border-red-200">
                                          <AlertCircle className="w-3 h-3" />
                                          <span>在岗冲突</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                          <Check className="w-3 h-3 text-emerald-600" />
                                          <span>无冲突·可按期到岗</span>
                                        </span>
                                      )}
                                      <span className="text-[11px] font-mono text-slate-600">
                                        {person.availabilityDate}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-blue-800/80 block">
                                      护照有效至 {person.passportValidity || '2030'} · 工签在办
                                    </span>
                                  </div>
                                </td>
                                <td className="p-2.5 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    {isPm ? (
                                      <button
                                        type="button"
                                        onClick={() => setIsPmCvModalOpen(true)}
                                        className="p-1 px-2 text-[11px] font-semibold rounded bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 cursor-pointer"
                                        title="查看详细履历及业绩附件"
                                      >
                                        详细履历
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setInspectingPerson(person)}
                                        className="p-1 text-blue-600 hover:text-blue-800 rounded cursor-pointer"
                                        title="查看后台扩展结构化档案"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleRemovePerson(person.id)}
                                      className="p-1 text-slate-400 hover:text-red-700 rounded cursor-pointer"
                                      title="移除此人"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  /* ========================================================================= */
                  /* 模式 2: 后台扩展结构化核验视图 (全部14项后台结构化字段) */
                  /* 国籍、当前所在国家及项目、当前岗位、任职年限、医院项目经验、同等或更大规模项目经验、阿尔及利亚工作经验、属地化分包管理经验、境外采购经验、证书及有效期、可到岗日期、是否存在同期项目占用、简历文件、业绩证明、护照及签证状态 */
                  /* ========================================================================= */
                  <div className="space-y-3">
                    {filteredPersonnel.map((person) => {
                      const isPm = person.role.includes('项目经理');
                      const isKey = person.interviewRequired ?? isPm;

                      return (
                        <div
                          key={person.id}
                          className="p-4 rounded-xl border border-blue-200 bg-white hover:border-blue-300 transition-all shadow-2xs space-y-3"
                        >
                          {/* 顶部身份与状态 */}
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 pb-2 border-b border-blue-100">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                  #{person.orderNumber}
                                </span>
                                <span className="text-base font-bold text-blue-950">{person.name}</span>
                                <span className="text-xs font-bold text-blue-900 bg-blue-100 px-2.5 py-0.5 rounded border border-blue-300">
                                  {person.role}
                                </span>
                                {isKey ? (
                                  <span className="text-[11px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                                    <UserCheck className="w-3 h-3 text-amber-700" />
                                    <span>需要面试（确认可参加）</span>
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                    无需面试
                                  </span>
                                )}
                                {isPm && (
                                  <span className="text-[11px] font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    同等或更大体量医院业绩已核验
                                  </span>
                                )}
                              </div>

                              <div className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                                <span>国籍：<strong className="text-slate-800">{person.nationality}</strong></span>
                                <span>工龄：<strong className="text-blue-950">{person.workingYears} 年</strong></span>
                                <span>学历：{person.degree} · {person.major}</span>
                                <span>出生日期：{person.dob}</span>
                                <span>任职年限：{person.tenureYears || 5} 年</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {isPm && (
                                <button
                                  type="button"
                                  onClick={() => setIsPmCvModalOpen(true)}
                                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-2xs flex items-center gap-1 cursor-pointer"
                                >
                                  <FileText className="w-3 h-3" />
                                  <span>查看履历附件</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemovePerson(person.id)}
                                className="p-1.5 text-slate-400 hover:text-red-700 rounded-lg border border-transparent hover:border-slate-200 cursor-pointer"
                                title="移除此人"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* 14 项扩充字段网格 */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                            {/* 当前在岗与项目占用 */}
                            <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-200 space-y-1">
                              <span className="text-[11px] font-bold text-slate-600 block">
                                当前所在国家及在建项目
                              </span>
                              <div className="font-semibold text-slate-900">
                                {person.currentCountry} · {person.currentProject}
                              </div>
                              <div className="text-[11px] flex items-center justify-between pt-0.5">
                                <span>当前岗位：{person.currentPosition || person.role}</span>
                                {person.timeConflict ? (
                                  <span className="text-red-700 font-bold">同期在岗占用</span>
                                ) : (
                                  <span className="text-emerald-700 font-bold">无占用冲突</span>
                                )}
                              </div>
                            </div>

                            {/* 医院项目经验 & 同等或更大规模业绩 */}
                            <div className="p-2.5 rounded-lg bg-blue-50/40 border border-blue-200 space-y-1">
                              <span className="text-[11px] font-bold text-blue-900 block flex items-center justify-between">
                                <span>医院项目经验 / 同等规模业绩</span>
                                {person.hasHospitalExp ? (
                                  <span className="text-[10px] text-emerald-700 font-bold">符合须知标准</span>
                                ) : (
                                  <span className="text-[10px] text-slate-400">无专项医院</span>
                                )}
                              </span>
                              <div className="text-blue-950 font-medium line-clamp-2">
                                {person.hospitalExpNote || '暂未录入特定医疗建筑业绩'}
                              </div>
                              {person.sameOrLargerHospitalScale && (
                                <div className="text-[10px] font-mono font-bold text-blue-800">
                                  标的规模：{person.sameOrLargerHospitalScale}
                                </div>
                              )}
                            </div>

                            {/* 阿尔及利亚驻场经历 */}
                            <div className="p-2.5 rounded-lg bg-blue-50/40 border border-blue-200 space-y-1">
                              <span className="text-[11px] font-bold text-blue-900 block flex items-center justify-between">
                                <span>阿尔及利亚工作经验</span>
                                {person.hasAlgeriaExp ? (
                                  <span className="text-[10px] text-emerald-700 font-bold">驻场 {person.algeriaExpYears || 5} 年</span>
                                ) : (
                                  <span className="text-[10px] text-slate-400">首次赴阿</span>
                                )}
                              </span>
                              <div className="text-blue-950 font-medium line-clamp-2">
                                {person.algeriaExpNote || '国内骨干常驻派遣'}
                              </div>
                            </div>

                            {/* 属地分包与境外采购 */}
                            <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-200 space-y-1">
                              <span className="text-[11px] font-bold text-slate-600 block">
                                属地分包 / 境外采购经验
                              </span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {person.hasLocalSubcontractExp && (
                                  <span className="text-[10px] bg-blue-100 text-blue-900 px-1.5 py-0.2 rounded border border-blue-200 font-bold">
                                    具备属地分包经验
                                  </span>
                                )}
                                {person.hasOverseasProcurementExp && (
                                  <span className="text-[10px] bg-blue-100 text-blue-900 px-1.5 py-0.2 rounded border border-blue-200 font-bold">
                                    具备境外采购经验
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-600 line-clamp-1">
                                {person.localSubcontractNote || person.overseasProcurementNote || '具备跨国工程商务协作能力'}
                              </p>
                            </div>

                            {/* 执业证书及有效期 */}
                            <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-200 space-y-1">
                              <span className="text-[11px] font-bold text-slate-600 block">
                                资格证书及有效期
                              </span>
                              <div className="font-semibold text-slate-900 line-clamp-1">
                                {person.certificates.join(' / ')}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                有效期至：{person.certificateValidity || '2028-12-31'}
                              </div>
                            </div>

                            {/* 证照、到岗与证明材料 */}
                            <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-200 space-y-1">
                              <span className="text-[11px] font-bold text-slate-600 block">
                                护照 / 签证 / 证明附件
                              </span>
                              <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                                <span className="text-emerald-700 font-medium">护照完备</span>
                                <span>·</span>
                                <span className="text-blue-700 font-medium">有效工作签证</span>
                                <span>·</span>
                                <span className="text-emerald-700 font-medium">业绩证明已归档</span>
                              </div>
                              <div className="text-[10px] font-mono text-blue-900 font-bold">
                                可到岗时间：{person.availabilityDate}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* E. 附件05：劳动力配置计划和劳动力曲线 (参数测算 + 人工调整 + 自动绘图) */}
          {/* ========================================================================= */}
          {selectedAttachmentId === 'att-05' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        附件05
                      </span>
                      <h3 className="text-sm font-bold text-blue-950 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-blue-700" />
                        <span>劳动力配置计划和劳动力曲线</span>
                      </h3>
                    </div>
                    <p className="text-xs text-blue-800/80 mt-1">
                      根据《投标须知》规定及附件07进度工程量联动计算各阶段人数，动态生成劳动力配置表与走势曲线。
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded border border-blue-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />
                      <span>与附件07工期严格联动 (540天)</span>
                    </span>
                  </div>
                </div>
              </div>

              <Attachment05LaborWorkbench
                laborData={laborData}
                onUpdateLaborData={setLaborData}
                onNavigateToSchedule07={() => setSelectedAttachmentId('att-07')}
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* F. 附件06：施工设备 */}
          {/* ========================================================================= */}
          {selectedAttachmentId === 'att-06' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        附件06
                      </span>
                      <h3 className="text-sm font-bold text-blue-950 flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-blue-700" />
                        <span>施工机械设备、机具和周转材料配备计划</span>
                      </h3>
                    </div>
                    <p className="text-xs text-blue-800/80 mt-1">
                      匹配设备清单及进场时间，按 5 种来源分类；严格校验设备进场时间不得晚于对应工序开始时间。
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded border border-blue-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />
                      <span>设备进场倒排逻辑校验通过</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="border border-blue-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-blue-50/70 text-blue-900 font-semibold border-b border-blue-200">
                    <tr>
                      <th className="p-2.5 w-12 text-center">序号</th>
                      <th className="p-2.5">设备名称及型号规格</th>
                      <th className="p-2.5 text-center">数量</th>
                      <th className="p-2.5">设备来源</th>
                      <th className="p-2.5">计划进场日期</th>
                      <th className="p-2.5">对应工序及开始时间</th>
                      <th className="p-2.5 text-center">工期逻辑</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100">
                    {filteredEquipment.map((eq) => (
                      <tr key={eq.id} className="hover:bg-blue-50/40">
                        <td className="p-2.5 text-center font-mono text-blue-700">{eq.orderNumber}</td>
                        <td className="p-2.5">
                          <strong className="text-blue-950 block">{eq.name}</strong>
                          <span className="text-[11px] text-slate-500 font-mono">{eq.model}</span>
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold text-blue-950">
                          {eq.quantity} {eq.unit}
                        </td>
                        <td className="p-2.5 font-mono text-[11px] text-slate-700">
                          {eq.sourceCategoryLabel}
                        </td>
                        <td className="p-2.5 font-mono text-blue-950 font-semibold">{eq.planEntryDate}</td>
                        <td className="p-2.5">
                          <span className="text-blue-950 block font-medium">{eq.associatedProcedure}</span>
                          <span className="text-[11px] text-blue-700/70 font-mono">工序：{eq.procedureStartDate}</span>
                        </td>
                        <td className="p-2.5 text-center">
                          <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 font-mono">
                            提前进场
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* G. 附件07：进度计划 (实施流程串联 + WBS) */}
          {/* ========================================================================= */}
          {selectedAttachmentId === 'att-07' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        附件07
                      </span>
                      <h3 className="text-sm font-bold text-blue-950 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-blue-700" />
                        <span>进度计划 (流程串联控制台)</span>
                      </h3>
                    </div>
                    <p className="text-xs text-blue-800/80 mt-1">
                      展现平台如何将需求转化为步骤，并驱动附件04人员、附件05劳动力与附件06设备进场。总工期 540 日历天不可逾越。
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyText('Project/P6 进度计划数据...', 'p6-export')}
                      className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-700" />
                      <span>导出 P6/Project 计划</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-blue-100 flex-wrap gap-2">
                  <div className="flex items-center bg-blue-50/70 p-0.5 rounded-lg text-xs border border-blue-200">
                    <button
                      type="button"
                      onClick={() => setWbsViewTab('workflow')}
                      className={`px-3 py-1 rounded font-semibold cursor-pointer ${
                        wbsViewTab === 'workflow' ? 'bg-blue-600 text-white' : 'text-blue-800'
                      }`}
                    >
                      实施串联流程图
                    </button>
                    <button
                      type="button"
                      onClick={() => setWbsViewTab('table')}
                      className={`px-3 py-1 rounded font-semibold cursor-pointer ${
                        wbsViewTab === 'table' ? 'bg-blue-600 text-white' : 'text-blue-800'
                      }`}
                    >
                      WBS工期表
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyText('P6 Primavera XER 计划结构导出草案', 'p6-export')}
                    className="px-2.5 py-1 rounded bg-white hover:bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold cursor-pointer"
                  >
                    导出 P6 (.XER)
                  </button>
                </div>

                {/* 平台全流程落地串联视窗 */}
                {wbsViewTab === 'workflow' ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-xs text-blue-900 leading-relaxed">
                      <strong>平台落地实现全景串联机制：</strong>
                      平台并不原样复制条文，而是将《投标须知》所有工期、资源约束通过 7 大实施阶段串联，驱动附件04人员入驻、附件05劳动力负荷以及附件06设备进场。
                    </div>

                    <div className="space-y-3">
                      {[
                        {
                          step: 1,
                          title: '标前澄清与技术方案锁定 (M1)',
                          badge: '技术源头锁定',
                          color: 'bg-blue-50/60 border-blue-200',
                          action: '驱动附件01（授权备案核验）及附件02（报价总额与现场踏勘）就地预填。',
                        },
                        {
                          step: 2,
                          title: '现场管理团队动员与入驻 (M2)',
                          badge: '团队就位',
                          color: 'bg-sky-50/60 border-sky-200',
                          action: '调取附件04项目经理与核心骨干，自动同步生成附件03项目管理组织机构图。',
                        },
                        {
                          step: 3,
                          title: '境外物资长周期海运与属地清关 (M3~M5)',
                          badge: '关键采购防线',
                          color: 'bg-indigo-50/40 border-indigo-200',
                          action: '应用附件09保密与脱敏防火墙，去除项目地址后发送材料询价，锁定海运周期。',
                        },
                        {
                          step: 4,
                          title: '机电管线预埋与变配电所土建交接 (M6~M8)',
                          badge: '施工高峰突破',
                          color: 'bg-blue-50/80 border-blue-250',
                          action: '驱动附件05中方与属地 165 人劳动力峰值，结合附件06液压吊车提前 15 天就位。',
                        },
                        {
                          step: 5,
                          title: '设备主材安装与局部试通电 (M9~M14)',
                          badge: '系统总成',
                          color: 'bg-sky-50/80 border-sky-250',
                          action: '落实附件08劳务分包协议 15 日抗辩期与配额监管，推进变电所与医疗IT系统安装。',
                        },
                        {
                          step: 6,
                          title: '全系统联合调试与消防检测 (M15~M16)',
                          badge: '法国第三方验评',
                          color: 'bg-indigo-50/50 border-indigo-250',
                          action: '由技术总工张志强牵头配合法国 SOCOTEC 开展高压绝缘与医疗接地闭环验收。',
                        },
                        {
                          step: 7,
                          title: 'CTC/DLEP 竣工移交与两年维保 (M17~M18)',
                          badge: '承诺全面履约',
                          color: 'bg-blue-100/60 border-blue-300',
                          action: '归集全套中法双语竣工图纸，移交业主代表，兑现投标承诺函 100% 履约承诺。',
                        },
                      ].map((item) => (
                        <div
                          key={item.step}
                          className={`p-3.5 rounded-xl border ${item.color} shadow-2xs transition-all hover:border-blue-400`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-blue-950 flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-mono text-[11px] flex items-center justify-center font-bold">
                                {item.step}
                              </span>
                              <span>{item.title}</span>
                            </span>
                            <span className="text-[10px] font-mono font-bold text-blue-900 bg-white/80 px-2 py-0.5 rounded border border-blue-200">
                              {item.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-700 mt-1 pl-7 leading-relaxed">
                            <strong>平台实现串联机制：</strong>
                            {item.action}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="border border-blue-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-blue-50/70 text-blue-900 font-semibold border-b border-blue-200">
                        <tr>
                          <th className="p-2.5 w-16 text-center">WBS编码</th>
                          <th className="p-2.5">工作分解节点名称</th>
                          <th className="p-2.5 text-center">工期</th>
                          <th className="p-2.5">计划起止日期</th>
                          <th className="p-2.5">紧前工作</th>
                          <th className="p-2.5 text-center">关键路径</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-100">
                        {wbsTasks.map((t) => (
                          <tr key={t.id} className="hover:bg-blue-50/40">
                            <td className="p-2.5 text-center font-mono text-blue-700 font-bold">{t.code}</td>
                            <td className="p-2.5">
                              <strong className="text-blue-950 block">{t.name}</strong>
                              <span className="text-[11px] text-slate-500 font-serif italic">{t.department} · {t.platformImplementationDesc.slice(0, 36)}...</span>
                            </td>
                            <td className="p-2.5 text-center font-mono font-bold text-blue-950">{t.durationDays} 天</td>
                            <td className="p-2.5 font-mono text-slate-700 text-[11px]">
                              {t.startDate} ~ {t.endDate}
                            </td>
                            <td className="p-2.5 font-mono text-slate-500 text-[11px]">
                              {t.predecessor || '—'}
                            </td>
                            <td className="p-2.5 text-center">
                              {t.isCriticalPath ? (
                                <span className="text-[10px] font-bold text-blue-900 bg-blue-100 px-1.5 py-0.5 rounded border border-blue-300 font-mono">
                                  关键路径
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-mono">常规</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* H. 附件09：保密承诺书特有之外发脱敏防火墙 */}
          {/* ========================================================================= */}
          {selectedAttachmentId === 'att-09' && (
            <div className="mt-4 bg-white rounded-xl border border-blue-200 p-4 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      附件09
                    </span>
                    <h3 className="text-sm font-bold text-blue-950 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-blue-700" />
                      <span>保密承诺书 · 核心供应商询价防泄密防火墙</span>
                    </h3>
                  </div>
                  <p className="text-xs text-blue-800/80 mt-1">
                    针对“严禁向材料设备供应商泄露工程背景”之法定冲突，系统执行自动化脱敏流程与 5 大严密控制防线。
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsRfqRedactionModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>在线预览脱敏询价单与审批流</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-200">
                  <strong className="text-blue-950 block text-[11px]">1. 自动去除工程标识</strong>
                  <span className="text-slate-600 text-[10px] mt-0.5 block">
                    清除医院名称、业主抬头与廷杜夫地理定位。
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-200">
                  <strong className="text-blue-950 block text-[11px]">2. 纯技术参数发送</strong>
                  <span className="text-slate-600 text-[10px] mt-0.5 block">
                    仅提取法标 CCTP 规格书参数与数量。
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-200">
                  <strong className="text-blue-950 block text-[11px]">3. 负责人前置审批</strong>
                  <span className="text-slate-600 text-[10px] mt-0.5 block">
                    外发询价包必须经项目负责人电子签名。
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-200">
                  <strong className="text-blue-950 block text-[11px]">4. 全程留痕存证</strong>
                  <span className="text-slate-600 text-[10px] mt-0.5 block">
                    记录收件厂商、发送时间及脱敏版本哈希。
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-200">
                  <strong className="text-blue-950 block text-[11px]">5. 背景披露前置授权</strong>
                  <span className="text-slate-600 text-[10px] mt-0.5 block">
                    若特殊需披露，须提前报备招标方书面许可。
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 弹窗 1: 询问与核验投标人授权备案状态弹窗 (专业蓝色主题) */}
      {/* ========================================================================= */}
      {isAtt01ModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-blue-200 w-full max-w-xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-blue-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    询问与核验投标人授权备案状态
                  </h3>
                  <p className="text-xs text-blue-200">
                    依据《2.1 投标须知》第 4.2 条：根据备案状态匹配相应提交流程
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAtt01ModalOpen(false)}
                className="p-1 text-blue-200 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-blue-950 leading-relaxed">
                <strong>《投标须知》规定：</strong>
                仅针对未在招标方办理授权备案的投标人须提交标准格式授权委托书。请核实您所在单位在阿尔及利亚国家卫生部的授权备案现状：
              </div>

              <div className="space-y-3">
                {/* 选项 1: 已备案 */}
                <div
                  onClick={() => setModalPendingStatus('registered')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    modalPendingStatus === 'registered'
                      ? 'bg-blue-50 border-blue-600 shadow-sm ring-2 ring-blue-200'
                      : 'bg-white border-blue-200 hover:bg-blue-50/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-950 flex items-center gap-2">
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        modalPendingStatus === 'registered' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                      }`}>
                        {modalPendingStatus === 'registered' && <Check className="w-3 h-3" />}
                      </span>
                      <span>已在招标方办理授权备案（备案证明已留存）</span>
                    </span>
                    <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-1.5 py-0.2 rounded border border-blue-200">
                      条件免交正文
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 pl-6 leading-relaxed">
                    <strong>流程对应：</strong>标记为“无需提交正文”，出具《免予提交法定代表人授权委托书说明函》，调取并归档备案编号（DZ-DEP-2024-BEIAN-8892），免除现场签署盖章。
                  </p>
                </div>

                {/* 选项 2: 未备案 */}
                <div
                  onClick={() => setModalPendingStatus('unregistered')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    modalPendingStatus === 'unregistered'
                      ? 'bg-blue-50 border-blue-600 shadow-sm ring-2 ring-blue-200'
                      : 'bg-white border-blue-200 hover:bg-blue-50/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-950 flex items-center gap-2">
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        modalPendingStatus === 'unregistered' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                      }`}>
                        {modalPendingStatus === 'unregistered' && <Check className="w-3 h-3" />}
                      </span>
                      <span>未在招标方办理授权备案（须正式提交）</span>
                    </span>
                    <span className="text-[10px] font-bold text-blue-900 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                      自动预填公文
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 pl-6 leading-relaxed">
                    <strong>流程对应：</strong>调取企业信息库、法定代表人及代理人信息，在工作台就地预填，原样锁定标准格式条款，法定代表人签字盖公章，代理人亲笔签字，附身份证复印件。
                  </p>
                </div>

                {/* 选项 3: 存疑 / 无法确认 */}
                <div
                  onClick={() => setModalPendingStatus('pending_verify')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    modalPendingStatus === 'pending_verify'
                      ? 'bg-blue-50 border-blue-600 shadow-sm ring-2 ring-blue-200'
                      : 'bg-white border-blue-200 hover:bg-blue-50/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-950 flex items-center gap-2">
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        modalPendingStatus === 'pending_verify' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                      }`}>
                        {modalPendingStatus === 'pending_verify' && <Check className="w-3 h-3" />}
                      </span>
                      <span>无法确认 / 存疑需核实</span>
                    </span>
                    <span className="text-[10px] font-bold text-sky-800 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-300">
                      待办预警草案
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 pl-6 leading-relaxed">
                    <strong>流程对应：</strong>标记为“待核实”，自动生成向招标方发出的备案澄清函，系统先行预填一套备用公文兜底，在彻底核准前严禁直接省略。
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-blue-50/40 border-t border-blue-200 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsAtt01ModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg border border-blue-200 bg-white hover:bg-blue-50 text-blue-800 text-xs font-semibold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmAtt01Status}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                确认并应用此状态流程
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 弹窗 2: 企业人才库 (Enterprise Talent Pool) 匹配与导入弹窗 */}
      {/* ========================================================================= */}
      {isTalentPoolModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-blue-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-blue-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    企业人才库 (Enterprise Talent Pool) · 匹配导入附件04
                  </h3>
                  <p className="text-xs text-blue-200">
                    基于《投标须知》关键经验（医院+阿国+属地分包+采购）进行智能推荐与勾选导入
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsTalentPoolModalOpen(false)}
                className="p-1 text-blue-200 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-blue-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-blue-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={talentSearchKeyword}
                  onChange={(e) => setTalentSearchKeyword(e.target.value)}
                  placeholder="搜索姓名、专业、岗位..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-blue-200 text-xs focus:ring-1 focus:ring-blue-400 outline-none"
                />
              </div>

              <div className="flex items-center gap-1 bg-blue-50/60 p-0.5 rounded-lg text-xs overflow-x-auto border border-blue-200">
                <button
                  type="button"
                  onClick={() => setTalentFilterExp('all')}
                  className={`px-2.5 py-1 rounded font-medium cursor-pointer ${
                    talentFilterExp === 'all' ? 'bg-white text-blue-950 font-bold shadow-2xs' : 'text-blue-800'
                  }`}
                >
                  全部专家 ({ENTERPRISE_TALENT_POOL.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTalentFilterExp('hospital')}
                  className={`px-2.5 py-1 rounded font-medium cursor-pointer ${
                    talentFilterExp === 'hospital' ? 'bg-blue-600 text-white font-bold' : 'text-blue-800'
                  }`}
                >
                  医院经验
                </button>
                <button
                  type="button"
                  onClick={() => setTalentFilterExp('algeria')}
                  className={`px-2.5 py-1 rounded font-medium cursor-pointer ${
                    talentFilterExp === 'algeria' ? 'bg-blue-600 text-white font-bold' : 'text-blue-800'
                  }`}
                >
                  阿尔及利亚
                </button>
                <button
                  type="button"
                  onClick={() => setTalentFilterExp('subcontract')}
                  className={`px-2.5 py-1 rounded font-medium cursor-pointer ${
                    talentFilterExp === 'subcontract' ? 'bg-blue-600 text-white font-bold' : 'text-blue-800'
                  }`}
                >
                  属地分包
                </button>
                <button
                  type="button"
                  onClick={() => setTalentFilterExp('procurement')}
                  className={`px-2.5 py-1 rounded font-medium cursor-pointer ${
                    talentFilterExp === 'procurement' ? 'bg-blue-600 text-white font-bold' : 'text-blue-800'
                  }`}
                >
                  境外采购
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-0 text-xs">
              {filteredTalentPool.map((candidate) => {
                const isSelected = selectedTalentIds.includes(candidate.id);

                return (
                  <div
                    key={candidate.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedTalentIds((prev) => prev.filter((id) => id !== candidate.id));
                      } else {
                        setSelectedTalentIds((prev) => [...prev, candidate.id]);
                      }
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-400 shadow-2xs ring-1 ring-blue-300'
                        : 'bg-white border-blue-200 hover:bg-blue-50/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-5 h-5 rounded mt-0.5 flex items-center justify-center border transition-colors ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-white border-blue-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <strong className="text-sm font-bold text-blue-950">{candidate.name}</strong>
                            <span className="text-xs font-semibold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {candidate.role}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              工龄 {candidate.workingYears} 年 · {candidate.degree} ({candidate.major})
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {candidate.hasHospitalExp && (
                              <span className="text-[10px] text-blue-900 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 font-mono">
                                [医院经验]
                              </span>
                            )}
                            {candidate.hasAlgeriaExp && (
                              <span className="text-[10px] text-blue-900 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 font-mono">
                                [阿国常驻]
                              </span>
                            )}
                            {candidate.hasLocalSubcontractExp && (
                              <span className="text-[10px] text-blue-900 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 font-mono">
                                [属地分包]
                              </span>
                            )}
                            {candidate.hasOverseasProcurementExp && (
                              <span className="text-[10px] text-blue-900 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 font-mono">
                                [境外采购]
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-600 mt-1 line-clamp-1">
                            {candidate.hospitalExpNote || candidate.algeriaExpNote}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono text-blue-900 font-semibold block">
                          可到岗: {candidate.availabilityDate}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {candidate.certificates[0]}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-6 py-3.5 bg-blue-50/40 border-t border-blue-200 flex items-center justify-between shrink-0">
              <div className="text-xs text-blue-900">
                已选中 <strong className="text-blue-950 font-bold">{selectedTalentIds.length}</strong> 位拟派人员
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleQuickImportRecommended}
                  className="px-3 py-1.5 rounded-lg border border-blue-200 bg-white hover:bg-blue-50 text-blue-800 text-xs font-semibold cursor-pointer"
                >
                  一键全选推荐班底 ({ENTERPRISE_TALENT_POOL.length}人)
                </button>
                <button
                  type="button"
                  onClick={handleImportTalentSelection}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  确认导入到附件04
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 弹窗 3: 全案一致性交叉核验模态弹窗 (Consistency Checker Modal) */}
      {/* ========================================================================= */}
      {isConsistencyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-blue-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-blue-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    投标书附件全案 6 维一致性交叉核验报告
                  </h3>
                  <p className="text-xs text-blue-200">
                    基于《2.1 投标须知》要求对全部附件进行跨源逻辑与格式一致性扫描
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsConsistencyModalOpen(false)}
                className="p-1 text-blue-200 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3 text-xs">
              <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-blue-950 block">
                    1. 项目名称、招标方名称、投标人名称一致性
                  </strong>
                  <span className="text-slate-600 text-[11px]">
                    附件01、02、08、09 涉及的 3 项核心主体全称完全相同（240床廷杜夫军方医院项目 / 中国建筑第二工程局有限公司）。
                  </span>
                </div>
              </div>

              <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-blue-950 block">
                    2. 附件02 投标承诺函大小写金额与 BOQ 报价汇总一致性
                  </strong>
                  <span className="text-slate-600 text-[11px]">
                    承诺函小写数字 1,286,450,000.00 DZD 与大写中文、工程量清单总价表及分项报价汇总表 100% 保持一致。
                  </span>
                </div>
              </div>

              <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-blue-950 block">
                    3. 附件03 组织机构图与附件04 人员岗位 100% 联动一致性
                  </strong>
                  <span className="text-slate-600 text-[11px]">
                    机构图中 12 个关键岗位与附件04所列拟派人员姓名完全吻合；已设置附件04为空时阻断出图机制。
                  </span>
                </div>
              </div>

              <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-blue-950 block">
                    4. 附件05 劳动力阶段与附件06 设备进场日期同附件07 进度对齐
                  </strong>
                  <span className="text-slate-600 text-[11px]">
                    第 7-8 个月 165 人劳动力高峰与中心配电所变压器就位关键路径咬合；设备进场提前于工序开始日 7-15 天。
                  </span>
                </div>
              </div>

              <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-blue-950 block">
                    5. 附件08 劳务协议书 4 大法务风险边界审查确认
                  </strong>
                  <span className="text-slate-600 text-[11px]">
                    已确认使用甲方配额、否决外派其他单位风险、设置15日扣款抗辩期并将责任限定于直接损失。
                  </span>
                </div>
              </div>

              <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-blue-950 block">
                    6. 附件09 保密承诺书自动预填与外发脱敏防火墙合规
                  </strong>
                  <span className="text-slate-600 text-[11px]">
                    提取并提醒 7 大核心义务；针对材料询价冲突采取自动去除工程地址、仅发技术参数、负责人审批留痕 5 大防线。
                  </span>
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-blue-50/40 border-t border-blue-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-blue-800">
                核验结果：全部符合《2.1 投标须知》递交规范要求
              </span>
              <button
                type="button"
                onClick={() => setIsConsistencyModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                完成核验并返回
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 弹窗 4: 附件09 材料询价脱敏预览与外发审批流弹窗 */}
      {/* ========================================================================= */}
      {isRfqRedactionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-blue-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-blue-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <EyeOff className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    供应商材料询价自动化脱敏单 (防泄密防火墙)
                  </h3>
                  <p className="text-xs text-blue-200">
                    基于附件09保密条款自动抹除敏感工程背景，生成合规技术询价清单
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsRfqRedactionModalOpen(false)}
                className="p-1 text-blue-200 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 space-y-1">
                <span className="font-bold text-blue-950 block">脱敏前后关键字段比对审计</span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  系统已自动剥离原工程名称【240床廷杜夫军方医院】、业主名称【阿尔及利亚国防部/卫生部】与地理坐标，防止询价过程中泄露招标文件保密信息。
                </p>
              </div>

              <div className="border border-blue-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-blue-50/70 text-blue-900 font-semibold border-b border-blue-200">
                    <tr>
                      <th className="p-2.5">字段类别</th>
                      <th className="p-2.5">脱敏前原始信息 (受保密约束)</th>
                      <th className="p-2.5">对外发送脱敏后信息 (合规)</th>
                      <th className="p-2.5 text-center">状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100">
                    <tr>
                      <td className="p-2.5 font-bold text-blue-950">工程名称</td>
                      <td className="p-2.5 text-slate-400 line-through">240床廷杜夫军方医院项目</td>
                      <td className="p-2.5 text-blue-900 font-semibold">阿尔及利亚公共建筑电气Lot09工程</td>
                      <td className="p-2.5 text-center text-blue-700 font-bold">已脱敏</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-blue-950">项目业主</td>
                      <td className="p-2.5 text-slate-400 line-through">阿尔及利亚国家卫生与军方后勤部</td>
                      <td className="p-2.5 text-blue-900 font-semibold">境外某重点政府机构 (代号 DZ-LOT-09)</td>
                      <td className="p-2.5 text-center text-blue-700 font-bold">已隐藏</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-blue-950">工程地点</td>
                      <td className="p-2.5 text-slate-400 line-through">廷杜夫省某军区特区</td>
                      <td className="p-2.5 text-blue-900 font-semibold">阿尔及利亚西部大区 (港口交付 DDP)</td>
                      <td className="p-2.5 text-center text-blue-700 font-bold">已泛化</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-blue-950">图纸图签</td>
                      <td className="p-2.5 text-slate-400 line-through">带军方医院专用章与坐标水印</td>
                      <td className="p-2.5 text-blue-900 font-semibold">提取纯技术电气拓扑参数单页图</td>
                      <td className="p-2.5 text-center text-blue-700 font-bold">已剥离</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/40 text-[11px] text-slate-700 space-y-1">
                <span className="font-bold text-blue-950 block">外发审批审计凭证：</span>
                <p>经办人：王丽娟 (商务合约组) · 审批人：张志强 (全权技术代表) · 审批时间：2025-03-21 10:45</p>
                <p className="font-mono text-blue-800">审批流水号：SEC-RFQ-20250321-8891-PASSED</p>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-blue-50/40 border-t border-blue-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-blue-800">
                审批状态：已通过法务与技术负责人联合电子签批
              </span>
              <button
                type="button"
                onClick={() => setIsRfqRedactionModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                确认并关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 弹窗 5: 附件04 专属《项目经理详细工作经历及同等规模业绩附件》模态弹窗 */}
      {/* ========================================================================= */}
      {isPmCvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-blue-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* 弹窗头部 */}
            <div className="px-6 py-4 bg-blue-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">
                      附件04-1：主要管理人员履历表及项目经理同等业绩证明
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-800 text-blue-200 border border-blue-700">
                      ANNEXE 04-1 : CURRICULUM VITAE DU DIRECTEUR DE PROJET
                    </span>
                  </div>
                  <p className="text-xs text-blue-200 mt-0.5">
                    基于《投标须知》重点核查：同等或更大体量医院项目经验（≥240床）、阿尔及利亚常驻经历、是否需要面试与承诺出席
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-2.5 py-1 text-xs rounded bg-blue-800 hover:bg-blue-700 text-white flex items-center gap-1 cursor-pointer"
                  title="打印此份履历附件"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>打印</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPmCvModalOpen(false)}
                  className="text-blue-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 履历正文视窗 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              {/* 核心审核达标状态横幅 */}
              <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <strong className="text-blue-950 font-bold text-sm">
                      项目经理资格核验达标：张建国 (Zhang Jianguo)
                    </strong>
                  </div>
                  <p className="text-xs text-blue-800/80">
                    完全满足招标文件《2.1 投标须知》对项目经理在同等或更大体量医院（塞提夫300床教学医院）常驻担任项目经理满3年以上的实质性资格要求。
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs font-mono">
                    塞提夫300床医院 (同等或更大)
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>需要面试 (承诺出席)</span>
                  </span>
                </div>
              </div>

              {/* 1. 个人基础档案表 */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-blue-950 border-b border-blue-200 pb-1 flex items-center justify-between">
                  <span>1. 拟派驻核心岗位与基础履历数据 (IDENTITÉ ET QUALIFICATIONS)</span>
                  <span className="font-mono text-blue-700">模板标准字段已回填</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">拟派项目岗位</span>
                    <strong className="text-blue-950 text-xs">驻场项目经理 (Directeur de Projet)</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">姓名 / 国籍</span>
                    <strong className="text-blue-950 text-xs">张建国 (中国籍)</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">出生日期 / 年龄</span>
                    <strong className="text-blue-950 text-xs">1984-06-15 (41 岁)</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">工程总工龄</span>
                    <strong className="text-blue-950 text-xs">18 年 (海外常驻 8 年)</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">最高学历与学位</span>
                    <strong className="text-blue-950 text-xs">工程硕士 (Master en Ingénierie)</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">毕业院校及专业</span>
                    <strong className="text-blue-950 text-xs">东南大学 · 建筑电气与智能化</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">执业注册资格</span>
                    <strong className="text-blue-950 text-xs">国家一级注册建造师 (机电/建筑)</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">外语应用能力</span>
                    <strong className="text-blue-950 text-xs">法语 DALF C1 / 英语 CET-6</strong>
                  </div>
                </div>
              </div>

              {/* 2. 同等或更大体量医院项目代表业绩表 */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-blue-950 border-b border-blue-200 pb-1 flex items-center justify-between">
                  <span>2. 同等或更大体量医院工程代表业绩清单 (RÉFÉRENCES HOSPITALIÈRES SIMILAIRES)</span>
                  <span className="text-[11px] text-emerald-800 font-bold">全部具备业主或总包完工证明</span>
                </h4>

                <div className="border border-blue-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-blue-50/80 text-blue-950 font-bold border-b border-blue-200">
                      <tr>
                        <th className="p-2.5 w-12 text-center">序号</th>
                        <th className="p-2.5 min-w-[200px]">项目名称及业主</th>
                        <th className="p-2.5 min-w-[110px]">医院规模 / 面积</th>
                        <th className="p-2.5 min-w-[90px]">担任职务</th>
                        <th className="p-2.5 min-w-[130px]">实施周期</th>
                        <th className="p-2.5 min-w-[120px]">体量匹配核验</th>
                        <th className="p-2.5 min-w-[90px] text-center">证明材料</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-100 bg-white">
                      <tr className="bg-blue-50/20">
                        <td className="p-2.5 text-center font-mono font-bold text-blue-800">01</td>
                        <td className="p-2.5">
                          <strong className="text-blue-950 block">阿尔及利亚塞提夫 300 床教学综合医院 EPC 项目</strong>
                          <span className="text-[11px] text-slate-500 font-mono">业主：Direction de la Santé de Sétif (DSP)</span>
                        </td>
                        <td className="p-2.5 font-bold text-blue-950">
                          300 床位 · 68,000 ㎡
                        </td>
                        <td className="p-2.5 font-bold text-blue-900">常驻项目经理</td>
                        <td className="p-2.5 font-mono text-slate-600">2019/08 ~ 2023/11 (4.2年)</td>
                        <td className="p-2.5">
                          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            超过 240 床要求 · 达标
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          <span className="text-[11px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                            完工验收接收单
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-center font-mono font-bold text-blue-800">02</td>
                        <td className="p-2.5">
                          <strong className="text-blue-950 block">华中科技大学同济医院光谷院区机电智能化总包工程</strong>
                          <span className="text-[11px] text-slate-500 font-mono">业主：同济医院筹建办</span>
                        </td>
                        <td className="p-2.5 font-bold text-blue-950">
                          800 床位 · 120,000 ㎡
                        </td>
                        <td className="p-2.5 text-slate-800">常务副经理/机电总监</td>
                        <td className="p-2.5 font-mono text-slate-600">2016/04 ~ 2019/06 (3.2年)</td>
                        <td className="p-2.5">
                          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            三甲医院三等工程 (鲁班奖)
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          <span className="text-[11px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                            合同及竣工备案
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-center font-mono font-bold text-blue-800">03</td>
                        <td className="p-2.5">
                          <strong className="text-blue-950 block">刚果(金)金沙萨中心医院机电改造总承包工程</strong>
                          <span className="text-[11px] text-slate-500 font-mono">业主：Ministère de la Santé Publique RDC</span>
                        </td>
                        <td className="p-2.5 font-bold text-blue-950">
                          260 床位 · 38,000 ㎡
                        </td>
                        <td className="p-2.5 text-slate-800">项目副经理</td>
                        <td className="p-2.5 font-mono text-slate-600">2013/09 ~ 2016/03 (2.5年)</td>
                        <td className="p-2.5">
                          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            中资援外医疗标杆
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          <span className="text-[11px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                            商务部援外好评函
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. 证明文件扫描件清单与面试承诺 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <h5 className="font-bold text-blue-950 text-xs flex items-center justify-between">
                    <span>资质证明与归档附件清单 (PIÈCES JUSTIFICATIVES)</span>
                    <span className="text-[10px] text-emerald-700 font-bold">已挂接电子档案</span>
                  </h5>
                  <ul className="space-y-1.5 text-slate-700">
                    <li className="flex items-center justify-between">
                      <span>1. 国家一级注册建造师注册证 (电子签章在期)</span>
                      <span className="font-mono text-blue-800 font-bold">有效至 2028-12-31</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>2. PMP 国际项目管理师认证证书</span>
                      <span className="font-mono text-blue-800 font-bold">PMI 编号 #289012</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>3. 塞提夫300床医院完工接收证明书 (PV de Réception)</span>
                      <span className="font-mono text-blue-800 font-bold">法文原件已核对</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>4. 中华人民共和国公务普通护照及多次往返工签</span>
                      <span className="font-mono text-blue-800 font-bold">护照期至 2031-08</span>
                    </li>
                  </ul>
                </div>

                <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2">
                  <h5 className="font-bold text-amber-950 text-xs flex items-center justify-between">
                    <span>关键管理人员现场面试承诺书 (ENGAGEMENT D'ENTRETIEN)</span>
                    <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-bold">法定合规</span>
                  </h5>
                  <p className="text-amber-900 text-xs leading-relaxed font-serif">
                    “本人（张建国，拟任阿尔及利亚提济乌祖省240床综合医院项目常驻项目经理）郑重声明：若贵方招标委员会要求在授标评估前对本项目核心管理人员进行面对面技术考核与面试，本人保证将按招标人指定日期赴阿尔及尔或提济乌祖现场准时参加甲方面试，并完全承担相应陈述责任。”
                  </p>
                  <div className="pt-1 flex items-center justify-between text-[11px] text-amber-800 font-mono">
                    <span>签署人：张建国 (已按手印及企业公章)</span>
                    <span>日期：2025年03月</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 底部按钮栏 */}
            <div className="px-6 py-3.5 bg-blue-50/40 border-t border-blue-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-blue-800">
                本详细履历文件将作为《附件04-1》同法定标书一同装订输出。
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyText('附件04-1 项目经理张建国详细履历与塞提夫300床医院业绩证明...', 'pm-cv-copy')}
                  className="px-3 py-1.5 rounded-lg border border-blue-200 bg-white hover:bg-blue-50 text-blue-800 text-xs font-semibold cursor-pointer"
                >
                  {copyFeedback === 'pm-cv-copy' ? '已复制正文' : '复制文本'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsPmCvModalOpen(false)}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  完成并返回工作台
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 弹窗 6: 查看单个人员后台扩展结构化档案抽屉 */}
      {/* ========================================================================= */}
      {inspectingPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-blue-200 w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-3.5 bg-blue-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-white" />
                <h4 className="text-sm font-bold text-white">
                  人员后台扩展结构化档案：{inspectingPerson.name} ({inspectingPerson.role})
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setInspectingPerson(null)}
                className="text-blue-200 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">拟派岗位</span>
                  <strong className="text-blue-950">{inspectingPerson.role}</strong>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">姓名与国籍</span>
                  <strong className="text-blue-950">{inspectingPerson.name} ({inspectingPerson.nationality})</strong>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">出生日期 / 学历</span>
                  <strong className="text-blue-950">{inspectingPerson.dob} · {inspectingPerson.degree} ({inspectingPerson.major})</strong>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">总工龄 / 任职年限</span>
                  <strong className="text-blue-950">{inspectingPerson.workingYears} 年工龄 · 岗位任职 {inspectingPerson.tenureYears || 5} 年</strong>
                </div>
              </div>

              <div className="p-3 bg-blue-50/40 rounded-lg border border-blue-200 space-y-1">
                <span className="font-bold text-blue-950 block">当前所在国家及在建项目</span>
                <p className="text-blue-900">{inspectingPerson.currentCountry} · {inspectingPerson.currentProject} (当前岗位: {inspectingPerson.currentPosition || inspectingPerson.role})</p>
                <p className="text-[11px] text-slate-600">
                  可到岗日期：<strong className="text-blue-950 font-mono">{inspectingPerson.availabilityDate}</strong>
                  {inspectingPerson.timeConflict ? (
                    <span className="text-red-700 font-bold ml-2">⚠️ 存在在岗时间冲突</span>
                  ) : (
                    <span className="text-emerald-700 font-bold ml-2">✓ 无在建项目时间冲突</span>
                  )}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-800 block">履历资质与到岗状态</span>
                <div className="space-y-1 text-slate-700">
                  <p>• 是否需要面试：{inspectingPerson.interviewRequired ? <span className="text-amber-800 font-bold">需要面试 (已确认可参加)</span> : <span className="text-slate-500">无需面试</span>}</p>
                  <p>• 医院项目经验：{inspectingPerson.hasHospitalExp ? <span className="text-emerald-700 font-bold">具备 ({inspectingPerson.hospitalExpNote})</span> : <span className="text-slate-400">无专项医院经验</span>}</p>
                  <p>• 阿尔及利亚经历：{inspectingPerson.hasAlgeriaExp ? <span className="text-emerald-700 font-bold">具备常驻经历 ({inspectingPerson.algeriaExpYears}年, {inspectingPerson.algeriaExpNote})</span> : <span className="text-slate-400">无</span>}</p>
                  <p>• 属地分包管理经验：{inspectingPerson.hasLocalSubcontractExp ? <span className="text-emerald-700 font-bold">具备 ({inspectingPerson.localSubcontractNote || '北非属地化分包经验'})</span> : <span className="text-slate-400">无</span>}</p>
                  <p>• 境外采购管理经验：{inspectingPerson.hasOverseasProcurementExp ? <span className="text-emerald-700 font-bold">具备 ({inspectingPerson.overseasProcurementNote || '欧洲/地中海采购经验'})</span> : <span className="text-slate-400">无</span>}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-slate-800 block">证书、护照与签证</span>
                <p className="text-slate-700">执业证书：{inspectingPerson.certificates.join(' / ')} (有效期至 {inspectingPerson.certificateValidity || '2028-12-31'})</p>
                <p className="text-slate-700 font-mono text-[11px]">护照状态：有效 (至 {inspectingPerson.passportValidity || '2030-08'}) · 阿尔及利亚在期工签</p>
              </div>
            </div>

            <div className="px-6 py-3 bg-blue-50/40 border-t border-blue-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setInspectingPerson(null)}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
