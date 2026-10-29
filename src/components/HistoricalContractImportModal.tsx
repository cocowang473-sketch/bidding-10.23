import React, { useState } from 'react';
import {
  HistoricalContractRecord,
  MaterialComponent,
  CurrencyType,
} from '../types/pricing';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Building,
  Sparkles,
  Calendar,
  Check,
  RefreshCw,
} from 'lucide-react';

interface HistoricalContractImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (
    importedContracts: HistoricalContractRecord[],
    updatedMaterials: MaterialComponent[]
  ) => void;
  currentMaterials: MaterialComponent[];
}

export const HistoricalContractImportModal: React.FC<HistoricalContractImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  currentMaterials,
}) => {
  const [activeStep, setActiveStep] = useState<1 | 2>(1);
  const [pasteData, setPasteData] = useState('');
  const [parsedRecords, setParsedRecords] = useState<HistoricalContractRecord[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  if (!isOpen) return null;

  // 预设样例包 1：阿尔及尔大清真寺项目真实历史签单包
  const handleLoadDemoPackageMosque = () => {
    setFileName('HYI_嘉玛大清真寺机电签约历史数据_2025Q4.xlsx');
    const demo: HistoricalContractRecord[] = [
      {
        id: `IMP-${Date.now()}-01`,
        contractNo: 'HT-HYI-INTL-2025-081',
        projectName: '阿尔及尔嘉玛大清真寺项目 (Djamaa el Djazaïr)',
        materialName: '接地裸铜绞线 50mm²',
        materialSpec: '国标/IEC标准 裸铜 50mm² 导电率 ≥98%',
        category: '电缆母线',
        unitPrice: 158,
        currency: 'CNY',
        supplierName: '宝胜电缆海外部 (扬州)',
        quantity: 800,
        unit: '米',
        deliveryTerms: 'CIF 阿尔及尔港',
        signDate: '2025-10-18',
        isRecentOneYear: true,
        verified: true,
        importBatch: `BATCH-${new Date().toISOString().slice(0, 10)}`,
      },
      {
        id: `IMP-${Date.now()}-02`,
        contractNo: 'HT-HYI-INTL-2025-082',
        projectName: '阿尔及尔嘉玛大清真寺项目',
        materialName: '低压进线总配电柜 TGBT 2500A',
        materialSpec: '2500A 4P 50kA IP54 施耐德 Masterpact MTZ',
        category: '电气设备',
        unitPrice: 18200,
        currency: 'EUR',
        supplierName: '法国施耐德电气 (Schneider France)',
        quantity: 4,
        unit: '台',
        deliveryTerms: 'CIF 阿尔及尔港 (EUR.1 免税)',
        signDate: '2025-11-05',
        isRecentOneYear: true,
        verified: true,
        importBatch: `BATCH-${new Date().toISOString().slice(0, 10)}`,
      },
      {
        id: `IMP-${Date.now()}-03`,
        contractNo: 'HT-HYI-INTL-2025-083',
        projectName: '阿尔及尔嘉玛大清真寺项目',
        materialName: '耐火动力电缆 U-1000 R2V 4x185mm²',
        materialSpec: 'U-1000 R2V 4x185mm² 铜芯阻燃',
        category: '电缆母线',
        unitPrice: 515,
        currency: 'CNY',
        supplierName: '江苏中天科技海缆',
        quantity: 1500,
        unit: '米',
        deliveryTerms: 'CIF 阿尔及尔港',
        signDate: '2025-12-02',
        isRecentOneYear: true,
        verified: true,
        importBatch: `BATCH-${new Date().toISOString().slice(0, 10)}`,
      },
      {
        id: `IMP-${Date.now()}-04`,
        contractNo: 'HT-HYI-INTL-2025-084',
        projectName: '阿尔及尔嘉玛大清真寺项目',
        materialName: '镀锌电缆梯架 300x50mm',
        materialSpec: '300x50x1.5mm 热镀锌',
        category: '辅材管道',
        unitPrice: 92,
        currency: 'CNY',
        supplierName: '天津友发钢管国际贸易',
        quantity: 900,
        unit: '米',
        deliveryTerms: 'CIF 阿尔及尔港',
        signDate: '2025-09-20',
        isRecentOneYear: true,
        verified: true,
        importBatch: `BATCH-${new Date().toISOString().slice(0, 10)}`,
      },
    ];

    setParsedRecords(demo);
    setActiveStep(2);
  };

  // 预设样例包 2：奥兰奥林匹克综合体育场
  const handleLoadDemoPackageStadium = () => {
    setFileName('HYI_奥兰奥林匹克综合体育场_机电签单台账.csv');
    const demo: HistoricalContractRecord[] = [
      {
        id: `IMP-${Date.now()}-11`,
        contractNo: 'HT-HYI-INTL-2025-044',
        projectName: '奥兰奥林匹克综合体育场项目 (Stade Olympique d’Oran)',
        materialName: '发电机与市电双电源自动切换配电柜',
        materialSpec: '800A 4P PC级 带自启动接点',
        category: '电气设备',
        unitPrice: 7450,
        currency: 'EUR',
        supplierName: 'Socomec 硕特电气 (法国原产)',
        quantity: 6,
        unit: '台',
        deliveryTerms: 'CIF 奥兰港',
        signDate: '2025-08-30',
        isRecentOneYear: true,
        verified: true,
        importBatch: `BATCH-${new Date().toISOString().slice(0, 10)}`,
      },
      {
        id: `IMP-${Date.now()}-12`,
        contractNo: 'HT-HYI-INTL-2025-045',
        projectName: '奥兰奥林匹克综合体育场项目',
        materialName: '密集型铜母线槽 1600A',
        materialSpec: '1600A 4P+PE IP66 铜导体',
        category: '电缆母线',
        unitPrice: 1820,
        currency: 'CNY',
        supplierName: '江苏大全母线系统',
        quantity: 450,
        unit: '米',
        deliveryTerms: 'CIF 奥兰港',
        signDate: '2025-10-12',
        isRecentOneYear: true,
        verified: true,
        importBatch: `BATCH-${new Date().toISOString().slice(0, 10)}`,
      },
      {
        id: `IMP-${Date.now()}-13`,
        contractNo: 'HT-HYI-INTL-2025-046',
        projectName: '奥兰奥林匹克综合体育场项目',
        materialName: '楼层医用负荷动力配电箱',
        materialSpec: '63A 380V/220V 16回出线 IP55',
        category: '电气设备',
        unitPrice: 3150,
        currency: 'CNY',
        supplierName: '正泰电气海外事业部',
        quantity: 32,
        unit: '台',
        deliveryTerms: 'CIF 奥兰港',
        signDate: '2026-01-15',
        isRecentOneYear: true,
        verified: true,
        importBatch: `BATCH-${new Date().toISOString().slice(0, 10)}`,
      },
    ];

    setParsedRecords(demo);
    setActiveStep(2);
  };

  // 解析粘贴的数据
  const handleParsePastedData = () => {
    if (!pasteData.trim()) return;
    const lines = pasteData.trim().split('\n');
    const parsed: HistoricalContractRecord[] = [];

    lines.forEach((line, idx) => {
      // 支持逗号或制表符切分
      const parts = line.split(/[,\t]+/).map((s) => s.trim());
      if (parts.length >= 4) {
        const matName = parts[0] || `历史材料-${idx + 1}`;
        const spec = parts[1] || '标准工程规格';
        const price = parseFloat(parts[2].replace(/[^0-9.]/g, '')) || 1000;
        const curr = (['CNY', 'EUR', 'DZD', 'USD'].find(
          (c) => c === parts[3]?.toUpperCase()
        ) || 'CNY') as CurrencyType;
        const sup = parts[4] || '海外合格签约供应商';
        const project = parts[5] || '阿尔及利亚重点已完工程';
        const date = parts[6] || '2025-11-15';

        parsed.push({
          id: `IMP-${Date.now()}-${idx}`,
          contractNo: `HT-IMP-${Date.now().toString().slice(-4)}-${idx + 1}`,
          projectName: project,
          materialName: matName,
          materialSpec: spec,
          category: '电气设备',
          unitPrice: price,
          currency: curr,
          supplierName: sup,
          quantity: 100,
          unit: '项',
          deliveryTerms: 'CIF 阿尔及尔港',
          signDate: date,
          isRecentOneYear: true,
          verified: true,
          importBatch: `BATCH-${new Date().toISOString().slice(0, 10)}`,
        });
      }
    });

    if (parsed.length > 0) {
      setParsedRecords(parsed);
      setFileName(`粘贴文本批量解析 (${parsed.length} 项)`);
      setActiveStep(2);
    }
  };

  // 确认导入入库并更新材料库和匹配置信度
  const handleConfirmImport = () => {
    if (parsedRecords.length === 0) return;

    // 智能更新现存材料库
    const updatedMaterials = currentMaterials.map((mat) => {
      // 模糊比对物资名称
      const matchedContract = parsedRecords.find(
        (c) =>
          c.materialName.toLowerCase().includes(mat.standardNameZh.toLowerCase()) ||
          mat.standardNameZh.toLowerCase().includes(c.materialName.toLowerCase()) ||
          mat.synonyms.some((syn) =>
            c.materialName.toLowerCase().includes(syn.toLowerCase())
          )
      );

      if (matchedContract) {
        return {
          ...mat,
          basePrice: matchedContract.unitPrice,
          currency: matchedContract.currency,
          lastSignedProject: `${matchedContract.projectName} (最新导入)`,
          lastSignedDate: matchedContract.signDate,
          isRecentOneYear: matchedContract.isRecentOneYear,
          supplierQuotes: [
            {
              supplierId: `SUP-IMP-${Date.now().toString().slice(-3)}`,
              supplierName: matchedContract.supplierName,
              unitPrice: matchedContract.unitPrice,
              currency: matchedContract.currency,
              originCountry: '已签约合作方',
              leadTimeDays: 30,
              isLowestPrice: true,
              quotedDate: matchedContract.signDate,
              notes: `来源于历史签单合同号: ${matchedContract.contractNo}`,
            },
            ...mat.supplierQuotes,
          ],
        };
      }
      return mat;
    });

    onImportSuccess(parsedRecords, updatedMaterials);
    onClose();
  };

  // 下载标准模板样例说明
  const handleDownloadTemplate = () => {
    const csvContent =
      '物资名称,规格型号,签约单价,币种,签约供应商,历史项目名称,签单日期\n' +
      '接地裸铜绞线 50mm²,国标50mm²,155,CNY,宝胜电缆海外部,嘉玛大清真寺标段,2025-10-18\n' +
      '低压进线总配电柜 TGBT 2500A,400V 50kA,18200,EUR,施耐德电气,嘉玛大清真寺标段,2025-11-05\n' +
      '耐火动力电缆 U-1000 R2V 4x185mm²,4x185mm²,515,CNY,远东电缆,奥兰体育场项目,2025-12-02\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'HYI_海外工程历史签单导入标准模板.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* 顶部标题栏 */}
        <div className="px-6 py-4 border-b border-slate-150 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                历史签单数据批量导入向导 (Historical Contract Importer)
              </h3>
              <p className="text-[11px] text-slate-500">
                支持 Excel/CSV 批量导入或表格粘贴，自动同步更新主材底价与 1 年内签约置信度
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 步骤条 */}
        <div className="px-6 py-2.5 bg-slate-100/60 border-b border-slate-150 flex items-center gap-6 text-xs font-semibold">
          <div
            className={`flex items-center gap-1.5 ${
              activeStep === 1 ? 'text-blue-700' : 'text-slate-500'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                activeStep === 1 ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              1
            </span>
            <span>导入文件或粘贴数据</span>
          </div>

          <span className="text-slate-300">/</span>

          <div
            className={`flex items-center gap-1.5 ${
              activeStep === 2 ? 'text-blue-700' : 'text-slate-500'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                activeStep === 2 ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              2
            </span>
            <span>数据校验与入库预览</span>
          </div>
        </div>

        {/* 主内容 */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {activeStep === 1 && (
            <div className="space-y-4">
              {/* 快捷载入样例工程签单包 */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>快捷体验：一键载入北非重点标杆工程真实签单包</span>
                  </span>
                  <span className="text-[10px] text-emerald-700">
                    无需自备表格，立即检验导入后置信度飙升效果
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleLoadDemoPackageMosque}
                    className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg font-medium shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Building className="w-3.5 h-3.5 text-emerald-700" />
                    <span>载入【阿尔及尔嘉玛大清真寺项目】签单包 (4项关键机电)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLoadDemoPackageStadium}
                    className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg font-medium shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Building className="w-3.5 h-3.5 text-emerald-700" />
                    <span>载入【奥兰综合体育场机电标段】签单包 (3项成套设备)</span>
                  </button>
                </div>
              </div>

              {/* 文件上传区域与模板下载 */}
              <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center bg-slate-50/50 hover:bg-blue-50/30 transition-colors space-y-3">
                <FileSpreadsheet className="w-10 h-10 mx-auto text-blue-600" />
                <div>
                  <div className="font-bold text-slate-800 text-sm">
                    点击选择或拖拽 Excel / CSV 历史合同表格
                  </div>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    支持 .xlsx, .xls, .csv 格式（每行包含：物资名称、规格、单价、币种、签约供应商、项目、日期）
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span>下载标准导入模板 (.csv)</span>
                  </button>
                </div>
              </div>

              {/* 文本粘贴快速导入 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-700 font-semibold block">
                    或者直接粘贴表格数据文本 (制表符或逗号分隔)
                  </label>
                  <span className="text-[10px] text-slate-400">
                    格式: 物资名称, 规格, 签约单价, 币种(CNY/EUR), 供应商, 项目名, 签单日期
                  </span>
                </div>
                <textarea
                  rows={4}
                  placeholder="接地裸铜绞线 50mm², 国标50mm², 155, CNY, 宝胜电缆, 嘉玛大清真寺, 2025-10-18&#10;低压进线总配电柜 TGBT 2500A, 400V 50kA, 18200, EUR, 施耐德电气, 嘉玛大清真寺, 2025-11-05"
                  value={pasteData}
                  onChange={(e) => setPasteData(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-[11px] bg-white focus:border-blue-500"
                />
                {pasteData && (
                  <button
                    type="button"
                    onClick={handleParsePastedData}
                    className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold text-xs cursor-pointer shadow-xs"
                  >
                    解析并校验粘贴数据
                  </button>
                )}
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-700" />
                  <span className="font-bold text-blue-950">
                    成功解析源文件: {fileName}
                  </span>
                </div>
                <span className="font-mono font-bold text-blue-800">
                  共解析出 {parsedRecords.length} 项有效历史签单
                </span>
              </div>

              {/* 校验列表 */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 text-[11px] sticky top-0">
                      <tr>
                        <th className="py-2 px-3 font-semibold">项目名称</th>
                        <th className="py-2 px-3 font-semibold">物资名称及规格</th>
                        <th className="py-2 px-3 font-semibold text-right">签约单价</th>
                        <th className="py-2 px-3 font-semibold">签约供应商</th>
                        <th className="py-2 px-3 font-semibold">签订日期</th>
                        <th className="py-2 px-3 font-semibold text-center">时效评估</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 text-xs">
                      {parsedRecords.map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70">
                          <td className="py-2 px-3 font-medium text-slate-900 max-w-[140px] truncate">
                            {r.projectName}
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-bold text-slate-800">
                              {r.materialName}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {r.materialSpec}
                            </div>
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-emerald-700 text-right">
                            {r.unitPrice.toLocaleString()} {r.currency}
                          </td>
                          <td className="py-2 px-3 text-slate-600 max-w-[120px] truncate">
                            {r.supplierName}
                          </td>
                          <td className="py-2 px-3 text-slate-500 font-mono">
                            {r.signDate}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {r.isRecentOneYear ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                1年内有效签单
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                                超过1年参考
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
                <strong>入库与双库联动机制说明：</strong>
                导入完成后，系统将自动把上述签单记录沉淀至【历史签单台账】。同时，智能扫描当前材料库，若名称或别名匹配，将自动把该物资的“最近签单项目”、“签单时间”更新为本批次数据，使
                BOQ 组价匹配度提升至 95% 以上！
              </div>
            </div>
          )}
        </div>

        {/* 底部动作栏 */}
        <div className="px-6 py-3.5 border-t border-slate-150 flex items-center justify-between bg-slate-50">
          <div>
            {activeStep === 2 && (
              <button
                type="button"
                onClick={() => setActiveStep(1)}
                className="text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
              >
                ← 返回重新选择文件
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs text-slate-700 hover:bg-slate-100 cursor-pointer font-medium"
            >
              取消
            </button>
            {activeStep === 2 && (
              <button
                type="button"
                onClick={handleConfirmImport}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>确认批量导入并更新双库置信度</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
