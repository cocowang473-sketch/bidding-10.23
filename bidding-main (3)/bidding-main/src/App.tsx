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
import { TenderAttachment, TenderPackageParseResult } from './types/tenderAttachment';
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
import { INITIAL_TENDER_ATTACHMENTS } from './data/mockTenderAttachments';
import { DEFAULT_EMAIL_TEMPLATES } from './utils/rfqEmailTemplates';
import { calculateAllBoqItems, calculateItemCost } from './utils/pricingEngine';
import { Header } from './components/Header';
import { BoqPricingWorkbench } from './components/BoqPricingWorkbench';
import { ProposalAssemblyCanvas } from './components/ProposalAssemblyCanvas';
import { TenderNoticeAttachmentManager } from './components/TenderNoticeAttachmentManager';
import { DualDatabaseView } from './components/DualDatabaseView';
import { EmailRfqHubView } from './components/EmailRfqHubView';
import { GlobalConfigAndRfqView } from './components/GlobalConfigAndRfqView';
import { SendEmailRfqModal } from './components/SendEmailRfqModal';
import { ExportSummaryModal } from './components/ExportSummaryModal';
import { AppSidebar, MainNavId } from './components/AppSidebar';
import { ChangeHistoryDrawer } from './components/ChangeHistoryDrawer';
import { BoqImportModal } from './components/BoqImportModal';
import { ChangeHistoryRecord } from './types/history';
import { INITIAL_CHANGE_HISTORY } from './data/mockHistory';
import { TenderProject, TenderStage } from './types/tenderProject';
import { INITIAL_TENDER_PROJECTS } from './data/mockTenderProjects';
import { TenderProjectsHubView } from './components/TenderProjectsHubView';
import { CreateTenderModal } from './components/CreateTenderModal';
import { LayoutWidthMode, TableDensityMode } from './components/ViewAdaptationControls';
import { TenderWorkspaceHeader, TenderWorkbenchSubTab } from './components/TenderWorkspaceHeader';
import { TenderProjectOverview } from './components/TenderProjectOverview';
import { ProposalInteractivePreview } from './components/ProposalInteractivePreview';
import { ProductDocModal } from './components/ProductDocModal';
import { EnterpriseTalentHub } from './components/EnterpriseTalentHub';
import {
  EnterpriseTalentProfile,
  INITIAL_ENTERPRISE_TALENT_PROFILES,
} from './types/enterpriseTalent';

export default function App() {
  const [globalParams, setGlobalParams] = useState<GlobalPricingParams>(INITIAL_GLOBAL_PARAMS);
  const [quotas, setQuotas] = useState<InstallationQuotaComponent[]>(MOCK_INSTALLATION_QUOTAS);
  const [materials, setMaterials] = useState<MaterialComponent[]>(MOCK_MATERIALS);
  const [rfqRecords, setRfqRecords] = useState<RfqInquiryRecord[]>(MOCK_RFQ_RECORDS);

  // 导入工程量清单 (Excel/CSV) 弹窗状态
  const [isBoqImportModalOpen, setIsBoqImportModalOpen] = useState(false);

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

  // 多标段分类管理状态：支持多标并行、独立隔离文件、变量与量单
  const [tenders, setTenders] = useState<TenderProject[]>(INITIAL_TENDER_PROJECTS);
  const [activeTenderId, setActiveTenderId] = useState<string>('TENDER-2026-001');
  const [isCreateTenderModalOpen, setIsCreateTenderModalOpen] = useState(false);

  // 获取当前正在作业的标段
  const activeTender = React.useMemo(() => {
    return tenders.find((t) => t.id === activeTenderId) || tenders[0];
  }, [tenders, activeTenderId]);

  // 从当前标段解构其独立的三个核心板块数据
  const proposalSections = activeTender.proposalSections;
  const variableValues = activeTender.variableValues;
  const tenderAttachments = activeTender.attachments;
  const boqItems = activeTender.boqItems;

  // 标段数据受控调度器：每个标段独立拥有完整的附件库、变量库、须知装配与清单组价
  const setProposalSections = (updater: React.SetStateAction<ProposalSection[]>) => {
    setTenders((prev) =>
      prev.map((t) => {
        if (t.id === activeTender.id) {
          const next = typeof updater === 'function' ? updater(t.proposalSections) : updater;
          return {
            ...t,
            proposalSections: next,
            updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
          };
        }
        return t;
      })
    );
  };

  const setVariableValues = (updater: React.SetStateAction<VariableValues>) => {
    setTenders((prev) =>
      prev.map((t) => {
        if (t.id === activeTender.id) {
          const next = typeof updater === 'function' ? updater(t.variableValues) : updater;
          return {
            ...t,
            variableValues: next,
            updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
          };
        }
        return t;
      })
    );
  };

  const setTenderAttachments = (updater: React.SetStateAction<TenderAttachment[]>) => {
    setTenders((prev) =>
      prev.map((t) => {
        if (t.id === activeTender.id) {
          const next = typeof updater === 'function' ? updater(t.attachments) : updater;
          return {
            ...t,
            attachments: next,
            updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
          };
        }
        return t;
      })
    );
  };

  const setBoqItems = (updater: React.SetStateAction<BoqItem[]>) => {
    setTenders((prev) =>
      prev.map((t) => {
        if (t.id === activeTender.id) {
          const next = typeof updater === 'function' ? updater(t.boqItems) : updater;
          return {
            ...t,
            boqItems: next,
            updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
          };
        }
        return t;
      })
    );
  };

  // 当从标书组装区穿透至附件库时的预选过滤变量
  const [tenderAttachmentFilter, setTenderAttachmentFilter] = useState<string | null>(null);
  // 当从附件库穿透至标书组装区时目标高亮变量
  const [targetFocusedVariable, setTargetFocusedVariable] = useState<string | null>(null);

  // 左侧边栏折叠状态：屏幕小于 1200px 自动收起，保障大屏开阔自适应
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1200;
    }
    return false;
  });

  // 监听窗口尺寸变化，自动适应侧边栏展开/折叠
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1200) {
        setIsSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 标段内作业流子模式：遵从「标段总览 -> 招标公告与文件解析 -> 招标须知与标书装配 -> 清单智能组价」的标准作业序
  const [workbenchSubTab, setWorkbenchSubTab] = useState<TenderWorkbenchSubTab>('overview');

  // 双库子模式：'materials' (总库) | 'contracts' (历史签单与导入) | 'aliases' (别名映射)
  const [dualDbSubTab, setDualDbSubTab] = useState<'materials' | 'contracts' | 'aliases'>('materials');

  // 询价中心子模式：'records' (询价记录) | 'compare' (比价看板) | 'templates' (邮件模板)
  const [rfqSubTab, setRfqSubTab] = useState<'records' | 'compare' | 'templates'>('records');

  // 全局企业人才库状态 (支持导入简历、智能提取、职位维护、在岗任务及档期冲突研判)
  const [talentProfiles, setTalentProfiles] = useState<EnterpriseTalentProfile[]>(
    INITIAL_ENTERPRISE_TALENT_PROFILES
  );

  const [activeTab, setActiveTab] = useState<'tenders' | 'workbench' | 'dual-db' | 'rfq' | 'config' | 'talent'>('tenders');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isProductDocModalOpen, setIsProductDocModalOpen] = useState(false);
  // 附件板块内部视图模式：'vault' (方块网格库) | 'matrix' (八大板块结构化提取) | 'upload' (上传解包)
  const [attachmentSubView, setAttachmentSubView] = useState<'vault' | 'matrix' | 'upload'>('vault');

  // 当前主导航选中的条目 ID (映射到左侧垂直边栏)
  const currentNavId: MainNavId = (() => {
    if (activeTab === 'tenders') return 'tenders-hub';
    if (activeTab === 'workbench') {
      if (workbenchSubTab === 'overview') return 'workbench-overview';
      if (workbenchSubTab === 'attachments') return 'workbench-attachments';
      if (workbenchSubTab === 'variables') return 'workbench-variables';
      if (workbenchSubTab === 'preview') return 'workbench-preview';
      return 'workbench-boq';
    }
    if (activeTab === 'talent') {
      return 'enterprise-talent';
    }
    if (activeTab === 'dual-db') {
      return `dual-db-${dualDbSubTab}` as MainNavId;
    }
    if (activeTab === 'rfq') {
      return `rfq-${rfqSubTab}` as MainNavId;
    }
    return 'config';
  })();

  // 当前面包屑指示 (严格遵循 标段名 -> 招标公告 -> 招标须知 -> 组价 顺序)
  const currentBreadcrumb = (() => {
    switch (currentNavId) {
      case 'tenders-hub':
        return { group: '标段分类管理', item: '多标管理与项目总览' };
      case 'workbench-overview':
        return { group: activeTender.name, item: '标段综合工作台 (驾驶舱)' };
      case 'workbench-attachments':
        return { group: `${activeTender.name} (第1板块)`, item: '1. 招标公告与官方文件解析' };
      case 'workbench-variables':
        return { group: `${activeTender.name} (第2板块)`, item: '2. 投标须知与标书装配' };
      case 'workbench-preview':
        return { group: `${activeTender.name} (标书排版)`, item: '标书交互排版与打印预览 (A4 标准PDF)' };
      case 'workbench-boq':
        return { group: `${activeTender.name} (第3板块)`, item: '3. 投标组件与清单智能组价' };
      case 'enterprise-talent':
        return { group: '工程人才与核心资产库', item: '企业人才库与在岗中枢 (简历提取/岗位矩阵/档期研判)' };
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
        return { group: '成本测算与国际费率', item: '国际汇率与综合费率引擎' };
      default:
        return { group: '工程智能组价平台', item: '组价工作台' };
    }
  })();

  // 左侧导航点击无缝跳转并切换深层子视图
  const handleSidebarNavigate = (navId: MainNavId) => {
    switch (navId) {
      case 'tenders-hub':
        setActiveTab('tenders');
        break;
      case 'workbench-overview':
        setActiveTab('workbench');
        setWorkbenchSubTab('overview');
        break;
      case 'workbench-attachments':
        setActiveTab('workbench');
        setWorkbenchSubTab('attachments');
        break;
      case 'workbench-variables':
        setActiveTab('workbench');
        setWorkbenchSubTab('variables');
        break;
      case 'workbench-preview':
        setActiveTab('workbench');
        setWorkbenchSubTab('preview');
        break;
      case 'workbench-boq':
        setActiveTab('workbench');
        setWorkbenchSubTab('boq');
        break;
      case 'enterprise-talent':
        setActiveTab('talent');
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

  // 附件操作处理程序
  const handleAddAttachment = (newAtt: TenderAttachment) => {
    setTenderAttachments((prev) => [newAtt, ...prev]);
    logChange({
      actionType: 'import',
      title: `登记招标文件附件「${newAtt.name}」`,
      description: `已归档至 ${newAtt.category} 分类，建立 ${newAtt.linkedVariables.length} 处项目变量锚定。`,
      target: newAtt.fileName,
      operator: '当前商务造价师',
    });
  };

  const handleUpdateAttachment = (updated: TenderAttachment) => {
    setTenderAttachments((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a))
    );
    logChange({
      actionType: 'variable',
      title: `更新招标附件「${updated.name}」变量关联`,
      description: `调整变量关联与条款引用，当前共锚定 ${updated.linkedVariables.length} 个标书变量。`,
      target: updated.fileName,
      operator: '当前商务造价师',
    });
  };

  const handleDeleteAttachment = (id: string) => {
    const target = tenderAttachments.find((a) => a.id === id);
    setTenderAttachments((prev) => prev.filter((a) => a.id !== id));
    logChange({
      actionType: 'system',
      title: `移除招标文件附件「${target?.name || id}」`,
      description: `已从当前标段附件库中注销，并解除对相关项目变量的依据挂接。`,
      target: target?.fileName || id,
      operator: '当前商务造价师',
    });
  };

  // 批量更新变量
  const handleBatchUpdateVariables = (updates: Record<string, string>) => {
    setVariableValues((prev) => ({
      ...prev,
      ...updates,
    }));
    logChange({
      actionType: 'variable',
      title: `批量同步招标公告解析变量 (${Object.keys(updates).length} 项)`,
      description: `从招标公告与附件中自动提取并人工确认注入 ${Object.keys(updates).length} 项标书变量。`,
      target: '全案商务标变量库',
      operator: '当前商务造价师',
    });
  };

  // 处理解析后的整套招标公告文件包
  const handleAddParsedPackage = (result: TenderPackageParseResult) => {
    setTenderAttachments((prev) => [...result.unpackedFiles, ...prev]);
    logChange({
      actionType: 'import',
      title: `解压并解析招标公告包「${result.packageName}」`,
      description: `自动识别解构 ${result.unpackedFiles.length} 份官方招标文件，锁定并同步项目变量。`,
      target: result.packageName,
      operator: '当前商务造价师',
    });
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

  // 导入工程量清单成功回调 (支持 Excel/CSV 自动提取及即时双库重算)
  const handleImportBoqSuccess = (importedItems: BoqItem[], autoRunAiMatch: boolean = true) => {
    let nextItems = importedItems;
    if (autoRunAiMatch) {
      nextItems = calculateAllBoqItems(importedItems, globalParams);
    }
    setBoqItems(nextItems);
    setActiveTab('workbench');
    setWorkbenchSubTab('boq');
    logChange({
      actionType: 'pricing',
      title: `导入工程量清单 (${importedItems.length} 项)`,
      description: `从 Excel/CSV 提取并载入 ${importedItems.length} 项工程子目，结构校验通过 100%${autoRunAiMatch ? '，已自动完成双库匹配与直接费测算' : ''}。`,
      target: '强电工程量清单组价工作台',
      operator: '当前商务造价师',
    });
  };

  // 载入中建二局阿尔及利亚工程示范工程量清单 (支持 240 医院、奥兰体育馆、嘉玛清真寺多工程)
  const handleLoadSampleBoqItems = (preset: 'hospital' | 'stadium' | 'mosque' = 'hospital') => {
    let source = INITIAL_BOQ_ITEMS;
    let title = '载入阿尔及利亚 240 医院标杆示例清单 (7 项)';
    if (preset === 'stadium') {
      source = INITIAL_BOQ_ITEMS.slice(0, 4);
      title = '载入阿尔及利亚奥兰体育馆大功率变配电示范清单 (4 项)';
    } else if (preset === 'mosque') {
      source = INITIAL_BOQ_ITEMS.slice(3, 7);
      title = '载入嘉玛大清真寺动力与防雷接地示范清单 (4 项)';
    }
    const recalculated = calculateAllBoqItems(source, globalParams);
    setBoqItems(recalculated);
    setActiveTab('workbench');
    setWorkbenchSubTab('boq');
    logChange({
      actionType: 'system',
      title,
      description: `已成功载入 ${source.length} 项核心强电清单子目，并自动完成双库匹配与直接费测算。`,
      target: '强电工程量清单组价工作台',
      operator: '当前商务造价师',
    });
  };

  // 清空工程量清单 (进入未导入初始状态)
  const handleClearBoqItems = () => {
    setBoqItems([]);
    logChange({
      actionType: 'system',
      title: '清空工程量清单数据',
      description: '标段工程量清单已清空，工作台切换至未导入初始准备引导状态，等待导入新的 Excel/CSV 清单文件。',
      target: '强电工程量清单组价工作台',
      operator: '当前商务造价师',
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
          attachments: tenderAttachments.length,
          tenders: tenders.length,
        }}
        activeTender={activeTender}
        tenders={tenders}
        onSelectTender={(id) => {
          setActiveTenderId(id);
          setActiveTab('workbench');
          setWorkbenchSubTab('overview');
        }}
        onOpenCreateModal={() => setIsCreateTenderModalOpen(true)}
        onOpenProductDocModal={() => setIsProductDocModalOpen(true)}
        onOpenHistoryDrawer={() => setIsHistoryDrawerOpen(true)}
      />

      {/* 右侧主工作区容器 */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {/* 顶部企业级纯净导航 */}
        <Header
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
          currentBreadcrumb={currentBreadcrumb}
          activeTender={activeTender}
          tenders={tenders}
          onSelectTender={(tenderId) => {
            setActiveTenderId(tenderId);
            setActiveTab('workbench');
            setWorkbenchSubTab('overview');
          }}
          onNavigateToTendersHub={() => setActiveTab('tenders')}
          onNavigateToWorkbenchOverview={() => {
            setActiveTab('workbench');
            setWorkbenchSubTab('overview');
          }}
          onOpenCreateModal={() => setIsCreateTenderModalOpen(true)}
          onOpenHistoryDrawer={() => setIsHistoryDrawerOpen(true)}
          historyCount={historyList.length}
          isAutoSaving={isAutoSaving}
          lastSavedText={lastSavedText}
          layoutWidth={layoutWidth}
          onLayoutWidthChange={setLayoutWidth}
          zoomScale={zoomScale}
          onZoomScaleChange={setZoomScale}
          tableDensity={tableDensity}
          onTableDensityChange={setTableDensity}
          onOpenProductDocModal={() => setIsProductDocModalOpen(true)}
          onOpenExportModal={() => setIsExportModalOpen(true)}
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
          {/* 模块 0: 海外投标标段分类管理看板 (多标并行推进与新建标段) */}
          {activeTab === 'tenders' && (
            <TenderProjectsHubView
              tenders={tenders}
              activeTenderId={activeTenderId}
              onSelectTender={(tenderId, targetStep) => {
                setActiveTenderId(tenderId);
                setActiveTab('workbench');
                if (targetStep === 'instructions') {
                  setWorkbenchSubTab('variables');
                } else if (targetStep === 'pricing') {
                  setWorkbenchSubTab('boq');
                } else if (targetStep === 'notice') {
                  setWorkbenchSubTab('attachments');
                } else {
                  setWorkbenchSubTab('overview');
                }
              }}
              onOpenCreateModal={() => setIsCreateTenderModalOpen(true)}
              onDeleteTender={(tenderId) => {
                if (tenders.length <= 1) return;
                setTenders((prev) => prev.filter((t) => t.id !== tenderId));
                if (activeTenderId === tenderId) {
                  const next = tenders.find((t) => t.id !== tenderId);
                  if (next) setActiveTenderId(next.id);
                }
              }}
            />
          )}

          {activeTab === 'workbench' && (
            <div className="space-y-4">
              {/* 标段综合导航与状态栏 (对标市面主流投标文件系统) */}
              <TenderWorkspaceHeader
                activeTender={activeTender}
                activeSubTab={workbenchSubTab}
                onSubTabChange={(tab) => setWorkbenchSubTab(tab)}
                onBackToTendersHub={() => setActiveTab('tenders')}
              />

              {/* 子板块 0: 标段综合工作台 (总览/驾驶舱) */}
              {workbenchSubTab === 'overview' && (
                <TenderProjectOverview
                  tender={activeTender}
                  onNavigateToSubTab={(subTab) => setWorkbenchSubTab(subTab)}
                  onNavigateToAttachmentsSubTab={(subView) => {
                    setAttachmentSubView(subView);
                    setWorkbenchSubTab('attachments');
                  }}
                  onOpenExportModal={() => setIsExportModalOpen(true)}
                  onInspectAttachment={() => {
                    setAttachmentSubView('vault');
                    setWorkbenchSubTab('attachments');
                  }}
                />
              )}

              {/* 子模式 1: 标书组件组装与变量识别编辑区 (由左侧边栏独立切换) */}
              {workbenchSubTab === 'variables' && (
                <ProposalAssemblyCanvas
                  sections={proposalSections}
                  variableValues={variableValues}
                  onUpdateSections={setProposalSections}
                  onUpdateVariable={handleUpdateVariable}
                  onResetToDemoValues={handleResetToDemoValues}
                  attachments={tenderAttachments}
                  onNavigateToAttachments={(varKey) => {
                    setTenderAttachmentFilter(varKey || null);
                    setActiveTab('workbench');
                    setWorkbenchSubTab('attachments');
                  }}
                  onNavigateToBoq={() => {
                    setActiveTab('workbench');
                    setWorkbenchSubTab('boq');
                  }}
                  onNavigateToTalentHub={() => {
                    setActiveTab('talent');
                  }}
                  focusedVariable={targetFocusedVariable}
                  onFocusVariable={setTargetFocusedVariable}
                  projectName={activeTender.name}
                  tenderCode={activeTender.code}
                />
              )}

              {/* 子模式: 标书交互排版与打印预览 (支持在界面上动态排版标书内容，自定义打印布局CSS模块) */}
              {workbenchSubTab === 'preview' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col min-h-[720px]">
                  <ProposalInteractivePreview
                    sections={proposalSections}
                    variableValues={variableValues}
                    projectName={activeTender.name}
                    tenderCode={activeTender.code}
                    onClose={() => setWorkbenchSubTab('variables')}
                  />
                </div>
              )}

              {/* 子模式 2: 招标文件与附件管理中心 (独立全屏视图，支持 ZIP 上传解析、变量锁定与人工补齐) */}
              {workbenchSubTab === 'attachments' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col min-h-[680px] h-[calc(100vh-140px)] max-h-[1080px]">
                  <TenderNoticeAttachmentManager
                    attachments={tenderAttachments}
                    variableValues={variableValues}
                    defaultTab={attachmentSubView}
                    onAddAttachment={handleAddAttachment}
                    onAddParsedPackage={handleAddParsedPackage}
                    onUpdateAttachment={handleUpdateAttachment}
                    onDeleteAttachment={handleDeleteAttachment}
                    onUpdateVariable={handleUpdateVariable}
                    onBatchUpdateVariables={handleBatchUpdateVariables}
                    onJumpToVariable={(varKey) => {
                      setTargetFocusedVariable(varKey);
                      setActiveTab('workbench');
                      setWorkbenchSubTab('variables');
                    }}
                    onJumpToSection={() => {
                      setActiveTab('workbench');
                      setWorkbenchSubTab('variables');
                    }}
                    onJumpToBoq={() => {
                      setActiveTab('workbench');
                      setWorkbenchSubTab('boq');
                    }}
                    selectedVariableFilter={tenderAttachmentFilter}
                    onClearVariableFilter={() => setTenderAttachmentFilter(null)}
                  />
                </div>
              )}

              {/* 子模式 2: CFO 工程量清单双库组价台 */}
              {workbenchSubTab === 'boq' && (
                <BoqPricingWorkbench
                  items={boqItems}
                  globalParams={globalParams}
                  allMaterials={materials}
                  allQuotas={quotas}
                  rfqRecords={rfqRecords}
                  historicalContracts={historicalContracts}
                  onOpenImportModal={() => setIsBoqImportModalOpen(true)}
                  onOpenExportModal={() => setIsExportModalOpen(true)}
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
                  onLoadSampleItems={handleLoadSampleBoqItems}
                  onClearItems={handleClearBoqItems}
                  onNavigateToDualDb={(subTab) => {
                    setActiveTab('dual-db');
                    setDualDbSubTab(subTab);
                  }}
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

          {/* 模块 5: 工程人才与核心资产库 - 企业人才库与在岗中枢 */}
          {activeTab === 'talent' && (
            <EnterpriseTalentHub
              talentList={talentProfiles}
              onUpdateTalentList={setTalentProfiles}
              onAssignToCurrentBid={(talent) => {
                setActiveTab('workbench');
                setWorkbenchSubTab('variables');
              }}
              onNavigateToAttachment04={() => {
                setActiveTab('workbench');
                setWorkbenchSubTab('variables');
              }}
              targetProjectName={activeTender.name}
              targetMobilizationDate="2025-06-01"
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
          onClose={() => setIsExportModalOpen(false)}
        />

        {/* 新建标段弹窗 (支持上传官方招标 ZIP 包并立项) */}
        <CreateTenderModal
          isOpen={isCreateTenderModalOpen}
          onClose={() => setIsCreateTenderModalOpen(false)}
          onCreateTender={(newTender) => {
            setTenders((prev) => [newTender, ...prev]);
            setActiveTenderId(newTender.id);
            setIsCreateTenderModalOpen(false);
            setActiveTab('workbench');
            setWorkbenchSubTab('attachments');
            logChange({
              actionType: 'system',
              title: `新建海外工程标段「${newTender.name}」`,
              description: `立项国别 ${newTender.country}，结算币种 ${newTender.currency}，已自动建立招标公告、投标须知与清单组价专属工作台。`,
              target: newTender.name,
              operator: '当前商务造价师',
            });
          }}
        />

        {/* 标段操作变更审计历史抽屉 */}
        <ChangeHistoryDrawer
          isOpen={isHistoryDrawerOpen}
          historyList={historyList}
          onClose={() => setIsHistoryDrawerOpen(false)}
          onClearHistory={() => setHistoryList([])}
        />

        {/* 导入工程量清单 (Excel/CSV) 弹窗 */}
        <BoqImportModal
          isOpen={isBoqImportModalOpen}
          onClose={() => setIsBoqImportModalOpen(false)}
          onImportSuccess={handleImportBoqSuccess}
          currentCount={boqItems.length}
        />

        {/* 系统操作规程与业务架构说明 (PRD) 手册 */}
        <ProductDocModal
          isOpen={isProductDocModalOpen}
          onClose={() => setIsProductDocModalOpen(false)}
        />
      </div>
    </div>
  );
}
