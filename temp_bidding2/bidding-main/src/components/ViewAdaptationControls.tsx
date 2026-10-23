import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
  RotateCcw,
  Monitor,
  Check,
  ChevronDown,
  Expand,
  Sparkles,
} from 'lucide-react';

export type LayoutWidthMode = 'fluid' | 'wide' | 'standard';
export type TableDensityMode = 'comfortable' | 'standard' | 'compact';

interface ViewAdaptationControlsProps {
  layoutWidth: LayoutWidthMode;
  onLayoutWidthChange: (mode: LayoutWidthMode) => void;
  zoomScale: number;
  onZoomScaleChange: (scale: number) => void;
  density: TableDensityMode;
  onDensityChange: (density: TableDensityMode) => void;
  variant?: 'popover' | 'inline';
}

const ZOOM_PRESETS = [85, 90, 100, 110, 120, 130];

export const ViewAdaptationControls: React.FC<ViewAdaptationControlsProps> = ({
  layoutWidth,
  onLayoutWidthChange,
  zoomScale,
  onZoomScaleChange,
  density,
  onDensityChange,
  variant = 'popover',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleZoomIn = () => {
    const next = ZOOM_PRESETS.find((z) => z > zoomScale) || Math.min(zoomScale + 10, 150);
    onZoomScaleChange(next);
  };

  const handleZoomOut = () => {
    const reversed = [...ZOOM_PRESETS].reverse();
    const prev = reversed.find((z) => z < zoomScale) || Math.max(zoomScale - 10, 75);
    onZoomScaleChange(prev);
  };

  const handleReset = () => {
    onZoomScaleChange(100);
    onLayoutWidthChange('fluid');
    onDensityChange('standard');
  };

  const isCustomized = zoomScale !== 100 || layoutWidth !== 'fluid' || density !== 'standard';

  // 1. 行内快捷工具栏（嵌入在组价台工具栏内部）
  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-lg border border-slate-200 text-xs text-slate-700">
        <span className="text-[11px] font-semibold text-slate-500 pl-1.5 flex items-center gap-1">
          <Monitor className="w-3.5 h-3.5 text-blue-700" />
          <span className="hidden sm:inline">自适应:</span>
        </span>

        {/* 宽度模式切换 */}
        <div className="flex items-center bg-white rounded-md shadow-2xs border border-slate-200 p-0.5">
          <button
            onClick={() => onLayoutWidthChange('fluid')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              layoutWidth === 'fluid'
                ? 'bg-blue-700 text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="全屏自适应流式宽度：自动占满整个工作区，不留两侧大空白"
          >
            全宽自适应
          </button>
          <button
            onClick={() => onLayoutWidthChange('wide')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              layoutWidth === 'wide'
                ? 'bg-blue-700 text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="宽屏模式：最大 1720px"
          >
            宽屏
          </button>
          <button
            onClick={() => onLayoutWidthChange('standard')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              layoutWidth === 'standard'
                ? 'bg-blue-700 text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="标准居中：1280px"
          >
            标准
          </button>
        </div>

        {/* 缩放步进器 */}
        <div className="flex items-center bg-white rounded-md shadow-2xs border border-slate-200 p-0.5">
          <button
            onClick={handleZoomOut}
            disabled={zoomScale <= 80}
            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded disabled:opacity-40 cursor-pointer"
            title="缩小画面 (快捷键 Ctrl -)"
          >
            <ZoomOut className="w-3 h-3" />
          </button>

          <span
            onClick={() => onZoomScaleChange(zoomScale === 100 ? 115 : 100)}
            className="px-1.5 font-mono font-bold text-[11px] text-blue-900 cursor-pointer hover:underline"
            title="点击切换 100% / 115%"
          >
            {zoomScale}%
          </span>

          <button
            onClick={handleZoomIn}
            disabled={zoomScale >= 140}
            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded disabled:opacity-40 cursor-pointer"
            title="放大画面，解决字号过小问题"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
        </div>

        {/* 密度快捷选择 */}
        <div className="hidden lg:flex items-center bg-white rounded-md shadow-2xs border border-slate-200 p-0.5">
          <button
            onClick={() => onDensityChange('comfortable')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              density === 'comfortable'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="舒适大字模式：增大单元格间距和字号，阅读更轻松"
          >
            舒适大字
          </button>
          <button
            onClick={() => onDensityChange('standard')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              density === 'standard'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="标准平衡密度"
          >
            标准
          </button>
          <button
            onClick={() => onDensityChange('compact')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              density === 'compact'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="紧凑高密：一屏展示更多行"
          >
            紧凑
          </button>
        </div>

        {/* 重置按钮 */}
        {isCustomized && (
          <button
            onClick={handleReset}
            className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
            title="恢复默认自适应设置 (100% 全宽 标准)"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  // 2. 弹窗下拉按钮样式（嵌入在顶部导航栏 Header 动作区）
  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer shadow-2xs ${
          isCustomized
            ? 'bg-blue-50 text-blue-800 border-blue-300'
            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
        }`}
        title="调节主页面宽度自适应、缩放比例与字号密度"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-blue-700" />
        <span className="hidden sm:inline">自适应调节</span>
        <span className="font-mono text-[11px] px-1 py-0.2 rounded bg-slate-100 font-bold text-slate-800">
          {zoomScale}%
        </span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 text-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between border-b border-slate-150 pb-2.5">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-blue-700" />
              <h4 className="text-xs font-bold text-slate-900">界面自适应与显示调节</h4>
            </div>
            {isCustomized && (
              <button
                onClick={handleReset}
                className="text-[11px] text-blue-700 hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <RotateCcw className="w-3 h-3" />
                重置默认
              </button>
            )}
          </div>

          {/* 1. 缩放比例调节 */}
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-slate-700">页面显示比例 (Zoom)</span>
              <span className="font-mono font-bold text-blue-700 text-sm">{zoomScale}%</span>
            </div>

            {/* 缩放档位快捷点击 */}
            <div className="grid grid-cols-6 gap-1 bg-slate-100 p-1 rounded-lg">
              {ZOOM_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => onZoomScaleChange(preset)}
                  className={`py-1 rounded text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                    zoomScale === preset
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
                >
                  {preset}%
                </button>
              ))}
            </div>

            {/* 步进按钮 */}
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleZoomOut}
                disabled={zoomScale <= 80}
                className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 text-xs font-medium border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5 text-slate-600" />
                缩小 (-10%)
              </button>
              <button
                onClick={handleZoomIn}
                disabled={zoomScale >= 140}
                className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 text-xs font-medium border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5 text-slate-600" />
                放大 (+10%)
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              若缩放后表格或字号偏小，建议调节至 <strong>110% ~ 125%</strong>。
            </p>
          </div>

          {/* 2. 容器宽度自适应 */}
          <div className="border-t border-slate-150 pt-3">
            <span className="text-xs font-semibold text-slate-700 block mb-2">主工作区宽度模式</span>
            <div className="space-y-1.5">
              <button
                onClick={() => onLayoutWidthChange('fluid')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs text-left cursor-pointer transition-all ${
                  layoutWidth === 'fluid'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-medium ring-1 ring-blue-600/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div>
                  <div className="font-semibold flex items-center gap-1.5">
                    <span>全屏流式自适应 (推荐)</span>
                    <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.2 rounded">默认</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    自动充满可用宽度，不留两侧大黑边空白
                  </div>
                </div>
                {layoutWidth === 'fluid' && <Check className="w-4 h-4 text-blue-700" />}
              </button>

              <button
                onClick={() => onLayoutWidthChange('wide')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs text-left cursor-pointer transition-all ${
                  layoutWidth === 'wide'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-medium ring-1 ring-blue-600/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div>
                  <div className="font-semibold">超宽屏模式 (1720px)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">适合 2K/4K 专业造价显示器</div>
                </div>
                {layoutWidth === 'wide' && <Check className="w-4 h-4 text-blue-700" />}
              </button>

              <button
                onClick={() => onLayoutWidthChange('standard')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs text-left cursor-pointer transition-all ${
                  layoutWidth === 'standard'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-medium ring-1 ring-blue-600/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div>
                  <div className="font-semibold">标准固定宽度 (1280px)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">经典居中卡片布局</div>
                </div>
                {layoutWidth === 'standard' && <Check className="w-4 h-4 text-blue-700" />}
              </button>
            </div>
          </div>

          {/* 3. 表格字号与排版密度 */}
          <div className="border-t border-slate-150 pt-3">
            <span className="text-xs font-semibold text-slate-700 block mb-2">数据表格密度与字号</span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => onDensityChange('comfortable')}
                className={`p-2 rounded-lg border text-center cursor-pointer transition-all ${
                  density === 'comfortable'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-xs">舒适大字</div>
                <div className="text-[10px] text-slate-500 mt-0.5">字大行宽</div>
              </button>
              <button
                onClick={() => onDensityChange('standard')}
                className={`p-2 rounded-lg border text-center cursor-pointer transition-all ${
                  density === 'standard'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-xs">标准平衡</div>
                <div className="text-[10px] text-slate-500 mt-0.5">适中常规</div>
              </button>
              <button
                onClick={() => onDensityChange('compact')}
                className={`p-2 rounded-lg border text-center cursor-pointer transition-all ${
                  density === 'compact'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-xs">紧凑高密</div>
                <div className="text-[10px] text-slate-500 mt-0.5">容纳多行</div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
