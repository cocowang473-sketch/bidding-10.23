import React, { useState, useMemo } from 'react';
import { TenderProject, TenderStage } from '../types/tenderProject';
import { BiddingFilesModal } from './BiddingFilesModal';
import {
  FolderArchive,
  Plus,
  Search,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  Check,
  AlertCircle,
  FileText,
  Calculator,
  ArrowRight,
  Globe2,
  Sparkles,
  Layers,
  Trash2,
  ExternalLink,
  FolderOpen,
} from 'lucide-react';

interface TenderProjectsHubViewProps {
  tenders: TenderProject[];
  activeTenderId: string;
  onSelectTender: (tenderId: string, targetStep?: TenderStage) => void;
  onOpenCreateModal: () => void;
  onDeleteTender: (tenderId: string) => void;
}

export const TenderProjectsHubView: React.FC<TenderProjectsHubViewProps> = ({
  tenders,
  activeTenderId,
  onSelectTender,
  onOpenCreateModal,
  onDeleteTender,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'ready' | 'draft'>('all');
  const [filesModalOpen, setFilesModalOpen] = useState(false);
  const [selectedTenderForFiles, setSelectedTenderForFiles] = useState<TenderProject | null>(null);

  const handleOpenFilesModal = (tender: TenderProject, e: React.MouseEvent) => {
    e.stopPropagation();
    // 无论是否关联后端项目都允许打开:
    //   - 有 aivlProjectId: 走真实后端 API
    //   - 无 aivlProjectId: 根据 tender.id 回退到 MOCK_BIDDING_FILE_TREES 中的模拟文件树
    setSelectedTenderForFiles(tender);
    setFilesModalOpen(true);
  };

  const handleCloseFilesModal = () => {
    setFilesModalOpen(false);
    setSelectedTenderForFiles(null);
  };

  const filteredTenders = useMemo(() => {
    return tenders.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          (t.nameFr && t.nameFr.toLowerCase().includes(q)) ||
          t.code.toLowerCase().includes(q) ||
          t.client.toLowerCase().includes(q) ||
          t.country.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [tenders, statusFilter, searchQuery]);

  return (
    <div className="space-y-5">
      {/* 顶部总览看板与建标引导栏 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-150">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-blue-50 text-blue-700">
                <FolderArchive className="w-5 h-5" />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                海外投标标段分类管理中心
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              统一管理投标项目全生命周期，从招标文件解析、投标须知配置到工程量清单组价
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={onOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>新建标段 (上传ZIP/立项)</span>
            </button>
          </div>
        </div>

        {/* 核心指标微看板 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-xs text-slate-500 block">在手海外标段总数</span>
            <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
              {tenders.length} <span className="text-xs font-normal text-slate-500">个工程标</span>
            </div>
          </div>

          <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200">
            <span className="text-xs text-emerald-800 block">正在组价测算标段</span>
            <div className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
              {tenders.filter((t) => t.boqItems.length > 0).length} <span className="text-xs font-normal text-slate-500">个</span>
            </div>
          </div>

          <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200">
            <span className="text-xs text-blue-800 block">已锁定标书变量总计</span>
            <div className="text-xl font-bold font-mono text-blue-700 mt-0.5">
              {tenders.reduce((sum, t) => sum + Object.keys(t.variableValues).length, 0)} <span className="text-xs font-normal text-slate-500">项</span>
            </div>
          </div>

          <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200">
            <span className="text-xs text-amber-800 block">近 30 天内截标标段</span>
            <div className="text-xl font-bold font-mono text-amber-800 mt-0.5">
              {tenders.filter((t) => t.status !== 'submitted').length} <span className="text-xs font-normal text-slate-500">个在推</span>
            </div>
          </div>
        </div>
      </div>

      {/* 搜索与状态过滤器 */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索标段名称、法文名称、招标编号、国别、业主..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-full cursor-pointer transition-colors font-medium ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            全部标段 ({tenders.length})
          </button>
          <button
            onClick={() => setStatusFilter('in_progress')}
            className={`px-3 py-1 rounded-full cursor-pointer transition-colors font-medium ${
              statusFilter === 'in_progress'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            组价测算中 ({tenders.filter((t) => t.status === 'in_progress').length})
          </button>
          <button
            onClick={() => setStatusFilter('ready')}
            className={`px-3 py-1 rounded-full cursor-pointer transition-colors font-medium ${
              statusFilter === 'ready'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            变量已锁定 ({tenders.filter((t) => t.status === 'ready').length})
          </button>
          <button
            onClick={() => setStatusFilter('draft')}
            className={`px-3 py-1 rounded-full cursor-pointer transition-colors font-medium ${
              statusFilter === 'draft'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            待上传原件 ({tenders.filter((t) => t.status === 'draft').length})
          </button>
        </div>
      </div>

      {/* 标段卡片网格清单 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredTenders.map((tender) => {
          const isActive = tender.id === activeTenderId;
          const hasBoq = tender.boqItems.length > 0;
          const varCount = Object.keys(tender.variableValues).length;
          const attCount = tender.attachments.length;

          return (
            <div
              key={tender.id}
              className={`bg-white rounded-xl border transition-all flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-sm ${
                isActive
                  ? 'border-blue-600 ring-2 ring-blue-600/20 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* 卡片头部 */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[11px]">
                        {tender.code}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 font-medium text-[10px]">
                        {tender.country}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium text-[10px]">
                        结算币种: {tender.currency}
                      </span>
                      {isActive && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white font-semibold text-[10px] flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" />
                          当前作业标段
                        </span>
                      )}
                    </div>

                    <button
                      onClick={(e) => handleOpenFilesModal(tender, e)}
                      className="text-sm sm:text-base font-bold text-slate-900 mt-2 hover:text-blue-600 cursor-pointer line-clamp-1 text-left flex items-center gap-2 group transition-all"
                      title="点击查看招标文件详情"
                    >
                      {tender.name}
                      <FolderOpen className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                    </button>

                    {tender.nameFr && (
                      <p className="text-xs text-slate-500 italic truncate mt-0.5">
                        {tender.nameFr}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                      <span>业主: <strong className="text-slate-700">{tender.client}</strong></span>
                      <span className="text-slate-300">|</span>
                      <span className="flex items-center gap-1 text-amber-800 font-medium">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        截标: {tender.deadline}
                      </span>
                    </div>
                  </div>

                  {tenders.length > 1 && (
                    <button
                      onClick={() => {
                        if (confirm(`确定要删除标段「${tender.name}」吗？`)) {
                          onDeleteTender(tender.id);
                        }
                      }}
                      className="p-1.5 text-slate-300 hover:text-red-600 rounded cursor-pointer transition-colors"
                      title="删除此标段"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* 标段作业流程模块 */}
              <div className="p-4 bg-white space-y-3">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  作业流程：
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  {/* 板块 1: 招标公告 */}
                  <div
                    onClick={() => onSelectTender(tender.id, 'notice')}
                    className="p-2.5 rounded-lg border border-slate-200 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/50 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-semibold text-slate-700">1. 招标公告</span>
                      <FolderArchive className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {attCount > 0 ? (
                        <span className="text-emerald-700 font-medium">已归档 {attCount} 份原件</span>
                      ) : (
                        <span className="text-amber-700">待上传 ZIP</span>
                      )}
                    </div>
                  </div>

                  {/* 板块 2: 投标须知与组件 */}
                  <div
                    onClick={() => onSelectTender(tender.id, 'instructions')}
                    className="p-2.5 rounded-lg border border-slate-200 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/50 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-semibold text-slate-700">2. 投标须知</span>
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="text-[11px] text-slate-500">
                      <span className="text-blue-700 font-medium">已锁定 {varCount} 项变量</span>
                    </div>
                  </div>

                  {/* 板块 3: 清单组价 */}
                  <div
                    onClick={() => onSelectTender(tender.id, 'pricing')}
                    className="p-2.5 rounded-lg border border-slate-200 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/50 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-semibold text-slate-700">3. 清单组价</span>
                      <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {hasBoq ? (
                        <span className="text-emerald-700 font-medium">{tender.boqItems.length} 项已组价</span>
                      ) : (
                        <span className="text-slate-400">待导入清单</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 卡片底部操作栏 */}
              <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  更新于: {tender.updatedAt}
                </span>

                <button
                  onClick={() => onSelectTender(tender.id)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                >
                  <span>进入此标工作台</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 招标文件详情弹窗 (支持真实后端项目 + 模拟数据回退) */}
      {selectedTenderForFiles && (
        <BiddingFilesModal
          isOpen={filesModalOpen}
          onClose={handleCloseFilesModal}
          projectId={selectedTenderForFiles.aivlProjectId}
          mockTenderId={selectedTenderForFiles.id}
          projectName={selectedTenderForFiles.name}
        />
      )}
    </div>
  );
};
