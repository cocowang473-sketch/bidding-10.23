import type { BiddingFileNode } from '../utils/aivlApi';

/**
 * 为未关联后端 aivl 项目的标段提供模拟文件树与文件内容预览。
 * key: TenderProject.id
 */

const PHOENIX_FILES: BiddingFileNode[] = [
  {
    name: '01_招标公告与资格预审',
    path: '01_招标公告与资格预审',
    type: 'directory',
    children: [
      {
        name: 'Avis-Appel-Offres-CentreMedical-Phoenix.pdf',
        path: '01_招标公告与资格预审/Avis-Appel-Offres-CentreMedical-Phoenix.pdf',
        type: 'file',
        size: 3_564_800,
      },
      {
        name: '招标公告中文摘要.docx',
        path: '01_招标公告与资格预审/招标公告中文摘要.docx',
        type: 'file',
        size: 182_900,
      },
      {
        name: 'Dossier-Qualification-Prealable.pdf',
        path: '01_招标公告与资格预审/Dossier-Qualification-Prealable.pdf',
        type: 'file',
        size: 2_210_300,
      },
    ],
  },
  {
    name: '02_投标须知与合同条款',
    path: '02_投标须知与合同条款',
    type: 'directory',
    children: [
      {
        name: 'Instructions-aux-Soumissionnaires-IS.pdf',
        path: '02_投标须知与合同条款/Instructions-aux-Soumissionnaires-IS.pdf',
        type: 'file',
        size: 4_820_100,
      },
      {
        name: 'CCAG-Travaux-DZ-2026.pdf',
        path: '02_投标须知与合同条款/CCAG-Travaux-DZ-2026.pdf',
        type: 'file',
        size: 1_980_000,
      },
      {
        name: 'Modele-Lettre-Soumission.docx',
        path: '02_投标须知与合同条款/Modele-Lettre-Soumission.docx',
        type: 'file',
        size: 86_400,
      },
    ],
  },
  {
    name: '03_技术规格书CCTP',
    path: '03_技术规格书CCTP',
    type: 'directory',
    children: [
      {
        name: 'CCTP-Lot09-Electricite-CFO.pdf',
        path: '03_技术规格书CCTP/CCTP-Lot09-Electricite-CFO.pdf',
        type: 'file',
        size: 15_600_000,
      },
      {
        name: 'CCTP-Lot09-CFA-ToutesCourants-Faibles.pdf',
        path: '03_技术规格书CCTP/CCTP-Lot09-CFA-ToutesCourants-Faibles.pdf',
        type: 'file',
        size: 9_300_000,
      },
      {
        name: 'Annexe-Normes-NFC-IEC.pdf',
        path: '03_技术规格书CCTP/Annexe-Normes-NFC-IEC.pdf',
        type: 'file',
        size: 1_240_000,
      },
    ],
  },
  {
    name: '04_工程量清单BoQ',
    path: '04_工程量清单BoQ',
    type: 'directory',
    children: [
      {
        name: 'BoQ-Lot09-Electricite.xlsx',
        path: '04_工程量清单BoQ/BoQ-Lot09-Electricite.xlsx',
        type: 'file',
        size: 540_000,
      },
      {
        name: 'Bordereau-Prix-Unitaires.pdf',
        path: '04_工程量清单BoQ/Bordereau-Prix-Unitaires.pdf',
        type: 'file',
        size: 760_000,
      },
    ],
  },
  {
    name: '05_图纸',
    path: '05_图纸',
    type: 'directory',
    children: [
      {
        name: 'PLN-ELE-01-SchemaUnifilaire-HTA.pdf',
        path: '05_图纸/PLN-ELE-01-SchemaUnifilaire-HTA.pdf',
        type: 'file',
        size: 2_900_000,
      },
      {
        name: 'PLN-ELE-02-DistributionBT.pdf',
        path: '05_图纸/PLN-ELE-02-DistributionBT.pdf',
        type: 'file',
        size: 3_410_000,
      },
      {
        name: 'PLN-ELE-03-GroupeElectrogene.pdf',
        path: '05_图纸/PLN-ELE-03-GroupeElectrogene.pdf',
        type: 'file',
        size: 1_750_000,
      },
    ],
  },
];

const DAKAR_FILES: BiddingFileNode[] = [
  {
    name: '01_招标公告',
    path: '01_招标公告',
    type: 'directory',
    children: [
      {
        name: 'Avis-AOI-Stade-Dakar-2026.pdf',
        path: '01_招标公告/Avis-AOI-Stade-Dakar-2026.pdf',
        type: 'file',
        size: 3_400_000,
      },
      {
        name: 'Publication-BOMOP-2026-10-11.pdf',
        path: '01_招标公告/Publication-BOMOP-2026-10-11.pdf',
        type: 'file',
        size: 420_000,
      },
    ],
  },
  {
    name: '02_投标须知',
    path: '02_投标须知',
    type: 'directory',
    children: [
      {
        name: 'IS-Cite-Olympique-Dakar.pdf',
        path: '02_投标须知/IS-Cite-Olympique-Dakar.pdf',
        type: 'file',
        size: 5_600_000,
      },
      {
        name: 'Annexe-Garanties-Bancaires.pdf',
        path: '02_投标须知/Annexe-Garanties-Bancaires.pdf',
        type: 'file',
        size: 760_000,
      },
    ],
  },
  {
    name: '03_技术规格书',
    path: '03_技术规格书',
    type: 'directory',
    children: [
      {
        name: 'CCTP-Stade-Dakar-Eclairage.pdf',
        path: '03_技术规格书/CCTP-Stade-Dakar-Eclairage.pdf',
        type: 'file',
        size: 15_800_000,
      },
      {
        name: 'CCTP-Courants-Forts-HTA-BT.pdf',
        path: '03_技术规格书/CCTP-Courants-Forts-HTA-BT.pdf',
        type: 'file',
        size: 11_200_000,
      },
      {
        name: 'Specification-FIFA-Class-V.pdf',
        path: '03_技术规格书/Specification-FIFA-Class-V.pdf',
        type: 'file',
        size: 2_100_000,
      },
    ],
  },
  {
    name: '04_工程量清单BoQ',
    path: '04_工程量清单BoQ',
    type: 'directory',
    children: [
      {
        name: 'BoQ-Lot03-CourantsForts.xlsx',
        path: '04_工程量清单BoQ/BoQ-Lot03-CourantsForts.xlsx',
        type: 'file',
        size: 480_000,
      },
      {
        name: 'BoQ-Eclairage-Sportif.xlsx',
        path: '04_工程量清单BoQ/BoQ-Eclairage-Sportif.xlsx',
        type: 'file',
        size: 310_000,
      },
    ],
  },
  {
    name: '05_图纸',
    path: '05_图纸',
    type: 'directory',
    children: [
      {
        name: 'DWG-01-Implantation-Mats-Eclairage.pdf',
        path: '05_图纸/DWG-01-Implantation-Mats-Eclairage.pdf',
        type: 'file',
        size: 2_400_000,
      },
      {
        name: 'DWG-02-SchemaUnifilaire-HTA.pdf',
        path: '05_图纸/DWG-02-SchemaUnifilaire-HTA.pdf',
        type: 'file',
        size: 1_900_000,
      },
    ],
  },
];

const ABIDJAN_FILES: BiddingFileNode[] = [
  {
    name: '01_招标公告',
    path: '01_招标公告',
    type: 'directory',
    children: [
      {
        name: 'Avis-Appel-Offres-Tour-Financiere.pdf',
        path: '01_招标公告/Avis-Appel-Offres-Tour-Financiere.pdf',
        type: 'file',
        size: 2_800_000,
      },
    ],
  },
  {
    name: '02_投标须知',
    path: '02_投标须知',
    type: 'directory',
    children: [
      {
        name: 'IS-Tour-Financiere-Abidjan.pdf',
        path: '02_投标须知/IS-Tour-Financiere-Abidjan.pdf',
        type: 'file',
        size: 4_100_000,
      },
    ],
  },
  {
    name: '03_技术规格书',
    path: '03_技术规格书',
    type: 'directory',
    children: [
      {
        name: 'CCTP-Lot01-Electrotechnique-HT-BT.pdf',
        path: '03_技术规格书/CCTP-Lot01-Electrotechnique-HT-BT.pdf',
        type: 'file',
        size: 13_200_000,
      },
      {
        name: 'Annexe-Groupe-Electrogene-Secours.pdf',
        path: '03_技术规格书/Annexe-Groupe-Electrogene-Secours.pdf',
        type: 'file',
        size: 1_540_000,
      },
    ],
  },
  {
    name: '04_工程量清单BoQ',
    path: '04_工程量清单BoQ',
    type: 'directory',
    children: [
      {
        name: 'BoQ-Lot01-HTA-BT.xlsx',
        path: '04_工程量清单BoQ/BoQ-Lot01-HTA-BT.xlsx',
        type: 'file',
        size: 420_000,
      },
    ],
  },
];

export const MOCK_BIDDING_FILE_TREES: Record<string, BiddingFileNode[]> = {
  'TENDER-2026-001': PHOENIX_FILES,
  'TENDER-2026-002': DAKAR_FILES,
  'TENDER-2026-003': ABIDJAN_FILES,
};

/**
 * 根据文件路径提供可读的内容预览。按文件名关键字路由到不同模板，
 * 让用户点击左侧文件时看到贴近真实招标文件的中法双语文本。
 */
export function getMockFileContent(tenderId: string, filePath: string): string {
  const fileName = filePath.split('/').pop() || filePath;
  const ext = (fileName.split('.').pop() || '').toLowerCase();

  // Excel / 工程量清单
  if (ext === 'xlsx' || fileName.includes('BoQ') || fileName.includes('Bordereau')) {
    return [
      `【工程量清单 Bordereau Quantitatif / BoQ】`,
      `文件: ${fileName}`,
      `标段: ${tenderId}`,
      ``,
      `注: Excel 文件内容仅做文本摘要预览,精确数据请在"3. 清单组价"工作台中查看结构化清单。`,
      ``,
      `────────────────────────────────────────`,
      `序号   项目名称                                单位   数量      备注`,
      `────────────────────────────────────────`,
      `3.1.1  2500kVA 油浸式配电变压器 (20kV/0.4kV)   台     4         Schneider / ABB 认可品牌`,
      `3.1.2  1600kVA 干式变压器                      台     2         H级绝缘`,
      `3.2.1  高压 20kV 真空断路器柜 VD4              台     12        AREVA / Siemens 兼容`,
      `3.3.1  2500A 低压总开关柜 (Blokset)            套     4         IP31 内部分隔 Form 4b`,
      `3.4.1  LED 泛光灯 1500W (FIFA Class V 认证)   套     360       CRI>90, TLCI>90`,
      `3.5.1  1250 kVA 柴油发电机组 (Prime)           台     3         Perkins / Volvo Penta`,
      `3.6.1  UPS 不间断电源系统 300kVA               套     2         N+1 冗余`,
      `────────────────────────────────────────`,
      ``,
      `※ 以上为节选,完整清单共 486 行,请以 Excel 原件及"清单组价"工作台数据为准。`,
    ].join('\n');
  }

  // 招标公告
  if (fileName.includes('Avis') || fileName.includes('公告') || fileName.includes('BOMOP')) {
    return [
      `【招标公告 Avis d'Appel d'Offres International】`,
      `文件: ${fileName}`,
      ``,
      `────────────────────────────────────────`,
      `AVIS D'APPEL D'OFFRES INTERNATIONAL`,
      `国际公开招标通告`,
      `────────────────────────────────────────`,
      ``,
      `1. Maître d'Ouvrage / 招标人:`,
      `   见标段卡片"业主"字段。`,
      ``,
      `2. Objet du Marché / 招标范围:`,
      `   Travaux d'électricité CFO/CFA, groupe électrogène, UPS,`,
      `   éclairage spécial et distribution haute tension.`,
      `   强弱电总承包,包含柴油发电机组、UPS 不间断电源、`,
      `   专业场景照明与高压配电系统。`,
      ``,
      `3. Mode de Passation / 招标方式:`,
      `   Appel d'offres international ouvert, en une seule étape,`,
      `   avec pré-qualification simultanée.`,
      `   国际公开招标,一阶段两信封法,同步资格审查。`,
      ``,
      `4. Caution de Soumission / 投标保证金:`,
      `   详见"投标须知"第 4 条及标段卡片"投标保证金金额"变量。`,
      ``,
      `5. Date Limite / 截标日期:`,
      `   详见标段卡片"截标日期"字段。`,
      `   Toute offre reçue après cette date sera déclarée irrecevable.`,
      `   逾期送达的投标文件将被认定为无效文件,原件退回。`,
      ``,
      `6. Visite Obligatoire du Site / 必须参加踏勘:`,
      `   Date à fixer par le Maître d'Ouvrage.`,
      `   踏勘日期由招标人另行通知,投标人需提前 72 小时报名。`,
      ``,
      `7. Dépôt des Offres / 投标文件递交地点:`,
      `   Siège du Maître d'Ouvrage - Service Marchés.`,
      `   招标人办公楼合同管理处。`,
      ``,
      `※ 本预览由 bidcraft 智能解包生成,原件以 PDF 为准。`,
    ].join('\n');
  }

  // 投标须知 Instructions aux Soumissionnaires
  if (fileName.includes('Instructions') || fileName.includes('IS-') || fileName.startsWith('IS-')) {
    return [
      `【投标须知 Instructions aux Soumissionnaires (IS)】`,
      `文件: ${fileName}`,
      ``,
      `────────────────────────────────────────`,
      `Article 1 - Objet du Marché / 第 1 条 招标范围`,
      `────────────────────────────────────────`,
      `Le présent marché a pour objet la réalisation des travaux de`,
      `distribution électrique haute et basse tension, y compris`,
      `fourniture, pose et mise en service.`,
      ``,
      `本招标文件旨在确定高低压配电系统工程的承包单位,范围包括`,
      `设备供货、现场安装、调试及试运行。`,
      ``,
      `────────────────────────────────────────`,
      `Article 4 - Caution de Soumission / 第 4 条 投标保证金`,
      `────────────────────────────────────────`,
      `Le soumissionnaire doit fournir une caution de soumission`,
      `émise par une banque de premier rang, valable 120 jours`,
      `au-delà de la date limite de dépôt des offres.`,
      ``,
      `投标人须提交由一级银行开立、投标截止日后有效期不少于 120 天`,
      `的投标保函。保函金额详见标段变量"投标保证金金额"。`,
      ``,
      `────────────────────────────────────────`,
      `Article 7 - Validité de l'Offre / 第 7 条 投标有效期`,
      `────────────────────────────────────────`,
      `L'offre reste valable pendant 120 jours à compter de la date`,
      `limite de dépôt. Toute demande de prolongation sera notifiée`,
      `par écrit 15 jours avant expiration.`,
      ``,
      `投标文件自投标截止日起 120 日历天内保持有效。若需延长,招标人`,
      `将在到期前 15 日书面通知。`,
      ``,
      `────────────────────────────────────────`,
      `Article 12 - Critères d'Évaluation / 第 12 条 评标办法`,
      `────────────────────────────────────────`,
      `L'évaluation sera effectuée selon la méthode "offre économique`,
      `la plus avantageuse", avec pondération: Technique 40%, Prix 60%.`,
      ``,
      `评标采用"最经济有利投标"法,技术分权重 40%,价格分权重 60%。`,
      `技术分低于 70 分的投标文件将被认定为实质性不响应。`,
      ``,
      `※ 本预览为核心条款摘录,完整内容请以 PDF 原件为准。`,
    ].join('\n');
  }

  // CCTP 技术规格书
  if (fileName.includes('CCTP') || fileName.includes('技术规格')) {
    return [
      `【技术规格书 Cahier des Clauses Techniques Particulières (CCTP)】`,
      `文件: ${fileName}`,
      ``,
      `────────────────────────────────────────`,
      `Chapitre 1 - Généralités / 第 1 章 总则`,
      `────────────────────────────────────────`,
      `1.1 Normes applicables / 适用标准:`,
      `   - NF C 15-100 : Installations électriques BT`,
      `   - NF C 13-100 / NF C 13-200 : Postes HTA`,
      `   - IEC 60364, IEC 61439, IEC 60947`,
      `   - 本工程所在国现行国家强制标准`,
      ``,
      `1.2 Qualité des matériaux / 材料品质要求:`,
      `   Tous les équipements seront neufs, de première qualité,`,
      `   et conformes aux normes CE / IEC. Marques imposées:`,
      `   Schneider, ABB, Siemens, Legrand ou équivalent agréé.`,
      ``,
      `   所有设备必须全新且为第一等级品质,符合 CE / IEC 标准。`,
      `   指定品牌: Schneider、ABB、Siemens、Legrand 或经招标人书面`,
      `   认可的同等替代品牌。`,
      ``,
      `────────────────────────────────────────`,
      `Chapitre 3 - Poste de Livraison HTA / 第 3 章 高压配电站`,
      `────────────────────────────────────────`,
      `3.1 Transformateur de puissance 2500 kVA:`,
      `   - Tension primaire: 20 kV ± 2 × 2,5%`,
      `   - Tension secondaire: 400 V entre phases`,
      `   - Couplage: Dyn11`,
      `   - Refroidissement: ONAN (bain d'huile)`,
      `   - Pertes: standard DIN 42500 niveau Co/Bk`,
      ``,
      `   2500kVA 油浸式配电变压器,一次 20kV ± 2×2.5%,二次 400V,`,
      `   接线组别 Dyn11,ONAN 自然油冷,损耗等级 DIN 42500 Co/Bk。`,
      ``,
      `────────────────────────────────────────`,
      `Chapitre 5 - Groupe Électrogène de Secours / 第 5 章 应急柴油发电机`,
      `────────────────────────────────────────`,
      `Puissance nominale: 1250 kVA PRP (Prime Power).`,
      `Démarrage automatique sur défaut réseau en moins de 10 secondes.`,
      `Autonomie: 24 heures à pleine charge sans ravitaillement.`,
      ``,
      `额定功率: 1250 kVA PRP (持续功率等级)。`,
      `市电失电后自动启动,启动时间 ≤ 10 秒。`,
      `满载不加油续航时间不低于 24 小时。`,
      ``,
      `※ 本预览为核心技术条款摘录,完整规格共 180+ 页,请以 PDF 原件为准。`,
    ].join('\n');
  }

  // 图纸类
  if (fileName.startsWith('PLN-') || fileName.startsWith('DWG-') || fileName.includes('图纸') || fileName.includes('Schema')) {
    return [
      `【施工图纸 Plan / Dessin】`,
      `文件: ${fileName}`,
      ``,
      `注: 图纸为 PDF 矢量文件,此处仅提供元数据预览。`,
      ``,
      `────────────────────────────────────────`,
      `图纸编号 / N° Plan:  ${fileName.replace(/\.pdf$/i, '')}`,
      `比例 / Échelle:      1:100 / 1:50`,
      `图幅 / Format:       A1 (594 × 841 mm)`,
      `版次 / Révision:     Rev B - Bon pour Appel d'Offres`,
      `────────────────────────────────────────`,
      ``,
      `主要内容 / Contenu Principal:`,
      ``,
      `  • Schéma unifilaire général de la distribution électrique`,
      `    供配电系统主接线图`,
      `  • Localisation des armoires HTA et TGBT`,
      `    高压开关柜与低压总配电柜布置`,
      `  • Chemins de câbles principaux et sections conducteurs`,
      `    主桥架路由与电缆截面标注`,
      `  • Mise à la terre et liaisons équipotentielles`,
      `    接地系统与等电位联结`,
      ``,
      `请在设计评审会议及现场交底时,以甲方加盖"施工用图"章的`,
      `正式 PDF 版本为准。`,
    ].join('\n');
  }

  // 默认通用预览
  return [
    `【文件预览】`,
    `文件名: ${fileName}`,
    `路径:   ${filePath}`,
    `标段:   ${tenderId}`,
    ``,
    `本标段尚未关联后端 aivl 项目 (模拟数据),因此此处展示的是`,
    `模板示例文本,非从真实文件抽取的内容。`,
    ``,
    `若需查看完整原件,请:`,
    `  1) 返回标段总览,点击「新建标段 (上传ZIP/立项)」`,
    `  2) 选择同名招标包 ZIP 上传至后端`,
    `  3) 上传完成后,系统会自动绑定 aivlProjectId,`,
    `     再次打开此弹窗即可查看结构化解析结果与原文摘录。`,
  ].join('\n');
}

export function hasMockBiddingFiles(tenderId: string): boolean {
  return Object.prototype.hasOwnProperty.call(MOCK_BIDDING_FILE_TREES, tenderId);
}
