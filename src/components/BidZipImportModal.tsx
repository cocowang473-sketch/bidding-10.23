import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, FolderArchive, UploadCloud, Loader2, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import {
  AivlApiError,
  createProject,
  ensureLoggedIn,
  setStoredProjectId,
  uploadZip,
} from '../utils/aivlApi';
import { AivlProject } from '../types/bidding';

interface BidZipImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: (project: AivlProject, zipFileName: string) => void;
  defaultProjectName?: string;
}

type Stage = 'idle' | 'creating' | 'uploading' | 'done' | 'error';

export const BidZipImportModal: React.FC<BidZipImportModalProps> = ({
  isOpen,
  onClose,
  onImported,
  defaultProjectName = '阿尔及利亚 240 床廷杜夫医院 · 机电分包',
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [projectName, setProjectName] = useState(defaultProjectName);
  const [stage, setStage] = useState<Stage>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const reset = useCallback(() => {
    setFile(null);
    setStage('idle');
    setProgress(0);
    setErrorMsg(null);
    setRetryCount(0);
  }, []);

  // 弹窗打开时重置状态
  useEffect(() => {
    if (isOpen) {
      reset();
      setProjectName(defaultProjectName);
    }
  }, [isOpen, defaultProjectName, reset]);

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (!/\.zip$/i.test(f.name)) {
      setErrorMsg('请选择 .zip 格式的招标文件包');
      return;
    }
    setErrorMsg(null);
    setFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setStage('creating');
    setErrorMsg(null);
    const maxRetries = 3;

    try {
      await ensureLoggedIn();
      const project = await createProject(projectName || file.name.replace(/\.zip$/i, ''));
      setStage('uploading');

      let uploadSuccess = false;
      let lastError: Error | null = null;

      // 上传重试逻辑
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            setRetryCount(attempt);
            setProgress(0);
          }

          await uploadZip(project.id, file, (loaded, total) => {
            setProgress(total > 0 ? Math.round((loaded / total) * 100) : 0);
          });

          uploadSuccess = true;
          break;
        } catch (err) {
          lastError = err as Error;
          if (attempt < maxRetries) {
            // 等待后重试 (指数退避)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      }

      if (!uploadSuccess) {
        throw lastError || new Error('上传失败');
      }

      setStoredProjectId(project.id);
      setStage('done');
      // 给用户看到完成态的一个短暂间歇后关闭
      setTimeout(() => {
        onImported(project, file.name);
        reset();
      }, 500);
    } catch (e) {
      const msg = e instanceof AivlApiError ? e.message : (e as Error).message || '未知错误';
      setErrorMsg(msg);
      setStage('error');
    }
  };

  if (!isOpen) return null;

  const sizeMB = file ? (file.size / (1024 * 1024)).toFixed(1) : '';
  const busy = stage === 'creating' || stage === 'uploading';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="h-14 px-5 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-2.5 text-slate-900">
            <FolderArchive className="w-5 h-5 text-blue-600" />
            <span className="font-semibold">导入机电分包招标文件 ZIP</span>
          </div>
          <button
            onClick={() => {
              if (!busy) {
                reset();
                onClose();
              }
            }}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 disabled:opacity-30"
            disabled={busy}
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* 拖拽区 */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`rounded-lg border-2 border-dashed transition-colors cursor-pointer px-5 py-8 text-center ${
              dragOver
                ? 'border-blue-400 bg-blue-50'
                : file
                ? 'border-emerald-300 bg-emerald-50/50'
                : 'border-slate-300 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/40'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
            {file ? (
              <div className="flex flex-col items-center gap-1.5">
                <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                <div className="text-sm font-medium text-slate-900">{file.name}</div>
                <div className="text-xs text-slate-500">{sizeMB} MB · 点击可更换</div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <UploadCloud className="w-8 h-8 text-slate-400" />
                <div className="text-sm font-medium text-slate-700">拖拽 ZIP 到此,或点击选择</div>
                <div className="text-[11px] text-slate-500">支持 .zip,建议 ≤ 500 MB</div>
              </div>
            )}
          </div>

          {/* 项目名 */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">项目名(可编辑)</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              disabled={busy}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-white"
              placeholder="输入项目/标段名称"
            />
          </div>

          {/* 进度 */}
          {(stage === 'creating' || stage === 'uploading' || stage === 'done') && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  {stage === 'creating'
                    ? '创建项目...'
                    : stage === 'uploading'
                    ? `上传并解析 ${progress}%${retryCount > 0 ? ` (重试 ${retryCount}/3)` : ''}`
                    : '完成'}
                </span>
                {stage === 'uploading' && (
                  <span className="font-mono text-slate-400">{progress}%</span>
                )}
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    stage === 'done' ? 'bg-emerald-500 w-full' : 'bg-blue-500'
                  }`}
                  style={{
                    width:
                      stage === 'done'
                        ? '100%'
                        : stage === 'uploading'
                        ? `${progress}%`
                        : stage === 'creating'
                        ? '15%'
                        : '0%',
                  }}
                />
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium">导入失败</div>
                <div className="mt-0.5">{errorMsg}</div>
                <div className="mt-1 text-rose-500/80">
                  请确认 aivl 后端已启动(http://127.0.0.1:8000)且 DASHSCOPE_API_KEY 已配置。
                </div>
              </div>
              <button
                onClick={() => {
                  setStage('idle');
                  setErrorMsg(null);
                  handleImport();
                }}
                className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-100 hover:bg-rose-200 text-rose-700 font-medium transition-colors"
                title="重新尝试"
              >
                <RefreshCw className="w-3 h-3" />
                重试
              </button>
            </div>
          )}
        </div>

        <div className="h-14 px-5 flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50">
          <button
            onClick={() => {
              if (!busy) {
                reset();
                onClose();
              }
            }}
            disabled={busy}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleImport}
            disabled={!file || busy || stage === 'done'}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {stage === 'done' ? '已完成' : busy ? '导入中...' : '开始导入'}
          </button>
        </div>
      </div>
    </div>
  );
};
