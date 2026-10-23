import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Database,
  Calculator,
  Mail,
  BookOpen,
  ShieldCheck,
  TrendingUp,
  Globe2,
  FileSpreadsheet,
} from 'lucide-react';

export const RequirementSummaryBanner: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-slate-100/90 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-700 text-white text-[11px] font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xs font-bold text-slate-800">
                海外工程投标标准与供应链协同规范
              </h2>
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                统一折算第纳尔 (DZD) · 欧洲原产免关税 (EUR.1) · 双数据库语义匹配 · 询价回函闭环
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 transition-colors cursor-pointer"
          >
            <span>{isOpen ? '收起业务规范' : '展开工程造价合规备忘'}</span>
            {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {isOpen && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 mb-1">
                <Calculator className="w-3.5 h-3.5 text-blue-700" />
                <span>人材机定额与综合取费</span>
              </div>
              <ul className="text-slate-600 space-y-1 pl-4 list-disc text-[11px]">
                <li>人工工日 = 定额工日 × 当地基数 (6500 DZD)</li>
                <li>辅材与机械基数乘测算系数动态微调</li>
                <li>综合管理费率按人材机直接费 10% 计取</li>
              </ul>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 mb-1">
                <Globe2 className="w-3.5 h-3.5 text-blue-700" />
                <span>国际海运关税与结算规则</span>
              </div>
              <ul className="text-slate-600 space-y-1 pl-4 list-disc text-[11px]">
                <li>统一折算为当地法定货币（第纳尔 DZD）</li>
                <li>欧洲原产设备凭 EUR.1 证书享零关税</li>
                <li>国内发运物资统一计取 30% 清关税收</li>
              </ul>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 mb-1">
                <Database className="w-3.5 h-3.5 text-blue-700" />
                <span>历史签单库与智能别名映射</span>
              </div>
              <ul className="text-slate-600 space-y-1 pl-4 list-disc text-[11px]">
                <li>支持 Excel/CSV 批量导入过往真实签单</li>
                <li>1 年内有效签约赋予 95%+ 匹配置信度</li>
                <li>用户可自主维护中法英材料别名词典</li>
              </ul>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 mb-1">
                <Mail className="w-3.5 h-3.5 text-blue-700" />
                <span>供应链询价与多商比价回函</span>
              </div>
              <ul className="text-slate-600 space-y-1 pl-4 list-disc text-[11px]">
                <li>针对设备商/分包商/服务商客制化邮件模板</li>
                <li>回函报价支持等值价格升序/降序灵活排序</li>
                <li>一键生成中选/还价/技术澄清商务函件</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
