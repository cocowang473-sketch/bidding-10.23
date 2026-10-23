import React, { useState } from 'react';
import { MaterialComponent } from '../types/pricing';
import {
  Tag,
  Search,
  Plus,
  Trash2,
  Edit3,
  Check,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Layers,
  HelpCircle,
  X,
} from 'lucide-react';

interface MaterialAliasManagerViewProps {
  materials: MaterialComponent[];
  onUpdateMaterials: (materials: MaterialComponent[]) => void;
}

export const MaterialAliasManagerView: React.FC<MaterialAliasManagerViewProps> = ({
  materials,
  onUpdateMaterials,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [editingSynonymsInput, setEditingSynonymsInput] = useState('');
  const [newSingleAlias, setNewSingleAlias] = useState('');
  const [saveSuccessId, setSaveSuccessId] = useState<string | null>(null);

  // 实验室测试状态
  const [testQuery, setTestQuery] = useState('Armoire d’alimentation TGBT 2500A');
  const [matchResult, setMatchResult] = useState<{
    matchedMaterial: MaterialComponent | null;
    score: number;
    matchedAlias: string | null;
    reason: string;
  } | null>(null);

  // 启动编辑某项材料的全部别名
  const handleStartEdit = (mat: MaterialComponent) => {
    setEditingMaterialId(mat.id);
    setEditingSynonymsInput(mat.synonyms.join(', '));
  };

  // 保存某项材料别名修改
  const handleSaveEdit = (matId: string) => {
    const newSynonyms = editingSynonymsInput
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const updated = materials.map((m) => {
      if (m.id === matId) {
        return {
          ...m,
          synonyms: Array.from(new Set(newSynonyms)),
        };
      }
      return m;
    });

    onUpdateMaterials(updated);
    setEditingMaterialId(null);
    setSaveSuccessId(matId);
    setTimeout(() => setSaveSuccessId(null), 2000);
  };

  // 快捷添加单个别名
  const handleAddSingleAlias = (matId: string) => {
    if (!newSingleAlias.trim()) return;
    const cleanAlias = newSingleAlias.trim();

    const updated = materials.map((m) => {
      if (m.id === matId) {
        if (m.synonyms.includes(cleanAlias)) return m;
        return {
          ...m,
          synonyms: [...m.synonyms, cleanAlias],
        };
      }
      return m;
    });

    onUpdateMaterials(updated);
    setNewSingleAlias('');
    setSaveSuccessId(matId);
    setTimeout(() => setSaveSuccessId(null), 2000);
  };

  // 删除单个别名标签
  const handleRemoveSingleAlias = (matId: string, aliasToRemove: string) => {
    const updated = materials.map((m) => {
      if (m.id === matId) {
        return {
          ...m,
          synonyms: m.synonyms.filter((s) => s !== aliasToRemove),
        };
      }
      return m;
    });
    onUpdateMaterials(updated);
  };

  // 智能别名实验室实时模拟测试匹配
  const handleRunMatchTest = (queryText: string) => {
    if (!queryText.trim()) {
      setMatchResult(null);
      return;
    }

    const q = queryText.toLowerCase().trim();
    let bestMat: MaterialComponent | null = null;
    let highestScore = 0;
    let hitAlias: string | null = null;
    let reason = '';

    materials.forEach((mat) => {
      const zh = mat.standardNameZh.toLowerCase();
      const fr = mat.standardNameFr.toLowerCase();

      // 1. 完全精确匹配中文或法文
      if (q === zh || q === fr) {
        bestMat = mat;
        highestScore = 100;
        hitAlias = q === zh ? mat.standardNameZh : mat.standardNameFr;
        reason = '精准命中标准物资官方唯一命名';
        return;
      }

      // 2. 检查别名词典
      for (const syn of mat.synonyms) {
        const synLower = syn.toLowerCase();
        if (q === synLower) {
          bestMat = mat;
          highestScore = 98;
          hitAlias = syn;
          reason = `精准命中已维护的工程别名词典条目: “${syn}”`;
          return;
        } else if (q.includes(synLower) || synLower.includes(q)) {
          const score = 92;
          if (score > highestScore) {
            bestMat = mat;
            highestScore = score;
            hitAlias = syn;
            reason = `基于词干模糊匹配命中工程别名: “${syn}”`;
          }
        }
      }

      // 3. 包含关系模糊匹配
      if (q.includes(zh) || zh.includes(q) || q.includes(fr) || fr.includes(q)) {
        const score = 85;
        if (score > highestScore) {
          bestMat = mat;
          highestScore = score;
          hitAlias = mat.standardNameZh;
          reason = '基于标准名分词子串匹配';
        }
      }
    });

    if (bestMat && highestScore >= 60) {
      setMatchResult({
        matchedMaterial: bestMat,
        score: highestScore,
        matchedAlias: hitAlias,
        reason,
      });
    } else {
      setMatchResult({
        matchedMaterial: null,
        score: 25,
        matchedAlias: null,
        reason: '当前词典库未收录该别名，建议在下方材料列表对应条目中点击“添加别名”',
      });
    }
  };

  React.useEffect(() => {
    handleRunMatchTest(testQuery);
  }, [testQuery, materials]);

  const filteredMaterials = materials.filter((m) => {
    const matchesQuery =
      m.standardNameZh.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.standardNameFr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.synonyms.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCat =
      selectedCategory === 'all' ? true : m.category === selectedCategory;

    return matchesQuery && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* 顶部标题与说明 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" />
                <span>中英法物资别名映射与语义知识库</span>
              </span>
              <span className="text-xs text-slate-500">
                支持造价工程师自主编辑 · 实时应用于 BOQ 自动算量与组价匹配
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              材料智能别名映射管理 (Material Alias Mapping Hub)
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              解决海外招标清单中法国标准（如 TGBT、Armoire divisionnaire、Inverseur de source）、地方土语或中文习惯叫法差异。您可自由编辑与补充各物资的别名，系统组价时将智能模糊关联，大幅提升命中率。
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-mono bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              当前维护标准物料: <strong>{materials.length}</strong> 项 / 别名累计:{' '}
              <strong className="text-blue-700">
                {materials.reduce((acc, m) => acc + m.synonyms.length, 0)}
              </strong>{' '}
              条
            </span>
          </div>
        </div>

        {/* 智能别名匹配实验室 (实时语义测试沙盒) */}
        <div className="mt-4 p-4 bg-slate-900 text-white rounded-xl shadow-md space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-200">
                智能别名映射实时实验室 (Semantic Match Sandbox)
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              输入任意招标描述，即刻检验当前别名映射字典匹配效果
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-6">
              <label className="text-[11px] text-slate-400 block mb-1">
                测试输入：招标清单物资名称或外文描述
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  placeholder="如: Coffret divisionnaire, ATS双电源转换箱, 接地铜网..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 font-mono focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="md:col-span-6 bg-slate-800/80 p-3 rounded-lg border border-slate-700 text-xs space-y-1">
              {matchResult?.matchedMaterial ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      命中标准库物资：{matchResult.matchedMaterial.standardNameZh}
                    </span>
                    <span className="font-mono font-bold text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                      匹配置信度: {matchResult.score}%
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 flex items-center justify-between">
                    <span>
                      标准代码: {matchResult.matchedMaterial.code} (
                      {matchResult.matchedMaterial.standardNameFr})
                    </span>
                    <span className="font-mono text-slate-300">
                      基准单价: {matchResult.matchedMaterial.basePrice}{' '}
                      {matchResult.matchedMaterial.currency}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 pt-0.5 border-t border-slate-700/60">
                    触发规则: {matchResult.reason}
                  </div>
                </>
              ) : (
                <div className="text-amber-400 text-[11px] py-1 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  <span>{matchResult?.reason}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 筛选与搜索条 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-150 mt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="搜索标准物资名称、法语名或已有关联别名..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            {['all', '电气设备', '电缆母线', '辅材管道'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-blue-700 text-white font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat === 'all' ? '全部工程分类' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 别名条目卡片列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {filteredMaterials.map((mat) => {
          const isEditing = editingMaterialId === mat.id;
          const isJustSaved = saveSuccessId === mat.id;

          return (
            <div
              key={mat.id}
              className={`bg-white rounded-xl border p-4.5 transition-all shadow-2xs space-y-3 ${
                isJustSaved
                  ? 'border-emerald-500 ring-1 ring-emerald-500'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* 卡片头部 */}
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded">
                      {mat.code}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {mat.category}
                    </span>
                    {isJustSaved && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Check className="w-3 h-3" /> 已保存
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {mat.standardNameZh}
                  </h3>
                  <p className="text-slate-500 text-[11px] font-sans">
                    {mat.standardNameFr} · {mat.spec}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!isEditing ? (
                    <button
                      onClick={() => handleStartEdit(mat)}
                      className="px-2.5 py-1 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>批量编辑别名</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSaveEdit(mat.id)}
                      className="px-3 py-1 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>保存</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 别名标签展示区 */}
              {!isEditing ? (
                <div className="space-y-2">
                  <div className="text-[11px] text-slate-500 font-semibold flex items-center justify-between">
                    <span>已收录工程同义别名 ({mat.synonyms.length} 个)：</span>
                    <span className="text-[10px] text-slate-400">点击 × 可直接删除</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 min-h-12 items-center">
                    {mat.synonyms.map((syn) => (
                      <span
                        key={syn}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium transition-colors border border-slate-200/60"
                      >
                        <span>{syn}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSingleAlias(mat.id, syn)}
                          className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="删除此别名"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}

                    {/* 单独追加新别名小输入框 */}
                    <div className="inline-flex items-center gap-1">
                      <input
                        type="text"
                        placeholder="+ 新增别名..."
                        value={editingMaterialId === `single-${mat.id}` ? newSingleAlias : ''}
                        onFocus={() => {
                          setEditingMaterialId(`single-${mat.id}`);
                        }}
                        onChange={(e) => setNewSingleAlias(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSingleAlias(mat.id);
                          }
                        }}
                        className="px-2 py-0.8 text-xs border border-dashed border-slate-300 rounded-md w-28 bg-white focus:w-36 focus:border-blue-500 transition-all"
                      />
                      {editingMaterialId === `single-${mat.id}` && newSingleAlias && (
                        <button
                          type="button"
                          onClick={() => handleAddSingleAlias(mat.id)}
                          className="px-2 py-0.8 bg-blue-700 text-white rounded text-xs font-semibold cursor-pointer"
                        >
                          添加
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* 正在编辑全部别名文本框 */
                <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <label className="text-[11px] font-semibold text-slate-700 block">
                    编辑别名列表 (用逗号分隔)：
                  </label>
                  <textarea
                    rows={3}
                    value={editingSynonymsInput}
                    onChange={(e) => setEditingSynonymsInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-900 focus:border-blue-500 font-mono leading-relaxed"
                  />
                  <div className="flex justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingMaterialId(null)}
                      className="px-2.5 py-1 border border-slate-300 text-slate-600 rounded text-xs cursor-pointer hover:bg-slate-100"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(mat.id)}
                      className="px-3 py-1 bg-emerald-700 text-white rounded text-xs font-semibold cursor-pointer shadow-2xs"
                    >
                      完成保存
                    </button>
                  </div>
                </div>
              )}

              {/* 底部价格与签单映射指示 */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  基准单价: {mat.basePrice.toLocaleString()} {mat.currency}
                </span>
                <span>最近签单: {mat.lastSignedProject}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
