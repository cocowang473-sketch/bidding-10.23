import React, { useState } from 'react';
import { EmailTemplateItem, VendorCategoryType, CurrencyType } from '../types/pricing';
import {
  PRESET_EMAIL_VARIABLES,
  DEFAULT_EMAIL_TEMPLATES,
  renderTemplateWithVariables,
} from '../utils/rfqEmailTemplates';
import {
  Mail,
  Plus,
  Edit3,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Eye,
  Trash2,
  Tag,
  HelpCircle,
  FileText,
  Sliders,
  Send,
  Building,
  CheckCircle2,
} from 'lucide-react';

interface EmailTemplateManagerViewProps {
  templates: EmailTemplateItem[];
  onUpdateTemplates: (templates: EmailTemplateItem[]) => void;
  onSelectTemplateForRfq?: (template: EmailTemplateItem) => void;
}

export const EmailTemplateManagerView: React.FC<EmailTemplateManagerViewProps> = ({
  templates,
  onUpdateTemplates,
  onSelectTemplateForRfq,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates[0]?.id || 'tpl-equipment-mfg'
  );

  // 编辑态
  const activeTemplate =
    templates.find((t) => t.id === selectedTemplateId) || templates[0];

  const [editName, setEditName] = useState(activeTemplate?.name || '');
  const [editCategory, setEditCategory] = useState<VendorCategoryType>(
    activeTemplate?.category || 'equipment'
  );
  const [editCurrency, setEditCurrency] = useState<CurrencyType>(
    activeTemplate?.defaultCurrency || 'CNY'
  );
  const [editSubject, setEditSubject] = useState(activeTemplate?.subjectTemplate || '');
  const [editBody, setEditBody] = useState(activeTemplate?.bodyTemplate || '');
  const [editDescription, setEditDescription] = useState(activeTemplate?.description || '');

  // 当选择不同模板时，同步表单
  React.useEffect(() => {
    if (activeTemplate) {
      setEditName(activeTemplate.name);
      setEditCategory(activeTemplate.category);
      setEditCurrency(activeTemplate.defaultCurrency);
      setEditSubject(activeTemplate.subjectTemplate);
      setEditBody(activeTemplate.bodyTemplate);
      setEditDescription(activeTemplate.description);
    }
  }, [selectedTemplateId]);

  // 新增模板弹窗
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTplName, setNewTplName] = useState('');
  const [newTplCategory, setNewTplCategory] = useState<VendorCategoryType>('equipment');
  const [newTplCurrency, setNewTplCurrency] = useState<CurrencyType>('CNY');
  const [newTplDesc, setNewTplDesc] = useState('');

  // 提示信息
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // 插入预设变量到正文
  const handleInsertVariable = (variableStr: string) => {
    setEditBody((prev) => prev + (prev.endsWith('\n') ? '' : '\n') + variableStr);
  };

  // 保存当前修改
  const handleSaveCurrentTemplate = () => {
    const updated = templates.map((t) => {
      if (t.id === selectedTemplateId) {
        return {
          ...t,
          name: editName,
          category: editCategory,
          defaultCurrency: editCurrency,
          subjectTemplate: editSubject,
          bodyTemplate: editBody,
          description: editDescription,
          updatedAt: new Date().toISOString().split('T')[0],
        };
      }
      return t;
    });
    onUpdateTemplates(updated);
    setSaveSuccessMsg('模板已成功保存并实时生效！');
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  // 创建新模板
  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTplName.trim()) return;

    const categoryLabels: Record<VendorCategoryType, string> = {
      equipment: '设备厂商',
      service: '服务承包商',
      subcontractor: '分包劳务',
      distributor: '材料贸易商',
      international: '国际原厂',
    };

    const newTemplate: EmailTemplateItem = {
      id: `tpl-custom-${Date.now().toString().slice(-4)}`,
      name: newTplName,
      category: newTplCategory,
      categoryLabel: categoryLabels[newTplCategory],
      badge: categoryLabels[newTplCategory],
      description: newTplDesc || '用户自定义专项询价模板',
      defaultCurrency: newTplCurrency,
      subjectTemplate: `[商务询价/Inquiry] {{项目名称}} - 关于【{{询价材料清单}}】商务报价邀请 (致 {{供应商名称}})`,
      bodyTemplate: `致：{{供应商名称}} 商务及投标部：\n\n您好！\n我司（{{采购单位名称}}）正在推进“{{项目名称}}”，现就以下采购内容向贵司发出正式商务询价邀请：\n\n一、 采购物资清单：\n{{询价材料清单}}\n\n二、 交付与履约要求：\n交货地点：{{交货地点与条款}}\n技术标准：{{技术标准规范}}\n期望币种：{{期望报价币种}}\n\n请于 {{报价截止日期}} 前将正式报价文件回复我司。\n\n商务联系人：{{联系人及电话}}\n顺祝商祺！\n{{采购单位名称}}`,
      isCustom: true,
      updatedAt: new Date().toISOString().split('T')[0],
    };

    const nextList = [newTemplate, ...templates];
    onUpdateTemplates(nextList);
    setSelectedTemplateId(newTemplate.id);
    setIsCreateModalOpen(false);
    setNewTplName('');
    setNewTplDesc('');
    setSaveSuccessMsg(`已新建并切换至自定义模板：${newTemplate.name}`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // 删除自定义模板
  const handleDeleteTemplate = (id: string) => {
    if (confirm('确认删除该自定义邮件模板吗？')) {
      const nextList = templates.filter((t) => t.id !== id);
      onUpdateTemplates(nextList);
      if (selectedTemplateId === id) {
        setSelectedTemplateId(nextList[0]?.id || '');
      }
    }
  };

  // 设为默认模板
  const handleSetDefault = (id: string) => {
    const updated = templates.map((t) => ({
      ...t,
      isDefault: t.id === id,
    }));
    onUpdateTemplates(updated);
    setSaveSuccessMsg('已将当前模板设为此类别优先推荐模板！');
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  // 恢复为出厂标准模板
  const handleResetToDefaults = () => {
    if (confirm('确认重置并载入官方标准的 5 大供应商类别邮件模板吗？')) {
      onUpdateTemplates(DEFAULT_EMAIL_TEMPLATES);
      setSelectedTemplateId(DEFAULT_EMAIL_TEMPLATES[0].id);
      setSaveSuccessMsg('已恢复官方标准模板库！');
      setTimeout(() => setSaveSuccessMsg(null), 2500);
    }
  };

  const filteredTemplates = templates.filter((t) => {
    if (selectedCategory === 'all') return true;
    return t.category === selectedCategory;
  });

  // 实时预览渲染内容
  const previewRenderedBody = renderTemplateWithVariables(editBody, {
    supplierName: '法国施耐德电气海外工程部 (Schneider Electric)',
    materialList: '【低压动力配电箱 TGBT 2500A】(规格: 400V 50kA IP54，需求数量: 2 台)',
    projectName: '阿尔及利亚 Phoenix 智慧医疗综合体标段',
    deadlineDate: '2026-08-20',
    deliveryPort: 'CIF 阿尔及尔港 (Port d’Alger)',
    techStandard: 'IEC 61439-2 / 法国标准 NFC 15-100',
    buyerName: '宏远国际工程集团有限公司 (HYI Group) 海外工程事业部',
    contactInfo: '李工 (+86-10-6789-8800 / procurement.dz@cscec2.com.cn)',
    currency: editCurrency,
  });

  const previewRenderedSubject = renderTemplateWithVariables(editSubject, {
    supplierName: '法国施耐德电气 (Schneider Electric)',
    materialList: '低压动力配电箱 TGBT 2500A',
    projectName: '阿尔及利亚 Phoenix 智慧医疗综合体标段',
    deadlineDate: '2026-08-20',
    deliveryPort: 'CIF 阿尔及尔港',
    techStandard: 'IEC 61439-2',
    buyerName: '宏远国际工程集团海外项目部',
    contactInfo: '李工',
    currency: editCurrency,
  });

  return (
    <div className="space-y-6">
      {/* 模块头部 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5" />
                <span>供应商分级邮件正文模板管理中心</span>
              </span>
              <span className="text-xs text-slate-500">
                支持插入系统预设变量 · 多类别客制化正文 · 实时邮件样张渲染
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              供应商类别专属邮件模板库 (Template Hub)
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              造价与采购团队可针对不同合作方属性（如重资产设备厂商、服务承包商、属地劳务分包、材料贸易商）定制严谨的对外商务发函正文，模板变量将在外发询价时自动映射为项目实际工程量与单项明细。
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleResetToDefaults}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              title="重置为官方预置的 5 类标准模板"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>恢复预置模板</span>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>新建个性化模板</span>
            </button>
          </div>
        </div>

        {/* 类别筛选 Tab */}
        <div className="flex items-center gap-2 pt-4 border-t border-slate-150 mt-4 overflow-x-auto">
          {[
            { id: 'all', label: '全部类别' },
            { id: 'equipment', label: '设备制造厂商' },
            { id: 'service', label: '服务承包商' },
            { id: 'subcontractor', label: '分包劳务商' },
            { id: 'distributor', label: '材料贸易商' },
            { id: 'international', label: '国际免税原厂' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-blue-700 text-white font-semibold shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between text-xs font-semibold animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{saveSuccessMsg}</span>
          </div>
        </div>
      )}

      {/* 核心工作区：左侧模板卡片选择，右侧在线编辑与实时预览 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 左侧：模板列表 (占 4 列) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
            <span>模板库目录 ({filteredTemplates.length})</span>
            <span className="text-slate-400">点击进入编辑与参数调试</span>
          </div>

          <div className="space-y-2.5">
            {filteredTemplates.map((t) => {
              const isSelected = selectedTemplateId === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTemplateId(t.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-blue-600 shadow-md ring-1 ring-blue-600'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        t.category === 'equipment'
                          ? 'bg-blue-100 text-blue-800'
                          : t.category === 'service'
                          ? 'bg-emerald-100 text-emerald-800'
                          : t.category === 'subcontractor'
                          ? 'bg-amber-100 text-amber-800'
                          : t.category === 'distributor'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-cyan-100 text-cyan-800'
                      }`}
                    >
                      {t.categoryLabel || t.badge}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {t.isDefault && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          默认优先
                        </span>
                      )}
                      {t.isCustom && (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          自定义
                        </span>
                      )}
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 mt-2 line-clamp-1">
                    {t.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {t.description}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span>基准币种: {t.defaultCurrency}</span>
                    <span>{t.updatedAt ? `更新于 ${t.updatedAt}` : '系统标准'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 右侧：模板编辑器与变量渲染样张 (占 8 列) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-700" />
                <h3 className="font-bold text-slate-900 text-sm">
                  正在编辑: {activeTemplate?.name}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {activeTemplate?.isCustom && (
                  <button
                    onClick={() => handleDeleteTemplate(activeTemplate.id)}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer text-xs flex items-center gap-1"
                    title="删除此自定义模板"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>删除</span>
                  </button>
                )}
                {!activeTemplate?.isDefault && (
                  <button
                    onClick={() => handleSetDefault(activeTemplate.id)}
                    className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                  >
                    设为默认
                  </button>
                )}
                <button
                  onClick={handleSaveCurrentTemplate}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>保存模板配置</span>
                </button>
              </div>
            </div>

            {/* 基本属性网格 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-slate-600 font-medium block mb-1">
                  模板名称
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-900 font-medium bg-white focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-600 font-medium block mb-1">
                  适用供应商类别
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as VendorCategoryType)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-900 bg-white"
                >
                  <option value="equipment">设备制造厂商 (Equipment)</option>
                  <option value="service">服务承包商 (Service)</option>
                  <option value="subcontractor">分包劳务商 (Subcontractor)</option>
                  <option value="distributor">材料贸易商 (Distributor)</option>
                  <option value="international">国际原厂 (International)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 font-medium block mb-1">
                  期望默认结算币种
                </label>
                <select
                  value={editCurrency}
                  onChange={(e) => setEditCurrency(e.target.value as CurrencyType)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-900 bg-white font-mono"
                >
                  <option value="CNY">人民币 (CNY)</option>
                  <option value="EUR">欧元 (EUR)</option>
                  <option value="DZD">阿尔及利亚第纳尔 (DZD)</option>
                  <option value="USD">美元 (USD)</option>
                </select>
              </div>
            </div>

            {/* 预设系统变量插入卡条 */}
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>点击一键插入系统预设变量 (点击直接插入正文)：</span>
                </span>
                <span className="text-[10px] text-blue-700">
                  发信时系统将自动根据项目数据与清单动态填入实际值
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {PRESET_EMAIL_VARIABLES.map((v) => (
                  <button
                    key={v.variable}
                    type="button"
                    onClick={() => handleInsertVariable(v.variable)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-blue-100/70 text-blue-900 border border-blue-300 rounded-md text-[11px] font-mono font-medium transition-all shadow-2xs hover:scale-102 cursor-pointer"
                    title={`${v.desc} (例如: ${v.example})`}
                  >
                    <span>{v.variable}</span>
                    <span className="text-[9px] text-slate-400 font-sans">({v.label})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 邮件主题模板 */}
            <div>
              <label className="text-slate-700 font-semibold text-xs block mb-1">
                邮件主题模板 (Subject Template)
              </label>
              <input
                type="text"
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 bg-white focus:border-blue-500 font-mono"
              />
            </div>

            {/* 邮件正文模板 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-700 font-semibold text-xs block">
                  邮件正文模板 (Body Template)
                </label>
                <span className="text-[11px] text-slate-400">
                  支持多段落、商务礼仪、贸易条款与技术规范定制
                </span>
              </div>
              <textarea
                rows={11}
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 bg-slate-50/50 focus:bg-white focus:border-blue-500 leading-relaxed font-sans"
              />
            </div>
          </div>

          {/* 实时数据变量渲染效果预览卡 */}
          <div className="bg-slate-900 text-white rounded-xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-slate-700 pb-2">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200">
                  真实工程项目数据实时渲染样张预览 (Live Mail Preview)
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Destinataire: Schneider Electric France
              </span>
            </div>

            <div className="text-xs space-y-2">
              <div className="p-2 bg-slate-800/80 rounded border border-slate-700 text-slate-300 font-mono text-[11px]">
                <strong className="text-slate-400 font-sans">邮件主题: </strong>
                {previewRenderedSubject}
              </div>

              <div className="bg-slate-800/50 p-3.5 rounded-lg border border-slate-700 max-h-56 overflow-y-auto whitespace-pre-wrap font-sans text-slate-200 leading-relaxed text-xs">
                {previewRenderedBody}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 新建模态窗口 */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-150 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-700" />
                <h3 className="font-bold text-slate-900 text-sm">
                  新建个性化供应商邮件正文模板
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="p-5 space-y-4 text-xs">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  模板全称
                </label>
                <input
                  type="text"
                  required
                  placeholder="如: 高压变压器专项采购询价函 (法国原厂免税版)"
                  value={newTplName}
                  onChange={(e) => setNewTplName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    目标供应商分类
                  </label>
                  <select
                    value={newTplCategory}
                    onChange={(e) =>
                      setNewTplCategory(e.target.value as VendorCategoryType)
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="equipment">设备制造厂商</option>
                    <option value="service">服务承包商</option>
                    <option value="subcontractor">分包劳务商</option>
                    <option value="distributor">材料贸易商</option>
                    <option value="international">国际原厂</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    默认报价结算币种
                  </label>
                  <select
                    value={newTplCurrency}
                    onChange={(e) => setNewTplCurrency(e.target.value as CurrencyType)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="CNY">人民币 (CNY)</option>
                    <option value="EUR">欧元 (EUR)</option>
                    <option value="DZD">阿尔及利亚第纳尔 (DZD)</option>
                    <option value="USD">美元 (USD)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  适用场景说明
                </label>
                <textarea
                  rows={2}
                  placeholder="说明此模板针对的技术标准、港口交货或资质审核重点..."
                  value={newTplDesc}
                  onChange={(e) => setNewTplDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold cursor-pointer shadow-xs"
                >
                  确认创建并开始编辑
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
