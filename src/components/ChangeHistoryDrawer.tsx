import React, { useState, useMemo } from 'react';
import { ChangeHistoryRecord, HistoryActionType } from '../types/history';
import {
  X,
  History,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  User,
  ArrowRight,
  FileSpreadsheet,
  Download,
  Trash2,
  ShieldCheck,
  Tag,
  Zap,
  Calculator,
  FileText,
  Building2,
  Layers,
  FileSearch,
  ClipboardList,
} from 'lucide-react';

interface ChangeHistoryDrawerProps {
  isOpen: boolean;
  historyList: ChangeHistoryRecord[];
  onClose: () => void;
  onClearHistory?: () => void;
}

export const ChangeHistoryDrawer: React.FC<ChangeHistoryDrawerProps> = ({
  isOpen,
  historyList,
  onClose,
  onClearHistory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<HistoryActionType | 'all'>('all');

  // 过滤后的变更历史
  const filteredList = useMemo(() => {
    return historyList.filter((item) => {
      const matchType = selectedType === 'all' || item.actionType === selectedType;
      const matchQuery =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.operator.toLowerCase().includes(searchQuery.toLowerCase());
      return matchType && matchQuery;
    });
  }, [historyList, selectedType, searchQuery]);

  if (!isOpen) return null;

  // 导出 CSV 审计日志
  const handleExportCsv = () => {
    const headers = ['变更ID', '分类', '操作标题', '影响对象', '操作人', '变更时间', '详情说明', '变更前', '变更后'];
    const rows = filteredList.map((item) => [
      item.id,
      item.actionType,
      item.title,
      item.target,
      item.operator,
      item.timestamp,
      `"${item.description.replace(/"/g, '""')}"`,
      `"${item.details?.before || ''}"`,
      `"${item.details?.after || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `标段操作审计日志_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getActionBadge = (type: HistoryActionType) => {
    switch (type) {
      case 'pricing':
        return {
          label: '组价调价',
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: <Calculator className="w-3.5 h-3.5 text-blue-600" />,
        };
      case 'rfq':
        return {
          label: '询价决策',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: <Zap className="w-3.5 h-3.5 text-emerald-600" />,
        };
      case 'variable':
        return {
          label: '条款变量',
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: <FileText className="w-3.5 h-3.5 text-amber-600" />,
        };
      case 'quota':
        return {
          label: '定额工日',
          bg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
          icon: <Layers className="w-3.5 h-3.5 text-indigo-600" />,
        };
      case 'import':
        return {
          label: '签单导入',
          bg: 'bg-purple-50 text-purple-800 border-purple-200',
          icon: <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600" />,
        };
      case 'notice':
        return {
          label: '公告解读',
          bg: 'bg-sky-50 text-sky-800 border-sky-200',
          icon: <FileSearch className="w-3.5 h-3.5 text-sky-600" />,
        };
      case 'instructions':
        return {
          label: '须知编制',
          bg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
          icon: <ClipboardList className="w-3.5 h-3.5 text-indigo-600" />,
        };
      default:
        return {
          label: '系统参数',
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />,
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      {/* 遮罩背景点击关闭 */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* 侧滑抽屉主体 */}
      <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col z-10 border-l border-slate-200 animate-in slide-in-from-right duration-250">
        {/* 抽屉头部 */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  实时自动保存运行中
                </span>
                <span className="text-xs text-slate-300">共 {historyList.length} 条日志</span>
              </div>
              <h2 className="text-base font-bold text-white mt-1">
                标段操作审计与变更历史
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="关闭抽屉"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 顶部搜索与类型快速过滤 */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0 text-xs">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索变更描述、清单序号、操作人..."
              className="w-full pl-9 pr-8 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 分类过滤芯片 */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedType('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                selectedType === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              全部 ({historyList.length})
            </button>
            <button
              onClick={() => setSelectedType('pricing')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                selectedType === 'pricing'
                  ? 'bg-blue-700 text-white shadow-2xs'
                  : 'bg-white text-blue-800 hover:bg-blue-50 border border-blue-200'
              }`}
            >
              组价调价
            </button>
            <button
              onClick={() => setSelectedType('rfq')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                selectedType === 'rfq'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
              }`}
            >
              询价决策
            </button>
            <button
              onClick={() => setSelectedType('variable')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                selectedType === 'variable'
                  ? 'bg-amber-700 text-white shadow-2xs'
                  : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200'
              }`}
            >
              条款变量
            </button>
            <button
              onClick={() => setSelectedType('quota')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                selectedType === 'quota'
                  ? 'bg-indigo-700 text-white shadow-2xs'
                  : 'bg-white text-indigo-800 hover:bg-indigo-50 border border-indigo-200'
              }`}
            >
              定额工日
            </button>
            <button
              onClick={() => setSelectedType('import')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                selectedType === 'import'
                  ? 'bg-purple-700 text-white shadow-2xs'
                  : 'bg-white text-purple-800 hover:bg-purple-50 border border-purple-200'
              }`}
            >
              签单导入
            </button>
            <button
              onClick={() => setSelectedType('notice')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                selectedType === 'notice'
                  ? 'bg-sky-700 text-white shadow-2xs'
                  : 'bg-white text-sky-800 hover:bg-sky-50 border border-sky-200'
              }`}
            >
              公告解读
            </button>
            <button
              onClick={() => setSelectedType('instructions')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                selectedType === 'instructions'
                  ? 'bg-indigo-700 text-white shadow-2xs'
                  : 'bg-white text-indigo-800 hover:bg-indigo-50 border border-indigo-200'
              }`}
            >
              须知编制
            </button>
          </div>
        </div>

        {/* 审计日志时间线列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
          {filteredList.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <History className="w-8 h-8 mx-auto mb-2 text-slate-300 opacity-60" />
              <p className="text-sm font-medium text-slate-500">未找到符合条件的变更历史</p>
              <p className="text-xs text-slate-400 mt-1">尝试更换关键词或清除筛选条件</p>
            </div>
          ) : (
            filteredList.map((record, index) => {
              const badge = getActionBadge(record.actionType);
              return (
                <div
                  key={record.id}
                  className="bg-white rounded-xl border border-slate-200 p-3.5 hover:border-slate-300 hover:shadow-xs transition-all relative group"
                >
                  {/* 第一行：类别徽章 + 模块对象 + 时间 */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${badge.bg}`}
                      >
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>
                      <span className="text-slate-700 font-mono text-[11px] font-medium bg-slate-100 px-1.5 py-0.2 rounded truncate max-w-[200px]">
                        {record.target}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono shrink-0">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span className="font-semibold text-slate-600">{record.timeAgo}</span>
                    </div>
                  </div>

                  {/* 标题 */}
                  <h4 className="font-bold text-slate-900 text-xs mb-1">
                    {record.title}
                  </h4>

                  {/* 描述 */}
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    {record.description}
                  </p>

                  {/* 前后变更对比盒 */}
                  {record.details && (record.details.before || record.details.after) && (
                    <div className="mt-2.5 p-2 rounded-lg bg-slate-50 border border-slate-150 flex items-center justify-between gap-2 text-[11px] font-mono">
                      <div className="text-slate-500 truncate">
                        <span className="text-slate-400 text-[10px] block font-sans">变更前:</span>
                        <span className="text-slate-600">{record.details.before || '未设定'}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <div className="text-right truncate">
                        <span className="text-slate-400 text-[10px] block font-sans">变更后:</span>
                        <span className="text-emerald-700 font-bold">{record.details.after || '已更新'}</span>
                      </div>
                    </div>
                  )}

                  {/* 底部信息：操作人 & 绝对时间戳 */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1 text-slate-500 font-medium">
                      <User className="w-3 h-3 text-slate-400" />
                      {record.operator}
                    </span>
                    <span className="font-mono">{record.timestamp}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 抽屉底部操作栏 */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">不可篡改审计流 · 支持全案追溯</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              disabled={filteredList.length === 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors cursor-pointer disabled:opacity-50"
              title="导出当前筛选的审计记录为 CSV 文件"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>导出日志</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 font-semibold cursor-pointer"
            >
              完成
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
