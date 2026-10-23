import React, { useState, useRef } from 'react';
import { TenderProject } from '../types/tenderProject';
import { INITIAL_PROPOSAL_SECTIONS } from '../data/mockProposalComponents';
import {
  X,
  Building2,
  FolderArchive,
  Upload,
  Calendar,
  DollarSign,
  Tag,
  Check,
  Sparkles,
  FileText,
} from 'lucide-react';

interface CreateTenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTender: (newTender: TenderProject) => void;
}

export const CreateTenderModal: React.FC<CreateTenderModalProps> = ({
  isOpen,
  onClose,
  onCreateTender,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'form' | 'upload_first'>('form');

  // 表单状态
  const [name, setName] = useState('');
  const [nameFr, setNameFr] = useState('');
  const [code, setCode] = useState('');
  const [client, setClient] = useState('');
  const [country, setCountry] = useState('阿尔及利亚 (Algérie)');
  const [currency, setCurrency] = useState('DZD');
  const [deadline, setDeadline] = useState('2026-12-30');
  const [category, setCategory] = useState<TenderProject['category']>('医疗建筑');
  const [description, setDescription] = useState('');

  // 快捷上传 ZIP 建标状态
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
      setSelectedFile({ name: file.name, size: sizeStr });

      // 根据文件名智能推测标段名称与文号
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      if (!name) setName(cleanName);
      if (!code) setCode(`DZ-AOI-${Date.now().toString().slice(-4)}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newId = `TENDER-${Date.now().toString().slice(-6)}`;
    const newTender: TenderProject = {
      id: newId,
      name: name.trim(),
      nameFr: nameFr.trim() || undefined,
      code: code.trim() || `TND-${Date.now().toString().slice(-4)}`,
      client: client.trim() || '阿尔及利亚国家部委业主',
      country,
      currency,
      deadline,
      status: selectedFile ? 'in_progress' : 'draft',
      statusLabel: selectedFile ? '原件已上传待解析' : '待上传原件',
      category,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      description: description.trim() || '新建海外工程标段，立项后可直接上传招标公告原件、锁定项目变量并进行量单组价。',
      packageFileName: selectedFile?.name,
      packageFileSize: selectedFile?.size,
      currentStep: 'notice',
      attachments: [],
      variableValues: {
        项目名称: name.trim(),
        招标编号: code.trim() || `TND-${Date.now().toString().slice(-4)}`,
        招标人名称: client.trim() || '国家主管部委',
        投标截止日期: deadline,
        投标有效期: '90',
        投标保证金金额: currency === 'DZD' ? '20,000,000 DZD' : '100,000 EUR',
        工期日历天: '540',
        计划开工日期: '2027-01-01',
        计划竣工日期: '2028-06-24',
        工程质量等级: '国际优良工程 (NFC/IEC)',
        工程交付地点: country,
        工程质保期: '2',
        应急响应时间: '2',
        投标人法定名称: '中国建筑第二工程局有限公司 (CSCEC-II)',
        法定代表人姓名: '石雨',
        授权委托人姓名: '李工',
        委托人职务: '商务经理',
        委托人身份证号: '110108198501012345',
        项目经理姓名: '张工',
        建造师注册编号: '京1112022202300123',
        投标总价: `0 ${currency}`,
      },
      proposalSections: INITIAL_PROPOSAL_SECTIONS,
      boqItems: [],
      rfqRecords: [],
    };

    onCreateTender(newTender);
    onClose();
  };

  const handleQuickPreset = (presetType: 'algeria_sub' | 'senegal_infra' | 'guinea_power') => {
    if (presetType === 'algeria_sub') {
      setName('阿尔及利亚奥兰国际会展中心弱电与变配电标段');
      setNameFr('Centre de Conventions d\'Oran - Lot Électricité CFO/CFA');
      setCode('DZ-ORAN-2026-CFO-018');
      setClient('阿尔及利亚住房与城市规划部 (Ministère de l\'Habitat)');
      setCountry('阿尔及利亚 (Algérie)');
      setCurrency('DZD');
      setDeadline('2026-12-25');
      setCategory('公共市政');
      setSelectedFile({
        name: 'Dossier-Appel-Offres-CCO-Oran-2026.zip',
        size: '54.2 MB',
      });
    } else if (presetType === 'senegal_infra') {
      setName('塞内加尔圣路易国际机场航站楼电气与照明工程');
      setNameFr('Aéroport International de Saint-Louis - Lot CFO/Balisage');
      setCode('SN-AERO-2026-004');
      setClient('塞内加尔国家民航总局 (ANACIM)');
      setCountry('塞内加尔 (Sénégal)');
      setCurrency('XOF');
      setDeadline('2027-01-15');
      setCategory('基础设施');
      setSelectedFile({
        name: 'Dossier-Appel-Offres-Aeroport-SaintLouis.zip',
        size: '78.5 MB',
      });
    } else {
      setName('几内亚科纳克里政府办公大楼供配电系统');
      setNameFr('Immeuble Gouvernemental de Conakry - Courants Forts');
      setCode('GN-CONAKRY-2026-LOT02');
      setClient('几内亚基础设施与公共工程部');
      setCountry('几内亚 (Guinée)');
      setCurrency('USD');
      setDeadline('2027-02-10');
      setCategory('商业综合体');
      setSelectedFile({
        name: 'Tender-Dossier-Conakry-Gov-2026.zip',
        size: '41.0 MB',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* 标题 */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <Building2 className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                新建海外投标标段 (Créer un Nouveau Marché)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                独立分类管理：可按标段分别上传招标文件、锁定标书变量及编制工程量清单。
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 方式切换 Tab */}
        <div className="px-6 pt-3 border-b border-slate-200 bg-white flex items-center gap-4 text-xs">
          <button
            onClick={() => setActiveTab('form')}
            className={`pb-2.5 font-semibold cursor-pointer border-b-2 transition-colors ${
              activeTab === 'form'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            标准新建标段信息
          </button>
          <button
            onClick={() => setActiveTab('upload_first')}
            className={`pb-2.5 font-semibold cursor-pointer border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'upload_first'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5 text-blue-600" />
            <span>拖入招标文件 ZIP 直接建标</span>
          </button>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {/* 快捷示例载入 */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-blue-900 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>快速填入国际投标标段范例：</span>
              </span>
              <span className="text-[10px] text-blue-700">一键代入</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleQuickPreset('algeria_sub')}
                className="px-2.5 py-1 rounded bg-white hover:bg-blue-100 text-blue-800 border border-blue-200 font-medium cursor-pointer"
              >
                🇩🇿 阿尔及利亚奥兰会展中心
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('senegal_infra')}
                className="px-2.5 py-1 rounded bg-white hover:bg-blue-100 text-blue-800 border border-blue-200 font-medium cursor-pointer"
              >
                🇸🇳 塞内加尔国际机场航站楼
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('guinea_power')}
                className="px-2.5 py-1 rounded bg-white hover:bg-blue-100 text-blue-800 border border-blue-200 font-medium cursor-pointer"
              >
                🇬🇳 几内亚科纳克里政府大楼
              </button>
            </div>
          </div>

          {/* 拖入 ZIP 文件区 */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              挂载招标文件包 (可选，支持 ZIP / PDF 原件):
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelected}
              accept=".zip,.rar,.pdf,.dwg,.xlsx"
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`p-4 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors ${
                selectedFile
                  ? 'border-emerald-400 bg-emerald-50/30'
                  : 'border-slate-300 hover:border-blue-500 bg-slate-50/50'
              }`}
            >
              {selectedFile ? (
                <div className="flex items-center justify-center gap-2 text-emerald-800">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold">{selectedFile.name}</span>
                  <span className="text-[11px] text-slate-500 font-mono">({selectedFile.size})</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                    className="text-xs text-red-600 underline ml-2 cursor-pointer"
                  >
                    重新选择
                  </button>
                </div>
              ) : (
                <div>
                  <Upload className="w-6 h-6 mx-auto mb-1 text-slate-400" />
                  <div className="font-medium text-slate-700">点击上传或将招标 ZIP 包拖拽至此</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    建标后将直接进入第 1 步「招标公告」，系统将自动解包并提取项目变量
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 标段全称 */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              标段工程全称 (中文) <span className="text-red-500">*</span>:
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：阿尔及利亚 240 床综合医院强电与智能化系统工程"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white"
            />
          </div>

          {/* 法文全称 */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              标段官方全称 (法文 / 英文，供双语标书生成):
            </label>
            <input
              type="text"
              value={nameFr}
              onChange={(e) => setNameFr(e.target.value)}
              placeholder="例如：Projet Hôpital 240 Lits à Tizi Ouzou - Lot 09 Électricité"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 招标文号 */}
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                官方招标编号 (Numéro d'Avis):
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="例如：DZ-SANTE-2026-CFO-009"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            {/* 招标人单位 */}
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                招标人 / 业主全称 (Maître de l'Ouvrage):
              </label>
              <input
                type="text"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="例如：阿尔及利亚卫生部"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 国家地区 */}
            <div>
              <label className="block font-medium text-slate-700 mb-1">国家 / 地区:</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="例如：阿尔及利亚"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            {/* 结算币种 */}
            <div>
              <label className="block font-medium text-slate-700 mb-1">标书报价币种:</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white"
              >
                <option value="DZD">DZD (阿尔及利亚第纳尔)</option>
                <option value="XOF">XOF (西非法郎)</option>
                <option value="EUR">EUR (欧元)</option>
                <option value="USD">USD (美元)</option>
                <option value="CNY">CNY (人民币)</option>
              </select>
            </div>

            {/* 截标日期 */}
            <div>
              <label className="block font-medium text-slate-700 mb-1">投标递交截止日期:</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white"
              />
            </div>
          </div>

          {/* 标段简要描述 */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">工程范围简要说明:</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="概括该标段的建筑规模、主要专业施工范围及关键合同特点..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white"
            />
          </div>

          {/* 底部按钮栏 */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-slate-400 text-[11px]">
              建标后即自动进入独立的 招标公告 ➔ 投标须知 ➔ 清单组价 作业流
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer text-xs"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>立即建标并进入工作台</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
