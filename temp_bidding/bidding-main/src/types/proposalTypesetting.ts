// ============================================================================
// 交互式标书排版与自定义打印配置数据模型 (Proposal Typesetting & Print Spec)
// ============================================================================

export type PageMarginPreset = 'standard' | 'compact' | 'wide' | 'custom';
export type PageFontPreset = 'songti' | 'fangsong' | 'heiti' | 'times' | 'garamond' | 'sans';
export type PageFontSizePreset = '10.5pt' | '12pt' | '14pt';
export type PageLineHeightPreset = 1.35 | 1.5 | 1.75 | 2.0;
export type BilingualLayoutMode = 'two-column' | 'stacked';
export type PageNumberFormat = 'zh' | 'fr' | 'dash';

export interface ProposalTypesettingConfig {
  // 1. 纸张与边距 (Page & Margins)
  paperSize: 'A4';
  marginPreset: PageMarginPreset;
  marginTopMm: number;    // 默认 25mm
  marginBottomMm: number; // 默认 25mm
  marginLeftMm: number;   // 默认 25mm
  marginRightMm: number;  // 默认 25mm

  // 2. 字体与正文版式 (Typography)
  fontPreset: PageFontPreset;
  fontSizePreset: PageFontSizePreset;
  lineHeight: PageLineHeightPreset;
  paragraphIndent: boolean; // 首行缩进 2 字符
  paragraphSpacingMm: number; // 段落间距 (默认 3mm)

  // 3. 标书组成架构开关 (Dossier Structure)
  showCoverPage: boolean;        // 正式投标书封面
  showTableOfContents: boolean;  // 自动目录页
  showSignaturePage: boolean;    // 法定签署与公章预留页
  pageBreakBetweenSections: boolean; // 章节间强制分页

  // 4. 封面元数据 (Cover Metadata)
  coverData: {
    tenderCode: string;
    projectNameZh: string;
    projectNameFr: string;
    clientName: string;
    bidderNameZh: string;
    bidderNameFr: string;
    legalRepresentative: string;
    authorizedAgent: string;
    submissionDate: string;
    tenderDocType: string; // 商务及法定标 / 技术标 / 综合标
  };

  // 5. 页眉与页脚 (Header & Footer)
  showHeader: boolean;
  headerText: string;
  headerBorderBottom: boolean;
  showFooter: boolean;
  footerText: string;
  footerBorderTop: boolean;
  pageNumberFormat: PageNumberFormat;

  // 6. 防扩散安全水印 (Watermark)
  showWatermark: boolean;
  watermarkText: string;
  watermarkOpacity: number; // 0.05 ~ 0.25
  watermarkAngle: number;   // -35 deg

  // 7. 语言对照模式 (Language & Columns)
  languageMode: 'bilingual' | 'zh' | 'fr';
  bilingualLayout: BilingualLayoutMode; // 'two-column' (左右分栏) | 'stacked' (上下分段)
}

export const DEFAULT_TYPESETTING_CONFIG: ProposalTypesettingConfig = {
  paperSize: 'A4',
  marginPreset: 'standard',
  marginTopMm: 25,
  marginBottomMm: 25,
  marginLeftMm: 25,
  marginRightMm: 25,

  fontPreset: 'songti',
  fontSizePreset: '12pt', // 小四，招投标国家标准规范字号
  lineHeight: 1.5,
  paragraphIndent: true,
  paragraphSpacingMm: 3,

  showCoverPage: true,
  showTableOfContents: true,
  showSignaturePage: true,
  pageBreakBetweenSections: true,

  coverData: {
    tenderCode: '240-DZ-HEALTH-2026-001',
    projectNameZh: '阿尔及利亚提济乌祖省 240 床综合医院建设项目',
    projectNameFr: 'Projet de Construction de l\'Hôpital 240 Lits à Tizi Ouzou (Algérie)',
    clientName: '阿尔及利亚卫生部工程管理局 (Direction de la Santé)',
    bidderNameZh: '中国建筑第二工程局有限公司 (阿尔及利亚分公司)',
    bidderNameFr: 'CHINA STATE CONSTRUCTION ENGINEERING CORP. (ALGERIE)',
    legalRepresentative: '陈建国 (执行董事 / 法定代表人)',
    authorizedAgent: '刘伟 (阿尔及利亚投标项目总代表)',
    submissionDate: '2026 年 08 月 20 日',
    tenderDocType: '商务与法定义务投标文件 (OFFRE COMMERCIALE & JURIDIQUE)',
  },

  showHeader: true,
  headerText: '阿尔及利亚240床医院项目 · 商务投标文件 (OFFRE COMMERCIALE)',
  headerBorderBottom: true,
  showFooter: true,
  footerText: 'CONFIDENTIEL · 投标文件商务机密 严禁外传',
  footerBorderTop: true,
  pageNumberFormat: 'zh',

  showWatermark: true,
  watermarkText: '中建二局投标专有 · DOCUMENT DE SOUMISSION CONFIDENTIEL',
  watermarkOpacity: 0.08,
  watermarkAngle: -35,

  languageMode: 'bilingual',
  bilingualLayout: 'two-column',
};
