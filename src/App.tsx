import React, { useState } from 'react';
import {
  BoqItem,
  GlobalPricingParams,
  MaterialComponent,
  InstallationQuotaComponent,
  RfqInquiryRecord,
  EmailTemplateItem,
  HistoricalContractRecord,
  SupplierReplyDetail,
} from './types/pricing';
import { ProposalSection, VariableValues } from './types/proposalVariables';
import {
  INITIAL_GLOBAL_PARAMS,
  MOCK_INSTALLATION_QUOTAS,
  MOCK_MATERIALS,
  INITIAL_BOQ_ITEMS,
  MOCK_RFQ_RECORDS,
  MOCK_HISTORICAL_CONTRACTS,
} from './data/mockData';
import {
  INITIAL_PROPOSAL_SECTIONS,
  INITIAL_VARIABLE_VALUES,
} from './data/mockProposalComponents';
import { DEFAULT_EMAIL_TEMPLATES } from './utils/rfqEmailTemplates';
import { calculateAllBoqItems, calculateItemCost } from './utils/pricingEngine';
import { Header } from './components/Header';
import { BoqPricingWorkbench } from './components/BoqPricingWorkbench';
import { DualDatabaseView } from './components/DualDatabaseView';
import { EmailRfqHubView } from './components/EmailRfqHubView';
import { GlobalConfigAndRfqView } from './components/GlobalConfigAndRfqView';
import { SendEmailRfqModal } from './components/SendEmailRfqModal';
import { ExportSummaryModal } from './components/ExportSummaryModal';
import { ProductDocModal } from './components/ProductDocModal';
import { AppSidebar, MainNavId } from './components/AppSidebar';
import { ChangeHistoryDrawer } from './components/ChangeHistoryDrawer';
import { ChangeHistoryRecord } from './types/history';
import { INITIAL_CHANGE_HISTORY } from './data/mockHistory';
import {
  LayoutWidthMode,
  TableDensityMode,
} from './components/ViewAdaptationControls';
import { BidImportModal } from './components/BidImportModal';
import { NoticeAnalysisView } from './components/NoticeAnalysisView';
import { NoticeExtractionView } from './components/NoticeExtractionView';
import { InstructionsAttachmentsView } from './components/InstructionsAttachmentsView';
import { InstructionsAttachmentsViewWrapper } from './components/InstructionsAttachmentsViewWrapper';
import {
  AivlProject,
  InstructionsRecord,
  NoticeAnalysisResult,
} from './types/bidding';
import {
  getStoredProjectId,
  setStoredProjectId as persistProjectId,
  ensureLoggedIn,
  getProject,
  getNoticeAnalysis,
  getInstructions,
} from './utils/aivlApi';
import {
  noticeFieldsToVariables,
  summarizeInstructionsPolicy,
} from './utils/aivlAdapters';
import { TenderProject, TenderStage } from './types/tenderProject';
import { INITIAL_TENDER_PROJECTS } from './data/mockTenderProjects';
import { TenderProjectsHubView } from './components/TenderProjectsHubView';

export default function App() {
  // ========== 多标段管理状态 ==========
  const [tenderProjects, setTenderProjects] = useState<TenderProject[]>(INITIAL_TENDER_PROJECTS);
  const [activeTenderId, setActiveTenderId] = useState<string>(INITIAL_TENDER_PROJECTS[0].id);

  const activeTender = tenderProjects.find((t) => t.id === activeTenderId) || tenderProjects[0];

  // ========== 全局共享资源库状态 (跨标段共享) ==========
  const [globalParams, setGlobalParams] = useState<GlobalPricingParams>(INITIAL_GLOBAL_PARAMS);
  const [quotas, setQuotas] = useState<InstallationQuotaComponent[]>(MOCK_INSTALLATION_QUOTAS);
  const [materials, setMaterials] = useState<MaterialComponent[]>(MOCK_MATERIALS);

  // 标段操作审计变更历史与实时自动保存微反馈状态
  const [historyList, setHistoryList] = useState<ChangeHistoryRecord[]>(INITIAL_CHANGE_HISTORY);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSavedText, setLastSavedText] = useState('刚才');

  // 记录变更并触发实时自动保存微动画
  const logChange = (record: Omit<ChangeHistoryRecord, 'id' | 'timestamp' | 'timeAgo'>) => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const dateStr = now.toISOString().split('T')[0];
    const newEntry: ChangeHistoryRecord = {
      ...record,
      id: `HIST-${Date.now().toString().slice(-5)}`,
      timestamp: `${dateStr} ${timeStr}`,
      timeAgo: '刚才',
    };

    setHistoryList((prev) => [newEntry, ...prev]);
    setIsAutoSaving(true);
    setTimeout(() => {
      setIsAutoSaving(false);
      setLastSavedText('刚才');
    }, 400);
  };

  // 邮件模板库全局状态 (可在邮件模板管理中自由创建、编辑、保存)
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplateItem[]>(DEFAULT_EMAIL_TEMPLATES);

  // 视图自适应与显示调节状态：全宽流式自适应、自定义缩放比例(85%~140%)与舒适大字密度
  const [layoutWidth, setLayoutWidth] = useState<LayoutWidthMode>('fluid');
  const [zoomScale, setZoomScale] = useState<number>(100);
  const [tableDensity, setTableDensity] = useState<TableDensityMode>('standard');

  // 历史签单台账全局状态 (支持从 Excel/CSV/JSON 批量导入)
  const [historicalContracts, setHistoricalContracts] = useState<HistoricalContractRecord[]>(
    MOCK_HISTORICAL_CONTRACTS
  );

  // 标书组件章节与变量识别状态 - 从当前激活标段读取
  const proposalSections = activeTender.proposalSections;
  const variableValues = activeTender.variableValues;
  const boqItems = activeTender.boqItems;
  const rfqRecords = activeTender.rfqRecords;

  // 更新标段数据 helper
  const updateTender = (tenderId: string, updates: Partial<TenderProject>) => {
    setTenderProjects((prev) =>
      prev.map((t) => (t.id === tenderId ? { ...t, ...updates } : t))
    );
  };

  // 更新提案章节
  const setProposalSections = (sections: ProposalSection[]) => {
    updateTender(activeTenderId, { proposalSections: sections });
  };

  // 更新变量值
  const setVariableValues = (values: VariableValues) => {
    updateTender(activeTenderId, { variableValues: values });
  };

  // 更新量单
  const setBoqItems = (items: BoqItem[]) => {
    updateTender(activeTenderId, { boqItems: items });
  };

  // 更新询价记录
  const setRfqRecords = (records: RfqInquiryRecord[]) => {
    updateTender(activeTenderId, { rfqRecords: records });
  };

  // 产品架构与交互逻辑规范 (PRD / PDF) 弹窗状态
  const [isProductDocModalOpen, setIsProductDocModalOpen] = useState(false);

  // 左侧边栏折叠状态
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // 组装工作台已精简为单一模式：工程量清单智能组价
  const [workbenchSubTab, setWorkbenchSubTab] = useState<'variables' | 'boq'>('boq');

  // 双库子模式：'materials' (总库) | 'contracts' (历史签单与导入) | 'aliases' (别名映射)
  const [dualDbSubTab, setDualDbSubTab] = useState<'materials' | 'contracts' | 'aliases'>('materials');

  // 询价中心子模式：'records' (询价记录) | 'compare' (比价看板) | 'templates' (邮件模板)
  const [rfqSubTab, setRfqSubTab] = useState<'records' | 'compare' | 'templates'>('records');

  const [activeTab, setActiveTab] = useState<
    'workbench' | 'dual-db' | 'rfq' | 'config' | 'notice' | 'instructions' | 'tender-hub'
  >('tender-hub');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // —— 招标文件智能解读(接 aivl 后端)——
  const [aivlProject, setAivlProject] = useState<AivlProject | null>(null);
  const [bidZipFileName, setBidZipFileName] = useState<string | null>(null);
  const [noticeAnalysis, setNoticeAnalysis] = useState<NoticeAnalysisResult | null>(null);
  const [instructionsRecord, setInstructionsRecord] = useState<InstructionsRecord | null>(null);
  const [isBidImportModalOpen, setIsBidImportModalOpen] = useState(false);
  const [backendAlert, setBackendAlert] = useState<string | null>(null);

  // 启动时尝试静默登录 + 恢复上次项目
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await ensureLoggedIn();
      } catch (e) {
        if (!cancelled) {
          setBackendAlert(
            'aivl 后端未就绪(默认 http://127.0.0.1:8000),招标文件智能解读功能将不可用,请参考 README 启动后端。'
          );
        }
        return;
      }
      const pid = getStoredProjectId();
      if (!pid) return;
      try {
        const [proj, notice, inst] = await Promise.all([
          getProject(pid).catch(() => null),
          getNoticeAnalysis(pid).catch(() => null),
          getInstructions(pid).catch(() => null),
        ]);
        if (cancelled) return;
        if (proj) setAivlProject(proj);
        if (notice) setNoticeAnalysis(notice);
        if (inst) setInstructionsRecord(inst);
      } catch {
        /* ignore,等用户主动触发 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleBidImported = (project: AivlProject, zipName: string) => {
    setAivlProject(project);
    setBidZipFileName(zipName);
    persistProjectId(project.id);
    setIsBidImportModalOpen(false);
    logChange({
      actionType: 'notice',
      title: `导入招标文件 ZIP · ${project.name}`,
      description: `创建项目 #${project.id},完成文件 ${zipName} 的解包与结构化扫描。`,
      target: project.name,
      operator: '当前商务造价师',
    });
  };

  const handleResetProject = () => {
    persistProjectId(null);
    setAivlProject(null);
    setNoticeAnalysis(null);
    setInstructionsRecord(null);
    setBidZipFileName(null);
  };

  const handleWriteNoticeToVariables = (res: NoticeAnalysisResult) => {
    const { updated, mapped, extras } = noticeFieldsToVariables(res.fields || [], variableValues);
    setVariableValues(updated);
    logChange({
      actionType: 'notice',
      title: '将招标公告字段回填到标书变量库',
      description: `映射到标准变量 ${mapped.length} 项,追加公告字段 ${extras.length} 项(前缀「公告·」),已穿透替换全案条款。`,
      target: '商务标变量库 & 公告解读',
      operator: '当前商务造价师',
    });
    setActiveTab('workbench');
    setWorkbenchSubTab('boq');
  };

  const handleCompleteInstructions = (rec: InstructionsRecord) => {
    const state = rec.result;
    if (!state) return;
    const summary = summarizeInstructionsPolicy(state);
    if (Object.keys(summary.patch).length > 0) {
      setGlobalParams((prev) => ({ ...prev, ...summary.patch }));
    }
    logChange({
      actionType: 'instructions',
      title: '完成投标须知编制,写入全局计价约束',
      description:
        [
          summary.currency ? `计价币种:${summary.currency}` : null,
          summary.priceLockMode === 'lump-sum' ? '合同形式:固定总价包干' : null,
          summary.foreignExchangeNote ? `外汇:${summary.foreignExchangeNote}` : null,
          summary.mandatoryRules.length
            ? `强制规则 ${summary.mandatoryRules.length} 条`
            : null,
        ]
          .filter(Boolean)
          .join(' · ') || '完成投标须知状态机。',
      target: '投标须知工作台',
      operator: '当前商务造价师',
    });
  };

  // 当前主导航选中的条目 ID (映射到左侧垂直边栏)
  const currentNavId: MainNavId = (() => {
    if (activeTab === 'tender-hub') return 'projects-hub';
    if (activeTab === 'notice') return 'notice-analysis';
    if (activeTab === 'instructions') return 'instructions-workbench';
    if (activeTab === 'workbench') {
      return 'workbench-boq';
    }
    if (activeTab === 'dual-db') {
      return `dual-db-${dualDbSubTab}` as MainNavId;
    }
    if (activeTab === 'rfq') {
      return `rfq-${rfqSubTab}` as MainNavId;
    }
    return 'config';
  })();

  // 当前面包屑指示
  const currentBreadcrumb = (() => {
    switch (currentNavId) {
      case 'projects-hub':
        return { group: '招标标段管理中心', item: '标段总览与解包中心' };
      case 'notice-analysis':
        return { group: '招标文件智能解读', item: '招标公告智能解读' };
      case 'instructions-workbench':
        return { group: '招标文件智能解读', item: '投标须知工作台' };
      case 'workbench-boq':
        return { group: '标书与组价作业流', item: '智能组价台' };
      case 'dual-db-materials':
        return { group: '工程物资与资产库', item: '工程物资与定额总库' };
      case 'dual-db-contracts':
        return { group: '工程物资与资产库', item: '历史签单台账与导入' };
      case 'dual-db-aliases':
        return { group: '工程物资与资产库', item: '物料别名智能映射' };
      case 'rfq-records':
        return { group: '供应商询价与协同中心', item: '询价单跟踪与发函' };
      case 'rfq-compare':
        return { group: '供应商询价与协同中心', item: '多商报价横向比选' };
      case 'rfq-templates':
        return { group: '供应商询价与协同中心', item: '询价邮件模板管理' };
      case 'config':
        return { group: '标书与组价作业流', item: '国际汇率与综合费率' };
      default:
        return { group: '工程智能组价平台', item: '组价工作台' };
    }
  })();

  // 左侧导航点击无缝跳转并切换深层子视图
  const handleSidebarNavigate = (navId: MainNavId) => {
    switch (navId) {
      case 'projects-hub':
        setActiveTab('tender-hub');
        break;
      case 'notice-analysis':
        setActiveTab('notice');
        break;
      case 'instructions-workbench':
        setActiveTab('instructions');
        break;
      case 'workbench-boq':
        setActiveTab('workbench');
        setWorkbenchSubTab('boq');
        break;
      case 'dual-db-materials':
        setActiveTab('dual-db');
        setDualDbSubTab('materials');
        break;
      case 'dual-db-contracts':
        setActiveTab('dual-db');
        setDualDbSubTab('contracts');
        break;
      case 'dual-db-aliases':
        setActiveTab('dual-db');
        setDualDbSubTab('aliases');
        break;
      case 'rfq-records':
        setActiveTab('rfq');
        setRfqSubTab('records');
        break;
      case 'rfq-compare':
        setActiveTab('rfq');
        setRfqSubTab('compare');
        break;
      case 'rfq-templates':
        setActiveTab('rfq');
        setRfqSubTab('templates');
        break;
      case 'config':
        setActiveTab('config');
        break;
    }
  };

  // 邮件询价弹窗状态
  const [isSendEmailModalOpen, setIsSendEmailModalOpen] = useState(false);
  const [emailPrefillItem, setEmailPrefillItem] = useState<{
    name: string;
    spec: string;
    unit: string;
    quantity: number;
    imageUrl?: string;
    boqItemId?: string;
  } | null>(null);

  const handleOpenSendEmailModal = (prefill?: any) => {
    setEmailPrefillItem(prefill || null);
    setIsSendEmailModalOpen(true);
  };

  // 变量更新：全案实时双向绑定
  const handleUpdateVariable = (key: string, value: string) => {
    setVariableValues((prev) => ({
      ...prev,
      [key]: value,
    }));
    logChange({
      actionType: 'variable',
      title: `更新标书条款变量 [${key}]`,
      description: `将变量「${key}」取值更新为「${value}」，全案文本实时穿透替换。`,
      target: `商务标变量 [${key}]`,
      operator: '当前商务造价师',
    });
  };

  // 重置变量为预设示例
  const handleResetToDemoValues = () => {
    setVariableValues(INITIAL_VARIABLE_VALUES);
    logChange({
      actionType: 'variable',
      title: '重置标书全案变量至系统预设值',
      description: '恢复阿尔及利亚 240 床综合医院示范标段基准条款与合同变量。',
      target: '全案商务标变量库',
      operator: '当前商务造价师',
    });
  };

  // 参数更新触发全量重算
  const handleUpdateGlobalParams = (newParams: GlobalPricingParams) => {
    setGlobalParams(newParams);
    setBoqItems((prev) => calculateAllBoqItems(prev, newParams));
    logChange({
      actionType: 'system',
      title: '更新国际综合费率与外币折算汇率',
      description: `管理费率设定为 ${newParams.managementRate * 100}%，人工基数 ${newParams.laborBaseRate} DZD，已联动重算全部清单子目。`,
      target: '全局测算与汇率引擎',
      operator: '当前造价工程师',
    });
  };

  // 单项或批量更新量单
  const handleUpdateItems = (updatedItems: BoqItem[]) => {
    const recalculated = calculateAllBoqItems(updatedItems, globalParams);
    setBoqItems(recalculated);
    logChange({
      actionType: 'pricing',
      title: '更新工程量清单定额组价与主材参数',
      description: `更新 ${updatedItems.length} 项清单子目的工日定额或原币采购基准，重新核算综合单价与合价。`,
      target: '强电工程量清单工作台',
      operator: '当前造价工程师',
    });
  };

  // 新增定额组件
  const handleAddQuota = (newQuota: InstallationQuotaComponent) => {
    setQuotas((prev) => [newQuota, ...prev]);
    logChange({
      actionType: 'quota',
      title: `新增安装定额子目「${newQuota.nameZh}」`,
      description: `录入定额编号 ${newQuota.quotaCode}，综合工日基数 ${newQuota.laborContent} 工日/${newQuota.unit}。`,
      target: newQuota.nameZh,
      operator: '当前造价工程师',
    });
  };

  // 新增主材组件
  const handleAddMaterial = (newMaterial: MaterialComponent) => {
    setMaterials((prev) => [newMaterial, ...prev]);
    logChange({
      actionType: 'pricing',
      title: `采购总库新增主材「${newMaterial.standardNameZh}」`,
      description: `登记原币采购参考价 ${newMaterial.basePrice.toLocaleString()} ${newMaterial.currency}，产地 ${newMaterial.defaultOrigin}。`,
      target: newMaterial.standardNameZh,
      operator: '当前造价工程师',
    });
  };

  // 批量导入历史签单成功后的联动更新
  const handleAddHistoricalContracts = (
    newContracts: HistoricalContractRecord[],
    updatedMaterials?: MaterialComponent[]
  ) => {
    setHistoricalContracts((prev) => [...newContracts, ...prev]);
    logChange({
      actionType: 'import',
      title: `批量导入历史工程签单 ${newContracts.length} 笔`,
      description: `成功载入真实中标合同台账，并自动匹配提升 BOQ 对应物资匹配置信度至 96%。`,
      target: '历史签单数据库',
      operator: '当前造价工程师',
    });

    if (updatedMaterials) {
      setMaterials(updatedMaterials);

      // 同步提升 BOQ 中相关物料的匹配置信度并重算
      setBoqItems((prev) =>
        prev.map((item) => {
          // 查找是否匹配到新导入的历史签单物资
          const hitContract = newContracts.find(
            (c) =>
              c.materialName.toLowerCase().includes(item.descriptionZh.toLowerCase()) ||
              item.descriptionZh.toLowerCase().includes(c.materialName.toLowerCase())
          );

          if (hitContract) {
            const updated = {
              ...item,
              matchStatus: 'matched' as const,
              matchConfidence: 96,
              materialPriceOriginal: hitContract.unitPrice,
              materialCurrency: hitContract.currency,
              applyTariff: hitContract.currency === 'CNY',
              selectedSupplierName: `${hitContract.supplierName} (历史签约价)`,
            };
            return calculateItemCost(updated, globalParams);
          }
          return item;
        })
      );
    }
  };

  // 供应商询价采纳入库闭环 (支持采纳比价面板中选中的任意供应商单价，并无缝回填指定量单项)
  const handleAdoptRfq = (
    rfqId: string,
    customQuote?: SupplierReplyDetail,
    targetBoqItemId?: string
  ) => {
    const rfq = rfqRecords.find((r) => r.id === rfqId);
    if (!rfq) return;

    const chosenQuote =
      customQuote ||
      rfq.supplierReplies?.[0] ||
      (rfq.replySummary
        ? {
            supplierName: rfq.replySummary.supplierName,
            supplierEmail: 'sales@vendor.com',
            quotedPrice: rfq.replySummary.quotedPrice,
            currency: rfq.replySummary.currency,
            replyAttachmentName: rfq.replySummary.replyAttachmentName,
            origin: rfq.replySummary.origin,
            leadTime: rfq.replySummary.leadTime,
            parsedAt: rfq.replySummary.parsedAt,
          }
        : null);

    if (!chosenQuote) return;

    setRfqRecords((prev) =>
      prev.map((r) =>
        r.id === rfqId
          ? {
              ...r,
              isAdoptedToHistoryDb: true,
              status: 'adopted',
              replySummary: {
                supplierName: chosenQuote.supplierName,
                quotedPrice: chosenQuote.quotedPrice,
                currency: chosenQuote.currency,
                replyAttachmentName: chosenQuote.replyAttachmentName,
                origin: chosenQuote.origin,
                leadTime: chosenQuote.leadTime,
                parsedAt: chosenQuote.parsedAt,
              },
            }
          : r
      )
    );

    const newMaterialItem: MaterialComponent = {
      id: `MAT-RFQ-${Date.now().toString().slice(-4)}`,
      code: `EL-RFQ-${Date.now().toString().slice(-3)}`,
      standardNameZh: rfq.materialName,
      standardNameFr: rfq.materialName,
      synonyms: ['接地铜网', '铜绞线', '接地母线'],
      spec: rfq.materialSpec,
      unit: rfq.unit,
      defaultOrigin: chosenQuote.origin,
      currency: chosenQuote.currency,
      basePrice: chosenQuote.quotedPrice,
      imageUrl:
        rfq.imageUrl ||
        'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
      supplierQuotes: [
        {
          supplierId: `SUP-${Date.now().toString().slice(-3)}`,
          supplierName: chosenQuote.supplierName,
          unitPrice: chosenQuote.quotedPrice,
          currency: chosenQuote.currency,
          originCountry: chosenQuote.origin,
          leadTimeDays: 35,
          isLowestPrice: true,
          quotedDate: new Date().toISOString().split('T')[0],
          notes: '经过造价工程师多商比选人工审核确认采纳入库',
        },
      ],
      lastSignedProject: '240 医院项目 (询价决标采纳)',
      lastSignedDate: new Date().toISOString().split('T')[0],
      isRecentOneYear: true,
      category: '电缆母线',
    };

    setMaterials((prev) => [newMaterialItem, ...prev]);

    // 同时将该笔采纳记录作为最新签单沉淀入历史签单台账
    const newContract: HistoricalContractRecord = {
      id: `HC-${Date.now().toString().slice(-4)}`,
      contractNo: `HT-RFQ-2026-${Date.now().toString().slice(-3)}`,
      projectName: '阿尔及利亚 240 床综合医院标段',
      materialName: rfq.materialName,
      materialSpec: rfq.materialSpec,
      category: '电缆母线',
      unitPrice: chosenQuote.quotedPrice,
      currency: chosenQuote.currency,
      supplierName: chosenQuote.supplierName,
      quantity: rfq.quantityNeeded,
      unit: rfq.unit,
      deliveryTerms: 'CIF 阿尔及尔港',
      signDate: new Date().toISOString().split('T')[0],
      isRecentOneYear: true,
      verified: true,
      importBatch: 'RFQ-DECISION-AWARD',
    };
    setHistoricalContracts((prev) => [newContract, ...prev]);

    // 智能回填量单 (支持显式目标行、关联ID与关键词模糊匹配)
    setBoqItems((prev) =>
      prev.map((item) => {
        const isMatchedTarget =
          (targetBoqItemId && item.id === targetBoqItemId) ||
          (rfq.linkedBoqItemId && item.id === rfq.linkedBoqItemId) ||
          item.id === 'BOQ-07' ||
          item.descriptionZh.includes(rfq.materialName.slice(0, 4)) ||
          rfq.materialName.includes(item.descriptionZh.slice(0, 4));

        if (isMatchedTarget) {
          const updated = {
            ...item,
            matchStatus: 'matched' as const,
            matchConfidence: 96,
            matchedMaterialId: newMaterialItem.id,
            materialPriceOriginal: chosenQuote.quotedPrice,
            materialCurrency: chosenQuote.currency,
            materialOrigin: chosenQuote.origin,
            applyTariff: chosenQuote.currency === 'CNY',
            selectedSupplierName: chosenQuote.supplierName,
          };
          return calculateItemCost(updated, globalParams);
        }
        return item;
      })
    );
  };

  const handleSendNewRfq = (record: RfqInquiryRecord) => {
    setRfqRecords((prev) => [record, ...prev]);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-row font-sans text-slate-900">
      {/* 企业级专业左侧垂直导航侧边栏 */}
      <AppSidebar
        currentNavId={currentNavId}
        onNavigate={handleSidebarNavigate}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        counts={{
          boqItems: boqItems.length,
          contracts: historicalContracts.length,
          pendingRfqs: rfqRecords.filter((r) => !r.isAdoptedToHistoryDb).length,
          emailTemplates: emailTemplates.length,
          noticeFields: noticeAnalysis?.fields?.filter((f) => !f.missing && f.value).length,
          instructionsDone:
            instructionsRecord?.result?.attachments?.filter((a) => a.status === 'done').length,
          instructionsTotal: instructionsRecord?.result?.attachments?.length,
        }}
        onOpenProductDoc={() => setIsProductDocModalOpen(true)}
      />

      {/* 右侧主工作区容器 */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {/* 顶部企业级 B 端 SaaS 标准导航 */}
        <Header
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onExport={() => setIsExportModalOpen(true)}
          onOpenProductDoc={() => setIsProductDocModalOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
          currentProjectName={activeTender?.projectName}
          currentBreadcrumb={currentBreadcrumb}
          layoutWidth={layoutWidth}
          onLayoutWidthChange={setLayoutWidth}
          zoomScale={zoomScale}
          onZoomScaleChange={setZoomScale}
          density={tableDensity}
          onDensityChange={setTableDensity}
          showExportButton={currentNavId === 'workbench-boq'}
        />

        {/* 主视图内容区域：全宽流式自适应 / 自定义缩放 / 纯功能工作区 */}
        <main
          className={`flex-1 transition-all duration-150 ${
            layoutWidth === 'fluid'
              ? 'w-full px-4 sm:px-6 lg:px-8 py-5'
              : layoutWidth === 'wide'
              ? 'max-w-[1720px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-5'
              : 'max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5'
          }`}
          style={{
            zoom: zoomScale !== 100 ? `${zoomScale}%` : undefined,
          }}
        >
          {/* 标段管理中心 */}
          {activeTab === 'tender-hub' && (
            <TenderProjectsHubView
              tenders={tenderProjects}
              activeTenderId={activeTenderId}
              onSelectTender={(tenderId, targetStep) => {
                setActiveTenderId(tenderId);

                // 根据 targetStep 跳转到对应页面
                if (targetStep === 'notice') {
                  setActiveTab('notice');
                } else if (targetStep === 'instructions') {
                  setActiveTab('instructions');
                } else if (targetStep === 'pricing') {
                  setActiveTab('workbench');
                  setWorkbenchSubTab('boq');
                } else {
                  // 默认进入第一步：招标公告解读
                  setActiveTab('notice');
                }
              }}
              onOpenCreateModal={() => setIsBidImportModalOpen(true)}
              onDeleteTender={(tenderId) => {
                setTenderProjects((prev) => prev.filter((p) => p.id !== tenderId));
                if (tenderId === activeTenderId && tenderProjects.length > 1) {
                  setActiveTenderId(tenderProjects.find((p) => p.id !== tenderId)!.id);
                }
              }}
            />
          )}

          {activeTab === 'workbench' && (
            <div className="space-y-4">
              {/* 智能组价台 (CFO 工程量清单双库组价台) */}
              {(
                <BoqPricingWorkbench
                  items={boqItems}
                  globalParams={globalParams}
                  allMaterials={materials}
                  allQuotas={quotas}
                  rfqRecords={rfqRecords}
                  onAdoptQuoteFromWorkbench={(rfqId, quote, targetItem) =>
                    handleAdoptRfq(rfqId, quote, targetItem.id)
                  }
                  onUpdateItems={handleUpdateItems}
                  onUpdateGlobalParams={handleUpdateGlobalParams}
                  layoutWidth={layoutWidth}
                  onLayoutWidthChange={setLayoutWidth}
                  zoomScale={zoomScale}
                  onZoomScaleChange={setZoomScale}
                  tableDensity={tableDensity}
                  onTableDensityChange={setTableDensity}
                  onNavigateToRfq={(matName) => {
                    setActiveTab('rfq');
                    setRfqSubTab('records');
                  }}
                  onOpenSendEmailModal={handleOpenSendEmailModal}
                />
              )}
            </div>
          )}

          {/* 模块 2: 工程物资与历史签单库 (定额/主材库/历史签单导入/别名映射) */}
          {activeTab === 'dual-db' && (
            <DualDatabaseView
              quotas={quotas}
              materials={materials}
              onAddQuota={handleAddQuota}
              onAddMaterial={handleAddMaterial}
              onUpdateMaterials={setMaterials}
              historicalContracts={historicalContracts}
              onAddHistoricalContracts={handleAddHistoricalContracts}
              onOpenSendEmailModal={handleOpenSendEmailModal}
              activeModule={dualDbSubTab}
              onModuleChange={setDualDbSubTab}
            />
          )}

          {/* 模块 3: 供应商邮件询价与协同中心 (多商发函/按价格排序/邮件模板管理) */}
          {activeTab === 'rfq' && (
            <EmailRfqHubView
              rfqRecords={rfqRecords}
              onOpenSendModal={handleOpenSendEmailModal}
              onAdoptRfq={handleAdoptRfq}
              templates={emailTemplates}
              onUpdateTemplates={setEmailTemplates}
              globalParams={globalParams}
              activeSubModule={rfqSubTab}
              onSubModuleChange={setRfqSubTab}
            />
          )}

          {/* 模块 4: 成本测算与国际费率中心 (费率与汇率) */}
          {activeTab === 'config' && (
            <GlobalConfigAndRfqView
              params={globalParams}
              rfqRecords={rfqRecords}
              onUpdateParams={handleUpdateGlobalParams}
              onAdoptRfq={handleAdoptRfq}
              onSendNewRfq={handleSendNewRfq}
            />
          )}

          {/* 模块 5: 招标公告智能解读 - 8 大信息提取 */}
          {activeTab === 'notice' && (
            <NoticeExtractionView
              projectName={activeTender?.name}
              onNavigateToInstructions={() => setActiveTab('instructions')}
            />
          )}

          {/* 模块 6: 投标须知附件编制 */}
          {activeTab === 'instructions' && (
            <InstructionsAttachmentsViewWrapper
              projectName={activeTender?.name}
              onNavigateToBoq={() => {
                setActiveTab('workbench');
                setWorkbenchSubTab('boq');
              }}
            />
          )}
        </main>

        {/* 供应商邮件询价弹窗 (支持选用自定义模板) */}
        <SendEmailRfqModal
          isOpen={isSendEmailModalOpen}
          prefillItem={emailPrefillItem}
          onClose={() => setIsSendEmailModalOpen(false)}
          onSendRfq={handleSendNewRfq}
          availableTemplates={emailTemplates}
          onAdoptImmediately={(record) => {
            handleAdoptRfq(record.id);
          }}
        />

        {/* 标书报价汇总导出弹窗 */}
        <ExportSummaryModal
          isOpen={isExportModalOpen}
          items={boqItems}
          globalParams={globalParams}
          proposalSections={proposalSections}
          variableValues={variableValues}
          noticeAnalysis={noticeAnalysis}
          instructionsRecord={instructionsRecord}
          onClose={() => setIsExportModalOpen(false)}
        />

        {/* 产品功能清单、系统架构与详细交互逻辑规范 (PRD / PDF 导出) 模态框 */}
        <ProductDocModal
          isOpen={isProductDocModalOpen}
          onClose={() => setIsProductDocModalOpen(false)}
        />

        {/* 多标段中心 ZIP 快速导入 */}
        <BidImportModal
          isOpen={isBidImportModalOpen}
          onClose={() => setIsBidImportModalOpen(false)}
          onImportSuccess={(result) => {
            const newProject: TenderProject = {
              id: `TEND-${Date.now().toString().slice(-5)}`,
              aivlProjectId: result.projectId > 0 ? result.projectId : undefined, // 保存后端项目ID
              name: result.projectName,
              code: `BID-${Date.now().toString().slice(-6)}`,
              client: result.client || '待识别', // 使用提取的业主信息
              country: '阿尔及利亚',
              currency: 'EUR',
              deadline: '2026-11-30',
              status: 'in_progress',
              statusLabel: '招标文件解析中',
              category: '基础设施',
              createdAt: new Date().toISOString().split('T')[0],
              updatedAt: new Date().toISOString().split('T')[0],
              description: '正在从招标包中提取关键信息...',
              packageFileName: result.projectName + '.zip',
              packageFileSize: '未知',
              currentStep: 'notice',
              attachments: result.files.map((f) => ({
                id: `ATT-${Date.now().toString().slice(-5)}-${f.name.slice(0, 3)}`,
                name: f.name,
                type: f.type as any,
                uploadedAt: new Date().toISOString(),
                fileSize: '未知',
                parsedStatus: f.status === 'parsed' ? 'done' : 'pending',
              })),
              variableValues: INITIAL_VARIABLE_VALUES,
              proposalSections: INITIAL_PROPOSAL_SECTIONS,
              boqItems: INITIAL_BOQ_ITEMS,
              rfqRecords: MOCK_RFQ_RECORDS,
            };
            setTenderProjects((prev) => [newProject, ...prev]);
            setActiveTenderId(newProject.id);
            setIsBidImportModalOpen(false);

            // 上传完成后留在标段管理中心，用户可以查看文件、确认后再决定下一步
            // 不自动跳转，由用户在标段卡片上点击"招标公告/投标须知/组价"进入对应工作台
            setActiveTab('tender-hub');
          }}
        />
      </div>
    </div>
  );
}
