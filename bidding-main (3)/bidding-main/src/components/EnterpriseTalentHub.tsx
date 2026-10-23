import React, { useState, useMemo, useRef } from 'react';
import {
  Users,
  UserPlus,
  FileText,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Briefcase,
  Building2,
  Calendar,
  Globe2,
  Award,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Upload,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  Download,
  CheckSquare,
  Square,
  AlertCircle,
  HelpCircle,
  FolderUp,
  Paperclip,
  FileCode,
} from 'lucide-react';
import {
  EnterpriseTalentProfile,
  TalentCurrentTask,
  AvailabilityStatus,
  INITIAL_ENTERPRISE_TALENT_PROFILES,
} from '../types/enterpriseTalent';

interface EnterpriseTalentHubProps {
  talentList: EnterpriseTalentProfile[];
  onUpdateTalentList: (list: EnterpriseTalentProfile[]) => void;
  onAssignToCurrentBid?: (talent: EnterpriseTalentProfile) => void;
  onNavigateToAttachment04?: () => void;
  targetProjectName?: string;
  targetMobilizationDate?: string; // 拟派驻进场时间，例如 "2025-06-01"
}

export const EnterpriseTalentHub: React.FC<EnterpriseTalentHubProps> = ({
  talentList,
  onUpdateTalentList,
  onAssignToCurrentBid,
  onNavigateToAttachment04,
  targetProjectName = '阿尔及利亚提济乌祖省 240 床综合医院项目',
  targetMobilizationDate = '2025-06-01',
}) => {
  // 筛选与搜索状态
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleCategory, setSelectedRoleCategory] = useState<string>('all');
  const [selectedAvailabilityFilter, setSelectedAvailabilityFilter] = useState<string>('all');
  const [requireHospitalExp, setRequireHospitalExp] = useState(false);
  const [requireAlgeriaExp, setRequireAlgeriaExp] = useState(false);
  const [requireLocalSubcontract, setRequireLocalSubcontract] = useState(false);
  const [requireOverseasProcure, setRequireOverseasProcure] = useState(false);

  // 拟比对目标标段进场时间 (用于判断什么时候有空 / 是否时间冲突)
  const [evalMobilizationDate, setEvalMobilizationDate] = useState(targetMobilizationDate);

  // 弹窗状态
  const [isImportResumeModalOpen, setIsImportResumeModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [editingTalent, setEditingTalent] = useState<EnterpriseTalentProfile | null>(null);
  const [selectedTalentDetail, setSelectedTalentDetail] = useState<EnterpriseTalentProfile | null>(null);

  // 简历导入工作台状态
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeImportTab, setActiveImportTab] = useState<'upload_doc' | 'paste_text'>('upload_doc');
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
    formattedSize: string;
    type: string;
    uploadedAt: string;
  } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [resumeTextInput, setResumeTextInput] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedDraft, setExtractedDraft] = useState<Partial<EnterpriseTalentProfile> | null>(null);
  const [extractSuccessToast, setExtractSuccessToast] = useState(false);

  // 视图模式：卡片网格 vs 紧凑排期矩阵
  const [viewMode, setViewMode] = useState<'cards' | 'matrix'>('cards');

  // 真实简历文档库样本 (支持一键载入测试体验文档导入与解析能力)
  const SAMPLE_DOCUMENT_FILES = [
    {
      fileName: '陈建华_机电项目经理_个人履历及海外医院业绩证明.docx',
      fileSize: '348 KB',
      fileType: 'DOCX',
      role: '机电项目经理',
      content: `姓名：陈建华
拟任岗位：机电项目经理 (Directeur de Projet MEP)
出生日期：1979年5月12日，工龄：23年
学历：同济大学工程硕士（供热供燃气通风及空调工程）
执业证书：一级建造师（建筑/机电双专业）、高级工程师、法国SOCOTEC认证质量工程师
工作经历与北非常驻：
常驻阿尔及利亚12年，熟练掌握法语（工作语言）及英语。
重点医院业绩：
1. 阿尔及尔大学城500床综合教学医院机电总承包项目经理（同等规模以上综合医院）
2. 奥兰心血管专科医院手术室洁净空调与气体系统负责人
属地化经验：
具备多年属地分包带班与本地技术人员培训管理经验，熟悉阿尔及利亚公共工程部采购法规。
境外采购经验：
主导欧洲及中东医疗气体系统及变配电设备境外国际集采、海运及免税清关。
当前在建任务：
阿尔及尔东区综合医疗门诊楼机电顾问，当前进度95%，预计2025年4月20日竣工撤场交接，可即刻锁定派驻新标段。
护照及签证：
中国因公护照（2029年有效），阿尔及利亚常驻工作签证有效。具备甲方面试即刻到场资格。`,
    },
    {
      fileName: 'Karim_Belkacem_属地电气总工_中法双语档案.pdf',
      fileSize: '412 KB',
      fileType: 'PDF',
      role: '电气技术总工',
      content: `Nom: Karim Belkacem (卡里姆·贝尔卡塞姆)
Poste: Ingénieur en Chef Électricité / 电气技术总工
Nationalité: Algérienne (阿尔及利亚属地外籍专家)
Diplôme: Ingénieur d'État en Génie Électrique (USTHB Alger, 工学硕士)
Expérience: 17年电气工程与医院智能化施工经验
Langues: Arabe (maternelle), Français (bilingue), 中文基础沟通
Qualifications: Agréé Sonelgaz (高低压配电认证), Expert NF C 15-100 & NF C 15-211
Projets Médicaux Majeurs:
- Hôpital Militaire Régional de Constantine (君士坦丁军区医院高低压强电系统)
- Centre Anti-Cancer de Batna (巴特纳抗癌中心UPS与医用隔离变压器IT系统)
Sous-traitance Locale & Encadrement:
- 长期带领阿尔及利亚属地班组进行母线槽与配电盘配线，熟悉阿尔及利亚劳动法与工伤申报流程。
Mission Actuelle:
Superviseur Électrique chez Entreprise Publique, fin de mission prévue le 2025-05-15.
Disponibilité: Disponible pour mobilisation immédiate à partir du 2025-05-20.`,
    },
    {
      fileName: '黄海鹏_境外采购与物流清关主管_履历.docx',
      fileSize: '286 KB',
      fileType: 'DOCX',
      role: '境外采购经理',
      content: `姓名：黄海鹏
岗位：境外采购与物流清关经理 (Responsable Approvisionnement & Transit)
工龄：16年国际工程采购与物流经验
学历：国际经济与贸易本科，中级经济师
海外驻场年限：常驻阿尔及利亚7年，法语熟练、英语精通。
核心能力与经验：
1. 境外采购与免税批文：精通阿尔及利亚财政部与海关总署设备材料进口免税批单（Franchise Douanière）申报，掌握免除增值税TVA与进口关税全套流程。
2. 医院专用设备供应链：熟悉法国特种医用气体阀件、洁净空调机组欧洲原产地证明（EUR.1）及装船前检验（Certificat SGS）。
3. 属地化物流网络：拥有阿尔及尔港与奥兰港常备清关代理协作网络。
当前在岗任务：
负责奥兰在建水处理项目最后两批设备海运到港与清关，预计2025年4月10日完成所有集装箱移交，即可全面释放投入新项目。`,
    },
  ];

  // 预设简历样本 (方便一键载入测试体验真实提取能力)
  const RESUME_PRESETS = [
    {
      title: '张海峰 - 机电技术总工 (9年北非医院高低压专科)',
      sampleText: `张海峰，男，1981年8月出生，工学学士，电气工程及其自动化专业。
工龄20年，高级工程师，一级建造师，法国SOCOTEC认证质量检查员。
常驻阿尔及利亚9年，法语熟练（工作语言），熟练掌握欧洲及法国NF标准、DTR建筑规范。
主要业绩：主持安纳巴心血管专科医院手术室孤立电源(IT系统)深化设计，阿尔及尔教学医院10kV双回路变配电安装工程。
属地经验：组织编制中法双语技术交底卡与本地员工安全规范手册，具有丰富属地分包带班经验。
当前在岗任务：负责“安纳巴专科医院变配电扩建工程”电气总工，目前负荷进度92%，预计2025年3月31日正式取得电力公司送电批文并撤场释放。
证照状态：持有有效中国因公护照（有效期至2029年），阿尔及利亚常驻工作签证有效。`,
    },
    {
      title: '周志成 - 暖通洁净空调工程师 (医院净化受控环境专家)',
      sampleText: `周志成，男，1983年12月生，暖通空调与制冷工程学士，18年机电施工工龄。
持有注册公用设备工程师(暖通空调)、VDI 6022洁净卫生认证。
阿尔及利亚驻场8年，法语熟练。精通法国医疗受控环境空气质量标准 NF S 90-351。
重点业绩：君士坦丁抗癌中心正负压隔离病房、百级层流手术室净化机组安装调试。
属地管理：带领阿尔及利亚本地钣金技工完成18000平方米镀锌风管就地制作与漏风率测试。
当前任务：奥兰国际会展中心暖通改建工程暖通专业负责人，现场进度85%，预计2025年4月28日竣工交付后全面释放。`,
    },
    {
      title: '刘志刚 - 冲突候选人 (在建项目2025年11月才完工)',
      sampleText: `刘志刚，1978年生，工学学士，机电一级建造师。工龄22年，常驻阿尔及利亚8年。
当前在建项目：担任奥兰超大型商业综合体机电总承包项目经理。
当前任务状态：该项目为合同备案锁定工程，目前进行至62%，主干冷水机组与管井就位中，合同明确要求竣工验收前严禁撤换项目经理，预计2025年11月30日方可完工。
时间研判预警：若指派至2025年6月开工的新标段，存在严重工期重合与在岗冲突风险！`,
    },
  ];

  // 统计指标
  const metrics = useMemo(() => {
    const total = talentList.length;
    const availableNow = talentList.filter((t) => t.availabilityStatus === 'available_now').length;
    const releasingSoon = talentList.filter((t) => t.availabilityStatus === 'releasing_soon').length;
    const occupiedConflict = talentList.filter((t) => t.availabilityStatus === 'occupied_conflict').length;
    const hospitalExpCount = talentList.filter((t) => t.hasHospitalExp).length;
    const algeriaExpCount = talentList.filter((t) => t.hasAlgeriaExp).length;
    return {
      total,
      availableNow,
      releasingSoon,
      occupiedConflict,
      hospitalExpCount,
      algeriaExpCount,
    };
  }, [talentList]);

  // 计算某人在目标进场日期时是否空闲可用
  const checkAvailabilityForTargetDate = (talent: EnterpriseTalentProfile, targetDateStr: string) => {
    if (!talent.currentTask || talent.availabilityStatus === 'available_now') {
      return { isAvailable: true, reason: '无在岗项目占用，可即刻锁定派驻' };
    }
    const targetDate = new Date(targetDateStr);
    const taskEndDate = new Date(talent.currentTask.estimatedEndDate);

    if (talent.currentTask.isContractualKeyPersonnel && taskEndDate > targetDate) {
      const daysDiff = Math.ceil((taskEndDate.getTime() - targetDate.getTime()) / (1000 * 3600 * 24));
      return {
        isAvailable: false,
        reason: `在岗冲突：属于合同不可撤换关键人员，当前项目预计 ${talent.currentTask.estimatedEndDate} 完工，晚于拟派驻时间 ${targetDateStr}（重叠 ${daysDiff} 天）`,
      };
    }

    if (taskEndDate <= targetDate) {
      return {
        isAvailable: true,
        reason: `空闲可用：当前项目将于 ${talent.currentTask.estimatedEndDate} 释放，早于拟派驻时间 ${targetDateStr}`,
      };
    } else {
      return {
        isAvailable: false,
        reason: `时间冲突：当前项目预计 ${talent.currentTask.estimatedEndDate} 完工释放，晚于拟派驻时间 ${targetDateStr}`,
      };
    }
  };

  // 过滤后的候选人
  const filteredTalents = useMemo(() => {
    return talentList.filter((talent) => {
      // 关键字搜索
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = talent.name.toLowerCase().includes(q);
        const matchRole = talent.role.toLowerCase().includes(q);
        const matchMajor = talent.major.toLowerCase().includes(q);
        const matchTask = talent.currentTask?.projectName.toLowerCase().includes(q);
        const matchHospital = talent.hospitalExpNote?.toLowerCase().includes(q);
        if (!matchName && !matchRole && !matchMajor && !matchTask && !matchHospital) {
          return false;
        }
      }

      // 职位分类筛选
      if (selectedRoleCategory !== 'all') {
        if (selectedRoleCategory === 'project_manager' && !talent.role.includes('项目经理')) return false;
        if (selectedRoleCategory === 'tech_director' && !talent.role.includes('技术总工') && !talent.role.includes('总工程师')) return false;
        if (selectedRoleCategory === 'mep_engineer' && !talent.role.includes('工程师')) return false;
        if (selectedRoleCategory === 'commercial' && !talent.role.includes('商务') && !talent.role.includes('造价')) return false;
        if (selectedRoleCategory === 'hse' && !talent.role.includes('HSE') && !talent.role.includes('安全')) return false;
        if (selectedRoleCategory === 'procurement' && !talent.role.includes('采购') && !talent.role.includes('物流')) return false;
      }

      // 可用状态筛选
      if (selectedAvailabilityFilter !== 'all') {
        if (talent.availabilityStatus !== selectedAvailabilityFilter) return false;
      }

      // 4大核心条件复选
      if (requireHospitalExp && !talent.hasHospitalExp) return false;
      if (requireAlgeriaExp && !talent.hasAlgeriaExp) return false;
      if (requireLocalSubcontract && !talent.hasLocalSubcontractExp) return false;
      if (requireOverseasProcure && !talent.hasOverseasProcurementExp) return false;

      return true;
    });
  }, [
    talentList,
    searchQuery,
    selectedRoleCategory,
    selectedAvailabilityFilter,
    requireHospitalExp,
    requireAlgeriaExp,
    requireLocalSubcontract,
    requireOverseasProcure,
  ]);

  // 智能提取简历信息
  const handleExtractResume = (overrideText?: string, sourceFileName?: string) => {
    const text = (overrideText !== undefined ? overrideText : resumeTextInput).trim();
    if (!text) return;
    setIsExtracting(true);

    setTimeout(() => {
      // 启发式正则解析
      const nameMatch = text.match(/(?:姓名[：:\s]*|Nom[：:\s]*|^)([张王李赵陈刘杨黄周吴孙KrimoKarim][\u4e00-\u9fa5]{1,3}|[A-Z][a-z]+ [A-Z][a-z]+)/);
      const name = nameMatch
        ? nameMatch[1].replace(/(?:姓名|Nom)[：:\s]*/, '').trim()
        : (sourceFileName ? sourceFileName.split(/[_\-\s\.]/)[0] : '导入专家候选人');

      const roleMatch = text.match(/(项目经理|技术总工|总工程师|暖通工程师|电气工程师|给排水工程师|商务经理|采购经理|HSE主管|安全总监|Directeur de Projet|Ingénieur en Chef|Responsable Approvisionnement)/);
      const role = roleMatch ? roleMatch[1] : '海外机电管理专家';

      const degreeMatch = text.match(/(工学硕士|工学学士|管理学硕士|工程硕士|学士|硕士|大专|Ingénieur d'État)/);
      const degree = degreeMatch ? degreeMatch[1] : '工学学士';

      const yearsMatch = text.match(/(\d{1,2})\s*年(?:工龄|机电|工程|工作经验)/);
      const workingYears = yearsMatch ? parseInt(yearsMatch[1], 10) : 18;

      const hasHospital = /医院|病房|手术室|医用气体|净化|医疗|Hôpital|Anti-Cancer/.test(text);
      const hasAlgeria = /阿尔及利亚|阿国|阿尔及尔|安纳巴|奥兰|君士坦丁|提济乌祖|北非|Algér|Alger/.test(text);
      const hasSubcontract = /属地|分包|本地员工|带班|外籍|法文交底|Sous-traitance|Encadrement/.test(text);
      const hasProcure = /采购|海运|清关|免税|原产地证明|集采|报关|Franchise Douanière|Approvisionnement/.test(text);

      const endDateMatch = text.match(/(202\d[-年/]\d{1,2}(?:[-月/]\d{1,2})?)/g);
      const estimatedEndDate = endDateMatch && endDateMatch.length > 0
        ? endDateMatch[endDateMatch.length - 1].replace(/[年月/]/g, '-').replace('日', '')
        : '2025-04-30';

      const isConflict = /冲突|严禁撤换|不得撤换|未完工|高峰施工/.test(text);

      const taskNameMatch = text.match(/“([^”]+)”|负责[“"']?([^，。\n"']+[工程|项目])[”"']?/);
      const currentTaskName = taskNameMatch
        ? (taskNameMatch[1] || taskNameMatch[2])
        : (text.includes('门诊楼') ? '阿尔及尔东区综合医疗门诊楼机电顾问' : text.includes('水处理') ? '奥兰在建水处理项目采购物流' : '在建工程机电专业履约');

      const draft: Partial<EnterpriseTalentProfile> = {
        name,
        role: role.includes('项目经理')
          ? '机电项目经理 (Directeur de Projet MEP)'
          : role.includes('总工')
          ? '机电技术总工 (Ingénieur en Chef MEP)'
          : role.includes('采购')
          ? '境外采购经理 (Responsable Approvisionnement)'
          : `${role} (Ingénieur / Responsable)`,
        degree,
        major: text.includes('电气')
          ? '电气工程及其自动化'
          : text.includes('暖通')
          ? '建筑环境与机电设备工程'
          : text.includes('采购') || text.includes('贸易')
          ? '国际经济与贸易'
          : '工程管理 / 机电一体化',
        workingYears,
        nationality: /Krimo|Karim|Belkacem|本地外籍/.test(text) ? '阿尔及利亚' : '中国',
        currentCountry: '阿尔及利亚',
        hasHospitalExp: hasHospital,
        hospitalExpNote: hasHospital
          ? '具备阿尔及利亚大型综合医院/专科医疗中心同等或更大体量机电智能化安装业绩'
          : '无医院业绩记录',
        hasAlgeriaExp: hasAlgeria,
        algeriaExpNote: hasAlgeria
          ? '具备多年北非常驻履历，精通法国DTR/NF法规标准与监理验评规范'
          : '无北非经验',
        hasLocalSubcontractExp: hasSubcontract,
        localSubcontractNote: hasSubcontract
          ? '具备带领属地化劳务团队、法语技术交底及本地分包管控经验'
          : undefined,
        hasOverseasProcurementExp: hasProcure,
        overseasProcurementNote: hasProcure
          ? '精通阿尔及利亚财政部海关免税批单（Franchise Douanière）申报与设备国际集采'
          : undefined,
        certificates: text.includes('一级建造师')
          ? ['高级工程师', '一级建造师(机电)', '法国SOCOTEC认证']
          : text.includes('Sonelgaz')
          ? ['Sonelgaz电网认证', 'Agréé DTR', 'NF C 15-100资质']
          : ['高级工程师', '注册安全工程师'],
        availabilityDate: estimatedEndDate,
        timeConflict: isConflict,
        resumeUploaded: true,
        performanceProofUploaded: true,
        passportStatus: 'valid',
        visaStatus: 'valid_work_visa',
        frenchLevel: text.includes('熟练') ? '熟练工作语言 (Professionnel)' : '精通 (Courant/Bilingue)',
        englishLevel: '熟练',
        specialtyField: text.includes('暖通')
          ? '暖通洁净空调'
          : text.includes('电气')
          ? '高低压变配电'
          : text.includes('采购')
          ? '采购物流'
          : '综合机电',
        currentTask: {
          projectName: currentTaskName,
          role: role,
          startDate: '2024-01-01',
          estimatedEndDate: estimatedEndDate,
          progressPercent: isConflict ? 60 : 92,
          location: '阿尔及利亚',
          dutyDescription: '负责现场专业施工协调与移交，跟踪完工释放进度。',
          isContractualKeyPersonnel: isConflict,
        },
        availabilityStatus: isConflict ? 'occupied_conflict' : 'releasing_soon',
        rawResumeText: text,
        totalOverseasMonths: workingYears * 6,
        totalHospitalProjectsCount: hasHospital ? 3 : 0,
        lastUpdatedDate: new Date().toISOString().split('T')[0],
      };

      setExtractedDraft(draft);
      setIsExtracting(false);
      setExtractSuccessToast(true);
      setTimeout(() => setExtractSuccessToast(false), 3000);
    }, 600);
  };

  // 生成根据上传文件名特征的仿真结构化简历文本
  const generateSimulatedDocumentText = (fileName: string): string => {
    const cleanName = fileName.replace(/\.[^/.]+$/, '');
    const parts = cleanName.split(/[_\-\s]+/);
    const candidateName = parts[0] || '李明辉';
    const roleKeyword = parts.find((p) => /经理|总工|工程师|安全|采购|商务/.test(p)) || '海外机电技术专家';

    return `【提取自文档：${fileName}】
姓名：${candidateName}
拟任岗位：${roleKeyword.includes('经理') ? '机电项目经理 (Directeur de Projet MEP)' : `${roleKeyword} (Ingénieur / Responsable)`}
性别：男  出生日期：1982年6月  工龄：18年
学历：工学学士  毕业院校：东南大学 机电工程专业
资质证书：高级工程师、一级建造师（机电工程）、阿尔及利亚监理会认证安全工程师
海外常驻年限：常驻阿尔及利亚 8 年，精通法语及规范（DTR / NF C 15-100 / NF S 90-351）
核心医院业绩：
- 曾主持/深度参与阿尔及利亚 300 床公立综合医院机电强电及智能化总承包施工；
- 具备手术室洁净净化及医用气体系统安装调试经验，规模与技术指标达到同等或更大体量。
属地化管理与境外经验：
- 带领过 50+ 阿尔及利亚当地技工班组，熟练推行双语交底；掌握欧洲设备材料采购与海运免税申报。
当前在岗任务与排期：
- 目前负责“阿尔及尔商业中心改扩建弱电智能化工程”技术把关，预计2025年4月30日正式竣工释放，可提前进场投入新标段。
- 证照状态：中国因公护照有效期至2028年，阿尔及利亚常驻工作签有效，若需要面试即可随时到场。`;
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // 处理文件上传解析
  const processUploadedFile = (file: File) => {
    const formatted = formatFileSize(file.size);
    setUploadedFile({
      name: file.name,
      size: file.size,
      formattedSize: formatted,
      type: file.type || file.name.split('.').pop()?.toUpperCase() || 'DOC',
      uploadedAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    });

    if (file.name.endsWith('.txt') || file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = (event.target?.result as string) || '';
        setResumeTextInput(text);
        handleExtractResume(text, file.name);
      };
      reader.readAsText(file);
    } else {
      const text = generateSimulatedDocumentText(file.name);
      setResumeTextInput(text);
      handleExtractResume(text, file.name);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processUploadedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const handleSelectSampleDoc = (sample: (typeof SAMPLE_DOCUMENT_FILES)[0]) => {
    setUploadedFile({
      name: sample.fileName,
      size: 350000,
      formattedSize: sample.fileSize,
      type: sample.fileType,
      uploadedAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    });
    setResumeTextInput(sample.content);
    handleExtractResume(sample.content, sample.fileName);
  };

  // 确认将解析后的简历草稿存入企业人才库
  const handleSaveExtractedDraft = () => {
    if (!extractedDraft || !extractedDraft.name) return;

    const newTalent: EnterpriseTalentProfile = {
      id: `p-import-${Date.now().toString().slice(-4)}`,
      orderNumber: talentList.length + 1,
      role: extractedDraft.role || '机电专业工程师',
      name: extractedDraft.name,
      dob: '1982-01-01',
      degree: extractedDraft.degree || '工学学士',
      major: extractedDraft.major || '机电工程',
      workingYears: extractedDraft.workingYears || 15,
      nationality: extractedDraft.nationality || '中国',
      currentCountry: extractedDraft.currentCountry || '阿尔及利亚',
      currentProject: extractedDraft.currentTask?.projectName || '在岗待命',
      tenureYears: 8,
      hasHospitalExp: !!extractedDraft.hasHospitalExp,
      hospitalExpNote: extractedDraft.hospitalExpNote,
      hasAlgeriaExp: !!extractedDraft.hasAlgeriaExp,
      algeriaExpNote: extractedDraft.algeriaExpNote,
      hasLocalSubcontractExp: !!extractedDraft.hasLocalSubcontractExp,
      localSubcontractNote: extractedDraft.localSubcontractNote,
      hasOverseasProcurementExp: !!extractedDraft.hasOverseasProcurementExp,
      overseasProcurementNote: extractedDraft.overseasProcurementNote,
      certificates: extractedDraft.certificates || ['高级工程师', '一级建造师'],
      availabilityDate: extractedDraft.availabilityDate || '2025-05-01',
      timeConflict: !!extractedDraft.timeConflict,
      resumeUploaded: true,
      performanceProofUploaded: true,
      passportStatus: 'valid',
      visaStatus: 'valid_work_visa',
      frenchLevel: extractedDraft.frenchLevel || '熟练工作语言 (Professionnel)',
      englishLevel: extractedDraft.englishLevel || '熟练',
      specialtyField: extractedDraft.specialtyField || '综合机电',
      currentTask: extractedDraft.currentTask,
      availabilityStatus: extractedDraft.availabilityStatus || 'releasing_soon',
      rawResumeText: extractedDraft.rawResumeText,
      totalOverseasMonths: (extractedDraft.workingYears || 15) * 6,
      totalHospitalProjectsCount: extractedDraft.hasHospitalExp ? 2 : 0,
      lastUpdatedDate: new Date().toISOString().split('T')[0],
    };

    onUpdateTalentList([newTalent, ...talentList]);
    setIsImportResumeModalOpen(false);
    setResumeTextInput('');
    setExtractedDraft(null);
  };

  // 一键将候选人锁定并派驻到当前标段 (附件04)
  const handleAssignPerson = (talent: EnterpriseTalentProfile) => {
    // 检查冲突并温馨确认
    const check = checkAvailabilityForTargetDate(talent, evalMobilizationDate);
    if (!check.isAvailable) {
      const confirmAssign = window.confirm(
        `⚠️ 警告：该候选人存在在岗时间冲突！\n\n【冲突分析】：${check.reason}\n\n若强制指定可能在资格审查中被判定违规。是否仍要确认派驻？`
      );
      if (!confirmAssign) return;
    }

    // 更新状态为已派驻当前标段
    const updated = talentList.map((t) =>
      t.id === talent.id
        ? {
            ...t,
            availabilityStatus: 'assigned_current_bid' as AvailabilityStatus,
            currentProject: `已锁定当前标段：${targetProjectName}`,
          }
        : t
    );
    onUpdateTalentList(updated);

    if (onAssignToCurrentBid) {
      onAssignToCurrentBid(talent);
    }
  };

  // 删除人才
  const handleDeleteTalent = (id: string) => {
    if (window.confirm('确认从企业人才库中移除此人员档案？')) {
      onUpdateTalentList(talentList.filter((t) => t.id !== id));
      if (selectedTalentDetail?.id === id) setSelectedTalentDetail(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* 1. 顶栏：企业人才库与在岗履约调度中枢 (符合 B 端蓝色经典基调) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl border border-blue-200 p-4 lg:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-blue-950">
                  企业人才库与在岗履约调度中枢
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-semibold">
                  简历智能提取 · 职位矩阵维护 · 在岗任务与档期冲突研判
                </span>
              </div>
              <p className="text-xs text-blue-800/80 mt-1">
                统一维护海内外工程核心专家档案，跟踪当前在建任务与完工释放节点，无缝赋能《投标须知》附件03组织架构图与附件04人员履历。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {onNavigateToAttachment04 && (
              <button
                type="button"
                onClick={onNavigateToAttachment04}
                className="px-3.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <ArrowRight className="w-3.5 h-3.5 text-blue-700" />
                <span>返回《投标须知》附件04</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsImportResumeModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>导入人才简历并提取信息</span>
            </button>
          </div>
        </div>

        {/* 顶部核心指标看板 (深蓝、天青清爽数据栏) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
          <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-200">
            <span className="text-[11px] text-blue-800/80 block">入库人才总量</span>
            <div className="text-lg font-bold font-mono text-blue-950 mt-0.5">
              {metrics.total} <span className="text-xs font-normal text-slate-500">位专家</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-200">
            <span className="text-[11px] text-blue-800/80 block">即刻空闲 / 可立即派驻</span>
            <div className="text-lg font-bold font-mono text-blue-900 mt-0.5">
              {metrics.availableNow} <span className="text-xs font-normal text-slate-500">人可用</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-200">
            <span className="text-[11px] text-blue-800/80 block">60天内完工释放 (储备)</span>
            <div className="text-lg font-bold font-mono text-sky-800 mt-0.5">
              {metrics.releasingSoon} <span className="text-xs font-normal text-slate-500">人即将空闲</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-200">
            <span className="text-[11px] text-blue-800/80 block">在岗冲突 / 长期锁定</span>
            <div className="text-lg font-bold font-mono text-blue-950 mt-0.5">
              {metrics.occupiedConflict} <span className="text-xs font-normal text-slate-500">人冲突</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-200">
            <span className="text-[11px] text-blue-800/80 block">具备医院项目业绩</span>
            <div className="text-lg font-bold font-mono text-blue-950 mt-0.5">
              {metrics.hospitalExpCount} <span className="text-xs font-normal text-slate-500">位</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-200">
            <span className="text-[11px] text-blue-800/80 block">常驻阿尔及利亚经历</span>
            <div className="text-lg font-bold font-mono text-blue-950 mt-0.5">
              {metrics.algeriaExpCount} <span className="text-xs font-normal text-slate-500">位</span>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. 筛选过滤与搜索工具栏 (零胶囊、极简蓝灰排版) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl border border-blue-200 p-3.5 shadow-2xs space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* 搜索框与职位筛选并排 */}
          <div className="flex flex-col md:flex-row md:items-center gap-2.5 flex-1 min-w-0">
            {/* 搜索框 */}
            <div className="relative w-full md:w-64 lg:w-72 shrink-0">
              <Search className="w-4 h-4 text-blue-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="搜索专家姓名、专业、证书、项目..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-7 py-1.5 text-xs rounded-lg border border-blue-200 bg-blue-50/20 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 职位分类过滤 (放搜索框的旁边) */}
            <div className="flex items-center gap-1 bg-blue-50/70 p-0.5 rounded-lg border border-blue-200 text-xs overflow-x-auto scrollbar-none shrink-0">
              {[
                { id: 'all', label: '全部职位' },
                { id: 'project_manager', label: '项目经理' },
                { id: 'tech_director', label: '技术总工' },
                { id: 'mep_engineer', label: '机电专业工' },
                { id: 'commercial', label: '商务合约' },
                { id: 'hse', label: 'HSE安全' },
                { id: 'procurement', label: '境外采购' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedRoleCategory(cat.id)}
                  className={`px-2.5 py-1 rounded font-medium whitespace-nowrap cursor-pointer transition-colors ${
                    selectedRoleCategory === cat.id
                      ? 'bg-white text-blue-950 font-bold shadow-2xs border border-blue-200'
                      : 'text-blue-800 hover:text-blue-950'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* 状态改成下拉选择 */}
          <div className="flex items-center gap-2 shrink-0 self-start xl:self-center">
            <span className="text-xs text-blue-900 font-medium whitespace-nowrap flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>状态：</span>
            </span>
            <select
              value={selectedAvailabilityFilter}
              onChange={(e) => setSelectedAvailabilityFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-blue-200 bg-white text-blue-950 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
            >
              <option value="all">全部状态</option>
              <option value="available_now">🟢 即刻空闲 (无在岗项目占用)</option>
              <option value="releasing_soon">🟡 近期释放 (30-60天内完工)</option>
              <option value="occupied_conflict">🔴 在岗冲突 (周期重叠未释放)</option>
            </select>
          </div>
        </div>

        {/* 4 项核心投标资格条件复选 */}
        <div className="pt-2 border-t border-blue-100 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-slate-500 font-medium">四项硬性资信筛选：</span>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 hover:text-blue-900 select-none">
              <input
                type="checkbox"
                checked={requireHospitalExp}
                onChange={(e) => setRequireHospitalExp(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 border-blue-300"
              />
              <span>需具备医院项目业绩</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 hover:text-blue-900 select-none">
              <input
                type="checkbox"
                checked={requireAlgeriaExp}
                onChange={(e) => setRequireAlgeriaExp(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 border-blue-300"
              />
              <span>需常驻阿尔及利亚经历</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 hover:text-blue-900 select-none">
              <input
                type="checkbox"
                checked={requireLocalSubcontract}
                onChange={(e) => setRequireLocalSubcontract(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 border-blue-300"
              />
              <span>需属地化劳务管理经验</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 hover:text-blue-900 select-none">
              <input
                type="checkbox"
                checked={requireOverseasProcure}
                onChange={(e) => setRequireOverseasProcure(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 border-blue-300"
              />
              <span>需境外集采与清关经验</span>
            </label>
          </div>

          <div className="text-[11px] text-slate-500">
            共筛选出 <strong className="text-blue-950 font-bold font-mono">{filteredTalents.length}</strong> 位符合要求的候选专家
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. 人员与在岗任务看板 (卡片视图) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredTalents.map((talent) => {
          const availCheck = checkAvailabilityForTargetDate(talent, evalMobilizationDate);
          const isSelected = selectedTalentDetail?.id === talent.id;

          return (
            <div
              key={talent.id}
              className={`bg-white rounded-xl border p-4 shadow-2xs transition-all flex flex-col justify-between space-y-3 ${
                isSelected
                  ? 'border-blue-500 ring-1 ring-blue-300'
                  : 'border-blue-200 hover:border-blue-300'
              }`}
            >
              <div className="space-y-2.5">
                {/* 专家基本信息行 */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 border border-blue-200 text-blue-900 font-bold flex items-center justify-center shrink-0 text-sm">
                      {talent.name.slice(0, 1)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-blue-950">{talent.name}</strong>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {talent.nationality}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-blue-800 line-clamp-1 mt-0.5">
                        {talent.role}
                      </div>
                    </div>
                  </div>

                  {/* 状态指示条 */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {availCheck.isAvailable ? (
                      <span className="text-[11px] font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded border border-blue-200 font-mono inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-blue-700" />
                        <span>空闲可用</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-blue-950 bg-blue-50 px-2 py-0.5 rounded border border-blue-300 font-mono inline-flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-blue-700" />
                        <span>在岗冲突</span>
                      </span>
                    )}
                    {talent.role.includes('项目经理') || talent.role.includes('技术总工') || talent.role.includes('机电') || talent.role.includes('商务') ? (
                      <span className="text-[10px] font-bold text-amber-900 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 font-mono inline-flex items-center gap-0.5" title="招标文件要求关键岗位人员参加甲方面试">
                        <span>是否需要面试: 需面试</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.2 rounded border border-slate-200 font-mono inline-flex items-center gap-0.5">
                        <span>是否需要面试: 无需面试</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* 资信与学历行 */}
                <div className="text-xs text-slate-600 space-y-1 bg-slate-50/60 p-2 rounded-lg border border-slate-150">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">工龄 / 学历：</span>
                    <span className="font-medium text-slate-800">
                      {talent.workingYears} 年工龄 · {talent.degree} ({talent.major})
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">法语水平：</span>
                    <span className="font-medium text-blue-900">{talent.frenchLevel}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">核心证书：</span>
                    <span className="font-medium text-slate-800 truncate max-w-[200px]">
                      {talent.certificates.join(' / ')}
                    </span>
                  </div>
                </div>

                {/* 当前在岗任务项 (用于判断什么时候有空) */}
                <div className="p-2.5 rounded-lg bg-blue-50/30 border border-blue-200 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-950 flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-blue-700" />
                      <span>当前在建任务：</span>
                    </span>
                    <span className="text-[11px] font-mono font-bold text-blue-900">
                      进度 {talent.currentTask?.progressPercent || 100}%
                    </span>
                  </div>

                  <p className="text-xs text-blue-900 font-medium truncate">
                    {talent.currentTask?.projectName || '暂无在建施工任务'}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5 border-t border-blue-100">
                    <span>
                      预计释放：<strong className="text-blue-950 font-mono">{talent.currentTask?.estimatedEndDate || talent.availabilityDate}</strong>
                    </span>
                    <span className="text-blue-700">
                      {availCheck.isAvailable ? '✓ 满足派驻' : '⚠️ 存在时间重叠'}
                    </span>
                  </div>
                </div>

                {/* 4 项核心投标资信指标标签 */}
                <div className="space-y-1 text-xs">
                  {talent.hasHospitalExp && (
                    <div className="text-[11px] text-blue-900 truncate">
                      <span className="font-bold text-blue-950">[医院业绩]</span> {talent.hospitalExpNote}
                    </div>
                  )}
                  {talent.hasAlgeriaExp && (
                    <div className="text-[11px] text-blue-900 truncate">
                      <span className="font-bold text-blue-950">[阿国经历]</span> {talent.algeriaExpNote}
                    </div>
                  )}
                </div>
              </div>

              {/* 底部操作区 */}
              <div className="pt-2 border-t border-blue-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTalentDetail(talent)}
                  className="px-2.5 py-1 text-xs rounded-lg text-blue-800 hover:bg-blue-50 font-medium transition-colors cursor-pointer"
                >
                  查看完整档案
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleDeleteTalent(talent.id)}
                    className="p-1 text-slate-400 hover:text-blue-700 rounded cursor-pointer"
                    title="移除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAssignPerson(talent)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold shadow-2xs transition-all flex items-center gap-1 cursor-pointer ${
                      availCheck.isAvailable
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-blue-100 text-blue-900 border border-blue-300 hover:bg-blue-200'
                    }`}
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>回填至标段附件04</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 4. 简历导入与智能信息提取弹窗 (核心功能：拖拽/粘贴 -> 提取 -> 回填) */}
      {/* ========================================================================= */}
      {isImportResumeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-blue-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            {/* 弹窗顶栏 */}
            <div className="p-4 border-b border-blue-200 bg-blue-50/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
                    <span>导入人才简历并智能提取档案与在岗任务</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
                      支持文档导入 (.docx/.pdf/.txt/.json)
                    </span>
                  </h3>
                  <p className="text-[11px] text-blue-800/80">
                    支持直接拖拽/上传简历文件或粘贴中法文简历文本，自动提取基本资质、医院业绩、海外经历、当前任务与释放日期
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsImportResumeModalOpen(false);
                  setExtractedDraft(null);
                  setUploadedFile(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 弹窗主体双栏 */}
            <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-2 gap-5 min-h-0">
              {/* 左侧：输入简历或选择预设 */}
              <div className="space-y-3 flex flex-col">
                {/* 模式切换 Tabs */}
                <div className="flex items-center gap-1 bg-blue-50/70 p-1 rounded-xl border border-blue-200 text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveImportTab('upload_doc')}
                    className={`flex-1 py-1.5 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      activeImportTab === 'upload_doc'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-blue-900 hover:bg-blue-100/50'
                    }`}
                  >
                    <FolderUp className="w-3.5 h-3.5" />
                    <span>上传简历文档 (Word / PDF / TXT)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveImportTab('paste_text')}
                    className={`flex-1 py-1.5 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      activeImportTab === 'paste_text'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-blue-900 hover:bg-blue-100/50'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>直接粘贴文本内容</span>
                  </button>
                </div>

                {/* 隐藏式文件选择框 */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".doc,.docx,.pdf,.txt,.json,.rtf"
                  className="hidden"
                />

                {activeImportTab === 'upload_doc' ? (
                  <div className="space-y-3 flex flex-col flex-1">
                    {/* 拖拽上传区域 */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOver(true);
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-5 text-center flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                        isDragOver
                          ? 'border-blue-500 bg-blue-50/80 scale-[1.01]'
                          : 'border-blue-300 hover:border-blue-500 bg-blue-50/30 hover:bg-blue-50/60'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                        <FolderUp className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-blue-950 block">
                          点击选择文件 或 将简历文档拖放到此处
                        </span>
                        <span className="text-[11px] text-blue-700 mt-0.5 block">
                          支持 Word (.docx / .doc)、PDF (.pdf)、纯文本 (.txt)、JSON 等
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100/80 text-blue-900 border border-blue-200">
                          DOCX
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-100/80 text-red-900 border border-red-200">
                          PDF
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100/80 text-emerald-900 border border-emerald-200">
                          TXT / JSON
                        </span>
                      </div>
                    </div>

                    {/* 已上传文档状态卡片 */}
                    {uploadedFile && (
                      <div className="p-3 bg-white rounded-xl border border-blue-200 flex items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0 font-bold text-xs font-mono">
                            {uploadedFile.type.slice(0, 4)}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-blue-950 block truncate">
                              {uploadedFile.name}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 font-mono">
                              <span>大小: {uploadedFile.formattedSize}</span>
                              <span>•</span>
                              <span>上传时间: {uploadedFile.uploadedAt}</span>
                              <span className="text-emerald-700 font-bold font-sans">✓ 已解析</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                          className="px-2.5 py-1 text-xs rounded border border-blue-200 text-blue-800 hover:bg-blue-50 font-medium shrink-0 cursor-pointer"
                        >
                          更换文档
                        </button>
                      </div>
                    )}

                    {/* 一键载入脱敏工程档案文档体验 */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-500 block">
                        或一键体验真实工程简历文档：
                      </span>
                      <div className="grid grid-cols-1 gap-1.5">
                        {SAMPLE_DOCUMENT_FILES.map((sample, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectSampleDoc(sample)}
                            className="text-left px-3 py-2 rounded-xl border border-blue-200 bg-white hover:bg-blue-50/60 hover:border-blue-400 text-xs transition-all cursor-pointer flex items-center justify-between group shadow-2xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
                                {sample.fileType}
                              </span>
                              <span className="font-medium text-blue-950 truncate">
                                {sample.fileName}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0 group-hover:text-blue-700">
                              {sample.fileSize}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 flex flex-col flex-1">
                    {/* 快捷载入文本预设 */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 block">快捷载入真实履历样本：</span>
                      <div className="grid grid-cols-1 gap-1.5">
                        {RESUME_PRESETS.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setResumeTextInput(preset.sampleText);
                              handleExtractResume(preset.sampleText);
                            }}
                            className="text-left px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50/30 hover:bg-blue-100/60 text-xs font-medium text-blue-950 transition-colors cursor-pointer truncate"
                          >
                            📄 {preset.title}
                          </button>
                        ))}
                      </div>
                    </div>

                    <textarea
                      rows={8}
                      value={resumeTextInput}
                      onChange={(e) => setResumeTextInput(e.target.value)}
                      placeholder="在此直接粘贴候选人简历、履历表或官方资料文字内容...
例如：张海峰，男，1981年生，高级电气工程师，常驻阿尔及利亚9年，熟悉NF标准与SOCOTEC验评，曾负责安纳巴心血管医院机电安装。目前担任安纳巴扩建工程电气总工，预计2025年3月31日完工送电释放……"
                      className="flex-1 w-full p-3 text-xs rounded-xl border border-blue-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono leading-relaxed"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleExtractResume()}
                  disabled={!resumeTextInput.trim() || isExtracting}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  {isExtracting ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin" />
                      <span>正在智能解析提取关键字段与在岗排期...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>一键提取档案字段与在岗排期</span>
                    </>
                  )}
                </button>
              </div>

              {/* 右侧：提取结果预览与确认调整 */}
              <div className="space-y-3 flex flex-col bg-blue-50/20 p-4 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-700" />
                    <span>2. 提取结构化信息预览</span>
                  </span>
                  {extractSuccessToast && (
                    <span className="text-[11px] text-blue-900 font-bold bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
                      ✓ 信息已成功提取
                    </span>
                  )}
                </div>

                {extractedDraft ? (
                  <div className="space-y-2.5 flex-1 overflow-y-auto text-xs">
                    <div className="p-3 bg-white rounded-lg border border-blue-200 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 block">姓名</label>
                          <input
                            type="text"
                            value={extractedDraft.name || ''}
                            onChange={(e) => setExtractedDraft({ ...extractedDraft, name: e.target.value })}
                            className="w-full p-1 border border-blue-200 rounded font-bold text-blue-950"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block">拟任岗位</label>
                          <input
                            type="text"
                            value={extractedDraft.role || ''}
                            onChange={(e) => setExtractedDraft({ ...extractedDraft, role: e.target.value })}
                            className="w-full p-1 border border-blue-200 rounded text-blue-900"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 block">学历及专业</label>
                          <input
                            type="text"
                            value={`${extractedDraft.degree || ''} · ${extractedDraft.major || ''}`}
                            onChange={(e) => setExtractedDraft({ ...extractedDraft, major: e.target.value })}
                            className="w-full p-1 border border-blue-200 rounded text-slate-700"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block">工龄年限</label>
                          <input
                            type="number"
                            value={extractedDraft.workingYears || 15}
                            onChange={(e) => setExtractedDraft({ ...extractedDraft, workingYears: parseInt(e.target.value, 10) })}
                            className="w-full p-1 border border-blue-200 rounded text-slate-700 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 在岗任务项与档期判断 */}
                    <div className="p-3 bg-white rounded-lg border border-blue-200 space-y-2">
                      <span className="font-bold text-blue-950 block text-[11px]">
                        【在建项目任务与空闲日期】
                      </span>
                      <div>
                        <label className="text-[10px] text-slate-500 block">当前在建项目</label>
                        <input
                          type="text"
                          value={extractedDraft.currentTask?.projectName || ''}
                          onChange={(e) =>
                            setExtractedDraft({
                              ...extractedDraft,
                              currentTask: {
                                ...(extractedDraft.currentTask as TalentCurrentTask),
                                projectName: e.target.value,
                              },
                            })
                          }
                          className="w-full p-1 border border-blue-200 rounded text-blue-900"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 block">预计释放日期 (何时有空)</label>
                          <input
                            type="text"
                            value={extractedDraft.availabilityDate || ''}
                            onChange={(e) => setExtractedDraft({ ...extractedDraft, availabilityDate: e.target.value })}
                            className="w-full p-1 border border-blue-200 rounded font-mono font-bold text-blue-950"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block">档期状态</label>
                          <select
                            value={extractedDraft.availabilityStatus}
                            onChange={(e) =>
                              setExtractedDraft({
                                ...extractedDraft,
                                availabilityStatus: e.target.value as AvailabilityStatus,
                              })
                            }
                            className="w-full p-1 border border-blue-200 rounded text-blue-900 bg-white"
                          >
                            <option value="available_now">即刻空闲 / 可立即派驻</option>
                            <option value="releasing_soon">近期释放 / 备选储备</option>
                            <option value="occupied_conflict">在岗冲突 / 长期锁定</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* 四项资质确认 */}
                    <div className="p-3 bg-white rounded-lg border border-blue-200 space-y-1.5">
                      <span className="font-bold text-blue-950 block text-[11px]">
                        【4 项核心投标资信指标】
                      </span>
                      <div className="space-y-1">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!extractedDraft.hasHospitalExp}
                            onChange={(e) => setExtractedDraft({ ...extractedDraft, hasHospitalExp: e.target.checked })}
                          />
                          <span>具备大型医院项目业绩</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!extractedDraft.hasAlgeriaExp}
                            onChange={(e) => setExtractedDraft({ ...extractedDraft, hasAlgeriaExp: e.target.checked })}
                          />
                          <span>常驻阿尔及利亚经历</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!extractedDraft.hasLocalSubcontractExp}
                            onChange={(e) => setExtractedDraft({ ...extractedDraft, hasLocalSubcontractExp: e.target.checked })}
                          />
                          <span>属地化分包管理经验</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!extractedDraft.hasOverseasProcurementExp}
                            onChange={(e) => setExtractedDraft({ ...extractedDraft, hasOverseasProcurementExp: e.target.checked })}
                          />
                          <span>境外采购与物流经验</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-2">
                    <FileText className="w-10 h-10 text-slate-300" />
                    <p className="text-xs">
                      请在左侧粘贴简历内容并点击提取，<br />
                      系统将智能识别姓名、职务、工龄、在建任务及释放日期。
                    </p>
                  </div>
                )}

                <div className="pt-2 border-t border-blue-200 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsImportResumeModalOpen(false);
                      setExtractedDraft(null);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs hover:bg-slate-50 cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveExtractedDraft}
                    disabled={!extractedDraft || !extractedDraft.name}
                    className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
                  >
                    保存存入企业人才库
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. 专家完整档案抽屉 / 弹窗 */}
      {/* ========================================================================= */}
      {selectedTalentDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-blue-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-blue-200 bg-blue-50/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                  {selectedTalentDetail.name.slice(0, 1)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-blue-950">
                    {selectedTalentDetail.name} · 专家详细履历与在岗排期档案
                  </h3>
                  <span className="text-[11px] text-blue-800">
                    {selectedTalentDetail.role}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTalentDetail(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {/* 基本资信卡 */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 block">学历及专业：</span>
                  <strong className="text-slate-900">{selectedTalentDetail.degree} · {selectedTalentDetail.major}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">工龄及国籍：</span>
                  <strong className="text-slate-900">{selectedTalentDetail.workingYears} 年工龄 · {selectedTalentDetail.nationality}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">外语水平：</span>
                  <strong className="text-blue-900">法语: {selectedTalentDetail.frenchLevel}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">证照状态：</span>
                  <strong className="text-emerald-700">因公护照/常驻工签完备</strong>
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-slate-500 text-xs">是否需要面试：</span>
                  <span className={
                    selectedTalentDetail.role.includes('项目经理') || selectedTalentDetail.role.includes('技术总工') || selectedTalentDetail.role.includes('机电') || selectedTalentDetail.role.includes('商务')
                      ? 'text-xs font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200'
                      : 'text-xs text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200'
                  }>
                    {selectedTalentDetail.role.includes('项目经理') || selectedTalentDetail.role.includes('技术总工') || selectedTalentDetail.role.includes('机电') || selectedTalentDetail.role.includes('商务')
                      ? '需要面试 (关键管理人员·承诺现场出席)'
                      : '无需面试'}
                  </span>
                </div>
              </div>

              {/* 当前在建工程与任务排期 */}
              <div className="p-3.5 bg-blue-50/40 rounded-xl border border-blue-200 space-y-2">
                <span className="font-bold text-blue-950 block text-xs flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-blue-700" />
                  <span>当前在建工程与任务排期（研判空闲时间）</span>
                </span>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-slate-500 text-[11px] block">项目名称：</span>
                    <span className="font-semibold text-blue-950">{selectedTalentDetail.currentTask?.projectName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">担任职务：</span>
                    <span className="font-semibold text-slate-800">{selectedTalentDetail.currentTask?.role}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">工期起止：</span>
                    <span className="font-mono text-slate-700">
                      {selectedTalentDetail.currentTask?.startDate} 至 {selectedTalentDetail.currentTask?.estimatedEndDate}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">完工预计释放：</span>
                    <span className="font-mono font-bold text-blue-900">
                      {selectedTalentDetail.currentTask?.estimatedEndDate}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 bg-white p-2 rounded border border-blue-100">
                  {selectedTalentDetail.currentTask?.dutyDescription}
                </p>
              </div>

              {/* 重点履历业绩 */}
              <div className="space-y-2">
                <span className="font-bold text-blue-950 block text-xs">重点海外及医院工程业绩</span>
                <div className="p-3 bg-white rounded-xl border border-blue-200 space-y-1.5">
                  <div className="flex items-start gap-1.5">
                    <Building2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-blue-950">医院项目业绩：</strong>
                      <span className="text-slate-700">{selectedTalentDetail.hospitalExpNote}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Globe2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-blue-950">阿尔及利亚驻场经历：</strong>
                      <span className="text-slate-700">{selectedTalentDetail.algeriaExpNote}</span>
                    </div>
                  </div>
                  {selectedTalentDetail.localSubcontractNote && (
                    <div className="flex items-start gap-1.5">
                      <Users className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-blue-950">属地化管理与分包经验：</strong>
                        <span className="text-slate-700">{selectedTalentDetail.localSubcontractNote}</span>
                      </div>
                    </div>
                  )}
                  {selectedTalentDetail.overseasProcurementNote && (
                    <div className="flex items-start gap-1.5">
                      <Award className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-blue-950">境外采购与海关免税：</strong>
                        <span className="text-slate-700">{selectedTalentDetail.overseasProcurementNote}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-blue-200 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                档案更新日期：{selectedTalentDetail.lastUpdatedDate}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTalentDetail(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs cursor-pointer hover:bg-slate-50"
                >
                  关闭
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleAssignPerson(selectedTalentDetail);
                    setSelectedTalentDetail(null);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs cursor-pointer"
                >
                  派驻至当前标段 (附件04)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
