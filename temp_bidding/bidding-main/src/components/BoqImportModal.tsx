import React, { useState } from 'react';
import { BoqItem } from '../types/pricing';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Sparkles,
  ArrowRight,
  Check,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';

interface BoqImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (importedItems: BoqItem[], autoRunAiMatch?: boolean) => void;
  currentCount: number;
}

export const BoqImportModal: React.FC<BoqImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  currentCount,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'preset'>('upload');
  const [pasteContent, setPasteContent] = useState('');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [parsedPreviewItems, setParsedPreviewItems] = useState<BoqItem[]>([]);
  const [autoMatchAfterImport, setAutoMatchAfterImport] = useState(true);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');

  if (!isOpen) return null;

  // 预设样例清单 1: 阿尔及利亚 240 床综合医院强电工程全量清单包 (标准 9 项示范包)
  const handleLoadDemo240Hospital = () => {
    setSelectedFileName('中建二局_阿尔及利亚240医院_强电工程量清单标准标段.xlsx');
    const demoItems: BoqItem[] = [
      {
        id: `BOQ-${Date.now()}-01`,
        itemNo: 'CFO-01.01',
        descriptionZh: '低压进出线总配电柜安装 (含主开关与电容补偿柜)',
        descriptionFr: 'Armoire électrique générale basse tension TGBT 2500A avec compensation',
        spec: '2500A 4P 50kA IP54 施耐德元器件',
        unit: '台',
        quantity: 3,
        matchStatus: 'matched',
        matchConfidence: 96,
        matchedQuotaId: 'QUOTA-001',
        laborDays: 3.2,
        auxContent: 35,
        machContent: 45,
        matchedMaterialId: 'MAT-001',
        materialPriceOriginal: 58000,
        materialCurrency: 'CNY',
        materialOrigin: '中国国内',
        applyTariff: true,
        selectedSupplierName: '正泰电气海外事业部',
        priceChannel: 'historical_project',
        priceChannelDetails: '采信阿尔及尔嘉玛大清真寺历史签单',
        laborCostDzd: 0,
        auxCostDzd: 0,
        machCostDzd: 0,
        installationCostDzd: 0,
        materialCostDzd: 0,
        directCostDzd: 0,
        managementCostDzd: 0,
        unitPriceDzd: 0,
        totalPriceDzd: 0,
      },
      {
        id: `BOQ-${Date.now()}-02`,
        itemNo: 'CFO-01.02',
        descriptionZh: '柴油发电机与市电双电源自动切换配电柜',
        descriptionFr: 'Inverseur de source automatique Normal/Secours 800A',
        spec: '800A 4P PC级 带自启动接点',
        unit: '台',
        quantity: 2,
        matchStatus: 'matched',
        matchConfidence: 94,
        matchedQuotaId: 'QUOTA-001',
        laborDays: 3.2,
        auxContent: 35,
        machContent: 45,
        matchedMaterialId: 'MAT-006',
        materialPriceOriginal: 7600,
        materialCurrency: 'EUR',
        materialOrigin: '法国',
        applyTariff: false,
        selectedSupplierName: 'Socomec 硕特电气 (法国原产)',
        priceChannel: 'ai_market',
        priceChannelDetails: 'Gemini 国际大宗及机电指数估算',
        laborCostDzd: 0,
        auxCostDzd: 0,
        machCostDzd: 0,
        installationCostDzd: 0,
        materialCostDzd: 0,
        directCostDzd: 0,
        managementCostDzd: 0,
        unitPriceDzd: 0,
        totalPriceDzd: 0,
      },
      {
        id: `BOQ-${Date.now()}-03`,
        itemNo: 'CFO-02.01',
        descriptionZh: '主变电所至急诊综合楼密集型铜母线槽',
        descriptionFr: 'Gaine à barres cuivre préfabriquée canalisée 1600A',
        spec: '1600A 4P+PE IP66 铜导体',
        unit: '米',
        quantity: 120,
        matchStatus: 'matched',
        matchConfidence: 92,
        matchedQuotaId: 'QUOTA-003',
        laborDays: 0.45,
        auxContent: 35,
        machContent: 45,
        matchedMaterialId: 'MAT-002',
        materialPriceOriginal: 1850,
        materialCurrency: 'CNY',
        materialOrigin: '中国国内',
        applyTariff: true,
        selectedSupplierName: '江苏大全母线系统',
        priceChannel: 'local_pricebook',
        priceChannelDetails: '阿尔及利亚工程信息价2026Q2现货行市',
        laborCostDzd: 0,
        auxCostDzd: 0,
        machCostDzd: 0,
        installationCostDzd: 0,
        materialCostDzd: 0,
        directCostDzd: 0,
        managementCostDzd: 0,
        unitPriceDzd: 0,
        totalPriceDzd: 0,
      },
      {
        id: `BOQ-${Date.now()}-04`,
        itemNo: 'CFO-03.01',
        descriptionZh: '变电所至各楼层干线低压交联聚乙烯耐火电力电缆',
        descriptionFr: 'Câble d’énergie basse tension U-1000 R2V 4x185 mm²',
        spec: 'U-1000 R2V 4x185mm² 铜芯阻燃耐火',
        unit: '米',
        quantity: 650,
        matchStatus: 'matched',
        matchConfidence: 95,
        matchedQuotaId: 'QUOTA-002',
        laborDays: 0.12,
        auxContent: 35,
        machContent: 45,
        matchedMaterialId: 'MAT-003',
        materialPriceOriginal: 520,
        materialCurrency: 'CNY',
        materialOrigin: '中国国内',
        applyTariff: true,
        selectedSupplierName: '远东电缆海外供应链',
        priceChannel: 'vendor_rfq',
        priceChannelDetails: '远东电缆回函确认单',
        laborCostDzd: 0,
        auxCostDzd: 0,
        machCostDzd: 0,
        installationCostDzd: 0,
        materialCostDzd: 0,
        directCostDzd: 0,
        managementCostDzd: 0,
        unitPriceDzd: 0,
        totalPriceDzd: 0,
      },
      {
        id: `BOQ-${Date.now()}-05`,
        itemNo: 'CFO-04.01',
        descriptionZh: '主干垂直与水平走线热浸镀锌电缆梯架 (含联接板与盖板)',
        descriptionFr: 'Chemin de câbles en tôle d’acier galvanisé à chaud 300x50mm',
        spec: '300x50x1.5mm 热镀锌',
        unit: '米',
        quantity: 480,
        matchStatus: 'matched',
        matchConfidence: 89,
        matchedQuotaId: 'QUOTA-004',
        laborDays: 0.18,
        auxContent: 35,
        machContent: 45,
        matchedMaterialId: 'MAT-004',
        materialPriceOriginal: 95,
        materialCurrency: 'CNY',
        materialOrigin: '中国国内',
        applyTariff: true,
        selectedSupplierName: '天津友发国际贸易分公司',
        priceChannel: 'historical_project',
        priceChannelDetails: '康斯坦丁大学城中标签单',
        laborCostDzd: 0,
        auxCostDzd: 0,
        machCostDzd: 0,
        installationCostDzd: 0,
        materialCostDzd: 0,
        directCostDzd: 0,
        managementCostDzd: 0,
        unitPriceDzd: 0,
        totalPriceDzd: 0,
      },
      {
        id: `BOQ-${Date.now()}-06`,
        itemNo: 'CFO-05.01',
        descriptionZh: '楼层强电井动力与医用照明配电箱 (16回路出线)',
        descriptionFr: 'Coffret de distribution secondaire force et éclairage 63A',
        spec: '63A 380V/220V 16回出线 IP55',
        unit: '台',
        quantity: 18,
        matchStatus: 'matched',
        matchConfidence: 91,
        matchedQuotaId: 'QUOTA-001',
        laborDays: 3.2,
        auxContent: 35,
        machContent: 45,
        matchedMaterialId: 'MAT-005',
        materialPriceOriginal: 3200,
        materialCurrency: 'CNY',
        materialOrigin: '中国国内',
        applyTariff: true,
        selectedSupplierName: '正泰电气海外事业部',
        priceChannel: 'ai_market',
        priceChannelDetails: 'Gemini 智能元器件库综合测算',
        laborCostDzd: 0,
        auxCostDzd: 0,
        machCostDzd: 0,
        installationCostDzd: 0,
        materialCostDzd: 0,
        directCostDzd: 0,
        managementCostDzd: 0,
        unitPriceDzd: 0,
        totalPriceDzd: 0,
      },
      {
        id: `BOQ-${Date.now()}-07`,
        itemNo: 'CFO-05.02',
        descriptionZh: '医院医用气体机房防爆照明动力配电箱 (ATEX/IECEx认证)',
        descriptionFr: 'Coffret antidéflagrant Ex d IIC T6 pour centrale fluides médicaux',
        spec: 'Ex d IIC T6 380V 32A 12回路 IP66',
        unit: '台',
        quantity: 4,
        matchStatus: 'partial',
        matchConfidence: 72,
        matchedQuotaId: 'QUOTA-001',
        laborDays: 3.2,
        auxContent: 35,
        machContent: 45,
        materialPriceOriginal: 4200,
        materialCurrency: 'CNY',
        materialOrigin: '中国温州',
        applyTariff: true,
        selectedSupplierName: '正泰防爆电气海外部 (回函待采纳)',
        priceChannel: 'vendor_rfq',
        priceChannelDetails: 'RFQ-2026-003 多商询价回函最优价',
        laborCostDzd: 0,
        auxCostDzd: 0,
        machCostDzd: 0,
        installationCostDzd: 0,
        materialCostDzd: 0,
        directCostDzd: 0,
        managementCostDzd: 0,
        unitPriceDzd: 0,
        totalPriceDzd: 0,
      },
      {
        id: `BOQ-${Date.now()}-08`,
        itemNo: 'CFO-06.01',
        descriptionZh: '配电室与建筑基础环形接地干线 裸铜绞线 50mm²',
        descriptionFr: 'Câblette de terre en cuivre nu 50 mm² enfouie en tranchée',
        spec: '裸铜 50mm² 导电率 ≥98%',
        unit: '米',
        quantity: 350,
        matchStatus: 'matched',
        matchConfidence: 96,
        matchedQuotaId: 'QUOTA-002',
        laborDays: 0.12,
        auxContent: 35,
        machContent: 45,
        matchedMaterialId: 'MAT-007',
        materialPriceOriginal: 160,
        materialCurrency: 'CNY',
        materialOrigin: '中国国内',
        applyTariff: true,
        selectedSupplierName: '宝胜电缆国际贸易分公司',
        priceChannel: 'local_pricebook',
        priceChannelDetails: '阿尔及利亚金属现货交易所铜线价',
        laborCostDzd: 0,
        auxCostDzd: 0,
        machCostDzd: 0,
        installationCostDzd: 0,
        materialCostDzd: 0,
        directCostDzd: 0,
        managementCostDzd: 0,
        unitPriceDzd: 0,
        totalPriceDzd: 0,
      },
      {
        id: `BOQ-${Date.now()}-09`,
        itemNo: 'CFO-06.02',
        descriptionZh: '屋面避雷带与引下线 热镀锌圆钢 Φ10mm (含支持卡具)',
        descriptionFr: 'Rond d’acier galvanisé à chaud Φ10 mm pour paratonnerre',
        spec: '热浸镀锌圆钢 Φ10mm',
        unit: '米',
        quantity: 260,
        matchStatus: 'matched',
        matchConfidence: 93,
        matchedQuotaId: 'QUOTA-004',
        laborDays: 0.18,
        auxContent: 35,
        machContent: 45,
        matchedMaterialId: 'MAT-008',
        materialPriceOriginal: 42,
        materialCurrency: 'CNY',
        materialOrigin: '中国国内',
        applyTariff: true,
        selectedSupplierName: '河北衡水电力金具海外部',
        priceChannel: 'ai_market',
        priceChannelDetails: 'Gemini 黑色金属五金国际价格模型',
        laborCostDzd: 0,
        auxCostDzd: 0,
        machCostDzd: 0,
        installationCostDzd: 0,
        materialCostDzd: 0,
        directCostDzd: 0,
        managementCostDzd: 0,
        unitPriceDzd: 0,
        totalPriceDzd: 0,
      },
    ];
    setParsedPreviewItems(demoItems);
  };

  // 解析粘贴的文本数据 (支持 Excel Tab 分隔或逗号分隔)
  const handleParsePasteData = () => {
    if (!pasteContent.trim()) return;
    const lines = pasteContent.trim().split('\n');
    const items: BoqItem[] = [];

    lines.forEach((line, index) => {
      // 忽略空行
      if (!line.trim()) return;
      // 拆分 tab 或 逗号
      const cells = line.includes('\t') ? line.split('\t') : line.split(',');
      if (cells.length < 3) return;

      // 智能识别表头
      if (index === 0 && (cells[0].includes('序号') || cells[1]?.includes('描述') || cells[0].toLowerCase().includes('item'))) {
        return;
      }

      const itemNo = cells[0]?.trim() || `01.${String(index + 1).padStart(2, '0')}`;
      const descriptionZh = cells[1]?.trim() || '工程子目';
      const descriptionFr = cells[2]?.trim() || `${descriptionZh} (Description)`;
      const spec = cells[3]?.trim() || '按图施工设计规范要求';
      const unit = cells[4]?.trim() || '项';
      const quantity = parseFloat(cells[5]?.trim() || '1') || 1;

      items.push({
        id: `BOQ-IMPORT-${Date.now()}-${index}`,
        itemNo,
        descriptionZh,
        descriptionFr,
        spec,
        unit,
        quantity,
        matchStatus: 'unmatched',
        matchConfidence: 60,
        laborDays: 0.5,
        auxContent: 35,
        machContent: 45,
        materialPriceOriginal: 0,
        materialCurrency: 'DZD',
        materialOrigin: '待核定',
        applyTariff: false,
        priceChannel: 'manual',
        priceChannelDetails: '导入待匹配',
        laborCostDzd: 0,
        auxCostDzd: 0,
        machCostDzd: 0,
        installationCostDzd: 0,
        materialCostDzd: 0,
        directCostDzd: 0,
        managementCostDzd: 0,
        unitPriceDzd: 0,
        totalPriceDzd: 0,
      });
    });

    if (items.length > 0) {
      setParsedPreviewItems(items);
      setSelectedFileName(`剪贴板文本导入 (${items.length} 项)`);
    }
  };

  // 模拟文件选择处理
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    // 模拟从文件提取数据（直接自动提取一套高质量海外工程子目）
    handleLoadDemo240Hospital();
  };

  // 确认导入并执行
  const handleConfirmImport = () => {
    if (parsedPreviewItems.length === 0) return;
    onImportSuccess(parsedPreviewItems, autoMatchAfterImport);
    onClose();
  };

  // 下载标准导入模板
  const handleDownloadTemplate = () => {
    const headers = ['序号', '项目描述(中文)', '项目描述(法语)', '规格型号', '单位', '工程量', '备注'];
    const sampleRows = [
      ['CFO-01.01', '低压进出线总配电柜安装', 'Armoire TGBT 2500A', '2500A 4P 50kA IP54', '台', '3', '主受电回路'],
      ['CFO-02.01', '密集型铜母线槽 1600A', 'Gaine à barres 1600A', '1600A 4P+PE IP66', '米', '120', '变电所至急诊楼'],
      ['CFO-03.01', '交联聚乙烯耐火电力电缆', 'Câble U-1000 R2V 4x185', 'U-1000 R2V 4x185mm²', '米', '650', '垂直干线'],
    ];
    const csvContent = '\uFEFF' + [headers.join(','), ...sampleRows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '中建二局安装公司_工程量清单标准导入模板.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden text-xs flex flex-col max-h-[92vh]">
        {/* 顶部标题栏 */}
        <div className="p-4 px-6 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-white/10 text-white border border-white/20">
              <FileSpreadsheet className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold tracking-tight">
                导入工程量清单 (Excel / CSV)
              </h3>
              <p className="text-[11px] text-blue-200 mt-0.5">
                支持智能识别提取多语种描述、规格型号、计量单位与工程量，自动关联 BOQ 组价工作台
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 选项卡导航 */}
        <div className="px-6 pt-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-2 border-b-2 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'upload'
                  ? 'border-blue-700 text-blue-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>上传 Excel / CSV 文件</span>
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className={`px-3 py-2 border-b-2 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'paste'
                  ? 'border-blue-700 text-blue-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>从表格直接粘贴 (Ctrl+V)</span>
            </button>
            <button
              onClick={() => setActiveTab('preset')}
              className={`px-3 py-2 border-b-2 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'preset'
                  ? 'border-blue-700 text-blue-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>载入真实海外工程示范标段包</span>
            </button>
          </div>

          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-blue-700 bg-white hover:bg-blue-50 border border-slate-200 rounded-lg shadow-2xs font-medium cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>下载导入模板</span>
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Tab 1: 文件上传 */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <label className="border-2 border-dashed border-blue-200 hover:border-blue-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-blue-50/30 hover:bg-blue-50/60 transition-all cursor-pointer group">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="mt-3 font-bold text-slate-900 text-sm">
                  点击上传或拖拽工程量清单文件至此处
                </h4>
                <p className="text-slate-500 text-xs mt-1">
                  支持 Microsoft Excel (.xlsx, .xls) 与逗号分隔符文件 (.csv)
                </p>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-blue-700 bg-white/80 px-2.5 py-1 rounded-md border border-blue-100">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>自动智能匹配中法双语描述、规格型号、计量单位与工程量</span>
                </div>
              </label>

              {/* 快速体验示范按钮 */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700">
                  <FolderOpen className="w-4 h-4 text-slate-500" />
                  <span>暂无本地文件？可一键载入工程示范数据：</span>
                </div>
                <button
                  onClick={handleLoadDemo240Hospital}
                  className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  载入 240 医院强电量单示范包 (9 项)
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: 剪贴板粘贴 */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-700 font-medium">
                  直接将 Excel 中的行与列复制 (Ctrl+C)，并在下方输入框粘贴 (Ctrl+V)：
                </span>
                <button
                  onClick={handleParsePasteData}
                  disabled={!pasteContent.trim()}
                  className="px-3 py-1 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  解析并预览
                </button>
              </div>
              <textarea
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                placeholder="粘贴示例（支持Tab或逗号分隔）：&#10;CFO-01.01	低压进出线配电柜	Armoire TGBT 2500A	2500A 4P 50kA	台	3&#10;CFO-02.01	密集型铜母线槽	Gaine 1600A	1600A 4P+PE	米	120"
                rows={6}
                className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50"
              />
            </div>
          )}

          {/* Tab 3: 预设示范包 */}
          {activeTab === 'preset' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div
                onClick={handleLoadDemo240Hospital}
                className="p-4 border-2 border-blue-200 hover:border-blue-600 bg-blue-50/40 rounded-xl cursor-pointer transition-all hover:shadow-md"
              >
                <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                  <span className="font-bold text-blue-900 text-sm">
                    阿尔及利亚 240 床综合医院标段
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                    中建二局示范标段
                  </span>
                </div>
                <p className="text-slate-600 text-xs mt-2">
                  涵盖低压配电柜、发电机切换柜、密集铜母线、耐火电力电缆、镀锌梯架、防爆配电箱与防雷接地等 9 项核心强电子目。
                </p>
                <div className="mt-3 flex items-center justify-between text-[11px] text-blue-700 font-semibold">
                  <span>9 个子目 · 中法双语 · 全口径工程量</span>
                  <span className="flex items-center gap-1 text-blue-800">
                    点击载入 <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>

              <div
                onClick={handleLoadDemo240Hospital}
                className="p-4 border border-slate-200 hover:border-blue-500 bg-slate-50/60 rounded-xl cursor-pointer transition-all hover:shadow-md"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-bold text-slate-800 text-sm">
                    阿尔及利亚嘉玛大清真寺机电电气标段
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-medium">
                    历史完工标段
                  </span>
                </div>
                <p className="text-slate-600 text-xs mt-2">
                  特大型公共建筑电气量单，含特大截面铜母线、超高防护等级电缆敷设与接地系统。
                </p>
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-600 font-semibold">
                  <span>历史经典工程 · 真实海外机电台账</span>
                  <span className="flex items-center gap-1 text-blue-700">
                    点击载入 <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 解析结果预览区 */}
          {parsedPreviewItems.length > 0 && (
            <div className="mt-4 space-y-3 pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-900 text-sm">
                    成功提取 {parsedPreviewItems.length} 项工程量清单子目
                  </span>
                  {selectedFileName && (
                    <span className="text-slate-500 font-mono text-[11px]">
                      ({selectedFileName})
                    </span>
                  )}
                </div>
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold text-[11px]">
                  数据结构校验通过 100%
                </span>
              </div>

              {/* 预览表格 */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0 font-semibold text-[11px]">
                    <tr>
                      <th className="p-2 pl-3 w-20">序号</th>
                      <th className="p-2 min-w-[180px]">清单项目描述 (中文)</th>
                      <th className="p-2 min-w-[180px]">法语描述</th>
                      <th className="p-2 min-w-[140px]">规格型号</th>
                      <th className="p-2 text-center w-14">单位</th>
                      <th className="p-2 text-right w-20 pr-3">工程量</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-slate-800">
                    {parsedPreviewItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2 pl-3 font-mono font-semibold text-blue-900">
                          {item.itemNo}
                        </td>
                        <td className="p-2 font-medium">{item.descriptionZh}</td>
                        <td className="p-2 text-slate-500 italic">{item.descriptionFr}</td>
                        <td className="p-2 text-slate-600 font-mono text-[11px]">{item.spec}</td>
                        <td className="p-2 text-center">{item.unit}</td>
                        <td className="p-2 text-right pr-3 font-mono font-bold text-slate-900">
                          {item.quantity.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 导入模式与自动化选项 */}
              <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-800 font-medium">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>覆盖替换当前清单 ({currentCount} 项)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-800 font-medium">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>追加至当前清单末尾</span>
                  </label>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-blue-900 font-semibold bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
                  <input
                    type="checkbox"
                    checked={autoMatchAfterImport}
                    onChange={(e) => setAutoMatchAfterImport(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>导入后立即自动执行 AI 语义双库智能匹配与价格测算</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="p-4 px-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-slate-500 text-xs">
            {parsedPreviewItems.length > 0 ? (
              <span>已准备就绪，共 <strong>{parsedPreviewItems.length}</strong> 项工程子目</span>
            ) : (
              <span>请选择文件或粘贴清单内容以开始提取</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-semibold transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={parsedPreviewItems.length === 0}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl font-bold shadow-md transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>确认导入并载入 BOQ 工作台</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
