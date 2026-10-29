import React, { useState } from 'react';
import {
  InstallationQuotaComponent,
  MaterialComponent,
  SupplierQuote,
  CurrencyType,
  HistoricalContractRecord,
} from '../types/pricing';
import { MaterialAliasManagerView } from './MaterialAliasManagerView';
import { HistoricalContractImportModal } from './HistoricalContractImportModal';
import {
  Layers,
  Database,
  Search,
  Plus,
  Image as ImageIcon,
  Check,
  CheckCircle2,
  Calendar,
  Building,
  Tag,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Info,
  Mail,
  Upload,
  FileSpreadsheet,
  Download,
  Filter,
  TrendingUp,
} from 'lucide-react';

interface DualDatabaseViewProps {
  quotas: InstallationQuotaComponent[];
  materials: MaterialComponent[];
  onAddQuota: (quota: InstallationQuotaComponent) => void;
  onAddMaterial: (material: MaterialComponent) => void;
  onUpdateMaterials: (materials: MaterialComponent[]) => void;
  historicalContracts: HistoricalContractRecord[];
  onAddHistoricalContracts: (
    contracts: HistoricalContractRecord[],
    updatedMaterials?: MaterialComponent[]
  ) => void;
  onOpenSendEmailModal?: (prefill?: any) => void;
  activeModule?: 'materials' | 'contracts' | 'aliases';
  onModuleChange?: (module: 'materials' | 'contracts' | 'aliases') => void;
}

export const DualDatabaseView: React.FC<DualDatabaseViewProps> = ({
  quotas,
  materials,
  onAddQuota,
  onAddMaterial,
  onUpdateMaterials,
  historicalContracts,
  onAddHistoricalContracts,
  onOpenSendEmailModal,
  activeModule: propActiveModule,
  onModuleChange,
}) => {
  // 顶层子模块切换：'materials' (总库) | 'contracts' (历史签单与导入) | 'aliases' (别名映射)
  const [internalActiveModule, setInternalActiveModule] = useState<
    'materials' | 'contracts' | 'aliases'
  >('materials');

  const activeModule = propActiveModule !== undefined ? propActiveModule : internalActiveModule;
  const setActiveModule = (mod: 'materials' | 'contracts' | 'aliases') => {
    setInternalActiveModule(mod);
    onModuleChange?.(mod);
  };

  // 材料/定额二级切换
  const [activeSubTab, setActiveSubTab] = useState<'quotas' | 'materials'>('materials');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState(false);
  const [isAddQuotaModalOpen, setIsAddQuotaModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // 历史签单搜索与过滤
  const [contractSearchQuery, setContractSearchQuery] = useState('');
  const [contractCategory, setContractCategory] = useState<string>('all');

  // 新增材料表单状态
  const [newMatNameZh, setNewMatNameZh] = useState('');
  const [newMatNameFr, setNewMatNameFr] = useState('');
  const [newMatSynonyms, setNewMatSynonyms] = useState('进出线柜, 开关柜, 配电柜');
  const [newMatSpec, setNewMatSpec] = useState('');
  const [newMatUnit, setNewMatUnit] = useState('台');
  const [newMatOrigin, setNewMatOrigin] = useState('中国');
  const [newMatCurrency, setNewMatCurrency] = useState<CurrencyType>('CNY');
  const [newMatPrice, setNewMatPrice] = useState<number>(5000);
  const [newMatCategory, setNewMatCategory] = useState<any>('电气设备');

  // 新增定额表单状态
  const [newQuotaCode, setNewQuotaCode] = useState('CFO-NEW-01');
  const [newQuotaNameZh, setNewQuotaNameZh] = useState('');
  const [newQuotaNameFr, setNewQuotaNameFr] = useState('');
  const [newQuotaLabor, setNewQuotaLabor] = useState(1.5);
  const [newQuotaUnit, setNewQuotaUnit] = useState('台');

  const filteredMaterials = materials.filter((m) => {
    const matchesSearch =
      m.standardNameZh.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.standardNameFr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.synonyms.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCat = selectedCategory === 'all' ? true : m.category === selectedCategory;

    return matchesSearch && matchesCat;
  });

  const filteredQuotas = quotas.filter((q) => {
    return (
      q.nameZh.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.nameFr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.quotaCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.craftNotes.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredContracts = historicalContracts.filter((c) => {
    const matchesSearch =
      c.materialName.toLowerCase().includes(contractSearchQuery.toLowerCase()) ||
      c.projectName.toLowerCase().includes(contractSearchQuery.toLowerCase()) ||
      c.supplierName.toLowerCase().includes(contractSearchQuery.toLowerCase()) ||
      c.contractNo.toLowerCase().includes(contractSearchQuery.toLowerCase());

    const matchesCat = contractCategory === 'all' ? true : c.category === contractCategory;

    return matchesSearch && matchesCat;
  });

  const recentYearContractsCount = historicalContracts.filter((c) => c.isRecentOneYear).length;

  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatNameZh) return;

    const newMaterial: MaterialComponent = {
      id: `MAT-${Date.now().toString().slice(-4)}`,
      code: `EL-GEN-${Date.now().toString().slice(-3)}`,
      standardNameZh: newMatNameZh,
      standardNameFr: newMatNameFr || newMatNameZh,
      synonyms: newMatSynonyms.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
      spec: newMatSpec || '标准工程规格',
      unit: newMatUnit,
      defaultOrigin: newMatOrigin,
      currency: newMatCurrency,
      basePrice: newMatPrice,
      imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
      supplierQuotes: [
        {
          supplierId: 'SUP-NEW',
          supplierName: '新入围供应商',
          unitPrice: newMatPrice,
          currency: newMatCurrency,
          originCountry: newMatOrigin,
          leadTimeDays: 30,
          isLowestPrice: true,
          quotedDate: '2026-08-15',
        },
      ],
      lastSignedProject: 'Phoenix 智慧医疗综合体项目 (1年内已签单)',
      lastSignedDate: '2026-08-01',
      isRecentOneYear: true,
      category: newMatCategory,
    };

    onAddMaterial(newMaterial);
    setIsAddMaterialModalOpen(false);
    setNewMatNameZh('');
    setNewMatNameFr('');
  };

  const handleSaveQuota = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuotaNameZh) return;

    const newQuota: InstallationQuotaComponent = {
      id: `QUOTA-${Date.now().toString().slice(-3)}`,
      quotaCode: newQuotaCode,
      nameZh: newQuotaNameZh,
      nameFr: newQuotaNameFr || newQuotaNameZh,
      unit: newQuotaUnit,
      laborContent: newQuotaLabor,
      auxiliaryContent: 35,
      auxiliaryCoeff: 1.1,
      machineryContent: 40,
      machineryCoeff: 1.1,
      craftNotes: '现场标准施工工艺，已按北非工程规范校核',
      referenceProject: '阿尔及利亚 Phoenix 智慧医疗综合体项目',
    };

    onAddQuota(newQuota);
    setIsAddQuotaModalOpen(false);
    setNewQuotaNameZh('');
    setNewQuotaNameFr('');
  };

  return (
    <div className="space-y-6">
      {/* 子模块 3: 材料智能别名映射管理 (完全可编辑) */}
      {activeModule === 'aliases' && (
        <MaterialAliasManagerView
          materials={materials}
          onUpdateMaterials={onUpdateMaterials}
        />
      )}

      {/* 子模块 2: 历史签单台账与批量导入向导 */}
      {activeModule === 'contracts' && (
        <div className="space-y-5">
          {/* 历史签单数据概览指标 */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 block">历史签约合同总数</span>
              <div className="text-xl font-bold text-slate-900 font-mono mt-1">
                {historicalContracts.length} 份
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                覆盖北非多项重点工程
              </span>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-2xs">
              <span className="text-emerald-800 font-semibold block">
                1年内高置信度签单
              </span>
              <div className="text-xl font-bold text-emerald-700 font-mono mt-1">
                {recentYearContractsCount} 份
              </div>
              <span className="text-[10px] text-emerald-600 mt-0.5 block">
                组价匹配命中时赋予 95%+ 置信度
              </span>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 block">重点覆盖工程</span>
              <div className="font-bold text-slate-900 truncate mt-1">
                Phoenix 智慧医疗综合体 · 嘉玛大清真寺 · 奥兰体育场
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                真实海外履约合规单价
              </span>
            </div>

            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-blue-900 font-bold block">批量导入更新</span>
                <span className="text-[11px] text-blue-700 mt-0.5 block">
                  支持 Excel / CSV 模版导入
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer shadow-xs"
              >
                立即导入
              </button>
            </div>
          </div>

          {/* 签单台账列表 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="搜索合同号、物资、项目名称、签约供应商..."
                  value={contractSearchQuery}
                  onChange={(e) => setContractSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                {['all', '电气设备', '电缆母线', '辅材管道'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setContractCategory(cat)}
                    className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      contractCategory === cat
                        ? 'bg-blue-700 text-white font-semibold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat === 'all' ? '全部工程分类' : cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100/70 text-slate-700 text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">合同编号</th>
                    <th className="py-2.5 px-4 font-semibold">履约项目标段</th>
                    <th className="py-2.5 px-4 font-semibold">签约物资及技术规格</th>
                    <th className="py-2.5 px-4 font-semibold text-right">签约单价</th>
                    <th className="py-2.5 px-4 font-semibold">签约供应商</th>
                    <th className="py-2.5 px-4 font-semibold">交货条款</th>
                    <th className="py-2.5 px-4 font-semibold">签订日期</th>
                    <th className="py-2.5 px-4 font-semibold text-center">时效置信度</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {filteredContracts.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-800">
                        {c.contractNo}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 max-w-[160px] truncate">
                        {c.projectName}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{c.materialName}</div>
                        <div className="text-[10px] text-slate-500 font-sans">
                          {c.materialSpec}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        {c.unitPrice.toLocaleString()} {c.currency}
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-[140px] truncate">
                        {c.supplierName}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-500">
                        {c.deliveryTerms}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {c.signDate}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {c.isRecentOneYear ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            1年内真实验证 (95%+)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                            历史过往参考
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 子模块 1: 定额与主材总库展示 */}
      {activeModule === 'materials' && (
        <div className="space-y-4">
          {/* 主材 / 定额 二级切换与操作工具栏 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2 overflow-x-auto">
              <button
                onClick={() => setActiveSubTab('materials')}
                className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  activeSubTab === 'materials'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>采购主材库 ({materials.length})</span>
              </button>

              <button
                onClick={() => setActiveSubTab('quotas')}
                className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  activeSubTab === 'quotas'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>工序定额库 ({quotas.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-2xs transition-all cursor-pointer whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-700" />
                <span>导入历史签单 (Excel/CSV)</span>
              </button>

              <button
                onClick={() =>
                  activeSubTab === 'materials'
                    ? setIsAddMaterialModalOpen(true)
                    : setIsAddQuotaModalOpen(true)
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition-all cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>
                  {activeSubTab === 'materials' ? '新增主材组件' : '新增工序定额'}
                </span>
              </button>
            </div>
          </div>

          {/* 搜索与分类过滤 */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeSubTab === 'materials'
                    ? '搜索材料名称、法语名、编码、别名（如进出线柜）...'
                    : '搜索定额工序、定额编号、工法要求...'
                }
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {activeSubTab === 'materials' && (
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <span className="text-slate-500 whitespace-nowrap">分类:</span>
                {['all', '电气设备', '电缆母线', '辅材管道'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {cat === 'all' ? '全部品类' : cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 主材费数据库列表 */}
          {activeSubTab === 'materials' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMaterials.map((mat) => {
                const lowestQuote = mat.supplierQuotes.find((q) => q.isLowestPrice);
                return (
                  <div
                    key={mat.id}
                    className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* 顶部标签 */}
                      <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded">
                            {mat.code}
                          </span>
                          <span className="text-xs text-slate-500">{mat.category}</span>
                        </div>

                        {mat.isRecentOneYear && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>1年内历史签单 (优先匹配)</span>
                          </span>
                        )}
                      </div>

                      {/* 核心内容与配图布局 */}
                      <div className="flex gap-3.5 mt-3">
                        {/* 物资技术图样与工程标准实物图鉴 */}
                        <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 relative group">
                          <img
                            src={mat.imageUrl}
                            alt={mat.standardNameZh}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-slate-900/60 text-white text-[9px] py-0.5 text-center backdrop-blur-2xs">
                            标准图鉴
                          </div>
                        </div>

                        {/* 文本描述与别名 */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              {mat.standardNameZh}
                            </h4>
                            <p className="text-xs text-slate-500 font-medium">
                              {mat.standardNameFr}
                            </p>
                          </div>

                          <div className="text-xs text-slate-600 line-clamp-1">
                            <span className="text-slate-400">规格: </span>
                            {mat.spec}
                          </div>

                          {/* 别名展示 */}
                          <div className="flex items-center gap-1 flex-wrap pt-0.5">
                            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                              <Tag className="w-3 h-3" /> 别名:
                            </span>
                            {mat.synonyms.map((syn, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px]"
                              >
                                {syn}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* 供应商报价与签单参考 */}
                      <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">采纳基准价:</span>
                          <span className="font-mono font-bold text-emerald-700 text-sm">
                            {mat.basePrice.toLocaleString()} {mat.currency} / {mat.unit}
                          </span>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-lg space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">最近签单项目:</span>
                            <span className="font-medium text-slate-800">
                              {mat.lastSignedProject}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-500">
                            <span>签约日期: {mat.lastSignedDate}</span>
                            <span>产地: {mat.defaultOrigin}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 flex items-center justify-between gap-2 text-xs">
                      <button
                        onClick={() => {
                          setActiveModule('aliases');
                        }}
                        className="text-blue-700 hover:text-blue-900 font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <Tag className="w-3.5 h-3.5" />
                        <span>编辑此材料别名</span>
                      </button>

                      {onOpenSendEmailModal && (
                        <button
                          onClick={() =>
                            onOpenSendEmailModal({
                              name: mat.standardNameZh,
                              spec: mat.spec,
                              unit: mat.unit,
                              quantity: 1,
                              imageUrl: mat.imageUrl,
                            })
                          }
                          className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>发起询价</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 定额数据库列表 */}
          {activeSubTab === 'quotas' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredQuotas.map((quota) => (
                <div
                  key={quota.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                      <div>
                        <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded">
                          {quota.quotaCode}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm mt-1">
                          {quota.nameZh}
                        </h4>
                        <p className="text-xs text-slate-500">{quota.nameFr}</p>
                      </div>
                      <span className="text-xs text-slate-500 font-mono">
                        单位: {quota.unit}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg text-center text-xs">
                      <div>
                        <span className="text-slate-500 block text-[11px]">
                          人工含量
                        </span>
                        <strong className="font-mono text-slate-800">
                          {quota.laborContent} 工日
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">
                          辅材基数×系数
                        </span>
                        <strong className="font-mono text-slate-800">
                          {quota.auxiliaryContent} × {quota.auxiliaryCoeff}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">
                          机械基数×系数
                        </span>
                        <strong className="font-mono text-slate-800">
                          {quota.machineryContent} × {quota.machineryCoeff}
                        </strong>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 bg-amber-50/50 p-2 rounded border border-amber-100/60 leading-relaxed">
                      <strong>工艺工法说明：</strong>
                      {quota.craftNotes}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>标杆参考工程: {quota.referenceProject}</span>
                    <span className="text-emerald-700 font-medium">海外标准定额</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 历史签单批量导入向导弹窗 */}
      <HistoricalContractImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        currentMaterials={materials}
        onImportSuccess={(newContracts, updatedMaterials) => {
          onAddHistoricalContracts(newContracts, updatedMaterials);
        }}
      />

      {/* 新增材料弹窗 */}
      {isAddMaterialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              新增工程采购主材组件
            </h3>
            <form onSubmit={handleSaveMaterial} className="space-y-3">
              <div>
                <label className="text-slate-600 block mb-1">标准物资名称 (中文)</label>
                <input
                  type="text"
                  required
                  value={newMatNameZh}
                  onChange={(e) => setNewMatNameZh(e.target.value)}
                  placeholder="如: 低压进出线配电柜"
                  className="w-full px-2.5 py-1.5 border rounded"
                />
              </div>

              <div>
                <label className="text-slate-600 block mb-1">标准物资名称 (法语)</label>
                <input
                  type="text"
                  value={newMatNameFr}
                  onChange={(e) => setNewMatNameFr(e.target.value)}
                  placeholder="如: Armoire TGBT"
                  className="w-full px-2.5 py-1.5 border rounded"
                />
              </div>

              <div>
                <label className="text-slate-600 block mb-1">
                  别名映射 (逗号隔开，供模糊匹配)
                </label>
                <input
                  type="text"
                  value={newMatSynonyms}
                  onChange={(e) => setNewMatSynonyms(e.target.value)}
                  placeholder="进出线柜, 开关柜, 配电柜"
                  className="w-full px-2.5 py-1.5 border rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 block mb-1">采购基准单价</label>
                  <input
                    type="number"
                    value={newMatPrice}
                    onChange={(e) => setNewMatPrice(Number(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 border rounded font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block mb-1">币种</label>
                  <select
                    value={newMatCurrency}
                    onChange={(e) => setNewMatCurrency(e.target.value as CurrencyType)}
                    className="w-full px-2.5 py-1.5 border rounded"
                  >
                    <option value="CNY">人民币 (CNY)</option>
                    <option value="EUR">欧元 (EUR)</option>
                    <option value="DZD">阿尔及利亚第纳尔 (DZD)</option>
                    <option value="USD">美元 (USD)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddMaterialModalOpen(false)}
                  className="px-3 py-1.5 border rounded hover:bg-slate-50 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-700 text-white rounded hover:bg-blue-800 cursor-pointer"
                >
                  保存入库
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 新增定额弹窗 */}
      {isAddQuotaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              新增工程定额工序组件
            </h3>
            <form onSubmit={handleSaveQuota} className="space-y-3">
              <div>
                <label className="text-slate-600 block mb-1">定额名称 (中文)</label>
                <input
                  type="text"
                  required
                  value={newQuotaNameZh}
                  onChange={(e) => setNewQuotaNameZh(e.target.value)}
                  placeholder="如: 电力电缆穿管敷设"
                  className="w-full px-2.5 py-1.5 border rounded"
                />
              </div>

              <div>
                <label className="text-slate-600 block mb-1">定额名称 (法语)</label>
                <input
                  type="text"
                  value={newQuotaNameFr}
                  onChange={(e) => setNewQuotaNameFr(e.target.value)}
                  placeholder="如: Tirage de câble sous conduit"
                  className="w-full px-2.5 py-1.5 border rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 block mb-1">人工定额含量 (工日)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newQuotaLabor}
                    onChange={(e) => setNewQuotaLabor(Number(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 border rounded font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block mb-1">计量单位</label>
                  <input
                    type="text"
                    value={newQuotaUnit}
                    onChange={(e) => setNewQuotaUnit(e.target.value)}
                    className="w-full px-2.5 py-1.5 border rounded"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddQuotaModalOpen(false)}
                  className="px-3 py-1.5 border rounded hover:bg-slate-50 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-700 text-white rounded hover:bg-blue-800 cursor-pointer"
                >
                  保存定额组件
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
