import { TenderAttachment } from '../types/tenderAttachment';

export const INITIAL_TENDER_ATTACHMENTS: TenderAttachment[] = [
  {
    id: 'ATT-01',
    name: '招标文件须知及评审细则 (Règlement de la Consultation - RC)',
    nameFr: 'Règlement de la Consultation (RC) - Instructions aux Soumissionnaires',
    fileName: 'RC-Reglement-Consultation-2026-CFO-009.pdf',
    category: 'legal',
    fileType: 'pdf',
    fileSize: '4.8 MB',
    uploadedAt: '2026-10-08 09:30',
    uploader: '海外商务合约部 · 王敏',
    version: 'Rev 1.0 (官方发布版)',
    tags: ['#截标时间', '#保函金额', '#投标有效期', '#商务资格'],
    officialDocNumber: 'DZ-SANTE-2026-CFO-009/RC',
    importance: 'critical',
    verificationStatus: 'verified',
    summary: '载明本次投标的截止时限、投标保函额度（2500万DZD）、90天标书有效期及密封递交规则。',
    summaryFr: 'Fixe la date limite de remise des offres au 20/11/2026, la caution de soumission (25M DZD) et le délai de validité des offres (90 jours).',
    previewSnippet: `Article 3.2: La date limite de dépôt des offres est fixée au 20/11/2026 à 12h00 (heure locale d'Alger).
Article 3.5: Le délai de validité des offres est fixé à 90 (quatre-vingt-dix) jours calendaires à compter de la date limite de remise des offres.
Article 6.1: Une caution de soumission d'un montant de 25.000.000,00 DZD (Vingt-cinq millions de Dinars Algériens) établie par une banque de droit algérien doit être obligatoirement jointe à l'offre financière.`,
    previewSnippetFr: `Article 3.2: La date limite de dépôt des offres est fixée au 20/11/2026 à 12h00 (heure locale d'Alger).
Article 3.5: Le délai de validité des offres est fixé à 90 (quatre-vingt-dix) jours calendaires à compter de la date limite de remise des offres.
Article 6.1: Une caution de soumission d'un montant de 25.000.000,00 DZD (Vingt-cinq millions de Dinars Algériens) établie par une banque de droit algérien doit être obligatoirement jointe à l'offre financière.`,
    previewSnippetZh: `第 3.2 条: 投标文件的递交截止时间确定为 2026年11月20日 12:00（阿尔及尔当地时间）。
第 3.5 条: 投标文件的有效期限自递交截止日起算固定为 90（九十）个日历天。
第 6.1 条: 必须在财务标书中随附由阿尔及利亚本土合规银行出具的金额为 25,000,000.00 第纳尔（贰仟伍佰万阿尔及利亚第纳尔）的投标保函。`,
    linkedVariables: [
      {
        variableKey: '投标截止日期',
        sourceClause: 'RC 须知第 3.2 款',
        extractedValue: '2026-11-20',
        pageNumber: 12,
        highlightText: "Date limite de dépôt des offres: 20/11/2026 à 12h00",
        note: '开标前现场密封递交至阿尔及尔国家卫生部招标办公室',
      },
      {
        variableKey: '投标有效期',
        sourceClause: 'RC 须知第 3.5 款',
        extractedValue: '90',
        pageNumber: 13,
        highlightText: "Délai de validité des offres fixé à 90 jours calendaires",
        note: '投标承诺书与保函有效期限必须完全覆盖 90 天',
      },
      {
        variableKey: '投标保证金金额',
        sourceClause: 'RC 须知第 6.1 款',
        extractedValue: '25,000,000 DZD',
        pageNumber: 18,
        highlightText: "Caution de soumission: 25.000.000,00 DZD délivrée par une banque agréée",
        note: '须由阿尔及利亚外贸银行 (BEA) 或国民银行 (BNA) 开具即付独立保函',
      },
      {
        variableKey: '招标编号',
        sourceClause: 'RC 封面及第 1.1 款',
        extractedValue: 'DZ-SANTE-2026-CFO-009',
        pageNumber: 1,
        highlightText: "Appel d'Offres National et International N° DZ-SANTE-2026-CFO-009",
        note: '全案标书封皮与商务承诺书统一文号',
      },
      {
        variableKey: '招标人名称',
        sourceClause: 'RC 须知第 1.2 款',
        extractedValue: '阿尔及利亚国家卫生与人口部 (Ministère de la Santé)',
        pageNumber: 2,
        highlightText: "Maître de l'Ouvrage: Ministère de la Santé, de la Population et de la Réforme Hospitalière",
        note: '公函主送抬头与合同签署甲方',
      },
    ],
  },
  {
    id: 'ATT-02',
    name: '电气强电及动力技术规格书 (CCTP - Courants Forts)',
    nameFr: 'Cahier des Clauses Techniques Particulières (CCTP) - Courants Forts',
    fileName: 'CCTP-Lot09-Electricite-Courants-Forts.pdf',
    category: 'specs',
    fileType: 'pdf',
    fileSize: '12.4 MB',
    uploadedAt: '2026-10-09 14:15',
    uploader: '机电深化组 · 陈工',
    version: 'Rev 2.1',
    tags: ['#法国NFC规范', '#IEC标准', '#质保期2年', '#2小时急修', '#提济乌祖'],
    officialDocNumber: 'DZ-SANTE-2026-CCTP-CFO',
    importance: 'critical',
    verificationStatus: 'verified',
    summary: '针对提济乌祖240床医院变配电室、发电机组、UPS不间断电源及双路供电的技术验收与质保条款。',
    summaryFr: 'Spécifications d\'installation et réception pour transformateurs, groupes électrogènes, onduleurs UPS et clause de garantie (2 ans, délai d\'intervention 2 heures).',
    previewSnippet: `Chapitre 1 - Normes de Référence:
Toutes les installations électriques doivent être rigoureusement conformes à la norme française NF C 15-100, NF C 13-100 et aux recommandations CEI/IEC correspondantes.
Chapitre 9 - Garanties et Service Après-Vente:
9.2: Le délai de garantie de parfait achèvement est de deux (02) années entières à compter de la date du procès-verbal de réception provisoire sans réserve.
9.5: Le titulaire du marché doit maintenir une permanence technique locale capable d'intervenir sur le site de Tizi Ouzou dans un délai maximum de deux (02) heures après notification de panne critique.`,
    previewSnippetFr: `Chapitre 1 - Normes de Référence:
Toutes les installations électriques doivent être rigoureusement conformes à la norme française NF C 15-100, NF C 13-100 et aux recommandations CEI/IEC correspondantes.
Chapitre 9 - Garanties et Service Après-Vente:
9.2: Le délai de garantie de parfait achèvement est de deux (02) années entières à compter de la date du procès-verbal de réception provisoire sans réserve.
9.5: Le titulaire du marché doit maintenir une permanence technique locale capable d'intervenir sur le site de Tizi Ouzou dans un délai maximum de deux (02) heures après notification de panne critique.`,
    previewSnippetZh: `第 1 章 - 执行参考标准规范:
所有电气安装工程必须严格符合法国标准 NF C 15-100、NF C 13-100 以及国际电工委员会对应 CEI/IEC 推荐标准。
第 9 章 - 质量保证与售后维保服务:
9.2: 工程无保留暂定验收纪要签发之日起，全案缺陷责任质保期固定为整整两（02）年。
9.5: 中标总包商必须在提济乌祖当地建立技术应急值守小组，在收到关键故障报修通知后最多两（02）小时内赶赴现场检修。`,
    linkedVariables: [
      {
        variableKey: '工程质量等级',
        sourceClause: 'CCTP 技术规范第 1.3 款',
        extractedValue: '优良工程 (Conforme aux normes NFC/IEC)',
        pageNumber: 8,
        highlightText: "Conformité obligatoire aux normes NF C 15-100 / NF C 13-100 et normes CEI",
        note: '明确要求严格执行法标强电规程，需在投标承诺书中单列',
      },
      {
        variableKey: '工程交付地点',
        sourceClause: 'CCTP 总体说明第 2.1 款',
        extractedValue: '阿尔及利亚提济乌祖省 (Tizi Ouzou)',
        pageNumber: 14,
        highlightText: "Implantation du projet: Nouvelle Ville de Tizi Ouzou, Wilaya de Tizi Ouzou",
        note: '现场踏勘与落地施工所在省份',
      },
      {
        variableKey: '工程质保期',
        sourceClause: 'CCTP 售后维保第 9.2 款',
        extractedValue: '2',
        pageNumber: 86,
        highlightText: "Délai de garantie de parfait achèvement: 02 (deux) années entières",
        note: '医院供配电工程标准质保期限为 2 年 (含易损备件保障)',
      },
      {
        variableKey: '应急响应时间',
        sourceClause: 'CCTP 售后维保第 9.5 款',
        extractedValue: '2',
        pageNumber: 88,
        highlightText: "Délai maximal d'intervention sur site: 02 (deux) heures après appel",
        note: '阿尔及利亚本地维保应急响应承诺不得高于 2 小时',
      },
    ],
  },
  {
    id: 'ATT-03',
    name: '专用行政及合同商务条款 (Cahier des Clauses Administratives Particulières - CCAP)',
    nameFr: 'Cahier des Clauses Administratives Particulières (CCAP)',
    fileName: 'CCAP-Cahier-Clauses-Administratives-Particulieres.pdf',
    category: 'legal',
    fileType: 'pdf',
    fileSize: '6.2 MB',
    uploadedAt: '2026-10-09 16:40',
    uploader: '海外商务合约部 · 王敏',
    version: 'Rev 1.0',
    tags: ['#工期540天', '#开工令ODS', '#履约罚则', '#双语验收'],
    officialDocNumber: 'DZ-SANTE-CCAP-2026',
    importance: 'critical',
    verificationStatus: 'verified',
    summary: '明确工程履约总工期为 540 个日历天，计划下达开工令 (ODS) 节点与阶段验收规范。',
    summaryFr: 'Fixe le délai contractuel global à 540 jours calendaires dès l\'Ordre de Service (ODS prévisionnel au 01/12/2026).',
    previewSnippet: `Article 8 - Délais d'Exécution:
8.1: Le délai global contractuel d'exécution de l'ensemble des travaux du présent lot est fixé à Cinq Cent Quarante (540) jours calendaires, à compter de la date de notification de l'Ordre de Service (ODS) de commencer les travaux.
8.2: Date prévisionnelle de notification de l'ODS: 01 Décembre 2026.
8.3: Date limite de réception provisoire contractuelle: 24 Mai 2028.`,
    previewSnippetFr: `Article 8 - Délais d'Exécution:
8.1: Le délai global contractuel d'exécution de l'ensemble des travaux du présent lot est fixé à Cinq Cent Quarante (540) jours calendaires, à compter de la date de notification de l'Ordre de Service (ODS) de commencer les travaux.
8.2: Date prévisionnelle de notification de l'ODS: 01 Décembre 2026.
8.3: Date limite de réception provisoire contractuelle: 24 Mai 2028.`,
    previewSnippetZh: `第 8 条 - 工期与执行进度:
8.1: 本标段所有工程的合同总履约工期自下达正式开工令（ODS）之日起固定为 五百四十（540）个日历天。
8.2: 预计下达开工令（ODS）日期: 2026年12月01日。
8.3: 合同约定的法定暂定竣工验收最迟截止日期: 2028年05月24日。`,
    linkedVariables: [
      {
        variableKey: '工期日历天',
        sourceClause: 'CCAP 合同条款第 8.1 条',
        extractedValue: '540',
        pageNumber: 22,
        highlightText: "Délai global d'exécution fixé à 540 jours calendaires à compter de l'ODS",
        note: '包含主设备海运备料、现场安装与带电联合调试总时长',
      },
      {
        variableKey: '计划开工日期',
        sourceClause: 'CCAP 合同条款第 8.2 条',
        extractedValue: '2026-12-01',
        pageNumber: 23,
        highlightText: "Date prévisionnelle de l'Ordre de Service (ODS): 01/12/2026",
        note: '预估业主下达进场开工令日期',
      },
      {
        variableKey: '计划竣工日期',
        sourceClause: 'CCAP 合同条款第 8.3 条',
        extractedValue: '2028-05-24',
        pageNumber: 24,
        highlightText: "Réception provisoire au plus tard le: 24/05/2028",
        note: '经日历天推算之法定暂定竣工验收交付日',
      },
    ],
  },
  {
    id: 'ATT-04',
    name: '电气系统施工总平面与单线深化图 (Plans d\'Électricité CFO/CFA)',
    fileName: 'DWG-CFO-Lot09-Plans-Distribution-Generale-v3.dwg',
    category: 'drawings',
    fileType: 'dwg',
    fileSize: '38.6 MB',
    uploadedAt: '2026-10-10 11:20',
    uploader: '机电深化组 · 陈工',
    version: 'Rev 3.0 (深化审定版)',
    tags: ['#CAD图纸', '#变配电单线图', '#柴发机房', '#强电负荷计算'],
    officialDocNumber: 'DWG-TIZI-HOSP-CFO-001~045',
    importance: 'required',
    verificationStatus: 'verified',
    summary: '共45张施工图纸，包含高压进线、2台1600kVA干变、应急柴发机组及手术部双路ATS切换大样。',
    previewSnippet: `Cartouche du Plan:
Projet: Réalisation d'un Hôpital de 240 Lits à Tizi Ouzou.
Maître de l'Ouvrage: Ministère de la Santé.
Lot N°09: Électricité CFO - Schéma Unifilaire Général HT/BT.
Localisation: Bâtiment Technique RDC / Sous-sol.`,
    linkedVariables: [
      {
        variableKey: '项目名称',
        sourceClause: '图纸图签栏 (Cartouche)',
        extractedValue: '阿尔及利亚 240 床综合医院强电与智能化系统工程',
        pageNumber: 1,
        highlightText: "Hôpital 240 Lits - Travaux d'électricité CFO/CFA",
        note: '全套施工图设计图签法定项目名称',
      },
      {
        variableKey: '工程交付地点',
        sourceClause: '图纸总说明附注',
        extractedValue: '阿尔及利亚提济乌祖省 (Tizi Ouzou)',
        pageNumber: 2,
        highlightText: "Site d'implantation: Tizi Ouzou",
        note: '施工总平面图坐标与现场接驳点标识',
      },
    ],
  },
  {
    id: 'ATT-05',
    name: '官方官方招标答疑澄清与补遗公告 01 号 (Additif N°01)',
    fileName: 'Additif-No01-Reponse-Clarifications-DZ2026.pdf',
    category: 'addenda',
    fileType: 'pdf',
    fileSize: '1.9 MB',
    uploadedAt: '2026-10-12 17:05',
    uploader: '海外商务合约部 · 王敏',
    version: 'Rev 1.0 (澄清最终件)',
    tags: ['#答疑补遗', '#项目经理资质', '#建造师证书', '#双语陈述'],
    officialDocNumber: 'DZ-SANTE-ADDITIF-01-2026',
    importance: 'critical',
    verificationStatus: 'verified',
    summary: '业主针对国际投标人提出的12条疑问出具的正式官方答辩函，明确了项目经理资质与证书审查标准。',
    previewSnippet: `Question N°4: Concernant la qualification du Chef de Projet pour le lot CFO:
Réponse: Le Chef de Projet proposé doit justifier d'au moins 10 ans d'expérience dans les projets hospitaliers similaires et être détenteur d'un certificat d'ingénieur ou équivalent (Ex: Certificat de Constructeur de Première Classe avec enregistrement officiel).`,
    linkedVariables: [
      {
        variableKey: '项目经理姓名',
        sourceClause: '答疑澄清第 4 条答辩',
        extractedValue: '李振华',
        pageNumber: 3,
        highlightText: "Le Chef de Projet doit être titulaire des qualifications professionnelles requises",
        note: '经公司海外管理部考核委派李振华总工任本项目常驻项目经理',
      },
      {
        variableKey: '建造师注册编号',
        sourceClause: '答疑澄清第 4 条附注',
        extractedValue: '京1112020202108892',
        pageNumber: 4,
        highlightText: "Numéro d'enregistrement du titre de Constructeur Qualifié",
        note: '一级建造师注册执业证书并已完成公证双认证',
      },
    ],
  },
  {
    id: 'ATT-06',
    name: '官方工程量清单报价表模版 (Cadre du Bordereau des Prix)',
    fileName: 'Cadre-Bordereau-Quantitatif-Estimatif-BQE.xlsx',
    category: 'financial',
    fileType: 'xlsx',
    fileSize: '2.3 MB',
    uploadedAt: '2026-10-08 10:15',
    uploader: '预算造价组 · 孙工',
    version: 'Rev 1.0',
    tags: ['#工程量清单', '#BQE模版', '#阿尔及利亚第纳尔', '#综合合价'],
    officialDocNumber: 'BQE-LOT09-DZ2026',
    importance: 'required',
    verificationStatus: 'verified',
    summary: '官方下发的标准工程量清单电子表格，共计7个主要分部分项子目，含变配电柜、电力电缆与防雷接地。',
    previewSnippet: `Cadre BQE Lot 09:
Devise de l'offre: Dinar Algérien (DZD).
Montant Total de la Soumission: calculé sur la base des prix unitaires fermes et non révisables pour la première tranche.`,
    linkedVariables: [
      {
        variableKey: '投标总价',
        sourceClause: 'BQE 汇总报价表总计栏',
        extractedValue: '1,286,450,000 DZD',
        pageNumber: 1,
        highlightText: "Montant Total de la Soumission en Dinar Algérien (TTC)",
        note: '需与财务标综合测算之总报价保持绝对一致',
      },
    ],
  },
];
