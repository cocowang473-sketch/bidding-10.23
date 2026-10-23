import React, { useState, useMemo, useRef } from 'react';
import {
  ProposalSection,
  VariableValues,
  LanguageMode,
} from '../types/proposalVariables';
import {
  ProposalTypesettingConfig,
  DEFAULT_TYPESETTING_CONFIG,
  PageMarginPreset,
  PageFontPreset,
  PageFontSizePreset,
  PageLineHeightPreset,
} from '../types/proposalTypesetting';
import { INITIAL_VARIABLE_VALUES_FR } from '../data/mockProposalComponents';
import {
  Printer,
  Download,
  Settings2,
  FileText,
  Sliders,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  ShieldCheck,
  Globe2,
  Layers,
  ChevronDown,
  Sparkles,
  Info,
  HelpCircle,
  Copy,
  ArrowRight,
  Stamp,
  AlignLeft,
  Columns,
} from 'lucide-react';

interface ProposalInteractivePreviewProps {
  sections: ProposalSection[];
  variableValues: VariableValues;
  projectName?: string;
  tenderCode?: string;
  onClose?: () => void;
}

export const ProposalInteractivePreview: React.FC<ProposalInteractivePreviewProps> = ({
  sections,
  variableValues,
  projectName = '阿尔及利亚提济乌祖省 240 床综合医院建设项目',
  tenderCode = '240-DZ-HEALTH-2026-001',
  onClose,
}) => {
  // 排版样式配置状态
  const [config, setConfig] = useState<ProposalTypesettingConfig>(() => ({
    ...DEFAULT_TYPESETTING_CONFIG,
    coverData: {
      ...DEFAULT_TYPESETTING_CONFIG.coverData,
      projectNameZh: projectName,
      tenderCode: tenderCode,
    },
    headerText: `${projectName} · 商务投标文件 (OFFRE COMMERCIALE)`,
  }));

  // 排版控制面板当前激活选项卡
  const [activeConfigTab, setActiveConfigTab] = useState<'page' | 'structure' | 'header' | 'bilingual'>('page');

  // 画布缩放比例 (70% ~ 130%)
  const [zoomScale, setZoomScale] = useState<number>(90);

  // 复制反馈
  const [copied, setCopied] = useState(false);

  // 辅助法语变量映射
  const frenchVariableValues = useMemo(() => {
    const map: Record<string, string> = { ...INITIAL_VARIABLE_VALUES_FR };
    Object.keys(variableValues).forEach((k) => {
      if (variableValues[k] && !map[k]) {
        map[k] = variableValues[k];
      }
    });
    return map;
  }, [variableValues]);

  // 解析并插值后的章节正文
  const resolvedSections = useMemo(() => {
    return sections.map((sec) => {
      const zhContent = sec.templateContent.replace(/\[([^\]]+)\]/g, (_, key) => {
        return variableValues[key] || `[${key}]`;
      });

      const frContent = (sec.templateContentFr || sec.templateContent).replace(
        /\[([^\]]+)\]/g,
        (_, key) => {
          return frenchVariableValues[key] || variableValues[key] || `[${key}]`;
        }
      );

      return {
        ...sec,
        resolvedZh: zhContent,
        resolvedFr: frContent,
      };
    });
  }, [sections, variableValues, frenchVariableValues]);

  // 切换边距预设
  const handleMarginPresetChange = (preset: PageMarginPreset) => {
    let top = 25;
    let bottom = 25;
    let left = 25;
    let right = 25;

    if (preset === 'compact') {
      top = 20;
      bottom = 20;
      left = 20;
      right = 20;
    } else if (preset === 'wide') {
      top = 30;
      bottom = 30;
      left = 30;
      right = 30;
    }

    setConfig((prev) => ({
      ...prev,
      marginPreset: preset,
      marginTopMm: top,
      marginBottomMm: bottom,
      marginLeftMm: left,
      marginRightMm: right,
    }));
  };

  // 触发原生高品质打印或导出 PDF
  const handlePrint = () => {
    window.print();
  };

  // 导出独立离线高保真可打印 HTML 文件 (在任何电脑 Chrome/Edge 浏览器双击即可唤起 A4 PDF 打印)
  const handleDownloadPrintableHtml = () => {
    const printableElement = document.getElementById('printable-proposal-container');
    if (!printableElement) return;

    // 克隆节点并重置缩放样式以确保导出为标准 1:1
    const clone = printableElement.cloneNode(true) as HTMLElement;
    const innerScalable = clone.querySelector('div');
    if (innerScalable) {
      innerScalable.style.transform = 'none';
      innerScalable.style.margin = '0 auto';
    }

    const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${config.coverData.projectNameZh || '工程商务标书'} - 标书输出归档 (A4标准)</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    html, body {
      margin: 0;
      padding: 0;
      background: #f8fafc;
      color: #0f172a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-banner {
      background: #0f172a;
      color: #ffffff;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
    }
    .print-btn {
      background: #059669;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      font-size: 13px;
    }
    .print-btn:hover { background: #047857; }
    .a4-sheet-preview {
      width: 210mm;
      min-height: 297mm;
      height: 297mm;
      background-color: #ffffff;
      box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.12);
      border: 1px solid #e2e8f0;
      position: relative;
      box-sizing: border-box;
      margin: 24px auto;
      overflow: hidden;
      page-break-after: always;
      break-after: page;
    }
    .a4-sheet-preview:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .font-songti { font-family: "SimSun", "STSong", "Songti SC", serif; }
    .font-fangsong { font-family: "FangSong", "STFangsong", serif; }
    .font-heiti { font-family: "SimHei", "Microsoft YaHei", sans-serif; }
    .font-times { font-family: "Times New Roman", Times, serif; }
    .font-garamond { font-family: "Garamond", "Georgia", serif; }
    .font-sans { font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
    .toc-row { display: flex; align-items: baseline; justify-content: space-between; width: 100%; }
    .toc-title { padding-right: 8px; background: #ffffff; z-index: 1; }
    .toc-leader { flex-grow: 1; border-bottom: 1.5px dotted #94a3b8; margin: 0 4px; position: relative; top: -3px; }
    .toc-page { padding-left: 8px; background: #ffffff; z-index: 1; font-family: monospace; }
    .official-stamp-box { width: 140px; height: 90px; border: 1.5px dashed #dc2626; border-radius: 6px; color: #dc2626; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; background-color: rgba(254, 242, 242, 0.4); }
    .proposal-watermark-layer { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 2; overflow: hidden; }
    .proposal-watermark-text { font-family: "SimSun", serif; font-weight: 800; white-space: nowrap; letter-spacing: 0.15em; }
    .bilingual-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .bilingual-left-zh { border-right: 1px solid #e2e8f0; padding-right: 20px; }
    .bilingual-right-fr { padding-left: 4px; font-style: italic; font-family: "Garamond", "Times New Roman", serif; }
    @media print {
      body { background: #ffffff !important; }
      .print-banner { display: none !important; }
      .a4-sheet-preview { margin: 0 !important; box-shadow: none !important; border: none !important; }
    }
  </style>
</head>
<body>
  <div class="print-banner">
    <div><strong>${config.coverData.projectNameZh}</strong> · 标书标准打印归档文档 (A4标准)</div>
    <button class="print-btn" onclick="window.print()">🖨️ 唤起系统打印 (保存为 PDF)</button>
  </div>
  <div id="print-root">
    ${clone.innerHTML}
  </div>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.coverData.projectNameZh || '投标书'}_标准排版可打印归档_${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 导出文本
  const handleExportText = () => {
    const lines: string[] = [];
    lines.push(`================================================================================`);
    lines.push(`${config.coverData.projectNameZh}`);
    lines.push(`TENDER CODE: ${config.coverData.tenderCode}`);
    lines.push(`BIDDER: ${config.coverData.bidderNameZh} / ${config.coverData.bidderNameFr}`);
    lines.push(`================================================================================\n`);

    resolvedSections.forEach((sec, idx) => {
      lines.push(`\n第 ${idx + 1} 章节: ${sec.code} - ${sec.title}`);
      lines.push(`--------------------------------------------------------------------------------`);
      if (config.languageMode === 'zh') {
        lines.push(sec.resolvedZh);
      } else if (config.languageMode === 'fr') {
        lines.push(sec.resolvedFr);
      } else {
        lines.push(`【中文条款】:\n${sec.resolvedZh}\n\n【法文对照 (Version Française)】:\n${sec.resolvedFr}`);
      }
      lines.push('\n');
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `投标商务标书排版成果_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 复制全文
  const handleCopyFull = () => {
    const fullText = resolvedSections
      .map((s) => `${s.code} ${s.title}\n${s.resolvedZh}\n\n${s.resolvedFr}`)
      .join('\n\n---\n\n');
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 重置回推荐标准版式
  const handleResetDefaults = () => {
    setConfig({
      ...DEFAULT_TYPESETTING_CONFIG,
      coverData: {
        ...DEFAULT_TYPESETTING_CONFIG.coverData,
        projectNameZh: projectName,
        tenderCode: tenderCode,
      },
    });
  };

  // 字体样式映射
  const getFontFamilyClass = (preset: PageFontPreset) => {
    switch (preset) {
      case 'songti':
        return 'font-songti';
      case 'fangsong':
        return 'font-fangsong';
      case 'heiti':
        return 'font-heiti';
      case 'times':
        return 'font-times';
      case 'garamond':
        return 'font-garamond';
      case 'sans':
      default:
        return 'font-sans';
    }
  };

  // 估算总页数
  const totalPagesCount = useMemo(() => {
    let count = 0;
    if (config.showCoverPage) count += 1;
    if (config.showTableOfContents) count += 1;
    if (config.pageBreakBetweenSections) {
      count += resolvedSections.length;
    } else {
      count += Math.ceil(resolvedSections.length / 1.5);
    }
    if (config.showSignaturePage) count += 1;
    return Math.max(1, count);
  }, [config.showCoverPage, config.showTableOfContents, config.pageBreakBetweenSections, config.showSignaturePage, resolvedSections.length]);

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[720px] bg-slate-100/90 rounded-xl overflow-hidden border border-slate-200 shadow-xs">
      {/* ========================================================================= */}
      {/* 1. 左侧：交互式标书排版与版式控制面板 (宽度固定 340px，独立滚动) */}
      {/* ========================================================================= */}
      <div className="w-full lg:w-85 border-r border-slate-200 bg-white flex flex-col shrink-0 no-print z-10">
        {/* 控制面板顶栏 */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
              <Sliders className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">标书排版与打印设置</h3>
              <p className="text-[11px] text-slate-500">动态定制国际工程投标文件输出格式</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded transition-colors"
            title="恢复推荐标准版式"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 四大排版模块微选项卡 */}
        <div className="flex items-center bg-slate-100 p-1 border-b border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setActiveConfigTab('page')}
            className={`flex-1 py-1.5 rounded-md font-medium transition-all text-center cursor-pointer ${
              activeConfigTab === 'page'
                ? 'bg-white text-blue-800 font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            版面边距
          </button>
          <button
            type="button"
            onClick={() => setActiveConfigTab('structure')}
            className={`flex-1 py-1.5 rounded-md font-medium transition-all text-center cursor-pointer ${
              activeConfigTab === 'structure'
                ? 'bg-white text-blue-800 font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            封面架构
          </button>
          <button
            type="button"
            onClick={() => setActiveConfigTab('header')}
            className={`flex-1 py-1.5 rounded-md font-medium transition-all text-center cursor-pointer ${
              activeConfigTab === 'header'
                ? 'bg-white text-blue-800 font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            页眉水印
          </button>
          <button
            type="button"
            onClick={() => setActiveConfigTab('bilingual')}
            className={`flex-1 py-1.5 rounded-md font-medium transition-all text-center cursor-pointer ${
              activeConfigTab === 'bilingual'
                ? 'bg-white text-blue-800 font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            双语对照
          </button>
        </div>

        {/* 交互调节参数表单 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-slate-700">
          {/* TAB 1: 版面与边距 */}
          {activeConfigTab === 'page' && (
            <div className="space-y-4">
              <div>
                <label className="font-bold text-slate-800 block mb-1.5">
                  A4 页面边距预设：
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['standard', 'compact', 'wide'] as PageMarginPreset[]).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleMarginPresetChange(preset)}
                      className={`py-1.5 px-2 rounded-lg border text-center transition-all cursor-pointer ${
                        config.marginPreset === preset
                          ? 'bg-blue-50 text-blue-800 border-blue-500 font-bold shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {preset === 'standard' && '标准 (25mm)'}
                      {preset === 'compact' && '紧凑 (20mm)'}
                      {preset === 'wide' && '宽裕 (30mm)'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1.5">
                  标书正文字体风格：
                </label>
                <select
                  value={config.fontPreset}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, fontPreset: e.target.value as PageFontPreset }))
                  }
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white font-medium focus:ring-1 focus:ring-blue-600"
                >
                  <option value="songti">宋体 (SimSun) · 传统公文标书标准</option>
                  <option value="fangsong">仿宋 (FangSong) · 严谨规范红头公文</option>
                  <option value="heiti">黑体 (SimHei) · 现代工程技术风格</option>
                  <option value="times">Times New Roman · 国际商务英语/法标规范</option>
                  <option value="garamond">Garamond · 典雅欧洲法律文件风</option>
                  <option value="sans">系统无衬线 · 现代数字化文档</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-800 block mb-1.5">
                    正文字号：
                  </label>
                  <select
                    value={config.fontSizePreset}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        fontSizePreset: e.target.value as PageFontSizePreset,
                      }))
                    }
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white font-medium focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="12pt">小四 (12pt / 推荐标准)</option>
                    <option value="10.5pt">五号 (10.5pt / 紧凑型)</option>
                    <option value="14pt">四号 (14pt / 大字易读)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1.5">
                    行间距倍数：
                  </label>
                  <select
                    value={config.lineHeight}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        lineHeight: Number(e.target.value) as PageLineHeightPreset,
                      }))
                    }
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white font-medium focus:ring-1 focus:ring-blue-600"
                  >
                    <option value={1.35}>1.35 倍 (紧凑)</option>
                    <option value={1.5}>1.5 倍 (推荐标准)</option>
                    <option value={1.75}>1.75 倍 (舒缓)</option>
                    <option value={2.0}>2.0 倍 (双倍行距)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">段落首行缩进 2 字符</span>
                  <input
                    type="checkbox"
                    checked={config.paragraphIndent}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, paragraphIndent: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">段间距 (mm)</span>
                  <span className="font-mono font-bold text-blue-700">{config.paragraphSpacingMm} mm</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="0.5"
                  value={config.paragraphSpacingMm}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, paragraphSpacingMm: Number(e.target.value) }))
                  }
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>
          )}

          {/* TAB 2: 标书构成架构 */}
          {activeConfigTab === 'structure' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block">正式标书封面页</span>
                    <span className="text-[11px] text-slate-500">含工程名、编号、单位及盖章区</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.showCoverPage}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, showCoverPage: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-slate-200/80 pt-2">
                  <div>
                    <span className="font-bold text-slate-800 block">自动生成目录页 (Sommaire)</span>
                    <span className="text-[11px] text-slate-500">提取章节标题与点状引导虚线</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.showTableOfContents}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, showTableOfContents: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-slate-200/80 pt-2">
                  <div>
                    <span className="font-bold text-slate-800 block">章节间强制新页起始</span>
                    <span className="text-[11px] text-slate-500">插入 page-break-after: always</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.pageBreakBetweenSections}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, pageBreakBetweenSections: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-slate-200/80 pt-2">
                  <div>
                    <span className="font-bold text-slate-800 block">法定代表签署与盖章页</span>
                    <span className="text-[11px] text-slate-500">红框印章预留位与签名栏</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.showSignaturePage}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, showSignaturePage: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* 封面可微调字段 */}
              {config.showCoverPage && (
                <div className="space-y-2.5">
                  <label className="font-bold text-slate-800 block">封面信息定制：</label>
                  <div>
                    <span className="text-[11px] text-slate-500 block">投标单位名称 (中文)：</span>
                    <input
                      type="text"
                      value={config.coverData.bidderNameZh}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          coverData: { ...prev.coverData, bidderNameZh: e.target.value },
                        }))
                      }
                      className="w-full p-1.5 border border-slate-300 rounded text-xs mt-0.5"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">法定代表人：</span>
                    <input
                      type="text"
                      value={config.coverData.legalRepresentative}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          coverData: { ...prev.coverData, legalRepresentative: e.target.value },
                        }))
                      }
                      className="w-full p-1.5 border border-slate-300 rounded text-xs mt-0.5"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">递交日期：</span>
                    <input
                      type="text"
                      value={config.coverData.submissionDate}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          coverData: { ...prev.coverData, submissionDate: e.target.value },
                        }))
                      }
                      className="w-full p-1.5 border border-slate-300 rounded text-xs mt-0.5"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: 页眉页脚与防伪水印 */}
          {activeConfigTab === 'header' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">启用页眉 (Header)</span>
                  <input
                    type="checkbox"
                    checked={config.showHeader}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, showHeader: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
                {config.showHeader && (
                  <input
                    type="text"
                    value={config.headerText}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, headerText: e.target.value }))
                    }
                    placeholder="自定义页眉标题..."
                    className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white"
                  />
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">启用页脚 (Footer)</span>
                  <input
                    type="checkbox"
                    checked={config.showFooter}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, showFooter: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
                {config.showFooter && (
                  <>
                    <input
                      type="text"
                      value={config.footerText}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, footerText: e.target.value }))
                      }
                      placeholder="自定义页脚保密说明..."
                      className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white"
                    />
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="text-slate-500">页码格式：</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setConfig((prev) => ({ ...prev, pageNumberFormat: 'zh' }))}
                          className={`px-2 py-0.5 rounded border text-[10px] ${
                            config.pageNumberFormat === 'zh'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-600'
                          }`}
                        >
                          第X页 共Y页
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfig((prev) => ({ ...prev, pageNumberFormat: 'fr' }))}
                          className={`px-2 py-0.5 rounded border text-[10px] ${
                            config.pageNumberFormat === 'fr'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-600'
                          }`}
                        >
                          Page X sur Y
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* 安全防伪水印 */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">页面斜向防扩散水印</span>
                  <input
                    type="checkbox"
                    checked={config.showWatermark}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, showWatermark: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
                {config.showWatermark && (
                  <div className="space-y-2 pt-1">
                    <input
                      type="text"
                      value={config.watermarkText}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, watermarkText: e.target.value }))
                      }
                      placeholder="输入水印文字..."
                      className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white"
                    />
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">水印浓度：</span>
                      <span className="font-mono text-blue-700 font-bold">{Math.round(config.watermarkOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.04"
                      max="0.22"
                      step="0.01"
                      value={config.watermarkOpacity}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, watermarkOpacity: Number(e.target.value) }))
                      }
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: 中法双语与排版分栏 */}
          {activeConfigTab === 'bilingual' && (
            <div className="space-y-4">
              <div>
                <label className="font-bold text-slate-800 block mb-1.5">
                  标书交付语种模式：
                </label>
                <div className="space-y-1.5">
                  {[
                    { key: 'bilingual', title: '🌐 中法双语对照版', desc: '涉外商务谈判与总包联合体首选' },
                    { key: 'zh', title: '🇨🇳 中文正式版', desc: '企业内部审批、合规留档与汇报' },
                    { key: 'fr', title: '🇫🇷 Version Française (法文版)', desc: '北非业主公共采购官方递交版' },
                  ].map((item) => (
                    <div
                      key={item.key}
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          languageMode: item.key as any,
                        }))
                      }
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        config.languageMode === item.key
                          ? 'bg-blue-50/80 border-blue-600 shadow-2xs font-semibold'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-900">{item.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {config.languageMode === 'bilingual' && (
                <div>
                  <label className="font-bold text-slate-800 block mb-1.5">
                    双语对照排版格式：
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setConfig((prev) => ({ ...prev, bilingualLayout: 'two-column' }))
                      }
                      className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                        config.bilingualLayout === 'two-column'
                          ? 'bg-blue-50 text-blue-800 border-blue-600 font-bold shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Columns className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                      <span>左右分栏并排对照</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfig((prev) => ({ ...prev, bilingualLayout: 'stacked' }))
                      }
                      className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                        config.bilingualLayout === 'stacked'
                          ? 'bg-blue-50 text-blue-800 border-blue-600 font-bold shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <AlignLeft className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                      <span>上下分段对照</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部行动操作栏 */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 space-y-2">
          <button
            type="button"
            onClick={handlePrint}
            className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            title="调用浏览器高品质打印机，直接导出为标准 A4 PDF 标书"
          >
            <Printer className="w-4 h-4" />
            <span>打印 / 导出为标准 PDF 标书</span>
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleExportText}
              className="flex-1 py-1.5 px-2.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>导出文本</span>
            </button>
            <button
              type="button"
              onClick={handleCopyFull}
              className="flex-1 py-1.5 px-2.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copied ? '已复制' : '复制全文'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. 右侧：A4 拟真交互排版预览视口 (多页流式排列，支持缩放与即时预览) */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-200/80 overflow-hidden">
        {/* 视口顶部工具栏 (含缩放比例、页数统计、全屏打印提示) */}
        <div className="px-5 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between gap-3 text-xs shrink-0 no-print">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">A4 标书标准打印视口</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500 font-mono">
              预计总计 <strong className="text-blue-700">{totalPagesCount}</strong> 页 · 纸张尺寸 210 × 297 mm
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* 缩放控制器 */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setZoomScale((prev) => Math.max(65, prev - 10))}
                className="p-1 text-slate-600 hover:text-slate-900 rounded cursor-pointer"
                title="缩小"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono font-bold text-slate-700 w-12 text-center text-[11px]">
                {zoomScale}%
              </span>
              <button
                type="button"
                onClick={() => setZoomScale((prev) => Math.min(130, prev + 10))}
                className="p-1 text-slate-600 hover:text-slate-900 rounded cursor-pointer"
                title="放大"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownloadPrintableHtml}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="下载自包含标准离线 HTML 文件，支持跨机双击唤起标准 PDF 打印"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>下载离线打印版</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>立即输出 PDF</span>
            </button>
          </div>
        </div>

        {/* 视口页面滚动区域 */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 proposal-print-viewport" id="printable-proposal-container">
          <div
            style={{
              transform: `scale(${zoomScale / 100})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out',
            }}
            className="space-y-8 pb-16"
          >
            {/* =================================================================== */}
            {/* PAGE 1: 标书正式封面 (Cover Page) */}
            {/* =================================================================== */}
            {config.showCoverPage && (
              <div
                className={`a4-sheet-preview flex flex-col justify-between p-12 ${getFontFamilyClass(config.fontPreset)}`}
                style={{
                  paddingTop: `${config.marginTopMm + 10}mm`,
                  paddingBottom: `${config.marginBottomMm + 5}mm`,
                  paddingLeft: `${config.marginLeftMm + 5}mm`,
                  paddingRight: `${config.marginRightMm + 5}mm`,
                }}
              >
                {/* 水印 */}
                {config.showWatermark && (
                  <div className="proposal-watermark-layer">
                    <span
                      className="proposal-watermark-text text-4xl"
                      style={{
                        opacity: config.watermarkOpacity,
                        transform: `rotate(${config.watermarkAngle}deg)`,
                      }}
                    >
                      {config.watermarkText}
                    </span>
                  </div>
                )}

                {/* 封面顶部机构与文件代号 */}
                <div className="text-center space-y-2 border-b-2 border-slate-900 pb-6">
                  <div className="text-xs uppercase tracking-widest text-slate-600 font-mono">
                    RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE
                  </div>
                  <div className="text-xs font-bold text-slate-700">
                    {config.coverData.clientName}
                  </div>
                  <div className="text-sm font-mono font-bold text-blue-900 pt-1">
                    DOSSIER D'APPEL D'OFFRES N° : {config.coverData.tenderCode}
                  </div>
                </div>

                {/* 封面核心标题 */}
                <div className="text-center space-y-6 my-auto py-10">
                  <div className="inline-block px-4 py-1.5 border border-slate-900 text-xs font-bold tracking-widest uppercase">
                    {config.coverData.tenderDocType}
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight leading-snug">
                    {config.coverData.projectNameZh}
                  </h1>

                  {config.coverData.projectNameFr && (
                    <p className="text-sm italic font-serif text-slate-700 max-w-xl mx-auto">
                      {config.coverData.projectNameFr}
                    </p>
                  )}

                  <div className="pt-4">
                    <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-800 rounded">
                      正本 (ORIGINAL) · 商务标分册
                    </span>
                  </div>
                </div>

                {/* 封面底部投标人信息表单与签章 */}
                <div className="border-t-2 border-slate-900 pt-6 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div>
                        <span className="text-slate-500">投标人单位 (Soumissionnaire)：</span>
                        <div className="font-bold text-slate-900">{config.coverData.bidderNameZh}</div>
                        <div className="text-[11px] text-slate-600 italic font-serif">
                          {config.coverData.bidderNameFr}
                        </div>
                      </div>
                      <div className="pt-1">
                        <span className="text-slate-500">法定代表人 (Représentant Légal)：</span>
                        <div className="font-semibold text-slate-800">{config.coverData.legalRepresentative}</div>
                      </div>
                    </div>

                    <div className="space-y-1.5 flex flex-col justify-between items-end">
                      <div className="text-right">
                        <span className="text-slate-500">递交日期 (Date de Dépôt)：</span>
                        <div className="font-mono font-bold text-slate-900">{config.coverData.submissionDate}</div>
                      </div>

                      {/* 封面盖印章框 */}
                      <div className="official-stamp-box">
                        <span>投标单位公章预留位</span>
                        <span className="text-[9px] font-normal text-red-500 mt-0.5">CACHET & SIGNATURE</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* PAGE 2: 自动目录页 (Table of Contents / Sommaire) */}
            {/* =================================================================== */}
            {config.showTableOfContents && (
              <div
                className={`a4-sheet-preview flex flex-col justify-between p-12 ${getFontFamilyClass(config.fontPreset)}`}
                style={{
                  paddingTop: `${config.marginTopMm}mm`,
                  paddingBottom: `${config.marginBottomMm}mm`,
                  paddingLeft: `${config.marginLeftMm}mm`,
                  paddingRight: `${config.marginRightMm}mm`,
                }}
              >
                {/* 水印 */}
                {config.showWatermark && (
                  <div className="proposal-watermark-layer">
                    <span
                      className="proposal-watermark-text text-4xl"
                      style={{
                        opacity: config.watermarkOpacity,
                        transform: `rotate(${config.watermarkAngle}deg)`,
                      }}
                    >
                      {config.watermarkText}
                    </span>
                  </div>
                )}

                {/* 页眉 */}
                {config.showHeader && (
                  <div className={`text-[11px] text-slate-500 flex justify-between items-center pb-2 ${config.headerBorderBottom ? 'border-b border-slate-300' : ''}`}>
                    <span>{config.headerText}</span>
                    <span className="font-mono font-bold">SOMMAIRE / 标书目录</span>
                  </div>
                )}

                <div className="my-auto py-8 space-y-6">
                  <div className="text-center pb-4 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">标 书 目 录</h2>
                    <p className="text-xs italic font-serif text-slate-500 mt-1">TABLE DES MATIÈRES / SOMMAIRE</p>
                  </div>

                  <div className="space-y-4 text-xs">
                    {resolvedSections.map((sec, idx) => (
                      <div key={sec.id} className="toc-row">
                        <span className="toc-title font-bold text-slate-900">
                          {String(idx + 1).padStart(2, '0')}. {sec.title}
                          {sec.titleFr && (
                            <span className="text-[11px] font-normal italic font-serif text-slate-500 ml-2">
                              / {sec.titleFr}
                            </span>
                          )}
                        </span>
                        <span className="toc-leader" />
                        <span className="toc-page font-bold text-blue-900">
                          P.{idx + (config.showCoverPage ? 2 : 1)}
                        </span>
                      </div>
                    ))}

                    {config.showSignaturePage && (
                      <div className="toc-row pt-2 border-t border-slate-150">
                        <span className="toc-title font-bold text-slate-900">
                          附录: 法定代表人授权书及签署盖章表 (Actes d'Engagement)
                        </span>
                        <span className="toc-leader" />
                        <span className="toc-page font-bold text-blue-900">
                          P.{totalPagesCount}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 页脚 */}
                {config.showFooter && (
                  <div className={`text-[11px] text-slate-500 flex justify-between items-center pt-2 ${config.footerBorderTop ? 'border-t border-slate-300' : ''}`}>
                    <span>{config.footerText}</span>
                    <span className="font-mono">
                      {config.pageNumberFormat === 'fr' ? `Page 2 sur ${totalPagesCount}` : `第 2 页 共 ${totalPagesCount} 页`}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* =================================================================== */}
            {/* PAGE 3+: 各章节条款正文 (Resolved Proposal Sections) */}
            {/* =================================================================== */}
            {resolvedSections.map((section, sIdx) => {
              const pageNumber = (config.showCoverPage ? 1 : 0) + (config.showTableOfContents ? 1 : 0) + sIdx + 1;

              return (
                <div
                  key={section.id}
                  className={`a4-sheet-preview flex flex-col justify-between p-12 ${getFontFamilyClass(config.fontPreset)}`}
                  style={{
                    paddingTop: `${config.marginTopMm}mm`,
                    paddingBottom: `${config.marginBottomMm}mm`,
                    paddingLeft: `${config.marginLeftMm}mm`,
                    paddingRight: `${config.marginRightMm}mm`,
                  }}
                >
                  {/* 水印 */}
                  {config.showWatermark && (
                    <div className="proposal-watermark-layer">
                      <span
                        className="proposal-watermark-text text-4xl"
                        style={{
                          opacity: config.watermarkOpacity,
                          transform: `rotate(${config.watermarkAngle}deg)`,
                        }}
                      >
                        {config.watermarkText}
                      </span>
                    </div>
                  )}

                  {/* 页眉 */}
                  {config.showHeader && (
                    <div className={`text-[11px] text-slate-500 flex justify-between items-center pb-2 shrink-0 ${config.headerBorderBottom ? 'border-b border-slate-300' : ''}`}>
                      <span className="truncate max-w-sm">{config.headerText}</span>
                      <span className="font-mono font-bold shrink-0">{section.code}</span>
                    </div>
                  )}

                  {/* 章节正文主体 */}
                  <div className="flex-1 py-4 flex flex-col justify-start">
                    {/* 章节标题 */}
                    <div className="mb-5 pb-3 border-b border-slate-200">
                      <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-900 uppercase tracking-wide">
                        <span>CHAPITRE {String(sIdx + 1).padStart(2, '0')}</span>
                        <span>·</span>
                        <span>{section.category}</span>
                      </div>
                      <h2 className="text-lg font-bold text-slate-900 mt-1">
                        {section.title}
                      </h2>
                      {section.titleFr && (
                        <p className="text-xs italic font-serif text-slate-600 mt-0.5">
                          {section.titleFr}
                        </p>
                      )}
                    </div>

                    {/* 正文排版 (按语种与双语对照分栏) */}
                    <div
                      style={{
                        fontSize: config.fontSizePreset,
                        lineHeight: config.lineHeight,
                      }}
                      className="text-slate-800"
                    >
                      {/* 模式 A: 纯中文 */}
                      {config.languageMode === 'zh' && (
                        <div
                          className={`whitespace-pre-wrap leading-relaxed ${config.paragraphIndent ? 'indent-8' : ''}`}
                          style={{ marginBottom: `${config.paragraphSpacingMm}mm` }}
                        >
                          {section.resolvedZh}
                        </div>
                      )}

                      {/* 模式 B: 纯法文 (Version Française) */}
                      {config.languageMode === 'fr' && (
                        <div
                          className={`whitespace-pre-wrap leading-relaxed font-serif italic ${config.paragraphIndent ? 'indent-8' : ''}`}
                          style={{ marginBottom: `${config.paragraphSpacingMm}mm` }}
                        >
                          {section.resolvedFr}
                        </div>
                      )}

                      {/* 模式 C: 中法双语对照 */}
                      {config.languageMode === 'bilingual' && (
                        <>
                          {config.bilingualLayout === 'two-column' ? (
                            <div className="bilingual-columns">
                              <div className="bilingual-left-zh">
                                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
                                  中文条款 (Version Chinoise)
                                </div>
                                <div className={`whitespace-pre-wrap ${config.paragraphIndent ? 'indent-6' : ''}`}>
                                  {section.resolvedZh}
                                </div>
                              </div>
                              <div className="bilingual-right-fr">
                                <div className="text-[11px] font-bold text-blue-800 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1 not-italic">
                                  Traduction Française (法文对照)
                                </div>
                                <div className={`whitespace-pre-wrap font-serif italic ${config.paragraphIndent ? 'indent-6' : ''}`}>
                                  {section.resolvedFr}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                                <div className="text-[11px] font-bold text-slate-600 mb-1">【中文条款】</div>
                                <div className={`whitespace-pre-wrap ${config.paragraphIndent ? 'indent-6' : ''}`}>
                                  {section.resolvedZh}
                                </div>
                              </div>
                              <div className="p-3 bg-blue-50/50 rounded border border-blue-200 font-serif italic">
                                <div className="text-[11px] font-bold text-blue-800 not-italic mb-1">【VERSION FRANÇAISE / 法文对照】</div>
                                <div className="whitespace-pre-wrap">
                                  {section.resolvedFr}
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* 页脚 */}
                  {config.showFooter && (
                    <div className={`text-[11px] text-slate-500 flex justify-between items-center pt-2 shrink-0 ${config.footerBorderTop ? 'border-t border-slate-300' : ''}`}>
                      <span>{config.footerText}</span>
                      <span className="font-mono">
                        {config.pageNumberFormat === 'fr'
                          ? `Page ${pageNumber} sur ${totalPagesCount}`
                          : `第 ${pageNumber} 页 共 ${totalPagesCount} 页`}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* =================================================================== */}
            {/* FINAL PAGE: 法定代表签署与公章预留页 (Signature & Stamp Page) */}
            {/* =================================================================== */}
            {config.showSignaturePage && (
              <div
                className={`a4-sheet-preview flex flex-col justify-between p-12 ${getFontFamilyClass(config.fontPreset)}`}
                style={{
                  paddingTop: `${config.marginTopMm}mm`,
                  paddingBottom: `${config.marginBottomMm}mm`,
                  paddingLeft: `${config.marginLeftMm}mm`,
                  paddingRight: `${config.marginRightMm}mm`,
                }}
              >
                {/* 水印 */}
                {config.showWatermark && (
                  <div className="proposal-watermark-layer">
                    <span
                      className="proposal-watermark-text text-4xl"
                      style={{
                        opacity: config.watermarkOpacity,
                        transform: `rotate(${config.watermarkAngle}deg)`,
                      }}
                    >
                      {config.watermarkText}
                    </span>
                  </div>
                )}

                {/* 页眉 */}
                {config.showHeader && (
                  <div className={`text-[11px] text-slate-500 flex justify-between items-center pb-2 ${config.headerBorderBottom ? 'border-b border-slate-300' : ''}`}>
                    <span>{config.headerText}</span>
                    <span className="font-mono font-bold">ACTE D'ENGAGEMENT / 法定授权</span>
                  </div>
                )}

                <div className="my-auto py-6 space-y-6 text-xs text-slate-800">
                  <div className="text-center pb-3 border-b-2 border-slate-900">
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                      法定代表人授权书及投标承诺签署表
                    </h2>
                    <p className="text-xs italic font-serif text-slate-600 mt-1">
                      ACTE D'ENGAGEMENT ET POUVOIRS DU SOUMISSIONNAIRE
                    </p>
                  </div>

                  <p className="leading-relaxed indent-8">
                    本投标人正式声明：已完全知悉并遵守阿尔及利亚公共采购法典及本项目招标文件（Cahier des Charges）中包含的所有条款、技术规范（CCTP）及开标约定。所有填报数据与所附原件真实有效，若发生实质性偏离或重大隐瞒，本投标人愿承担相应法律后果与投标保证金没收之处罚。
                  </p>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">投标保证金形式与金额：</span>
                      <span className="font-bold text-slate-900">
                        {variableValues['bid_bond_amount'] || '15,000,000 DZD (不可撤销见索即付银行保函)'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">合同工期承诺：</span>
                      <span className="font-bold text-slate-900">
                        {variableValues['project_duration_months'] ? `${variableValues['project_duration_months']} 个日历月` : '24 个月'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">缺陷责任与质保期：</span>
                      <span className="font-bold text-slate-900">
                        {variableValues['warranty_period'] || '24 个月'}
                      </span>
                    </div>
                  </div>

                  {/* 签字盖章双列排布 */}
                  <div className="grid grid-cols-2 gap-8 pt-8">
                    <div className="space-y-4">
                      <div className="font-bold text-slate-900">
                        法定代表人或授权委托人签字：
                      </div>
                      <div className="h-16 border-b border-dashed border-slate-400 flex items-end pb-1 text-slate-400 italic">
                        (Signature du Représentant Légal)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        姓名：<span className="font-bold text-slate-800">{config.coverData.legalRepresentative}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        职务：执行董事 / 法定代表人
                      </div>
                    </div>

                    <div className="space-y-4 flex flex-col items-center">
                      <div className="font-bold text-slate-900 text-center w-full">
                        投标单位法人公章 (CACHET OFFICIEL)：
                      </div>
                      <div className="official-stamp-box my-auto">
                        <span>中国建筑第二工程局有限公司</span>
                        <span className="text-[9px] font-normal text-red-500 mt-1">SEAL / CACHET</span>
                      </div>
                      <div className="text-[11px] text-slate-500 text-center">
                        签署日期：{config.coverData.submissionDate}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 页脚 */}
                {config.showFooter && (
                  <div className={`text-[11px] text-slate-500 flex justify-between items-center pt-2 ${config.footerBorderTop ? 'border-t border-slate-300' : ''}`}>
                    <span>{config.footerText}</span>
                    <span className="font-mono">
                      {config.pageNumberFormat === 'fr'
                        ? `Page ${totalPagesCount} sur ${totalPagesCount}`
                        : `第 ${totalPagesCount} 页 共 ${totalPagesCount} 页`}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
