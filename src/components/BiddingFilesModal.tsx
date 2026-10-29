import React, { useState, useEffect } from 'react';
import { X, Folder, FileText, ChevronRight, ChevronDown, File, Loader2, Info } from 'lucide-react';
import { getProjectFiles, getFileContent, type BiddingFileNode } from '../utils/aivlApi';
import { MOCK_BIDDING_FILE_TREES, getMockFileContent } from '../data/mockBiddingFiles';

interface BiddingFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 后端 aivl 项目 ID。有值时走真实 API；为 undefined 时根据 mockTenderId 使用本地模拟数据。 */
  projectId?: number;
  /** 模拟数据标段 ID。当没有后端 projectId 时根据此 ID 从 MOCK_BIDDING_FILE_TREES 加载文件树。 */
  mockTenderId?: string;
  projectName: string;
}

export const BiddingFilesModal: React.FC<BiddingFilesModalProps> = ({
  isOpen,
  onClose,
  projectId,
  mockTenderId,
  projectName,
}) => {
  const isMockMode = !projectId && !!mockTenderId;
  const [fileTree, setFileTree] = useState<BiddingFileNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ path: string; name: string } | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [contentLoading, setContentLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) return;
    if (projectId) {
      loadFiles();
    } else if (mockTenderId) {
      loadMockFiles(mockTenderId);
    }
    // 切换标段时清空上一次的选择
    setSelectedFile(null);
    setFileContent('');
  }, [isOpen, projectId, mockTenderId]);

  const loadFiles = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const files = await getProjectFiles(projectId);
      setFileTree(files);
      // 默认展开第一层
      const firstLevel = files.filter(f => f.type === 'directory').map(f => f.path);
      setExpandedFolders(new Set(firstLevel));
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载文件列表失败');
      console.error('Failed to load files:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMockFiles = (tenderId: string) => {
    setLoading(true);
    setError(null);
    try {
      const files = MOCK_BIDDING_FILE_TREES[tenderId] ?? MOCK_BIDDING_FILE_TREES.__default__ ?? [];
      setFileTree(files);
      const firstLevel = files.filter((f) => f.type === 'directory').map((f) => f.path);
      setExpandedFolders(new Set(firstLevel));
    } finally {
      setLoading(false);
    }
  };

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const handleFileClick = async (path: string, name: string) => {
    setSelectedFile({ path, name });
    setContentLoading(true);
    try {
      if (projectId) {
        const content = await getFileContent(projectId, path);
        setFileContent(content);
      } else if (mockTenderId) {
        // 轻微延迟,模拟异步加载体验
        await new Promise((r) => setTimeout(r, 120));
        setFileContent(getMockFileContent(mockTenderId, path));
      }
    } catch (err) {
      setFileContent('无法加载文件内容：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setContentLoading(false);
    }
  };

  const renderTreeNode = (node: BiddingFileNode, level: number = 0): React.ReactNode => {
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = selectedFile?.path === node.path;

    if (node.type === 'directory') {
      return (
        <div key={node.path}>
          <button
            onClick={() => toggleFolder(node.path)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors rounded-lg group"
            style={{ paddingLeft: `${level * 16 + 12}px` }}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-500" />
            )}
            <Folder className="w-4 h-4 text-blue-500" />
            <span className="font-medium group-hover:text-blue-600">{node.name}</span>
            {node.children && (
              <span className="ml-auto text-xs text-slate-400">
                {node.children.length}
              </span>
            )}
          </button>
          {isExpanded && node.children && (
            <div>
              {node.children.map((child) => renderTreeNode(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        key={node.path}
        onClick={() => handleFileClick(node.path, node.name)}
        className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors rounded-lg ${
          isSelected
            ? 'bg-blue-50 text-blue-700 font-medium'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
        style={{ paddingLeft: `${level * 16 + 36}px` }}
      >
        <FileText className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
        <span className="truncate">{node.name}</span>
        {node.size && (
          <span className="ml-auto text-xs text-slate-400">{formatFileSize(node.size)}</span>
        )}
      </button>
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-7xl h-[85vh] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* 弹窗头部 */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Folder className="w-5 h-5 text-blue-600" />
              招标文件详情
            </h2>
            <p className="text-sm text-slate-600 mt-1">{projectName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isMockMode && (
          <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 leading-relaxed">
              此标段为演示数据，未关联后端 aivl 项目。以下文件树与内容均为模拟示例，仅用于预览界面效果。
              若需查看真实招标原件，请使用「新建标段 (上传ZIP/立项)」上传招标包。
            </p>
          </div>
        )}

        {/* 内容区域 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧：文件树 */}
          <div className="w-80 border-r border-slate-200 bg-slate-50/50 overflow-y-auto">
            <div className="p-3">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <p className="text-sm">加载文件列表中...</p>
                </div>
              ) : error ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                  <button
                    onClick={loadFiles}
                    className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    重试
                  </button>
                </div>
              ) : fileTree.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <File className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">暂无文件</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {fileTree.map((node) => renderTreeNode(node))}
                </div>
              )}
            </div>
          </div>

          {/* 右侧：文件内容预览 */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {selectedFile ? (
              <>
                <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
                  <p className="text-sm font-medium text-slate-900">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedFile.path}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-white">
                  {contentLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                      <Loader2 className="w-8 h-8 animate-spin mb-2" />
                      <p className="text-sm">加载文件内容中...</p>
                    </div>
                  ) : (
                    <pre className="text-sm text-slate-700 font-mono whitespace-pre-wrap break-words">
                      {fileContent}
                    </pre>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <FileText className="w-16 h-16 mb-3 opacity-20" />
                <p className="text-sm">请从左侧选择文件查看内容</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
