import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Users,
  Calendar,
  Clock,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Paperclip,
  RotateCcw,
  RefreshCw,
  FileText,
  FileCheck,
  ShieldCheck,
  Eye,
  Download,
  Building2,
  ArrowRight,
  Sparkles,
  Info,
  Check,
  X,
  FileSpreadsheet,
  Globe2,
} from 'lucide-react';
import {
  LaborPlanData,
  LaborCalculationParameters,
  LaborTradeItem,
  MobilizationStageItem,
  LaborProofDocument,
} from '../types/tenderInstructionAttachments';

interface Attachment05LaborWorkbenchProps {
  laborData: LaborPlanData;
  onUpdateLaborData: (data: LaborPlanData) => void;
  onNavigateToSchedule07?: () => void;
}

export const Attachment05LaborWorkbench: React.FC<Attachment05LaborWorkbenchProps> = ({
  laborData,
  onUpdateLaborData,
  onNavigateToSchedule07,
}) => {
  // 当前子模块标签页
  const [activeTab, setActiveTab] = useState<'chart' | 'params' | 'matrix' | 'chinese' | 'mobilization'>('chart');

  // 劳动力曲线时间颗粒度：月度 (18个月) vs 周度 (78周)
  const [curveTimeframe, setCurveTimeframe] = useState<'monthly' | 'weekly'>('monthly');

  // 曲线图层筛选：全部 / 仅总人数 / 仅中国工人 / 仅当地工人
  const [curveFilter, setCurveFilter] = useState<'all' | 'total_only' | 'chinese_only' | 'local_only'>('all');

  // 正在查看/上传证明文件的模态框状态
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [activeProofDoc, setActiveProofDoc] = useState<LaborProofDocument | null>(null);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

  // 本地可编辑的测算参数表单状态
  const [editableParams, setEditableParams] = useState<LaborCalculationParameters>({
    ...laborData.calculationParams,
  });

  // =========================================================================
  // 1. 核心测算法：根据输入的专业工程量、工期压缩系数、班次与劳动生产率重新测算曲线
  // =========================================================================
  const handleRecalculateLaborPlan = (customParams?: Partial<LaborCalculationParameters>) => {
    const params = {
      ...editableParams,
      ...(customParams || {}),
    };

    const compRatio = params.compressionRatio || 1.0;
    const prodIndex = params.productivityIndex || 1.05;
    const shiftFactor = (params.shiftHours / 8) * (params.shiftsCount || 1.0);

    // 基础 18 个月人数基线
    const baselineMonthly = [45, 58, 72, 115, 138, 155, 165, 160, 148, 132, 120, 105, 88, 70, 52, 40, 28, 18];

    // 工期越压缩 (compRatio < 1.0)，单位时间内投入峰值与均值越高；班次与时长同理
    const newMonthly = baselineMonthly.map((count) => {
      const scaled = Math.round((count * (1 / compRatio) * (1 / (prodIndex * 0.96))) * shiftFactor);
      return Math.min(scaled, params.peakLimit);
    });

    const newPeak = Math.max(...newMonthly);
    const newAvg = Math.round(newMonthly.reduce((a, b) => a + b, 0) / newMonthly.length);

    // 重新生成 78 周走势
    const newWeekly = Array.from({ length: 78 }, (_, i) => {
      const monthIdx = Math.min(Math.floor(i / (78 / 18)), 17);
      const baseMonthVal = newMonthly[monthIdx];
      const cycleJitter = Math.sin(i * 0.45) * 3;
      return Math.max(8, Math.min(params.peakLimit, Math.round(baseMonthVal + cycleJitter)));
    });

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const updatedData: LaborPlanData = {
      ...laborData,
      calculationParams: params,
      monthlyTotalWorkers: newMonthly,
      weeklyTotalWorkers: newWeekly,
      peakWorkersCount: newPeak,
      avgWorkersCount: newAvg,
      scheduleNeedsRecalculation: false,
      linkedWithSchedule07: true,
      lastRecalculatedTime: `今天 ${timeStr} (已按附件07最新节点对齐)`,
    };

    setEditableParams(params);
    onUpdateLaborData(updatedData);

    setUploadFeedback('劳动力配置与曲线已成功按最新参数与附件07工期完成重新测算！');
    setTimeout(() => setUploadFeedback(null), 3000);
  };

  // 恢复出厂基准测算参数
  const handleResetParameters = () => {
    const baseParams: LaborCalculationParameters = {
      totalEngineeringWorkdays: 21550,
      productivityIndex: 1.05,
      shiftHours: 8,
      shiftsCount: 1.0,
      chineseRatio: 0.4,
      localRatio: 0.6,
      peakLimit: 180,
      compressionRatio: 1.0,
      entryDate: '2025-04-01',
      exitDate: '2026-09-30',
    };
    handleRecalculateLaborPlan(baseParams);
  };

  // 模拟附件07进度时间轴发生变更（用于测试联动提醒）
  const handleSimulateSchedule07Change = () => {
    const updatedParams = {
      ...editableParams,
      compressionRatio: 0.9, // 进度前移紧缩 10%
    };
    setEditableParams(updatedParams);
    onUpdateLaborData({
      ...laborData,
      calculationParams: updatedParams,
      scheduleNeedsRecalculation: true,
      linkedWithSchedule07: false,
    });
  };

  // =========================================================================
  // 2. 人工调整矩阵：就地修改各阶段工种人数
  // =========================================================================
  const handleTradeCountChange = (
    tradeId: string,
    field: 'stage1Count' | 'stage2Count' | 'stage3Count' | 'stage4Count' | 'stage5Count',
    valStr: string
  ) => {
    const num = parseInt(valStr, 10);
    const valid = isNaN(num) || num < 0 ? 0 : num;

    const updatedTrades = laborData.trades.map((t) => {
      if (t.id !== tradeId) return t;
      const updated = { ...t, [field]: valid };
      const counts = [
        updated.stage1Count,
        updated.stage2Count,
        updated.stage3Count,
        updated.stage4Count,
        updated.stage5Count,
      ];
      updated.peakCount = Math.max(...counts);
      updated.avgCount = Math.round(counts.reduce((a, b) => a + b, 0) / counts.length);
      return updated;
    });

    // 重新联动计算月度走势曲线各关键节点
    const s1Total = updatedTrades.reduce((acc, t) => acc + t.stage1Count, 0);
    const s2Total = updatedTrades.reduce((acc, t) => acc + t.stage2Count, 0);
    const s3Total = updatedTrades.reduce((acc, t) => acc + t.stage3Count, 0);
    const s4Total = updatedTrades.reduce((acc, t) => acc + t.stage4Count, 0);
    const s5Total = updatedTrades.reduce((acc, t) => acc + t.stage5Count, 0);

    const newMonthly = [...laborData.monthlyTotalWorkers];
    newMonthly[0] = Math.round(s1Total * 0.65);
    newMonthly[1] = Math.round(s1Total * 0.85);
    newMonthly[2] = s1Total;
    newMonthly[3] = Math.round(s2Total * 0.75);
    newMonthly[4] = Math.round(s2Total * 0.9);
    newMonthly[5] = s2Total;
    newMonthly[6] = s3Total; // 峰值月
    newMonthly[7] = Math.round(s3Total * 0.96);
    newMonthly[8] = Math.round(s3Total * 0.9);
    newMonthly[9] = Math.round(s3Total * 0.8);
    newMonthly[10] = s4Total;
    newMonthly[11] = Math.round(s4Total * 0.88);
    newMonthly[12] = Math.round(s4Total * 0.75);
    newMonthly[13] = Math.round(s4Total * 0.65);
    newMonthly[14] = s5Total;
    newMonthly[15] = Math.round(s5Total * 0.8);
    newMonthly[16] = Math.round(s5Total * 0.6);
    newMonthly[17] = Math.round(s5Total * 0.4);

    const peak = Math.max(...newMonthly);
    const avg = Math.round(newMonthly.reduce((a, b) => a + b, 0) / newMonthly.length);

    onUpdateLaborData({
      ...laborData,
      trades: updatedTrades,
      monthlyTotalWorkers: newMonthly,
      peakWorkersCount: peak,
      avgWorkersCount: avg,
    });
  };

  // =========================================================================
  // 3. 中国工人安排数据更新
  // =========================================================================
  const handleUpdateChineseWorkerField = (
    field: 'headquartersDispatched' | 'projectTransferred' | 'passportReady' | 'visaReady' | 'trainingPassed',
    valStr: string
  ) => {
    const num = parseInt(valStr, 10);
    const valid = isNaN(num) || num < 0 ? 0 : num;

    const current = { ...laborData.chineseWorkerBreakdown, [field]: valid };
    current.totalCount = current.headquartersDispatched + current.projectTransferred;

    onUpdateLaborData({
      ...laborData,
      chineseWorkerBreakdown: current,
    });
  };

  // =========================================================================
  // 4. 证明文件模拟上传与关联
  // =========================================================================
  const handleConfirmUploadProof = (docId: string, customName: string) => {
    const updatedDocs = laborData.proofDocuments.map((doc) => {
      if (doc.id !== docId) return doc;
      return {
        ...doc,
        fileName: customName,
        status: 'verified' as const,
        uploadDate: '刚刚已上传',
        auditRemark: '已完成法务、签证及境外安全审查，符合《投标须知》及阿国用工备案要求。',
      };
    });

    onUpdateLaborData({
      ...laborData,
      proofDocuments: updatedDocs,
    });

    setIsProofModalOpen(false);
    setUploadFeedback(`成功关联证明文件：${customName} (已自动匹配中方66人全员)`);
    setTimeout(() => setUploadFeedback(null), 3000);
  };

  // 计算当前中外人数比例
  const currentChineseTotal = laborData.chineseWorkerBreakdown.totalCount;
  const currentLocalTotal = Math.round(currentChineseTotal * (laborData.calculationParams.localRatio / laborData.calculationParams.chineseRatio));

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* 1. 进度联动与进度变更强提醒条 (与附件07关键节点联动) */}
      {/* ========================================================================= */}
      {laborData.scheduleNeedsRecalculation ? (
        <div className="bg-sky-50 border border-sky-300 rounded-xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
              <AlertTriangle className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <strong className="text-xs font-bold text-blue-950">
                  ⚠️ 进度联动预警：附件07进度时间轴发生变更（工期压缩系数已调整为 {editableParams.compressionRatio}）
                </strong>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold">
                  需重新测算
                </span>
              </div>
              <p className="text-xs text-blue-800/80 mt-1">
                依据《投标须知》：附件05必须与附件07的施工阶段和时间轴保持 100% 联动。进度变更后，请立即重新计算劳动力配置计划与负荷曲线！
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleRecalculateLaborPlan()}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>一键重新测算并对齐劳动力曲线</span>
            </button>
            {onNavigateToSchedule07 && (
              <button
                type="button"
                onClick={onNavigateToSchedule07}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold cursor-pointer"
              >
                查看附件07进度
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-blue-200 p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 text-xs">
            <span className="w-6 h-6 rounded-full bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
            <span className="font-semibold text-blue-950">
              已与附件07施工阶段和时间轴 100% 联动咬合
            </span>
            <span className="text-slate-400 font-mono">|</span>
            <span className="text-slate-600">
              基准总工期：<strong className="font-mono text-blue-950">540 日历天 (18个月)</strong>
            </span>
            <span className="text-slate-400 font-mono">|</span>
            <span className="text-slate-600">
              工期压缩系数：<strong className="font-mono text-blue-900">{editableParams.compressionRatio}</strong>
            </span>
            <span className="text-[11px] text-blue-700/70">
              (上次同步：{laborData.lastRecalculatedTime || '2025-03-21 09:30'})
            </span>
          </div>

          <button
            type="button"
            onClick={handleSimulateSchedule07Change}
            className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 underline cursor-pointer self-end sm:self-auto"
            title="模拟进度调整以验证提示重新计算功能"
          >
            模拟附件07进度微调
          </button>
        </div>
      )}

      {/* 操作成功提示反馈 */}
      {uploadFeedback && (
        <div className="p-3 bg-blue-50 border border-blue-300 rounded-lg text-xs font-semibold text-blue-950 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0" />
          <span>{uploadFeedback}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. 核心指标统计卡片看板 (企业蓝统一色系) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="p-3 bg-white rounded-xl border border-blue-200 shadow-2xs">
          <span className="text-[11px] text-blue-800/80 block font-medium">高峰期在岗人数</span>
          <div className="flex items-baseline gap-1 mt-1">
            <strong className="text-xl font-bold font-mono text-blue-950">
              {laborData.peakWorkersCount}
            </strong>
            <span className="text-xs text-slate-500">人</span>
          </div>
          <span className="text-[10px] text-blue-600 font-mono mt-0.5 block">
            上限限额: {editableParams.peakLimit} 人 (安全)
          </span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-blue-200 shadow-2xs">
          <span className="text-[11px] text-blue-800/80 block font-medium">全周期月均人数</span>
          <div className="flex items-baseline gap-1 mt-1">
            <strong className="text-xl font-bold font-mono text-blue-900">
              {laborData.avgWorkersCount}
            </strong>
            <span className="text-xs text-slate-500">人</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
            负荷均衡度 86.4%
          </span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-blue-200 shadow-2xs">
          <span className="text-[11px] text-blue-800/80 block font-medium">中国工人 (40%)</span>
          <div className="flex items-baseline gap-1 mt-1">
            <strong className="text-xl font-bold font-mono text-blue-950">
              {laborData.chineseWorkerBreakdown.totalCount}
            </strong>
            <span className="text-xs text-slate-500">人</span>
          </div>
          <span className="text-[10px] text-blue-700 font-mono mt-0.5 block">
            总部选派35 · 调派31
          </span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-blue-200 shadow-2xs">
          <span className="text-[11px] text-blue-800/80 block font-medium">当地工人 (60%)</span>
          <div className="flex items-baseline gap-1 mt-1">
            <strong className="text-xl font-bold font-mono text-blue-950">
              {currentLocalTotal}
            </strong>
            <span className="text-xs text-slate-500">人</span>
          </div>
          <span className="text-[10px] text-blue-700 font-mono mt-0.5 block">
            分包54 · 招募45
          </span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-blue-200 shadow-2xs">
          <span className="text-[11px] text-blue-800/80 block font-medium">专业工程总量</span>
          <div className="flex items-baseline gap-1 mt-1">
            <strong className="text-xl font-bold font-mono text-blue-950">
              {(editableParams.totalEngineeringWorkdays / 1000).toFixed(1)}k
            </strong>
            <span className="text-xs text-slate-500">工日</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
            定额效率 1.05
          </span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-blue-200 shadow-2xs">
          <span className="text-[11px] text-blue-800/80 block font-medium">出境凭证齐备率</span>
          <div className="flex items-baseline gap-1 mt-1">
            <strong className="text-xl font-bold font-mono text-blue-700">
              100%
            </strong>
            <span className="text-xs text-slate-500">5项PASS</span>
          </div>
          <span className="text-[10px] text-blue-700 font-mono mt-0.5 block">
            护照/签证/培训完备
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. 子板块导航药丸选项卡 (B端统一蓝调) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl border border-blue-200 p-2 shadow-2xs flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('chart')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'chart'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-blue-900 hover:bg-blue-50'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>1. 劳动力动态曲线 (月度/周度)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('params')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'params'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-blue-900 hover:bg-blue-50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>2. 参数测算与工期联动输入</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'matrix'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-blue-900 hover:bg-blue-50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>3. 各阶段工种配置与人工微调</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('chinese')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'chinese'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-blue-900 hover:bg-blue-50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>4. 中国工人安排与证明关联</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mobilization')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'mobilization'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-blue-900 hover:bg-blue-50'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>5. 人员进退场与当地劳动力</span>
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. 子板块 1：劳动力曲线 (月度/周度切换，交互式高精绘制) */}
      {/* ========================================================================= */}
      {activeTab === 'chart' && (
        <div className="bg-white rounded-xl border border-blue-200 p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-700" />
                <span>阿尔及利亚 240 床综合医院机电工程全周期劳动力负荷动态曲线</span>
              </h3>
              <p className="text-xs text-blue-800/80 mt-0.5">
                根据施工阶段分部工程量自动绘制，清晰呈现中国核心技工（40%）与属地施工力量（60%）的投入走势
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* 月度 / 周度颗粒度切换 */}
              <div className="flex items-center bg-blue-50/70 p-0.5 rounded-lg border border-blue-200 text-xs">
                <button
                  type="button"
                  onClick={() => setCurveTimeframe('monthly')}
                  className={`px-3 py-1 rounded font-semibold cursor-pointer transition-all ${
                    curveTimeframe === 'monthly'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-blue-900 hover:text-blue-950'
                  }`}
                >
                  月度视图 (18个月)
                </button>
                <button
                  type="button"
                  onClick={() => setCurveTimeframe('weekly')}
                  className={`px-3 py-1 rounded font-semibold cursor-pointer transition-all ${
                    curveTimeframe === 'weekly'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-blue-900 hover:text-blue-950'
                  }`}
                >
                  周度视图 (78周)
                </button>
              </div>

              {/* 走势图层控制 */}
              <div className="flex items-center bg-blue-50/70 p-0.5 rounded-lg border border-blue-200 text-xs">
                <button
                  type="button"
                  onClick={() => setCurveFilter('all')}
                  className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                    curveFilter === 'all' ? 'bg-white text-blue-950 font-bold shadow-2xs' : 'text-blue-800'
                  }`}
                >
                  全部
                </button>
                <button
                  type="button"
                  onClick={() => setCurveFilter('total_only')}
                  className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                    curveFilter === 'total_only' ? 'bg-white text-blue-950 font-bold shadow-2xs' : 'text-blue-800'
                  }`}
                >
                  总量
                </button>
                <button
                  type="button"
                  onClick={() => setCurveFilter('chinese_only')}
                  className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                    curveFilter === 'chinese_only' ? 'bg-white text-blue-950 font-bold shadow-2xs' : 'text-blue-800'
                  }`}
                >
                  中方
                </button>
                <button
                  type="button"
                  onClick={() => setCurveFilter('local_only')}
                  className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                    curveFilter === 'local_only' ? 'bg-white text-blue-950 font-bold shadow-2xs' : 'text-blue-800'
                  }`}
                >
                  当地
                </button>
              </div>
            </div>
          </div>

          {/* 曲线图例说明 */}
          <div className="flex items-center gap-4 text-xs flex-wrap pb-1 border-b border-blue-100">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-sky-400" />
              <span className="text-slate-700">全周期总人数 (Total Workers)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-blue-600" />
              <span className="text-slate-700">中国工人 (40% 核心骨干)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-blue-800" />
              <span className="text-slate-700">阿尔及利亚当地工人 (60% 属地班组)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-blue-400 border-dashed border-t-2" />
              <span className="text-blue-700 font-mono">高峰红线上限: {editableParams.peakLimit} 人</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-sky-400" />
              <span className="text-sky-700 font-mono">平均在岗基准线: {laborData.avgWorkersCount} 人</span>
            </div>
          </div>

          {/* 交互式图表视窗 (采用高权威企业深蓝背景) */}
          <div className="bg-blue-950 text-white rounded-xl p-5 space-y-3 border border-blue-900 shadow-md">
            <div className="flex items-center justify-between text-xs text-blue-200">
              <span className="font-bold flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
                <span>
                  {curveTimeframe === 'monthly' ? '月度全周期劳动力曲线 (18 Months Timeline)' : '周度高精度工期劳动力曲线 (78 Weeks Timeline)'}
                </span>
              </span>
              <span className="font-mono text-[11px] text-blue-300">
                单位：人 (Effectifs sur site) · 540 日历天
              </span>
            </div>

            {/* 图表绘图核心区域 */}
            <div className="h-60 w-full relative flex items-end pt-8 pb-4 px-2 border-b border-blue-800/80">
              {/* 高峰上限警戒参考虚线 */}
              <div
                style={{ bottom: `${Math.round((editableParams.peakLimit / 200) * 100)}%` }}
                className="absolute left-0 right-0 border-b border-dashed border-blue-400/40 pointer-events-none z-0 flex items-center justify-end pr-2"
              >
                <span className="text-[10px] font-mono text-blue-300 bg-blue-900/80 px-1 rounded">
                  上限 {editableParams.peakLimit}人
                </span>
              </div>

              {/* 平均基线参考线 */}
              <div
                style={{ bottom: `${Math.round((laborData.avgWorkersCount / 200) * 100)}%` }}
                className="absolute left-0 right-0 border-b border-sky-400/30 pointer-events-none z-0 flex items-center justify-start pl-2"
              >
                <span className="text-[10px] font-mono text-sky-300 bg-blue-900/80 px-1 rounded">
                  均值 {laborData.avgWorkersCount}人
                </span>
              </div>

              {/* 动态柱状与折线渲染 */}
              <div className="w-full flex items-end justify-between gap-1 z-10 h-full">
                {(curveTimeframe === 'monthly'
                  ? laborData.monthlyTotalWorkers
                  : laborData.weeklyTotalWorkers
                ).map((totalCount, idx) => {
                  const maxCap = 200;
                  const totalHeightPct = Math.min(Math.round((totalCount / maxCap) * 100), 100);
                  const chineseCount = Math.round(totalCount * laborData.calculationParams.chineseRatio);
                  const localCount = totalCount - chineseCount;
                  const isPeak = totalCount === laborData.peakWorkersCount;

                  const timeLabel = curveTimeframe === 'monthly'
                    ? laborData.timelineMonths[idx]
                    : laborData.timelineWeeks[idx];

                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                    >
                      {/* 悬停详细数据气泡 */}
                      <div className="absolute -top-16 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-900 text-white text-[10px] font-mono p-1.5 rounded pointer-events-none whitespace-nowrap shadow-xl border border-blue-600 z-30">
                        <div className="font-bold text-sky-300">{timeLabel}</div>
                        <div>总人数: {totalCount} 人 {isPeak && '(峰值)'}</div>
                        <div className="text-blue-200">中方: {chineseCount}人 (40%) · 属地: {localCount}人 (60%)</div>
                      </div>

                      {/* 柱形堆叠条 */}
                      <div
                        style={{ height: `${totalHeightPct}%` }}
                        className={`w-full rounded-t transition-all flex flex-col justify-end overflow-hidden ${
                          isPeak ? 'ring-2 ring-sky-300 shadow-lg' : 'hover:brightness-110'
                        }`}
                      >
                        {curveFilter === 'all' && (
                          <>
                            {/* 当地工人群体 (顶部深蓝) */}
                            <div
                              style={{ height: `${(localCount / totalCount) * 100}%` }}
                              className="w-full bg-blue-700"
                            />
                            {/* 中方工人群体 (底部亮蓝) */}
                            <div
                              style={{ height: `${(chineseCount / totalCount) * 100}%` }}
                              className={`w-full ${isPeak ? 'bg-sky-400' : 'bg-blue-500'}`}
                            />
                          </>
                        )}

                        {curveFilter === 'total_only' && (
                          <div className={`w-full h-full ${isPeak ? 'bg-sky-400' : 'bg-blue-500'}`} />
                        )}

                        {curveFilter === 'chinese_only' && (
                          <div
                            style={{ height: `${(chineseCount / totalCount) * 100}%` }}
                            className="w-full bg-sky-400"
                          />
                        )}

                        {curveFilter === 'local_only' && (
                          <div
                            style={{ height: `${(localCount / totalCount) * 100}%` }}
                            className="w-full bg-blue-700"
                          />
                        )}
                      </div>

                      {/* 时间轴标签 */}
                      <span className="text-[9px] text-blue-300 font-mono mt-1.5 transform -rotate-45 origin-left truncate max-w-full">
                        {curveTimeframe === 'monthly' ? timeLabel.split(' ')[0] : (idx % 4 === 0 ? timeLabel : '')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-blue-300 pt-1">
              <span>* 数据逻辑：根据 21,550 总工日分解，第 7~8 个月变电所母线槽与大型变压器进场期间达到 165 人劳动力峰值。</span>
              <span className="font-mono">完全符合《2.1 投标须知》劳动安全与施工负荷平滑约束</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. 子板块 2：参数测算与工期联动输入 (建议输入全要素表单) */}
      {/* ========================================================================= */}
      {activeTab === 'params' && (
        <div className="bg-white rounded-xl border border-blue-200 p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-blue-200">
            <div>
              <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-700" />
                <span>劳动力配置计划测算输入参数表 (参数测算驱动)</span>
              </h3>
              <p className="text-xs text-blue-800/80 mt-0.5">
                调整以下专业工程量、班次时长、中外配比或工期压缩系数，系统将动态联动重新生成劳动力曲线
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleResetParameters}
                className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-semibold cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>恢复基准参数</span>
              </button>
              <button
                type="button"
                onClick={() => handleRecalculateLaborPlan()}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>应用参数并重新测算绘图</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* 参数 1: 专业工程量总工日 */}
            <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/20 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-blue-950">专业工程量总工日 (工日)</label>
                <span className="font-mono text-blue-700 font-bold">BOQ联动</span>
              </div>
              <input
                type="number"
                value={editableParams.totalEngineeringWorkdays}
                onChange={(e) =>
                  setEditableParams({
                    ...editableParams,
                    totalEngineeringWorkdays: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-blue-950 font-mono font-bold text-xs focus:ring-1 focus:ring-blue-400 outline-none"
              />
              <p className="text-[11px] text-slate-500">
                涵盖强电变配电、弱电智能化、电缆桥架敷设、接地防雷及消防联调全部专业工日定额。
              </p>
            </div>

            {/* 参数 2: 劳动生产率指数 */}
            <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/20 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-blue-950">劳动生产率指数</label>
                <span className="font-mono text-blue-700 font-bold">标准定额: 1.05</span>
              </div>
              <input
                type="number"
                step="0.05"
                value={editableParams.productivityIndex}
                onChange={(e) =>
                  setEditableParams({
                    ...editableParams,
                    productivityIndex: parseFloat(e.target.value) || 1.0,
                  })
                }
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-blue-950 font-mono font-bold text-xs focus:ring-1 focus:ring-blue-400 outline-none"
              />
              <p className="text-[11px] text-slate-500">
                考虑阿尔及利亚高温气候及语言交底折减系数，综合定额效率指数设定为 1.05。
              </p>
            </div>

            {/* 参数 3: 每班工作时长与班次数量 */}
            <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/20 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-blue-950">工作时长与班次</label>
                <span className="font-mono text-blue-700 font-bold">8h / 单班制</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block">每班时长 (小时)</span>
                  <input
                    type="number"
                    value={editableParams.shiftHours}
                    onChange={(e) =>
                      setEditableParams({
                        ...editableParams,
                        shiftHours: parseInt(e.target.value, 10) || 8,
                      })
                    }
                    className="w-full px-2 py-1 rounded bg-white border border-blue-200 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">班次数量 (班)</span>
                  <input
                    type="number"
                    step="0.5"
                    value={editableParams.shiftsCount}
                    onChange={(e) =>
                      setEditableParams({
                        ...editableParams,
                        shiftsCount: parseFloat(e.target.value) || 1.0,
                      })
                    }
                    className="w-full px-2 py-1 rounded bg-white border border-blue-200 text-xs font-mono font-bold"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                正常为日单班8小时制；在第7~8个月主受电高峰期组织局部关键工序1.5班突击流水作业。
              </p>
            </div>

            {/* 参数 4: 中国工人与当地工人比例 */}
            <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/20 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-blue-950">中外工人配比比例</label>
                <span className="font-mono text-blue-700 font-bold">
                  {Math.round(editableParams.chineseRatio * 100)}% : {Math.round(editableParams.localRatio * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-blue-900">中国</span>
                <input
                  type="range"
                  min="0.2"
                  max="0.6"
                  step="0.05"
                  value={editableParams.chineseRatio}
                  onChange={(e) => {
                    const cRatio = parseFloat(e.target.value);
                    setEditableParams({
                      ...editableParams,
                      chineseRatio: cRatio,
                      localRatio: parseFloat((1 - cRatio).toFixed(2)),
                    });
                  }}
                  className="w-full accent-blue-600"
                />
                <span className="text-xs font-semibold text-blue-900">当地</span>
              </div>
              <p className="text-[11px] text-slate-500">
                符合阿尔及利亚劳工部对大型公立医疗建筑项目属地化雇佣比例不低于 50% 之法定规定。
              </p>
            </div>

            {/* 参数 5: 高峰人数限制 */}
            <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/20 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-blue-950">现场高峰人数上限控制</label>
                <span className="font-mono text-blue-700 font-bold">红线: 180人</span>
              </div>
              <input
                type="number"
                value={editableParams.peakLimit}
                onChange={(e) =>
                  setEditableParams({
                    ...editableParams,
                    peakLimit: parseInt(e.target.value, 10) || 180,
                  })
                }
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-blue-950 font-mono font-bold text-xs focus:ring-1 focus:ring-blue-400 outline-none"
              />
              <p className="text-[11px] text-slate-500">
                受营地宿舍、食堂配餐及现场作业面容量限制，单日驻场最高峰人数严格控制在 180 人以内。
              </p>
            </div>

            {/* 参数 6: 工期压缩系数与进退场时间 */}
            <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/20 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-blue-950">工期压缩系数与总工期</label>
                <span className="font-mono text-blue-700 font-bold">
                  {editableParams.compressionRatio} (基准540天)
                </span>
              </div>
              <input
                type="number"
                step="0.05"
                min="0.8"
                max="1.2"
                value={editableParams.compressionRatio}
                onChange={(e) =>
                  setEditableParams({
                    ...editableParams,
                    compressionRatio: parseFloat(e.target.value) || 1.0,
                  })
                }
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-blue-950 font-mono font-bold text-xs focus:ring-1 focus:ring-blue-400 outline-none"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1">
                <span>进场: {editableParams.entryDate}</span>
                <span>退场: {editableParams.exitDate}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. 子板块 3：各阶段工种配置与人工微调矩阵 (表格直接就地编辑) */}
      {/* ========================================================================= */}
      {activeTab === 'matrix' && (
        <div className="bg-white rounded-xl border border-blue-200 p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-700" />
                <span>各施工阶段及各工种人数配置表 (支持表格就地人工微调)</span>
              </h3>
              <p className="text-xs text-blue-800/80 mt-0.5">
                可直接修改各单元格数字，系统将实时重新求和并自动重绘劳动力全周期曲线
              </p>
            </div>

            <div className="text-xs text-slate-500">
              共 <strong>{laborData.trades.length}</strong> 个专业工种 · <strong>5</strong> 个施工阶段
            </div>
          </div>

          <div className="border border-blue-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-blue-50/70 text-blue-900 font-semibold border-b border-blue-200">
                <tr>
                  <th className="p-2.5 w-10 text-center">#</th>
                  <th className="p-2.5">工种名称及专业类别</th>
                  <th className="p-2.5 text-center w-24">
                    阶段一
                    <span className="block text-[10px] font-normal text-slate-500">M1-M3 预埋</span>
                  </th>
                  <th className="p-2.5 text-center w-24">
                    阶段二
                    <span className="block text-[10px] font-normal text-slate-500">M4-M6 桥架</span>
                  </th>
                  <th className="p-2.5 text-center w-24 bg-blue-100/60 font-bold text-blue-950">
                    阶段三 (高峰)
                    <span className="block text-[10px] font-normal text-blue-800">M7-M10 主设备</span>
                  </th>
                  <th className="p-2.5 text-center w-24">
                    阶段四
                    <span className="block text-[10px] font-normal text-slate-500">M11-M14 弱电</span>
                  </th>
                  <th className="p-2.5 text-center w-24">
                    阶段五
                    <span className="block text-[10px] font-normal text-slate-500">M15-M18 移交</span>
                  </th>
                  <th className="p-2.5 text-center w-20 font-bold">峰值</th>
                  <th className="p-2.5 text-center w-20">均值</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-100">
                {laborData.trades.map((trade, idx) => (
                  <tr key={trade.id} className="hover:bg-blue-50/40">
                    <td className="p-2.5 text-center font-mono text-blue-700 font-semibold">{idx + 1}</td>
                    <td className="p-2.5">
                      <strong className="text-blue-950 block">{trade.tradeName}</strong>
                      <span className="text-[10px] text-blue-700 font-mono">
                        {trade.category === 'electrical' && '强电电气类'}
                        {trade.category === 'low_voltage' && '弱电智能化类'}
                        {trade.category === 'auxiliary' && '属地配合类'}
                        {trade.category === 'welding_pipe' && '管道焊接类'}
                      </span>
                    </td>
                    <td className="p-2.5 text-center">
                      <input
                        type="number"
                        min="0"
                        value={trade.stage1Count}
                        onChange={(e) => handleTradeCountChange(trade.id, 'stage1Count', e.target.value)}
                        className="w-16 px-1.5 py-1 text-center font-mono rounded bg-white border border-blue-200 text-blue-950 font-bold focus:border-blue-500 outline-none"
                      />
                    </td>
                    <td className="p-2.5 text-center">
                      <input
                        type="number"
                        min="0"
                        value={trade.stage2Count}
                        onChange={(e) => handleTradeCountChange(trade.id, 'stage2Count', e.target.value)}
                        className="w-16 px-1.5 py-1 text-center font-mono rounded bg-white border border-blue-200 text-blue-950 font-bold focus:border-blue-500 outline-none"
                      />
                    </td>
                    <td className="p-2.5 text-center bg-blue-50/40">
                      <input
                        type="number"
                        min="0"
                        value={trade.stage3Count}
                        onChange={(e) => handleTradeCountChange(trade.id, 'stage3Count', e.target.value)}
                        className="w-16 px-1.5 py-1 text-center font-mono rounded bg-white border border-blue-400 text-blue-950 font-bold shadow-xs focus:ring-1 focus:ring-blue-400 outline-none"
                      />
                    </td>
                    <td className="p-2.5 text-center">
                      <input
                        type="number"
                        min="0"
                        value={trade.stage4Count}
                        onChange={(e) => handleTradeCountChange(trade.id, 'stage4Count', e.target.value)}
                        className="w-16 px-1.5 py-1 text-center font-mono rounded bg-white border border-blue-200 text-blue-950 font-bold focus:border-blue-500 outline-none"
                      />
                    </td>
                    <td className="p-2.5 text-center">
                      <input
                        type="number"
                        min="0"
                        value={trade.stage5Count}
                        onChange={(e) => handleTradeCountChange(trade.id, 'stage5Count', e.target.value)}
                        className="w-16 px-1.5 py-1 text-center font-mono rounded bg-white border border-blue-200 text-blue-950 font-bold focus:border-blue-500 outline-none"
                      />
                    </td>
                    <td className="p-2.5 text-center font-mono font-bold text-blue-950 bg-blue-50/60">
                      {trade.peakCount}
                    </td>
                    <td className="p-2.5 text-center font-mono text-slate-700">
                      {trade.avgCount}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-blue-50/70 border-t-2 border-blue-200 font-bold text-blue-950">
                <tr>
                  <td colSpan={2} className="p-2.5 text-right font-semibold">各阶段劳动力总计 (人)：</td>
                  <td className="p-2.5 text-center font-mono text-blue-950">
                    {laborData.trades.reduce((acc, t) => acc + t.stage1Count, 0)}
                  </td>
                  <td className="p-2.5 text-center font-mono text-blue-950">
                    {laborData.trades.reduce((acc, t) => acc + t.stage2Count, 0)}
                  </td>
                  <td className="p-2.5 text-center font-mono text-blue-950 bg-blue-100/60">
                    {laborData.trades.reduce((acc, t) => acc + t.stage3Count, 0)} (高峰)
                  </td>
                  <td className="p-2.5 text-center font-mono text-blue-950">
                    {laborData.trades.reduce((acc, t) => acc + t.stage4Count, 0)}
                  </td>
                  <td className="p-2.5 text-center font-mono text-blue-950">
                    {laborData.trades.reduce((acc, t) => acc + t.stage5Count, 0)}
                  </td>
                  <td className="p-2.5 text-center font-mono text-blue-950 bg-blue-100">
                    {laborData.peakWorkersCount}
                  </td>
                  <td className="p-2.5 text-center font-mono text-blue-950">
                    {laborData.avgWorkersCount}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. 子板块 4：中国工人安排与证明文件上传关联 (关键合规凭证) */}
      {/* ========================================================================= */}
      {activeTab === 'chinese' && (
        <div className="space-y-4">
          {/* 中国工人安排结构统计与编辑 */}
          <div className="bg-white rounded-xl border border-blue-200 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-blue-200">
              <div>
                <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-700" />
                  <span>中国工人来源及出境资格核查清单 (法定合规 6 项指标)</span>
                </h3>
                <p className="text-xs text-blue-800/80 mt-0.5">
                  严禁虚报用工配额；根据《投标须知》核准中方技术骨干总规模，并实时联动护照、签证及培训考试通过状态
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-900 bg-blue-100 px-2.5 py-1 rounded border border-blue-300 font-mono">
                  中方合计核定人数: {laborData.chineseWorkerBreakdown.totalCount} 人 (100% 合格)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
              {/* 指标 1: 总部选派人数 */}
              <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/20 space-y-1.5">
                <span className="font-bold text-blue-950 block">1. 总部选派人数</span>
                <input
                  type="number"
                  min="0"
                  value={laborData.chineseWorkerBreakdown.headquartersDispatched}
                  onChange={(e) => handleUpdateChineseWorkerField('headquartersDispatched', e.target.value)}
                  className="w-full px-2 py-1 rounded bg-white border border-blue-200 font-mono font-bold text-blue-950"
                />
                <span className="text-[10px] text-slate-500 block">中建二局总部直选精锐技工</span>
              </div>

              {/* 指标 2: 其他项目调派人数 */}
              <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/20 space-y-1.5">
                <span className="font-bold text-blue-950 block">2. 其他项目调派人数</span>
                <input
                  type="number"
                  min="0"
                  value={laborData.chineseWorkerBreakdown.projectTransferred}
                  onChange={(e) => handleUpdateChineseWorkerField('projectTransferred', e.target.value)}
                  className="w-full px-2 py-1 rounded bg-white border border-blue-200 font-mono font-bold text-blue-950"
                />
                <span className="text-[10px] text-slate-500 block">阿国在施及收尾项目调拨</span>
              </div>

              {/* 指标 3: 已办理护照人数 */}
              <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/20 space-y-1.5">
                <span className="font-bold text-blue-950 block">3. 已办理护照人数</span>
                <input
                  type="number"
                  min="0"
                  value={laborData.chineseWorkerBreakdown.passportReady}
                  onChange={(e) => handleUpdateChineseWorkerField('passportReady', e.target.value)}
                  className="w-full px-2 py-1 rounded bg-white border border-blue-200 font-mono font-bold text-blue-950"
                />
                <span className="text-[10px] text-blue-700 block">有效期均在 2027 年之后</span>
              </div>

              {/* 指标 4: 已办理签证人数 */}
              <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/20 space-y-1.5">
                <span className="font-bold text-blue-950 block">4. 已办理签证人数</span>
                <input
                  type="number"
                  min="0"
                  value={laborData.chineseWorkerBreakdown.visaReady}
                  onChange={(e) => handleUpdateChineseWorkerField('visaReady', e.target.value)}
                  className="w-full px-2 py-1 rounded bg-white border border-blue-200 font-mono font-bold text-blue-950"
                />
                <span className="text-[10px] text-blue-700 block">阿国工作签证批文已齐备</span>
              </div>

              {/* 指标 5: 已通过培训考试人数 */}
              <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/20 space-y-1.5">
                <span className="font-bold text-blue-950 block">5. 培训考试合格人数</span>
                <input
                  type="number"
                  min="0"
                  value={laborData.chineseWorkerBreakdown.trainingPassed}
                  onChange={(e) => handleUpdateChineseWorkerField('trainingPassed', e.target.value)}
                  className="w-full px-2 py-1 rounded bg-white border border-blue-200 font-mono font-bold text-blue-950"
                />
                <span className="text-[10px] text-blue-700 block">通过国际安全及法标考核</span>
              </div>

              {/* 指标 6: 合计人数 */}
              <div className="p-3 rounded-lg border border-blue-300 bg-blue-100/50 space-y-1.5">
                <span className="font-bold text-blue-950 block">6. 中方合计人数</span>
                <div className="text-xl font-bold font-mono text-blue-950 py-0.5">
                  {laborData.chineseWorkerBreakdown.totalCount} <span className="text-xs">人</span>
                </div>
                <span className="text-[10px] text-blue-800 font-mono block">
                  校验: {laborData.chineseWorkerBreakdown.headquartersDispatched} + {laborData.chineseWorkerBreakdown.projectTransferred} = {laborData.chineseWorkerBreakdown.totalCount} ✓
                </span>
              </div>
            </div>
          </div>

          {/* 证明文件上传并关联区 */}
          <div className="bg-white rounded-xl border border-blue-200 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-blue-700" />
                  <span>法定证明文件上传与关联清单 (护照、签证、培训、调派与花名册)</span>
                </h4>
                <p className="text-[11px] text-blue-800/80 mt-0.5">
                  系统支持上传原件扫描件并自动关联拟派人员，出具完备性审计凭证
                </p>
              </div>

              <div className="text-xs text-blue-800">
                已归档 <strong>{laborData.proofDocuments.length}</strong> 份官方合规证明
              </div>
            </div>

            <div className="space-y-2.5">
              {laborData.proofDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3.5 rounded-xl border border-blue-200 bg-white hover:border-blue-300 transition-all shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-xs font-bold text-blue-950">{doc.typeName}</strong>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200 font-bold">
                          已核准关联 {doc.associatedCount} 人
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {doc.fileName} ({doc.fileSize})
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1">
                        {doc.auditRemark}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveProofDoc(doc);
                        setIsProofModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-semibold cursor-pointer flex items-center gap-1"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>上传/替换文件</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadFeedback(`已成功导出并预览: ${doc.fileName}`);
                        setTimeout(() => setUploadFeedback(null), 2500);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold cursor-pointer flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>查看关联清单</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. 子板块 5：人员进退场计划与当地劳动力计划 */}
      {/* ========================================================================= */}
      {activeTab === 'mobilization' && (
        <div className="space-y-4">
          {/* 人员进退场计划 */}
          <div className="bg-white rounded-xl border border-blue-200 p-5 shadow-2xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-700" />
                <span>各施工阶段人员进退场详细调度计划 (5 大阶段节拍)</span>
              </h3>
              <p className="text-xs text-blue-800/80 mt-0.5">
                与进度计划紧密衔接，合理安排各专业进场时间与退场节点，避免窝工与场地拥挤
              </p>
            </div>

            <div className="space-y-3">
              {laborData.stages.map((stg) => (
                <div
                  key={stg.id}
                  className="p-4 rounded-xl border border-blue-200 bg-blue-50/20 hover:border-blue-300 transition-all shadow-2xs space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-xs font-bold text-blue-950">{stg.stageName}</strong>
                      <span className="text-[11px] font-mono text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                        {stg.timeRange}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200 font-mono font-bold">
                        阶段人数: {stg.totalStageCount} 人
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        (中方 {stg.chineseCount}人 · 属地 {stg.localCount}人)
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">
                    <strong>主要作业范围：</strong>{stg.workDescription}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="p-2.5 rounded bg-white border border-blue-200">
                      <strong className="text-blue-950 block">进场动员措施：</strong>
                      <span className="text-slate-600">{stg.entryAction}</span>
                    </div>
                    <div className="p-2.5 rounded bg-white border border-blue-200">
                      <strong className="text-blue-950 block">退场安排措施：</strong>
                      <span className="text-slate-600">{stg.exitAction}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 当地劳动力计划 */}
          <div className="bg-white rounded-xl border border-blue-200 p-5 shadow-2xs space-y-3">
            <div>
              <h4 className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                <Globe2 className="w-4 h-4 text-blue-700" />
                <span>当地劳动力雇佣与合规管理计划 (Local Labor Plan)</span>
              </h4>
              <p className="text-[11px] text-blue-800/80 mt-0.5">
                满足阿尔及利亚劳工部（Ministère du Travail）合规要求与属地社会保险（CNAS）100% 覆盖
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/20">
                <span className="text-[11px] text-slate-500 block">属地直接雇佣技工</span>
                <strong className="text-lg font-bold font-mono text-blue-950 mt-1 block">
                  {laborData.localLaborPlan.directHired} 人
                </strong>
                <span className="text-[10px] text-blue-700">签署属地固定期限劳动合同</span>
              </div>

              <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/20">
                <span className="text-[11px] text-slate-500 block">阿国资质分包班组</span>
                <strong className="text-lg font-bold font-mono text-blue-950 mt-1 block">
                  {laborData.localLaborPlan.subcontracted} 人
                </strong>
                <span className="text-[10px] text-blue-700">按工序分包，严禁外派他人</span>
              </div>

              <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/20">
                <span className="text-[11px] text-slate-500 block">中法双语属地工长</span>
                <strong className="text-lg font-bold font-mono text-blue-950 mt-1 block">
                  {laborData.localLaborPlan.algerianForemenCount} 人
                </strong>
                <span className="text-[10px] text-blue-700">技术安全交底翻译与班组统筹</span>
              </div>

              <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/20">
                <span className="text-[11px] text-slate-500 block">CNAS工伤社保覆盖</span>
                <strong className="text-lg font-bold font-mono text-blue-700 mt-1 block">
                  {laborData.localLaborPlan.localInsuranceCoverageRate}%
                </strong>
                <span className="text-[10px] text-slate-500">
                  备案号: {laborData.localLaborPlan.laborBureauFilingNo}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. 证明文件上传/替换弹窗模态框 */}
      {/* ========================================================================= */}
      {isProofModalOpen && activeProofDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-blue-200 w-full max-w-lg flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-blue-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Upload className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    上传并关联法定证明文件
                  </h3>
                  <p className="text-xs text-blue-200">
                    {activeProofDoc.typeName}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsProofModalOpen(false)}
                className="p-1 text-blue-200 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 space-y-1.5">
                <div className="flex items-center justify-between font-bold text-blue-950">
                  <span>当前关联文件：</span>
                  <span className="font-mono text-blue-700">{activeProofDoc.fileSize}</span>
                </div>
                <p className="font-mono text-slate-700 text-[11px] truncate">
                  {activeProofDoc.fileName}
                </p>
                <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1">
                  <span>上传时间: {activeProofDoc.uploadDate}</span>
                  <span>关联人员: 中方 {activeProofDoc.associatedCount} 人全员</span>
                </div>
              </div>

              {/* 模拟文件选择框 */}
              <div className="border-2 border-dashed border-blue-300 rounded-xl p-6 text-center space-y-2 bg-blue-50/20 hover:bg-blue-50/40 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-blue-600 mx-auto" />
                <div>
                  <strong className="text-xs font-bold text-blue-950 block">
                    点击选择或拖放更新后的 PDF / Excel 证明文件
                  </strong>
                  <span className="text-[10px] text-slate-500">
                    支持 .pdf, .xlsx, .zip (单文件上限 100MB，支持高清晰度加盖公章件)
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-slate-600 text-[11px]">
                <strong className="text-blue-950 block">法定审查核验要求：</strong>
                <p>1. 文件必须体现中国建筑第二工程局有限公司全称与官方公章；</p>
                <p>2. 人员名单与护照号必须与附件04管理人员及中方技工名单严格保持一致；</p>
                <p>3. 签证批文与劳工配额需经阿尔及利亚驻华使馆或阿国劳工部盖章认可。</p>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-blue-50/40 border-t border-blue-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setIsProofModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg border border-blue-200 bg-white hover:bg-blue-50 text-blue-800 text-xs font-semibold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() =>
                  handleConfirmUploadProof(
                    activeProofDoc.id,
                    `CSCEC2_${activeProofDoc.type.toUpperCase()}_Verified_${Date.now().toString().slice(-4)}.pdf`
                  )
                }
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                确认关联并完成合规审查
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
