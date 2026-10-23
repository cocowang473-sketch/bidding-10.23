import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  X,
  FileText,
  Printer,
  Download,
  Copy,
  Check,
  Layers,
  Database,
  Mail,
  Sliders,
  CheckCircle2,
  Workflow,
  Sparkles,
  ShieldCheck,
  Building2,
  Table,
  Cpu,
  BookOpen,
  Loader2,
} from 'lucide-react';

interface ProductDocModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProductDocModal: React.FC<ProductDocModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [activeSection, setActiveSection] = useState<'all' | 'arch' | 'features' | 'interaction' | 'calc'>('all');

  if (!isOpen) return null;

  // 纯客户端多页高清 PDF 生成器（使用 Canvas 高清矢量绘制 + jsPDF 生成标准 .pdf 二进制文件直接下载）
  const handleDownloadDirectPdfFile = () => {
    setIsGeneratingPdf(true);
    setTimeout(() => {
      try {
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });

        const pageWidth = 210;
        const pageHeight = 297;
        const canvasWidth = 1600;
        const canvasHeight = Math.round(canvasWidth * (pageHeight / pageWidth));

        const pagesData = [
          {
            title: '中建二局 · 海外工程智能造价与供应链协同平台',
            subtitle: '产品功能清单、系统架构说明与详细交互逻辑规范 (PRD/BRD)',
            meta: '版本: v4.2.0 | 编制: 海外工程商务部',
            sections: [
              {
                heading: '一、系统整体定位与业务背景',
                lines: [
                  '1. 业务痛点分析：海外EPC工程（阿尔及利亚等法标国家）投标与采购面临中外规范差异大、',
                  '   语言隔阂易造成“货不对版”；同时存在CNY/EUR/USD/DZD混合币种与30%关税，传统手工',
                  '   Excel组价极易公式断裂、汇率更新不及时；往期中标合同散落，无法在编制新标书时复用。',
                  '2. 系统定位：面向海外工程投标的专业级B2B SaaS平台，打通“标书组装 + BOQ组价 + ',
                  '   定额主材双库 + 供应商邮件询价与比价 + 国际费率测算”全链条闭环。',
                ],
              },
              {
                heading: '二、产品全景架构说明',
                lines: [
                  '1. 信息架构：标书组装画布、BOQ组价工作台、工程物资与历史签单库、供应商邮件协同中心、',
                  '   国际费率引擎五大核心板块，支持常驻导航与底层数据穿透。',
                  '2. 综合组价计算引擎模型：',
                  '   • 安装费(DZD) = 清单项定额工日 × 全局人工基准工日单价(DZD/工日)',
                  '   • 主材到岸完税费(DZD) = [主材原币单价 × 对应汇率] × (1 + 海运险率) × (1 + 关税率30%)',
                  '   • 综合单价(DZD) = (安装费 + 主材到岸完税费) × (1 + 间接费8%) × (1 + 利润12%)',
                  '   • 分项综合合价(DZD) = 综合单价 × 清单工程量',
                ],
              },
            ],
          },
          {
            title: '三、全景产品功能清单矩阵 (核心功能项)',
            subtitle: '全系统22项子功能矩阵规划与输出规范',
            meta: 'CostOS Enterprise Feature Matrix',
            sections: [
              {
                heading: '核心功能清单 (Feature Matrix Overview)',
                lines: [
                  '• [标书组装画布] 章节树形装配：组织标书多级章节结构，支持增删改排序与模板装配。',
                  '• [标书变量引擎] 变量穿透替换：[项目名称]、[工期]等全局变量双向绑定与DOM高亮。',
                  '• [BOQ组价台] 中法双语宽表：15列全要素展示，中文/法文规范对照，定额工日与到岸价实时折算。',
                  '• [BOQ组价台] 产地与关税联动：国内采购默认关联+30%关税，欧洲采购EUR折算，本地采购免税。',
                  '• [人工基准调价] 全局单价滑动调整：1,800~3,500 DZD/工日实时试算，测算全标段安装费变动。',
                  '• [历史签单台账] 三步批量导入向导：支持Excel/CSV/JSON/剪贴板，自动识别1年内有效并赋予96%置信度。',
                  '• [材料智能别名] 同义词映射引擎：材料中法文同义词标签管理，实时在线语义匹配度试算。',
                  '• [供应商发函] 多供应商企业邮箱询价：一企一信独立致函，避免抄送泄密，附带实物配图与规格。',
                  '• [比选看板] 报价按单价排序：统一折算DZD，支持升降序排列，最低价金牌标识与溢价百分比。',
                  '• [询价采纳] 一键采纳入库：更新物资库单价并穿透联动量单综合单价毫秒级重算。',
                  '• [商务函件] 一键生成专业回复：自动适配中标采纳协议确认函、友好议价函或谢绝归档函。',
                  '• [邮件模板] 供应商分类模板：按设备厂/承包商/经销商分类预置模板，支持预设变量一键插入。',
                ],
              },
            ],
          },
          {
            title: '四、详细系统交互逻辑规范 (Interaction Specification)',
            subtitle: '核心用户操作路径、状态机流转与边界异常处理规范',
            meta: 'Interaction Design & State Transition Specification',
            sections: [
              {
                heading: '4.1 标书组装画布与动态变量侧边栏交互逻辑',
                lines: [
                  '• 用户点击右侧变量面板任一变量标签，画布平滑滚动定位至该变量位置，触发呼吸灯高亮动画。',
                  '• 用户在右侧输入框修改变量值，全文所有引用节点毫秒级双向替换，顶部状态提示实时已保存。',
                ],
              },
              {
                heading: '4.2 BOQ 15列表格组价与关税切换交互逻辑',
                lines: [
                  '• 切换产地为【中国国内】时，自动勾选【+30%关税】，折算费按 原币×汇率×1.035×1.30 重算。',
                  '• 切换产地为【阿尔及利亚本地】时，币种自动联动为DZD，关税自动取消并置灰。',
                  '• 点击行级【测算明细】，右侧滑出ItemDetailDrawer抽屉，展示三层成本树与历史报价溯源。',
                ],
              },
              {
                heading: '4.3 历史签单导入与BOQ置信度联动交互逻辑',
                lines: [
                  '• 提供标准CSV模板下载；支持本地文件拖拽或表格文本直接粘贴。',
                  '• 签约时间小于12个月自动标记绿色【1年内有效 · 高置信度96%】。',
                  '• 导入确认后，若与当前BOQ物料匹配，自动将该项置信度跃升至96%，更新成交单价并重算。',
                ],
              },
              {
                heading: '4.4 供应商询价、价格排序比选与模板管理交互逻辑',
                lines: [
                  '• 询价弹窗勾选多家供应商，系统执行独立致函发函；支持选择厂商分类模板与正文在线编辑。',
                  '• 比价看板点击【单价升序】，卡片按价格重新排布，最低价挂载金色皇冠并标注价差比。',
                  '• 点击【采纳此报价】，物资单价更新并实时穿透BOQ综合单价重算，顶部弹出成功反馈。',
                ],
              },
            ],
          },
          {
            title: '五、全景自适应调节引擎与顶栏交互减负规范',
            subtitle: '视图容器宽度模式、缩放比例、数据密度与顶栏降噪设计规范',
            meta: 'View Adaptation Engine & Header Ergonomics Specification',
            sections: [
              {
                heading: '5.1 全景容器宽度与弹性视口规范',
                lines: [
                  '• [全宽自适应模式 (Fluid)]：打破1280px限制，主内容随浏览器视口100%弹性铺展，利用超宽显示空间。',
                  '• [宽屏工作台模式 (Wide)]：限定最大宽度1720px并居中，兼顾多列大表与视线聚焦舒适度。',
                  '• [标准受限模式 (Standard)]：保留标准1280px模式，适应传统老旧显示器或窄屏笔记本。',
                  '• [标书组装画布自适应]：高度采用 min-h-[680px] h-[calc(100vh-140px)] 弹性计算，告别固定780px截断。',
                ],
              },
              {
                heading: '5.2 缩放引擎与表格数据密度调节规范',
                lines: [
                  '• [缩放调节步进器]：支持85%~130%五档无损步进缩放，提供[-]、[+]与快速[100%]重置复位。',
                  '• [舒适大字模式]：加大单元格行距(py-4 px-3.5)与文字字号(text-sm)，彻底解决缩放后字体过小痛点。',
                  '• [紧凑高密模式]：压缩行距与间距(py-2 px-2)，适合单屏同屏审阅大量清单项的高级造价师。',
                  '• [工作台界面降噪]：彻底移除组价工作台内嵌的自适应、缩放与密度文本表述，向客户呈现极简专业清爽界面。',
                ],
              },
            ],
          },
          {
            title: '六、价格透明公式分解与供应商回函智能采纳规范',
            subtitle: '综合单价五维构成测算、数据血统审计与询价采纳闭环规范',
            meta: 'Formula Transparency & Data Lineage & RFQ Quote Adoption Specification',
            sections: [
              {
                heading: '6.1 综合单价透明推导与数据血统审计规范',
                lines: [
                  '• [Hover 悬停透明卡片]：鼠标悬停在综合单价单元格时即刻弹出推导详情，可视化展示 [原币×汇率]×(1+关税)×(1+运杂) 等算式。',
                  '• [fx 公式推导浮层]：BOQ 综合单价单元格挂载专属 [fx 公式] 审计入口，点击调出价格推导卡片。',
                  '• [数据血统追踪]：明确标注主材采购单价溯源主体（历史签单合同编号、最新回函供应商、置信度评级）。',
                  '• [步骤式数学推导]：透明呈现主材到港加税折算、安装费人材机定额、直接费汇总与10%综合管理取费过程。',
                  '• [五维构成占比条]：动态展示主材采购、关税运杂、人工定额、辅材机械与管理费各自占比与DZD数值。',
                  '• [公式文本一键复制]：提供格式化结构推导文本复制功能，直接粘贴至投标汇报与商务清标报告。',
                ],
              },
              {
                heading: '6.2 供应商回函比选与一键智能采纳闭环规范',
                lines: [
                  '• [行内回函触达感知]：当询价中心收到供应商回复时，BOQ 对应行主材列亮起 [⚡收到N家新报价] 状态提示。',
                  '• [一键比选采纳看板]：直接在工作台唤起横向比选抽屉，展示各家原币出厂价、折合到港价及交期、付款条款。',
                  '• [最优价智能高亮]：自动标明到港清关后折算当地币最低价，动态预估采纳后综合单价差额比例（如节省 -5.2%）。',
                  '• [双向穿透自动回填]：点击 [一键采纳]，系统自动回填原币单价、产地与关税状态，更新物资库并全表重算。',
                ],
              },
            ],
          },
        ];

        pagesData.forEach((page, pageIdx) => {
          if (pageIdx > 0) doc.addPage();

          const canvas = document.createElement('canvas');
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);

          ctx.fillStyle = '#1e3a8a';
          ctx.fillRect(60, 60, canvasWidth - 120, 12);

          ctx.fillStyle = '#1e3a8a';
          ctx.font = 'bold 36px "PingFang SC", "Microsoft YaHei", sans-serif';
          ctx.fillText(page.title, 80, 130);

          ctx.fillStyle = '#475569';
          ctx.font = 'normal 24px "PingFang SC", "Microsoft YaHei", sans-serif';
          ctx.fillText(page.subtitle, 80, 180);

          ctx.fillStyle = '#94a3b8';
          ctx.font = 'normal 18px "PingFang SC", "Microsoft YaHei", sans-serif';
          ctx.fillText(page.meta, 80, 220);

          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(80, 245);
          ctx.lineTo(canvasWidth - 80, 245);
          ctx.stroke();

          let cursorY = 300;
          page.sections.forEach((sec) => {
            ctx.fillStyle = '#1e40af';
            ctx.font = 'bold 26px "PingFang SC", "Microsoft YaHei", sans-serif';
            ctx.fillText(sec.heading, 80, cursorY);
            cursorY += 45;

            ctx.fillStyle = '#334155';
            ctx.font = 'normal 20px "PingFang SC", "Microsoft YaHei", sans-serif';

            sec.lines.forEach((line) => {
              ctx.fillText(line, 100, cursorY);
              cursorY += 36;
            });

            cursorY += 30;
          });

          ctx.strokeStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.moveTo(80, canvasHeight - 100);
          ctx.lineTo(canvasWidth - 80, canvasHeight - 100);
          ctx.stroke();

          ctx.fillStyle = '#64748b';
          ctx.font = 'normal 18px "PingFang SC", "Microsoft YaHei", sans-serif';
          ctx.fillText('中建二局海外工程商务部 · 研发成果规范 | FIDIC 商务标准', 80, canvasHeight - 60);
          ctx.fillText(`第 ${pageIdx + 1} 页 / 共 ${pagesData.length} 页`, canvasWidth - 240, canvasHeight - 60);

          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          doc.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
        });

        doc.save('海外工程智能造价与供应链协同平台_产品架构与交互逻辑规范(CostOS_v4.2).pdf');
      } catch (e) {
        console.error('PDF generation error:', e);
        window.print();
      } finally {
        setIsGeneratingPdf(false);
      }
    }, 100);
  };

  // 复制完整 Markdown 文档
  const handleCopyMarkdown = () => {
    const markdownContent = `# 中建二局 · 海外工程智能造价与供应链协同平台 (CostOS v4.2)
## 产品功能清单、系统架构说明与详细交互逻辑设计规范 (PRD/BRD)

**文档版本**：v4.2.0 Enterprise  
**编制部门**：海外工程事业部 · 商务造价与数智化研发组  
**基准工程**：阿尔及利亚 240 床综合医院标段（CFO 强电与弱电工程）  
**最后修订**：2026年10月  

---

### 一、产品整体定位与业务背景

#### 1. 业务痛点分析
海外大型 EPC 工程（如阿尔及利亚、中东、东南亚等法标/欧标项目）投标与施工阶段面临以下典型挑战：
- **中外规范与多语言隔阂**：国内材料清单（如电线电缆、成套配电柜）与当地法标规范（如 Réseau de terre, Câble U1000 RO2V）存在名称、技术标准差异，极易造成“货不对版”与海关清关风险。
- **混合币种与多重费率并存**：项目同时涉及国内人民币采购（CNY）、欧洲设备采购（EUR）、当地第纳尔分包劳务（DZD），叠加海运费率、到岸保险、以及 30% 阿尔及利亚海关关税，传统 Excel 组价极易公式断裂、汇率更新不及时。
- **询价周期长与供应商管理分散**：询价靠个人微信或零散邮件，缺乏多供应商企业邮箱并发询价、分品类专业函件模板与报价自动比选沉淀。
- **历史签单经验难以复用**：往期中标合同价格散落，无法在编制新标书时一键穿透导入并赋予价格置信度。

#### 2. 系统核心定位
定位为**面向海外工程投标的专业级 B2B SaaS 商务协同平台**，实现：
> **“标书大纲组装 + BOQ智能组价 + 定额主材双库协同 + 供应商全流程邮件询价与比价 + 国际费率测算”** 全链条闭环。

---

### 二、产品全景架构与左侧侧边栏导航体系规划

#### 1. 导航拓扑设计决策与架构逻辑对比 (Navigation Architecture Rationale)
在海外 EPC 工程组价这一专业复杂的 B 端 SaaS 系统中，导航架构的层级划分直接决定了造价工程师与商务采购专员的工作流效率。针对系统架构的规划，进行了深度论证与设计定型：

- **关于“方案 B（三级折叠深度嵌套：组价工作台 > 智能组价台 > 物资库/询价中心/国际汇率）”的痛点剖析**：
  1. **层级逻辑倒置（业务归属降级）**：「工程物资库」与「历史签单台账」是企业跨项目沉淀的**核心数字资产（Company Master Data）**；「供应商询价协同」则是采购专员的核心业务作业面。如果将它们作为“智能组价台”的三级子菜单，会让采购专员产生“为什么我维护材料库或发邮件必须进组价台”的职能错位感，且层级过深。
  2. **侧边栏物理空间受限与认知负担（UI/UX 挤压）**：左侧边栏宽度通常在 220~260px，展开三级菜单后缩进深度大，文字被截断折行，视觉杂乱且切换路径繁琐。
  3. **与 BOQ 15 列大宽表工作台冲突**：造价工程师需要专注于 15 列清单核价，过深的树状导航容易造成“迷失感”。

- **推荐并落地的工业级黄金导航架构（两级领域分组折叠侧边栏 + 顶层项目全局环境指示）**：
  系统在左侧建立**企业级垂直常驻侧边栏 (支持 260px 展开与 68px 紧凑收起)**，按**业务职能与资产属性划分为四大一级功能域 (Domain Groups)**，下设清晰二级独立工作台，并支持全系统一键直达与跨模块数据无缝联动：

#### 2. 左侧侧边栏两级导航结构拓扑 (Left Sidebar Navigation Map)
- **【第一功能域：标书与组价作业流】(BIDDING & PRICING)**
  - 📝 **标书组件与变量编辑区**：章节条款结构化装配、变量高亮与一键全案绑定。
  - 🧮 **CFO 强电量单智能组价台**：BOQ 15 列宽表穿透、人材机费率核算、清包工定额与主材到岸价联动。
- **【第二功能域：工程物资与资产库】(MASTER DATA & ASSETS)**
  - 🗄️ **工程物资与定额总库**：主材总库与安装定额库，支持产地与原币单价维护。
  - 📑 **历史签单台账与导入**：支持 Excel/CSV/JSON 批量导入，1年内有效签单赋予 96% 高置信度。
  - 🏷️ **物料别名智能映射**：中法英多语种同义词规则维护，实时在线语义相似度匹配测试。
- **【第三功能域：供应商询价与协同中心】(SUPPLY CHAIN & RFQ HUB)**
  - ✉️ **询价单跟踪与发函**：一企一信独立致函看板，附带实物图与技术规格，规避抄送泄密。
  - 📊 **多商报价横向比选**：供应商回函统一折算基准币种，价格升序（最低价高亮）/降序灵活排序与一键采纳。
  - 📨 **询价邮件模板管理**：按设备厂商/分包商/服务商分类维护模版，支持预设变量一键插槽注入。
- **【第四功能域：成本测算与国际费率】(COST ENGINE & FX RATES)**
  - 🌐 **国际汇率与综合费率**：CNY/EUR/USD 实时汇率联动，海运保险费率、30% 关税开关、管理费与利润模型。

#### 3. 核心业务流程架构 (Business Workflow Pipeline)
1. **招标拆解**：导入海外 BOQ 清单，拆分中文/法文双语描述。
2. **双库匹配**：自动检索历史签单库与物资库，计算匹配置信度。
3. **差异化询价**：针对低置信度或定制设备，匹配设备厂商/承包商模板，一键派发多供应商企业邮件。
4. **比价与采纳**：供应商邮件回复报价后，系统按价格排序（升序/降序），标记最低价与价差百分比，一键采纳入库并穿透更新 BOQ 单价。
5. **综合测算与导出**：应用国际费率引擎与人工基准，生成标书条款全文与标准报价表，一键导出汇总。

---

### 三、全景产品功能清单 (Product Feature Matrix)

| 模块编码 | 功能模块 | 功能点 | 输入数据 | 处理逻辑 | 输出结果 | 业务价值 |
|---|---|---|---|---|---|---|
| F-01 | 标书组装画布 | 章节树形装配 | 章节拖拽、大纲配置 | 组织标书多级章节结构，支持增删改 | 结构化标书草稿 | 标准化输出标书框架 |
| F-02 | 标书变量引擎 | 变量穿透替换 | [项目名称]、[交货期]等 | 正则匹配与 DOM 级高亮，双向绑定 | 替换后最终文本 | 避免海外投标笔误扣分 |
| F-03 | BOQ组价 | 双语清单展示 | 中文/法文/规格/单位 | 多币种汇率换算、定额工日乘算、关税附加 | 综合单价/综合合价 | 符合 FIDIC/欧标计量规范 |
| F-04 | BOQ组价 | 产地与关税切换 | 国内采购/欧洲采购/本地 | 动态触发 +30% 关税测算，实时联动重算 | 完税到岸价 | 精准把控跨国清关税务成本 |
| F-05 | BOQ组价 | 单项明细抽屉 | 单击量单行 | 穿透展示人工定额构成、历史供应商报价 | 全维度成本拆解树 | 支撑商务经理精细化核价 |
| F-06 | 费率测算 | 人工基准调价 | 1,800~3,500 DZD/工日 | 滑块/输入框驱动全局定额重算，风险测算 | 标段总安装成本变动 | 应对海外工会罢工与汇率波动 |
| F-07 | 工程双库 | 定额与物资库 | 材料分类、规格、价格 | 支持按品类筛选、搜索、新增自定义主材 | 物资基准数据库 | 沉淀海外工程物资资产 |
| F-08 | 历史签单 | 批量导入向导 | CSV/Excel/JSON/表格文本 | 智能映射字段、校验格式、标记1年内时效 | 历史签单台账 | 一键盘活往期中标工程数据 |
| F-09 | 历史签单 | BOQ置信度联动 | 导入签单数据 | 命中物料后置信度跃升至 96%，替换为历史价 | BOQ清单实时刷新 | 减少重复询价工作量 |
| F-10 | 别名引擎 | 智能别名映射 | 材料中文/法文同义词 | 建立别名索引，支持添加/删除/语义匹配度试算 | 多语种语义对齐规则 | 消除法标与国标命名歧义 |
| F-11 | 询价中心 | 任务大厅与外发 | 材料规格、工程量 | 关联对应 BOQ 项，跟踪询价状态 | 询价任务台账 | 实时掌握供应商报价进展 |
| F-12 | 询价中心 | 多供应商并发 | 选择多家供应商邮箱 | 生成独立定制邮件，附带实物图与技术参数 | 并发外发记录 | 避免邮件抄送泄露商业机密 |
| F-13 | 询价中心 | 报价按价格排序 | 各供应商回复报价 | 支持升序（最低价优先）与降序排列，计算价差 | 阶梯比价格局 | 快速定位最具性价比货源 |
| F-14 | 询价中心 | 一键采纳入库 | 选择采纳某供应商 | 更新主材总库价格，穿透更新量单综合单价 | 量单价格同步更新 | 询价-比价-组价完全打通 |
| F-15 | 询价中心 | 一键回复函生成 | 选定供应商报价 | 根据报价高低自动生成专业采纳确认函/议价函 | 正式商务邮件草稿 | 极大提升海外商务沟通效率 |
| F-16 | 模板管理 | 供应商分类模板 | 设备厂/承包商/经销商/劳务 | 维护个性化邮件正文，按厂商类别预置范式 | 分类邮件模板库 | 满足不同品类商务沟通规范 |
| F-17 | 模板管理 | 预设变量快捷插槽 | {{供应商名称}}、{{材料清单}}等 | 单击变量插槽即刻插入光标所在文本位置 | 动态变量语法标签 | 无需记忆语法，编辑零门槛 |
| F-18 | 模板管理 | 真实数据实时预览 | 选定模板 | 模拟真实项目上下文，实时渲染替换后正文 | 所见即所得预览区 | 防范变量占位符错漏 |
| F-19 | 国际费率 | 混合币种基准设定 | CNY/EUR/USD 汇率 | 全局广播汇率基准，驱动所有折算公式刷新 | 全局标段基准汇率 | 应对海外工程多币种结算风险 |
| F-20 | 导出中心 | 标书条款导出 | 替换后全章节标书 | 生成带规范章节分隔的 TXT/Word 格式 | 完整投标文件文本 | 供技术/法务团队终审盖章 |
| F-21 | 导出中心 | 综合报价表导出 | 全量 BOQ 组价清单 | 格式化导出含15个标准造价列的 CSV/Excel | 投标报价总表 | 满足业主招标格式要求 |
| F-22 | 视图引擎 | 全景自适应与缩放调节 | 宽度/缩放比例/数据密度 | 全宽/宽屏/标准容器切换，85%~130%缩放步进，舒适大字模式 | 响应式毫秒级重绘 | 彻底解决高分屏与缩放后字小看不清 |
| F-23 | 顶层导航 | 顶栏信息减负与面包屑 | 侧栏层级与作业流 | 移除冗余固定汇率与倒计时，突出面包屑与自适应调节 | 极简高信噪比顶栏 | 专注核心工作流，降低认知负荷 |
| F-24 | 价格审计 | 综合单价透明推导与数据血统 | 点击 [fx 公式] 单元格图标 | 步骤式透明拆解主材清关、定额工日、直接费与管理费取费，追溯历史签单凭证 | 五维构成占比条与推导公式 | 支撑造价汇报与商务清标审计 |
| F-25 | 询价闭环 | 供应商回函一键智能采纳 | 行内 [⚡比选采纳] 按钮 | 横向比选多家供应商报价、折合到港价及交期，自动回填量单并重算总价 | 报价比选抽屉与采纳闭环 | 询价结果1秒直通投标量单，告别手工搬砖 |

---

### 四、详细系统交互逻辑规范 (Detailed Interaction Logic Specification)

#### 1. 标书组装工作台交互逻辑 (Proposal Assembly Canvas)
- **触发入口**：点击顶部导航【标书组装与组价工作台】，子标签切换至【标书章节组装画布】。
- **页面布局**：左侧为标书章节树与组件库，中间为条款正文编辑区，右侧为【全局变量与占位符面板】。
- **交互动作与状态流转**：
  1. **变量点击与穿透高亮**：
     - 用户在右侧变量面板点击任一变量（如 \`[项目名称]\`）；
     - 中间正文编辑区自动平滑滚动定位至包含该变量的段落，触发黄色呼吸灯高亮动画（持续 1.5 秒）；
     - 右侧变量输入框聚焦，支持用户实时修改赋值；
     - 用户敲击回车或失焦（blur），全文所有引用处毫秒级同步替换。
  2. **章节结构调整**：
     - 用户拖拽左侧章节列表把手，触发视觉占位虚线（drop indicator）；
     - 松开鼠标完成排序，顶部保存状态指示由“已同步”短暂变为“保存中”，300ms 后恢复“已同步”。
  3. **条款内容增删**：
     - 点击【新增标书章节】，弹出快捷抽屉，选择预设标准模版（如“海外保函与付款条款”、“法标质量保证条款”）；
     - 确认后即时插入画布末尾，并自动提取该章节内包含的新变量至右侧面板。

#### 2. BOQ工程量清单组价核心交互逻辑 (BOQ Pricing Workbench)
- **触发入口**：点击子标签【BOQ工程量清单与分部分项组价】。
- **数据呈现**：15列宽表格，含中文名、法文名、规格、工程量、定额工日、安装费(DZD)、主材原币价、币种、产地、关税状态、折算费(DZD)、综合单价(DZD)、综合合价(DZD)、匹配度徽章、操作列。
- **核心交互动作与反馈**：
  1. **产地与关税状态瞬时切换**：
     - 用户点击表格中的【产地】下拉框（中国国内 / 欧洲法国 / 阿尔及利亚本地）；
     - 当选择“中国国内”时，【关税状态】自动关联勾选“+30%关税”，背景浅红提示；
     - 当切换为“阿尔及利亚本地”时，币种自动联动为 DZD，关税自动置灰并取消勾选；
     - 表格右侧的【主材折算费】、【综合单价】、【综合合价】即时重新计算并闪烁浅绿过渡背景，提示数值已重算。
  2. **行级明细抽屉穿透查看**：
     - 用户点击任意行右侧的【测算明细】按钮；
     - 屏幕右侧滑出 \`ItemDetailDrawer\` 抽屉，展示该清单项的三层成本拆解树：
       - 第1层：安装费拆解（工日 × 基准单价）；
       - 第2层：主材清关与海运到岸拆解（原币单价 × 汇率 × (1 + 海运险率) × (1 + 关税率)）；
       - 第3层：综合税费与直接成本合计；
     - 用户可在抽屉中直接调整定额工日或原币单价，失去焦点时主表格数据同步更新。
  3. **匹配置信度徽章交互**：
     - 当置信度 < 80% 显示琥珀色【需询价】徽章，点击直接唤起【供应商邮件询价模态框】，并自动预填该材料的名称、法文名称、规格与工程量；
     - 当置信度 ≥ 95% 显示绿色【高置信度】徽章，点击弹出浮层提示价格溯源（如“引自 2026年3月 历史签单：阿尔及尔大学城强电项目”）。

#### 3. 人工基准单价调价与风险测算交互逻辑 (LaborBaseConfirmModal)
- **触发入口**：点击 BOQ 表格顶部的人工基准单价卡片【调价测算】按钮。
- **交互动作与状态流转**：
  1. 弹出遮罩模态框，中心显示【全项目人工定额基准工日单价】调整器。
  2. 用户可通过滑动条（步长 50 DZD）或数字输入框在 1,800 ~ 3,500 DZD 范围内调整。
  3. 模态框下方实时计算**动态试算预览指标**：
     - 全标段总工日消耗量：合计工日；
     - 当前调价幅度（如：+15.2%）；
     - 标段安装费总额波动差额（如：+1,250,000 DZD）；
     - 调价风险等级仪表盘（正常 / 关注 / 高风险预警）。
  4. 点击【确认应用到所有清单项】：
     - 触发全局重算引擎，遍历所有清单项重新计算 \`installationCostDzd\` 与 \`unitPriceDzd\`；
     - 模态框关闭，主界面顶部弹出成功提示 Toast，总报价卡片数字跳动更新。

#### 4. 历史签单台账与批量导入向导交互逻辑 (HistoricalContractImportModal)
- **触发入口**：进入【工程物资与历史签单库】，切换至【历史签单台账与导入向导】标签，点击【批量导入历史签单】。
- **三步向导交互流程**：
  - **步骤一：下载模板与选择导入方式**：
    - 提供【下载标准 Excel/CSV 模版】按钮（点击即刻生成标准字段列的示例 CSV 文件）；
    - 支持两种导入方式切换：
      - 方式 A：拖拽/点击上传本地文件（.xlsx / .csv / .json）；
      - 方式 B：快捷粘贴制表符/逗号分隔的表格数据。
  - **步骤二：数据解析与智能字段映射**：
    - 系统自动解析文件行数，并进行数据清洗与校验；
    - 界面以表格形式呈现【导入数据预览与时效校验】：
      - 自动识别签约时间：若签约时间在 1 年以内，标记绿色【1年内有效 · 高置信度 (96%)】；
      - 若签约时间超期，标记黄色【超期 · 建议重新询价】；
    - 针对未识别字段允许用户手动下拉映射列名。
  - **步骤三：确认导入与联动生效**：
    - 点击【确认导入并联动主库】：
      - 将解析出的签单记录追加至历史库；
      - 系统自动比对主材库与当前 BOQ 清单，若物料描述匹配成功，自动提升匹配置信度至 96%，并同步更新单价；
      - 弹出导入成功反馈（显示：成功导入 N 条签单，自动命中并更新 M 项 BOQ 物料）；
      - 模态框自动平滑关闭。

#### 5. 材料智能别名映射与语义对齐交互逻辑 (MaterialAliasManagerView)
- **触发入口**：进入【工程物资与历史签单库】，切换至【材料智能别名映射】标签。
- **页面功能与交互**：
  1. **别名标签增删**：
     - 表格展示各标准物资的标准中文名、标准法文名以及已关联别名标签（如“裸铜绞线”的别名有“接地铜缆”、“Cuivre nu”、“50mm²铜线”）；
     - 点击【+ 添加别名】，出现内联输入框，输入后敲击回车即生成新标签；
     - 鼠标悬浮在已有标签上显示小叉号（x），点击即时删除该别名。
  2. **实时语义匹配度试算输入台**：
     - 页面上方提供【测试清单文本实时智能对齐】测试台；
     - 用户在测试输入框中输入非标准描述（例如：“Cuivre nu de terre 50”）；
     - 系统执行实时分词与模糊匹配，在下方以卡片呈现推荐匹配项、匹配算法得分（如 94% Match）以及命中哪一条别名规则；
     - 验证完毕后可一键将该新描述保存为该物料的新增别名规则。

#### 6. 供应商邮件询价与协同中心交互逻辑 (EmailRfqHubView & SendEmailRfqModal)
- **触发入口**：
  - 路径一：在顶部常驻导航切换至【供应商邮件询价与协同中心】；
  - 路径二：在 BOQ 表格或物资库中点击任意物料右侧的【发起邮件询价】。
- **询价发起模态框 (SendEmailRfqModal) 交互**：
  1. **多供应商邮箱勾选与扩充**：
     - 系统按当前物料品类列出推荐的企业合格供应商（显示公司名、企业邮箱、产地、过往履约评级）；
     - 支持多选框（Checkbox）一键全选或组合勾选（如同时勾选远东电缆、阿尔及尔本土线缆厂）；
     - 提供【+ 添加新供应商邮箱】按钮，支持手动输入供应商企业名称与企业邮箱，校验邮箱合法性；
     - 提供【网络搜索优质供应商】快捷扩展操作。
  2. **针对不同供应商类别的模板自动装载与切换**：
     - 下拉框提供预设及自定义邮件模板（如【国内设备厂商·集港离岸模版】、【本土分包商·到场含税模版】、【欧洲厂商·到岸CIF模版】）；
     - 切换模板下拉项时，下方邮件主题与正文即时重新渲染，自动将 \`{{供应商名称}}\` 动态替换为当前收件方；
     - 正文采用独立邮件原则（每家供应商收到的是单独抬头、无其他家邮箱的专业致函）。
  3. **正文在线编辑与实物图挂载**：
     - 正文区域支持用户针对当前标段补充个性化技术答疑要求或交货期限制；
     - 底部展示附带的工程实物图（高分辨率工程示意配图）与技术标准附件名称，支持勾选是否挂载。
  4. **点击【正式生成并发送询价函】**：
     - 触发发送状态 Loading 动画，模拟企业邮件网关发送；
     - 发送成功后自动在【询价任务大厅】新增一条询价批次记录，记录包含各供应商当前为“待回复”状态。

#### 7. 供应商报价比对与智能采纳交互逻辑
- **触发入口**：在【供应商邮件询价与协同中心】切换至【多供应商报价比选面板】。
- **核心交互动作与反馈**：
  1. **按价格升序/降序灵活排序**：
     - 用户点击排序控件（【单价从低到高 ↑】 / 【单价从高到低 ↓】）；
     - 列表卡片以平滑过渡动画重新排布；
     - 系统自动计算并折算所有报价为统一基准币种 (DZD)；
     - **最低价高亮标识**：系统自动在最低报价卡片上挂载金色【最低报价推荐 (Lowest Quote)】皇冠徽章，并标注“基准价”；
     - **价差百分比标注**：其他供应商报价均自动计算与最低价的差额百分比（如：“+14.3% vs 最低价”），便于直观决策。
  2. **一键采纳任意供应商报价入库**：
     - 每个供应商报价卡片右下角常驻【采纳此报价并更新主库】按钮；
     - 点击后弹出微确认提示，点击确认：
       - 该供应商状态变为【已采纳 (Adopted)】，徽章转绿；
       - 系统在全局主材库中将该物料的单价、币种、产地更新为该供应商报价；
       - 穿透回 BOQ 工程量清单，该项的置信度跃升至 100%，综合单价即刻重算；
       - 界面顶部出现成功 Toast：“已成功采纳 [供应商名] 报价并穿透更新 BOQ 单价！”。
  3. **一键生成专业商务回复邮件**：
     - 用户点击任意报价卡片旁的【生成回复邮件】；
     - 弹出智能邮件回复抽屉，根据报价情况提供智能回复范式：
       - 范式 A：【正式中标采纳确认函】（针对最低价或选中的供应商，明确供货条款、要求签署锁定协议）；
       - 范式 B：【友好商务议价/压价函】（针对报价偏高的供应商，礼貌反馈差距并协商降价空间）；
       - 范式 C：【商务谢绝函】（礼貌归档）；
     - 支持在文本框中二次编辑，并提供【一键复制回复正文】与【一键调用企业邮箱客户端发送】。

#### 8. 邮件模板管理器交互逻辑 (EmailTemplateManagerView)
- **触发入口**：在询价中心顶部切换至【邮件模板管理】子标签。
- **页面功能与交互**：
  1. **按供应商类别切换筛选**：
     - 顶部提供品类筛选胶囊：【全部类别】、【设备厂商 (Equipment)】、【服务承包商 (Service)】、【分包劳务 (Subcontractor)】、【综合物资商 (Distributor)】；
     - 点击不同胶囊，左侧模版卡片列表即时筛选更新。
  2. **预设变量插槽快捷点击插入**：
     - 右侧正文编辑器上方常驻【预设变量插槽快捷栏】：
       - 包含：\`{{供应商名称}}\`、\`{{询价材料清单}}\`、\`{{项目名称}}\`、\`{{报价截止日期}}\`、\`{{交货地点与条款}}\`、\`{{期望报价币种}}\`、\`{{联系人及电话}}\`；
       - 用户在正文输入框中定位光标，点击任意变量插槽按钮；
       - 系统在光标处精确插入对应的 \`{{变量名}}\` 标签，输入框保持聚焦，用户可连续打字。
  3. **真实工程数据实时预览**：
     - 编辑器下方提供【真实工程数据上下文实时预览】面板；
     - 系统自动装载当前标段真实数据（如项目名称、交货地点等）；
     - 实时渲染替换后的完整邮件样式（含致函抬头、材料规格表格、落款签字），确保所见即所得。
  4. **模版新建、保存与重置**：
     - 点击【新建自定义模板】，表单清空并自动填入初始骨架；
     - 编辑后点击【保存模板】，写入系统存储，弹出绿标保存成功反馈，在下一次询价发函时立即作为选项可选；
     - 内置模板支持【恢复默认】。

#### 9. 国际费率与汇率引擎交互逻辑 (GlobalConfigAndRfqView)
- **触发入口**：顶部导航点击【成本测算与国际费率引擎】。
- **核心交互动作与反馈**：
  1. **多币种汇率微调与一键重算**：
     - 提供 CNY / EUR / USD 对 DZD 汇率调整输入框；
     - 当用户修改 CNY 汇率（例如由 18.5 调整为 19.0）；
     - 点击【更新汇率基准并全量重算量单】，系统以 Web 异步微任务方式全量遍历刷新 100+ 项 BOQ 清单的主材折算费与综合单价，页面总报价即时更新。
  2. **30% 关税全局与行级继承策略**：
     - 界面提供阿尔及利亚海关标准关税（默认 30%）参数与海运险率（默认 3.5%）；
     - 用户可在此查看当前标段由于清关关税产生的新增税费总额统计图表。

#### 10. 全景视图自适应调节引擎交互逻辑 (ViewAdaptationControls)
- **触发入口**：顶栏右侧操作区【显示自适应调节】或 BOQ 工具栏右侧调节器。
- **核心交互动作与反馈**：
  1. **容器宽度弹性伸缩**：
     - **全宽自适应 (Fluid)**：默认开启，打破 1280px 硬编码枷锁，内容随视口 100% 铺满，充分释放 2K/4K/大屏显示器吞吐能力；
     - **宽屏工作台 (Wide)**：最大宽度锁定 1720px 并水平居中，兼顾多列大表信息密度与长久注视舒适度；
     - **标准适中 (Standard)**：最大宽度 1280px，兼容窄屏笔记本或传统投影。
  2. **多档位缩放步进引擎 (Zoom Engine)**：
     - 提供 85%、100%、110%、125%、130% 五档缩放步进；
     - 点击 [-] 缩小，点击 [+] 放大，点击 [100%] 瞬时重置回标准比例；
     - 采用 CSS 高保真缩放技术，页面文字与矢量图元毫秒级无损重绘。
  3. **表格数据密度三档调节**：
     - **舒适大字 (Comfortable)**：单元格内边距加大至 py-4 px-3.5，字体字号提升，彻底解决高分屏缩放后“内容过小看不清”的痛点；
     - **标准平衡 (Standard)**：适合绝大多数造价编制场景；
     - **紧凑高密 (Compact)**：压缩行高至 py-2 px-2，适合资深造价师同屏比对数十项清单。
  4. **标书条款装配画布视口自适应**：
     - 画布高度由固定 780px 改造为 \`calc(100vh - 140px)\`，最小高度 680px，最大高度 1080px，随浏览器视口上下弹性贴合。

#### 11. 顶栏精简与工作台界面降噪交互规范 (Ergonomics & Decluttering)
- **设计决策**：
  - 顶栏精简降噪：移除原顶栏中间展示的“商务标编制中 · 截标倒计时”及“汇率基准标签”等冗余元数据，将该类业务参数下沉至各业务域（如左侧导航“成本测算与国际汇率”专区及对应表单），降低顶层认知噪音；
  - 组价工作台界面去冗余：移除原组价工作台工具栏中内嵌的“自适应: 全宽/宽屏/标准”、“100% 缩放”以及“舒适大字/标准/紧凑”冗余文字控制，避免暴露给客户造成困惑；界面专注中法双语切换与清单组价，视觉更加清爽专业；
  - 路径面包屑强化：保留清晰两级/三级业务作业流路径指示（如“标书与组价作业流 > CFO 强电量单智能组价台”），伴随工程标段名称，建立清晰的上下文方位感。

#### 12. 综合单价透明公式推导与数据血统审计规范 (PriceFormulaInspectorModal & PriceFormulaHoverCard)
- **设计决策与触发入口**：
  - 在 BOQ 清单的【综合单价 (DZD)】单元格提供显式 [fx 公式] 审计入口；
  - **Hover 实时悬浮感知 (PriceFormulaHoverCard)**：鼠标悬停在综合单价单元格时，即刻弹出轻量透明悬浮卡片，0点击即可一眼看清核心推导数学模型 \`[原币 × 汇率] × (1+关税) × (1+运杂) + 安装定额 = 直接费\`，并将实际数值带入计算，彻底消灭黑盒疑虑；
  - **下钻审计弹窗**：点击单元格【推导血统】或卡片内【完整血统审计】，唤起沉浸式【价格测算血统与公式拆解剖析卡片】。
- **核心功能呈现**：
  1. **数据血统全溯源 (Data Lineage)**：
     - 主材采购价明确标注数据源出处（如历史签单合同编号、最新回函供应商名、原币出厂单价与产地国）；
     - 标注置信度评级（如 96% 高置信）与验证状态标签。
  2. **步骤式数学透明推导 (Step-by-Step Formula)**：
     - **步骤 1：主材到港加税折算**（原币 × 汇率 + 国际运费2% + 出口港杂7% + 人民币货物30%清关关税）；
     - **步骤 2：安装定额测算**（定额工日 × 人工固定基数 6,500 DZD + 辅材费 + 机械费）；
     - **步骤 3：直接费汇总**（主材到港合价 + 安装定额小计）；
     - **步骤 4：综合管理费取费**（直接费 × 10% 费率）；
     - **步骤 5：最终含税综合单价与清单合价**。
  3. **五维构成占比可视化 (Cost Breakdown Bar)**：
     - 动态渲染彩色横向占比条：主材采购、运杂关税、安装人工、辅材机械、管理取费五项占比与 DZD 数额；
  4. **一键复制推导依据**：
     - 支持一键拷贝规范结构化推导文本，便于商务总监汇报与清标答辩。

#### 13. 供应商回函比选与一键智能采纳闭环规范 (QuoteAdoptionModal)
- **设计决策与触发入口**：
  - 当询价中心收到供应商正式回复时，BOQ 组价工作台主材匹配列即时亮起【⚡ 收到 N 家新报价】提醒气泡；
  - 点击行内【⚡ 比选采纳】按钮，弹出横向报价比选看板。
- **核心交互流程**：
  1. **同口径公平比价计算**：
     - 针对多家供应商回复（不同币种、不同交货地），系统自动按全局汇率、运费系数及 30% 关税规则折算至当地货币 DZD；
  2. **最优价智能推荐与价差感知**：
     - 自动标示到港最低价并挂载【推荐最优价】徽标；
     - 实时动态测算若采纳该报价，当前清单项综合单价的变动幅度（如“比现价节省 -5.2%”）；
  3. **一键穿透采纳与全案回填**：
     - 用户点击【一键采纳此报价】，系统即时将该价格写入对应 BOQ 项，自动回填供应商名称、采购币种、关税状态；
     - 同步更新物资总库与历史签单台账，驱动整张 BOQ 工程量清单投标报价总额实时重算；
     - 屏幕右下角弹出高保真成功通知 Toast。

---

### 五、异常处理分支与边界交互规范 (Exception & Edge Cases)

1. **多币种输入精度防溢出**：
   - 所有原币单价保留两位小数，DZD 计算中间值保留四位浮点数，最终展示与合价均执行 \`Math.round()\` 或四舍五入至两位，杜绝前端精度丢失导致的“总分角不平”。
2. **重复邮箱与空输入拦截**：
   - 询价模态框中添加新供应商时，自动正则校验邮箱合法性格式 (\`^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$\`)，发现重复邮箱时提示“该邮箱已在收件列表中”，禁止重复添加。
3. **历史签单导入空值容错**：
   - 若导入文件存在空单价或空规格行，向导在第二步将其标记为红色警告，提供“自动跳过此行”或“手动补全单价”选项，避免脏数据污染物资总库。
4. **BOQ 清单未组价标红警示**：
   - 若某清单项主材单价为 0 或定额工日为 0，主表格在操作列显示红色高亮警告图标【待定项】，导出标书时弹出拦截确认弹窗，提醒商务经理核实缺项。
5. **模板变量未闭合容错**：
   - 用户手写模板变量如漏写花括号（如 \`{{供应商名称\`），预览引擎保持原样输出，并在编辑框下方以黄色标签提示“检测到未闭合变量语法”，引导用户修正。

---

### 六、交付与验收标准

1. **功能完整度**：标书组装、BOQ组价、定额主材双库、历史签单导入、别名映射、邮件询价、报价排序、模板管理、费率测算 9 大板块全部无缝穿透联动。
2. **交互流畅度**：所有表格切换、弹窗唤起、数据重算响应时间均小于 100ms。
3. **数据可靠度**：多币种到岸价与综合单价计算公式严格符合国际工程行业计价准则。
`;

    navigator.clipboard.writeText(markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // 触发浏览器打印（在 index.css 的 @media print 控制下，直接将当前文档打印为纯净高保真 PDF）
  const handlePrintPdf = () => {
    window.print();
  };

  // 生成可独立在浏览器中打开并自动唤起 PDF 打印的独立 HTML 文件下载
  const handleDownloadOfflinePdfHtml = () => {
    const printableElement = document.getElementById('printable-prd-doc');
    if (!printableElement) return;

    const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>海外工程智能造价与供应链协同平台_产品架构与交互逻辑规范_CostOS_v4.2.pdf</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #0f172a;
      background: #ffffff;
      padding: 40px;
      max-width: 1000px;
      margin: 0 auto;
    }
    h1 { font-size: 26px; color: #1e3a8a; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-top: 0; }
    h2 { font-size: 20px; color: #1e40af; margin-top: 32px; border-left: 4px solid #3b82f6; padding-left: 10px; }
    h3 { font-size: 16px; color: #1e293b; margin-top: 24px; }
    h4 { font-size: 14px; color: #334155; margin-top: 18px; }
    p, li { font-size: 13px; color: #334155; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; color: #0f172a; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; background: #e0e7ff; color: #3730a3; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .highlight { background: #fef3c7; padding: 2px 4px; border-radius: 2px; }
    @media print {
      body { padding: 0; }
      @page { margin: 15mm; size: A4; }
    }
  </style>
</head>
<body>
  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 24px;">
    <div><strong>中建二局海外工程商务部 · 研发成果规范</strong></div>
    <div style="font-size: 12px; color: #64748b;">文档版本: CostOS v4.2.0 | 生成时间: 2026-10</div>
  </div>
  ${printableElement.innerHTML}
  <script>
    window.onload = function() {
      // 自动唤起打印为 PDF 对话框
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '海外工程智能造价与供应链协同平台_产品架构与交互逻辑规范(支持一键存为PDF).html');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div
        id="printable-prd-doc-container"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
      >
        {/* 顶部操作控制条 (打印时自动隐藏) */}
        <div className="no-print bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  产品功能清单、系统架构说明与详细交互逻辑规范 (PRD)
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  CostOS v4.2
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                中建二局 · 海外工程商务标组价与采购协同系统
              </p>
            </div>
          </div>

          {/* 核心操作动作组：PDF 下载、PDF 打印、HTML 导出、Markdown 复制 */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadDirectPdfFile}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              title="使用 jsPDF 纯客户端直接生成并下载标准 PDF 文件 (.pdf)"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>生成 PDF 中...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>下载标准 PDF (.pdf)</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrintPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-colors cursor-pointer"
              title="使用浏览器系统打印直接另存为高保真矢量 PDF 文件（含样式与表格）"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>打印 / 另存为 PDF</span>
            </button>

            <button
              onClick={handleDownloadOfflinePdfHtml}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg border border-slate-700 transition-colors cursor-pointer"
              title="下载完整版排版 HTML 文档，打开后自动唤起另存为 PDF"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>离线 HTML</span>
            </button>

            <button
              onClick={handleCopyMarkdown}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg border border-slate-700 transition-colors cursor-pointer"
              title="复制完整 Markdown 文本，可直接粘贴进飞书/语雀/Confluence"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已复制' : '复制 MD'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 快捷导航与分类过滤条 (非打印模式) */}
        <div className="no-print bg-slate-100 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between gap-4 shrink-0 overflow-x-auto text-xs">
          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <span className="text-slate-500">跳转章节：</span>
            <button
              onClick={() => setActiveSection('all')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                activeSection === 'all' ? 'bg-white text-blue-700 font-bold shadow-2xs' : 'hover:bg-slate-200'
              }`}
            >
              完整全景规范
            </button>
            <button
              onClick={() => setActiveSection('arch')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                activeSection === 'arch' ? 'bg-white text-blue-700 font-bold shadow-2xs' : 'hover:bg-slate-200'
              }`}
            >
              产品架构说明
            </button>
            <button
              onClick={() => setActiveSection('features')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                activeSection === 'features' ? 'bg-white text-blue-700 font-bold shadow-2xs' : 'hover:bg-slate-200'
              }`}
            >
              产品功能清单矩阵
            </button>
            <button
              onClick={() => setActiveSection('interaction')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                activeSection === 'interaction' ? 'bg-white text-blue-700 font-bold shadow-2xs' : 'hover:bg-slate-200'
              }`}
            >
              详细交互逻辑规范
            </button>
            <button
              onClick={() => setActiveSection('calc')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                activeSection === 'calc' ? 'bg-white text-blue-700 font-bold shadow-2xs' : 'hover:bg-slate-200'
              }`}
            >
              算费与汇率引擎
            </button>
          </div>

          <div className="text-slate-500 flex items-center gap-1.5 shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>企业级工程规范 · 支持 A4 页面导出</span>
          </div>
        </div>

        {/* 核心文档内容区 (可打印与滚动的富文本正文) */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-white">
          <div id="printable-prd-doc" className="max-w-4xl mx-auto space-y-10 text-slate-900 leading-relaxed">
            
            {/* 文档封面头 */}
            <div className="border-b border-slate-300 pb-8">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-widest mb-2">
                <span>CSCEC Overseas Engineering System Specification</span>
                <span>•</span>
                <span>Product Requirements Document (PRD)</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                海外工程智能造价与供应链协同平台 (CostOS v4.2)
              </h1>
              <p className="text-lg text-slate-600 font-medium mt-1">
                产品功能清单、系统架构说明与详细交互逻辑规范手册
              </p>

              {/* 元数据卡片 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600">
                <div>
                  <span className="text-slate-400 block mb-0.5">编制主体</span>
                  <span className="font-semibold text-slate-800">中建二局海外工程商务部</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">基准示范工程</span>
                  <span className="font-semibold text-slate-800">阿尔及利亚 240 床综合医院</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">规范版本</span>
                  <span className="font-semibold text-blue-700 font-mono">v4.2.0 (Release)</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">发布日期</span>
                  <span className="font-semibold text-slate-800">2026年10月</span>
                </div>
              </div>
            </div>

            {/* 第一部分：业务背景与系统定位 */}
            {(activeSection === 'all' || activeSection === 'arch') && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-blue-700 font-bold text-lg border-l-4 border-blue-600 pl-3">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <h2>一、产品定位与核心业务背景</h2>
                </div>

                <div className="prose text-sm text-slate-700 space-y-3">
                  <p>
                    海外大型工程总承包 (EPC) 投标业务场景具有高度的复杂性。以中建二局在北非（阿尔及利亚等法标国家）承接的医疗与公建标段为例，传统依赖多名造价工程师各自维护本地 Excel 表格的做法存在严重的业务瓶颈：
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <h4 className="font-bold text-slate-900 text-xs mb-1.5 flex items-center gap-1.5 text-blue-700">
                        <span>1. 中外技术标准与语言差异</span>
                      </h4>
                      <p className="text-xs text-slate-600">
                        国内物料清单与法标、欧标（NF/CENELEC/IEC）描述不一致。若仅按中文名称采购，极易出现法方监理验收不符、海关清关退运等“货不对版”重大违约。
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <h4 className="font-bold text-slate-900 text-xs mb-1.5 flex items-center gap-1.5 text-blue-700">
                        <span>2. 混合币种与多层国际税费</span>
                      </h4>
                      <p className="text-xs text-slate-600">
                        采购涉及人民币 (CNY) 设备出口、欧元 (EUR) 欧洲原产辅材、当地第纳尔 (DZD) 安装劳务，叠加海运保险与阿尔及利亚严苛的 30% 清关关税，汇率手工计算极易算错。
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <h4 className="font-bold text-slate-900 text-xs mb-1.5 flex items-center gap-1.5 text-blue-700">
                        <span>3. 询价流程割裂与比价低效</span>
                      </h4>
                      <p className="text-xs text-slate-600">
                        邮件分散发送、无规范模板，各厂家报价口径不一（到厂价、离岸价、含税价），缺乏对多家供应商报价的高低排序、价差分析与一键采纳穿透量单机制。
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <h4 className="font-bold text-slate-900 text-xs mb-1.5 flex items-center gap-1.5 text-blue-700">
                        <span>4. 历史签单经验资产流失</span>
                      </h4>
                      <p className="text-xs text-slate-600">
                        往期成功履约合同数据散落在纸质档案或离职员工电脑中，无法在新项目中直接批量导入匹配并赋予价格置信度。
                      </p>
                    </div>
                  </div>

                  <p className="font-medium text-slate-900">
                    <strong>系统定位：</strong>打造企业级海外工程智能造价与供应链协同 SaaS 平台，打通“标书组装 - BOQ组价 - 物资双库 - 询价比价 - 费率引擎”五大核心子系统，实现全流程数字化、标准化与协同化。
                  </p>
                </div>
              </section>
            )}

            {/* 第二部分：产品全景架构说明 */}
            {(activeSection === 'all' || activeSection === 'arch') && (
              <section className="space-y-6 pt-4">
                <div className="flex items-center gap-2 text-blue-700 font-bold text-lg border-l-4 border-blue-600 pl-3">
                  <Workflow className="w-5 h-5 text-blue-600" />
                  <h2>二、产品全景架构说明 (Architecture)</h2>
                </div>

                {/* 2.1 整体信息架构 */}
                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-slate-900">2.1 整体信息架构 (Information Architecture)</h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <div className="bg-slate-100 p-3 font-bold text-slate-800 border-b border-slate-200">
                      CostOS 顶层功能架构布局 (Top-Level Information Architecture)
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200 bg-white">
                      <div className="p-3.5 space-y-2">
                        <div className="font-bold text-blue-700 flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5" />
                          <span>1. 标书组装与组价工作台</span>
                        </div>
                        <ul className="text-slate-600 space-y-1 list-disc list-inside">
                          <li>标书章节大纲装配画布</li>
                          <li>动态变量高亮与侧栏替换</li>
                          <li>BOQ 工程量清单 15 列组价</li>
                          <li>工日定额/主材到岸明细抽屉</li>
                          <li>人工基准单价滑动调价器</li>
                        </ul>
                      </div>

                      <div className="p-3.5 space-y-2">
                        <div className="font-bold text-blue-700 flex items-center gap-1">
                          <Database className="w-3.5 h-3.5" />
                          <span>2. 物资与历史签单库</span>
                        </div>
                        <ul className="text-slate-600 space-y-1 list-disc list-inside">
                          <li>安装定额库与主材采购总库</li>
                          <li>历史签单台账展示与过滤</li>
                          <li>三步批量导入向导 (Excel/CSV)</li>
                          <li>1年内时效自动标记与置信度</li>
                          <li>材料智能别名映射与对齐</li>
                        </ul>
                      </div>

                      <div className="p-3.5 space-y-2">
                        <div className="font-bold text-blue-700 flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" />
                          <span>3. 询价与供应链中心</span>
                        </div>
                        <ul className="text-slate-600 space-y-1 list-disc list-inside">
                          <li>询价任务大厅与外发台账</li>
                          <li>多供应商比选看板 (价格排序)</li>
                          <li>最低价标识与价差计算</li>
                          <li>一键采纳入库穿透量单</li>
                          <li>邮件模板管理 (按供应商类别)</li>
                        </ul>
                      </div>

                      <div className="p-3.5 space-y-2">
                        <div className="font-bold text-blue-700 flex items-center gap-1">
                          <Sliders className="w-3.5 h-3.5" />
                          <span>4. 国际费率测算引擎</span>
                        </div>
                        <ul className="text-slate-600 space-y-1 list-disc list-inside">
                          <li>多币种基准汇率实时调节</li>
                          <li>海运费率与货运险率配置</li>
                          <li>阿尔及利亚 30% 关税开关</li>
                          <li>标段综合管理费与利润系数</li>
                          <li>全量清单重算推演</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2.2 核心业务流程流向 */}
                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-slate-900">2.2 核心业务闭环流程 (Core Business Workflow)</h3>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-700 font-mono">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold">Step 1</span>
                      <span>招标拆解：导入海外法文 BOQ 清单，解析中文规范对齐项与工程量</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold">Step 2</span>
                      <span>双库匹配：智能检索历史签单库与物资总库，计算初始匹配置信度 (80%~96%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold">Step 3</span>
                      <span>定向询价：对无签单依据物资，选用对应品类模板一键向多供应商发送独立询价邮件</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold">Step 4</span>
                      <span>比价排序：供应商回复报价，看板按单价升序排列，标记最低价与差额比，一键采纳入库</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold">Step 5</span>
                      <span>费率穿透：汇率与30%关税自动折算，人工基准单价推演，生成总报价与标书全文本导出</span>
                    </div>
                  </div>
                </div>

                {/* 2.3 计算引擎架构 */}
                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-slate-900">2.3 综合单价与清关税费计算引擎模型</h3>
                  <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl space-y-2 text-xs text-slate-700">
                    <p className="font-semibold text-blue-900">核心组价公式体系：</p>
                    <ul className="list-disc list-inside space-y-1 font-mono text-[11px]">
                      <li>
                        <strong>安装费 (DZD)</strong> = 清单项定额工日 × 全局人工基准工日单价 (DZD/工日)
                      </li>
                      <li>
                        <strong>主材到岸完税费 (DZD)</strong> = [主材原币单价 × 对应汇率] × (1 + 海运险率) × (1 + [若适用关税 ? 30% : 0%])
                      </li>
                      <li>
                        <strong>直接费合计 (DZD)</strong> = 安装费 (DZD) + 主材到岸完税费 (DZD)
                      </li>
                      <li>
                        <strong>综合单价 (DZD)</strong> = 直接费合计 × (1 + 间接费率 8%) × (1 + 利润率 12%)
                      </li>
                      <li>
                        <strong>分项综合合价 (DZD)</strong> = 综合单价 (DZD) × 清单工程量
                      </li>
                    </ul>
                  </div>
                </div>
              </section>
            )}

            {/* 第三部分：全景产品功能清单 */}
            {(activeSection === 'all' || activeSection === 'features') && (
              <section className="space-y-4 pt-4">
                <div className="flex items-center gap-2 text-blue-700 font-bold text-lg border-l-4 border-blue-600 pl-3">
                  <Table className="w-5 h-5 text-blue-600" />
                  <h2>三、全景产品功能清单矩阵 (Feature Matrix)</h2>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                        <th className="p-2.5">模块</th>
                        <th className="p-2.5">功能点名称</th>
                        <th className="p-2.5">输入要素</th>
                        <th className="p-2.5">业务处理逻辑</th>
                        <th className="p-2.5">产出与界面状态</th>
                        <th className="p-2.5">业务价值</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700">
                      <tr>
                        <td className="p-2.5 font-bold text-blue-800" rowSpan={3}>标书组装工作台</td>
                        <td className="p-2.5 font-semibold">标书章节大纲画布</td>
                        <td className="p-2.5">章节树、模版块</td>
                        <td className="p-2.5">拖拽排序、增删章节</td>
                        <td className="p-2.5">多章节连贯标书条款</td>
                        <td className="p-2.5">结构化管理标书大纲</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-semibold">变量高亮与侧栏替换</td>
                        <td className="p-2.5">项目名称、工期变量</td>
                        <td className="p-2.5">正则查找替换、DOM高亮动画</td>
                        <td className="p-2.5">变量双向绑定、即时替换</td>
                        <td className="p-2.5">杜绝标书笔误与违约</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-semibold">标书条款汇总导出</td>
                        <td className="p-2.5">替换后章节文本</td>
                        <td className="p-2.5">章节拼装、标头标尾格式化</td>
                        <td className="p-2.5">TXT/Word 格式文件下载</td>
                        <td className="p-2.5">交付最终投标商务标本</td>
                      </tr>

                      <tr className="bg-slate-50/50">
                        <td className="p-2.5 font-bold text-blue-800" rowSpan={4}>BOQ组价工作台</td>
                        <td className="p-2.5 font-semibold">中法双语清单展示</td>
                        <td className="p-2.5">双语描述、规范代号</td>
                        <td className="p-2.5">15列宽表展现，标段分组</td>
                        <td className="p-2.5">中法对照清包工/主材项</td>
                        <td className="p-2.5">跨越法标语言障碍</td>
                      </tr>
                      <tr className="bg-slate-50/50">
                        <td className="p-2.5 font-semibold">产地与关税动态切换</td>
                        <td className="p-2.5">国内/欧洲/本地产地</td>
                        <td className="p-2.5">中国产地默认关联 +30%关税</td>
                        <td className="p-2.5">综合单价实时重算</td>
                        <td className="p-2.5">精准把控跨国清关税负</td>
                      </tr>
                      <tr className="bg-slate-50/50">
                        <td className="p-2.5 font-semibold">成本拆解明细抽屉</td>
                        <td className="p-2.5">清单项选中事件</td>
                        <td className="p-2.5">穿透提取人工工日与到岸公式</td>
                        <td className="p-2.5">三层成本拆解树展示</td>
                        <td className="p-2.5">精细化成本核算与审查</td>
                      </tr>
                      <tr className="bg-slate-50/50">
                        <td className="p-2.5 font-semibold">人工基准滑动调价</td>
                        <td className="p-2.5">工日单价(DZD)</td>
                        <td className="p-2.5">滑块输入联动全标段重算</td>
                        <td className="p-2.5">总报价变动幅度与风险度</td>
                        <td className="p-2.5">快速推演劳务成本波动</td>
                      </tr>

                      <tr>
                        <td className="p-2.5 font-bold text-blue-800" rowSpan={3}>物资与历史双库</td>
                        <td className="p-2.5 font-semibold">定额与主材总库</td>
                        <td className="p-2.5">材料分类、技术规格</td>
                        <td className="p-2.5">分类筛选、模糊检索、手工新增</td>
                        <td className="p-2.5">企业标准造价物资字典</td>
                        <td className="p-2.5">沉淀海外工程核心参数</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-semibold">历史签单导入向导</td>
                        <td className="p-2.5">Excel/CSV/JSON/剪贴板</td>
                        <td className="p-2.5">自动解析映射、1年时效标识</td>
                        <td className="p-2.5">历史签单库追加与BOQ置信度联动</td>
                        <td className="p-2.5">一键盘活往期中标工程数据</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-semibold">材料智能别名映射</td>
                        <td className="p-2.5">中法文材料别名标签</td>
                        <td className="p-2.5">同义词索引、在线语义试算</td>
                        <td className="p-2.5">高精度语义对齐与自动提示</td>
                        <td className="p-2.5">消除多语种命名歧义</td>
                      </tr>

                      <tr className="bg-slate-50/50">
                        <td className="p-2.5 font-bold text-blue-800" rowSpan={4}>询价协同中心</td>
                        <td className="p-2.5 font-semibold">多供应商并发邮件询价</td>
                        <td className="p-2.5">企业邮箱勾选/扩展</td>
                        <td className="p-2.5">生成单独致函邮件，挂载工程图</td>
                        <td className="p-2.5">外发台账记录生成</td>
                        <td className="p-2.5">避免抄送泄密，专业合规</td>
                      </tr>
                      <tr className="bg-slate-50/50">
                        <td className="p-2.5 font-semibold">报价按价格排序比选</td>
                        <td className="p-2.5">多家供应商报价回复</td>
                        <td className="p-2.5">折算统一币种，支持升序/降序</td>
                        <td className="p-2.5">金牌最低价标识与价差百分比</td>
                        <td className="p-2.5">一目了然确定最具性价比</td>
                      </tr>
                      <tr className="bg-slate-50/50">
                        <td className="p-2.5 font-semibold">一键采纳入库穿透量单</td>
                        <td className="p-2.5">采纳某供应商报价</td>
                        <td className="p-2.5">更新物资库单价并联动 BOQ 刷新</td>
                        <td className="p-2.5">量单综合单价毫秒级重算</td>
                        <td className="p-2.5">实现询价组价无缝闭环</td>
                      </tr>
                      <tr className="bg-slate-50/50">
                        <td className="p-2.5 font-semibold">一键生成专业商务回复</td>
                        <td className="p-2.5">供应商报价状态</td>
                        <td className="p-2.5">智能适配采纳确认/议价/谢绝函</td>
                        <td className="p-2.5">正式商务邮件草稿与复制</td>
                        <td className="p-2.5">极大提高商务往来效率</td>
                      </tr>

                      <tr>
                        <td className="p-2.5 font-bold text-blue-800" rowSpan={3}>邮件模板管理</td>
                        <td className="p-2.5 font-semibold">供应商类别专属模板</td>
                        <td className="p-2.5">设备厂/承包商/经销商</td>
                        <td className="p-2.5">分类维护差异化条款（FOB/CIF）</td>
                        <td className="p-2.5">模板分类库</td>
                        <td className="p-2.5">符合不同厂商商务惯例</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-semibold">预设变量插槽快捷栏</td>
                        <td className="p-2.5">点击变量插槽标签</td>
                        <td className="p-2.5">在光标处插入占位符标签</td>
                        <td className="p-2.5">如 &#123;&#123;供应商名称&#125;&#125;</td>
                        <td className="p-2.5">免记语法，点选即可配置</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-semibold">真实工程数据实时预览</td>
                        <td className="p-2.5">模板草稿内容</td>
                        <td className="p-2.5">模拟实际项目参数渲染正文</td>
                        <td className="p-2.5">真实收函效果所见即所得</td>
                        <td className="p-2.5">提前发现占位符遗漏</td>
                      </tr>

                      <tr className="bg-blue-50/40">
                        <td className="p-2.5 font-bold text-blue-800" rowSpan={2}>价格审计与闭环</td>
                        <td className="p-2.5 font-semibold">综合单价透明推导与数据血统</td>
                        <td className="p-2.5">[fx 公式] 点击触发</td>
                        <td className="p-2.5">五维构成占比、步骤式到岸加税公式、数据源合同追溯</td>
                        <td className="p-2.5">沉浸式剖析卡片与公式文本一键复制</td>
                        <td className="p-2.5">杜绝报价黑盒，满足投标清标审计</td>
                      </tr>
                      <tr className="bg-blue-50/40">
                        <td className="p-2.5 font-semibold">供应商回函一键智能采纳</td>
                        <td className="p-2.5">[⚡比选采纳] 按钮</td>
                        <td className="p-2.5">多商报价折合 DZD 横向排布、价差感知、一键回填量单</td>
                        <td className="p-2.5">自动更新量单原币价、关税及合价</td>
                        <td className="p-2.5">从询价到投标量单1秒闭环</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* 第四部分：详细交互逻辑规范 */}
            {(activeSection === 'all' || activeSection === 'interaction') && (
              <section className="space-y-6 pt-4">
                <div className="flex items-center gap-2 text-blue-700 font-bold text-lg border-l-4 border-blue-600 pl-3">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <h2>四、详细系统交互逻辑规范 (Interaction Specification)</h2>
                </div>

                {/* 4.1 标书组装工作台交互 */}
                <div className="space-y-2 border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs">1</span>
                    标书组装画布与动态变量侧边栏交互逻辑
                  </h3>
                  <div className="text-xs text-slate-700 space-y-2">
                    <p><strong>前置状态：</strong>用户进入【标书组装与组价工作台】，左侧显示章节目录树，右侧展示全局变量卡片，中间为条款编辑画布。</p>
                    <ul className="list-disc list-inside space-y-1.5 ml-2">
                      <li>
                        <strong>变量定位与呼吸灯高亮交互：</strong>用户在右侧面板点击任一变量（如【投标有效期】）。系统获取该变量在中间 DOM 节点的坐标，执行平滑滚动 (<code className="bg-slate-200 px-1 rounded">scrollIntoView({'{'} behavior: 'smooth' {'}'})</code>)；页面中的变量标签获得黄色呼吸灯闪烁样式（持续 1.5 秒），右侧输入框自动获焦。
                      </li>
                      <li>
                        <strong>变量实时替换与双向数据流：</strong>用户在右侧输入框修改变量值（如将“90天”改为“120天”），无须点击保存，正文区所有绑定该键值的占位符均在 50ms 内响应刷新；顶部状态栏显示“保存中...”并在 300ms 后变为“已同步”。
                      </li>
                      <li>
                        <strong>章节卡片折叠与增删：</strong>每个章节右上角提供折叠展开箭头与删除按钮。删除章节时弹出确认框（“确定移除本条款吗？”），确认后平滑移除，右侧变量面板自动重新统计剩余变量引用频次。
                      </li>
                    </ul>
                  </div>
                </div>

                {/* 4.2 BOQ组价清单交互 */}
                <div className="space-y-2 border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs">2</span>
                    BOQ 15列表格组价与关税切换交互逻辑
                  </h3>
                  <div className="text-xs text-slate-700 space-y-2">
                    <p><strong>前置状态：</strong>用户切换至【BOQ工程量清单与分部分项组价】，展示强电施工标段所有清单子项。</p>
                    <ul className="list-disc list-inside space-y-1.5 ml-2">
                      <li>
                        <strong>产地与关税联动规则：</strong>用户点击产地下拉菜单切换产地。
                        <br />- 选择【中国国内】：币种自动保持 CNY，系统强制勾选【+30%关税】，右侧主材折算费自动按公式 <code className="bg-slate-200 px-1 rounded">原币 × 18.5 × 1.035 × 1.30</code> 刷新；
                        <br />- 选择【欧洲原产】：币种自动切为 EUR，按 EUR 汇率折算；
                        <br />- 选择【阿尔及利亚本地】：币种切为 DZD，关税复选框自动取消并禁用（免关税）。
                      </li>
                      <li>
                        <strong>实时重算防抖与视觉反馈：</strong>当单价、工日或币种变动时，该行的综合单价单元格背景执行 800ms 浅绿色淡入淡出动效，提示商务人员该数值已重新计算。
                      </li>
                      <li>
                        <strong>侧边明细抽屉穿透：</strong>点击操作列【测算明细】，右侧滑出详细计算树，主页面背景适度遮罩，按 Esc 键或点击遮罩区即可关闭。
                      </li>
                    </ul>
                  </div>
                </div>

                {/* 4.3 历史签单导入向导交互 */}
                <div className="space-y-2 border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs">3</span>
                    历史签单批量导入向导与 BOQ 置信度穿透交互逻辑
                  </h3>
                  <div className="text-xs text-slate-700 space-y-2">
                    <p><strong>前置状态：</strong>在【工程物资与历史签单库】点击【批量导入历史签单】按钮。</p>
                    <ul className="list-disc list-inside space-y-1.5 ml-2">
                      <li>
                        <strong>模版下载与多模态解析：</strong>向导首屏提供【下载标准 CSV 模板】。用户既可点击上传本地文件，也可直接将 Excel 中的多行多列直接 Ctrl+V 粘贴进文本区；点击【下一步：解析并校验】。
                      </li>
                      <li>
                        <strong>时效性校验与置信度打标：</strong>系统根据每行签约时间计算距今日月数。若小于 12 个月，打上绿色【1年内有效】标签，并标明置信度为 96%；若超过 12 个月，打上黄色【超期参考】标签。
                      </li>
                      <li>
                        <strong>自动穿透提升 BOQ 置信度：</strong>用户点击【确认导入并联动主库】。系统不仅将数据写入历史签单表，更在后台遍历当前标段的 BOQ 清单。若发现匹配材料（如接地裸铜线），立即将 BOQ 中该项的置信度由原来的 75% 提升至 96%，并替换为该历史成交价，弹出成功提示，向导自动关闭。
                      </li>
                    </ul>
                  </div>
                </div>

                {/* 4.4 供应商多商询价与价格排序比选交互 */}
                <div className="space-y-2 border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs">4</span>
                    多供应商邮件询价与报价比选看板交互逻辑
                  </h3>
                  <div className="text-xs text-slate-700 space-y-2">
                    <p><strong>前置状态：</strong>在询价中心或量单行点击【发起邮件询价】。</p>
                    <ul className="list-disc list-inside space-y-1.5 ml-2">
                      <li>
                        <strong>供应商企业邮箱选择与独立致函：</strong>弹窗列出合格供应商多选框，支持勾选多家同时询价；用户也可点击【+ 新增供应商邮箱】输入自定义企业邮箱。系统严格按照一企一信原则生成独立致函邮件，避免抄送泄密。
                      </li>
                      <li>
                        <strong>报价看板按价格高低智能排序：</strong>在比价看板中，用户点击【单价从低到高 ↑】按钮。各家报价卡片按折算后的 DZD 单价升序排布。排在第一位的供应商卡片顶部自动呈现金色皇冠【最低报价推荐】，其余卡片标注与最低价的溢价比例（如“+16.4%”）。
                      </li>
                      <li>
                        <strong>一键采纳入库闭环：</strong>点击任意报价右侧的【采纳此报价入库】。系统弹出微确认，确认后该项报价标记为已采纳，对应物资单价更新，同时联动重算 BOQ 综合单价。
                      </li>
                      <li>
                        <strong>一键生成专业商务回复邮件：</strong>点击【生成回复邮件】，系统根据是否采纳智能预设【中标采纳协议确认函】或【商务议价函】。用户可在线修改正文，并一键复制或调用邮件客户端。
                      </li>
                    </ul>
                  </div>
                </div>

                {/* 4.5 邮件模板管理器交互 */}
                <div className="space-y-2 border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs">5</span>
                    邮件模板管理器分类与预设变量插槽交互逻辑
                  </h3>
                  <div className="text-xs text-slate-700 space-y-2">
                    <p><strong>前置状态：</strong>进入询价中心，切换至【邮件模板管理】标签。</p>
                    <ul className="list-disc list-inside space-y-1.5 ml-2">
                      <li>
                        <strong>供应商类别分类切换：</strong>点击【设备厂商】、【服务承包商】、【分包劳务】等胶囊，列表筛选出对应的专业范式。
                      </li>
                      <li>
                        <strong>变量插槽一键点选插入：</strong>在正文编辑框定位光标后，点击上方的预设变量按钮（如 <code className="bg-slate-200 px-1 rounded">&#123;&#123;询价材料清单&#125;&#125;</code>），系统在光标所在字符位置精确插入该变量标签，输入框保持获焦状态。
                      </li>
                      <li>
                        <strong>真实工程数据实时预览：</strong>页面下方常驻预览区，系统自动载入当前标段真实数据（工程名称、交货地点、联络人），所见即所得展示该模板生成后的最终真实邮件样貌。
                      </li>
                    </ul>
                  </div>
                </div>

                {/* 4.6 全景视图自适应调节引擎交互 */}
                <div className="space-y-2 border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs">6</span>
                    全景视图自适应调节引擎（容器宽度、显示比例与表格密度）交互逻辑
                  </h3>
                  <div className="text-xs text-slate-700 space-y-2">
                    <p><strong>前置状态：</strong>位于任意工作台，点击顶栏或 BOQ 工具栏【显示自适应调节】控件。</p>
                    <ul className="list-disc list-inside space-y-1.5 ml-2">
                      <li>
                        <strong>全宽与宽屏弹性切换：</strong>提供【全宽自适应 (100% 满屏)】、【宽屏工作台 (1720px)】、【标准居中 (1280px)】三档布局。点击瞬时切换外层容器 CSS 类名，大屏显示器无需横向局促居中，表格横向信息利用率提高 40% 以上。
                      </li>
                      <li>
                        <strong>无级步进式缩放引擎：</strong>支持 85% ~ 130% 范围缩放调节。点击【-】缩小界面，点击【+】放大界面，点击当前百分比或【100% 重置】一键恢复标准视口，保证多终端高清矢量无损渲染。
                      </li>
                      <li>
                        <strong>表格数据密度切换：</strong>提供【舒适大字】、【标准】、【紧凑高密】三档选项。选择【舒适大字】时，单元格文字与内边距自动扩充，彻底解决高分屏用户浏览器缩放后文字过小、辨析困难的痛点。
                      </li>
                      <li>
                        <strong>标书组装画布视口弹性贴合：</strong>标书章节画布采用 <code className="bg-slate-200 px-1 rounded">calc(100vh - 140px)</code> 动态视口高度，根据用户当前显示器自动撑满垂直屏幕，避免固定高度导致的底部留白或嵌套双滚动条。
                      </li>
                    </ul>
                  </div>
                </div>

                {/* 4.7 顶栏信息减负与业务面包屑流转交互 */}
                <div className="space-y-2 border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs">7</span>
                    顶栏信息减负与业务面包屑流转交互逻辑
                  </h3>
                  <div className="text-xs text-slate-700 space-y-2">
                    <p><strong>前置状态：</strong>用户在左侧侧边栏切换不同功能域与业务工作台。</p>
                    <ul className="list-disc list-inside space-y-1.5 ml-2">
                      <li>
                        <strong>顶栏降噪原则：</strong>移除原顶部常驻的静态截标倒计时与固定汇率标签，消除不必要的视觉干扰；相关业务参数下沉至各业务专区。
                      </li>
                      <li>
                        <strong>组价工作台去冗余：</strong>移除组价工作台主界面多余的【自适应: 全宽/宽屏/标准】、【100% 缩放】及【舒适大字/标准/紧凑】文字控件，无需暴露给客户，视线专注于专业双语组价业务本身。
                      </li>
                      <li>
                        <strong>动态业务面包屑流转：</strong>顶栏左侧随侧边栏选中项联动呈现三级路径（如【标书与组价作业流 &gt; CFO 强电量单智能组价台】），并标明当前所属示范标段，让多人员协同作业时始终拥有清晰的上下文方位感。
                      </li>
                      <li>
                        <strong>全局核心快捷动作常驻：</strong>保留侧边栏展开/收起切换、自适应调节浮窗、产品规范 PDF 预览与报价总表导出四大高频核心操作。
                      </li>
                    </ul>
                  </div>
                </div>

                {/* 4.8 综合单价透明推导与数据血统审计交互 */}
                <div className="space-y-2 border border-blue-200 rounded-xl p-4 bg-blue-50/30">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">8</span>
                    综合单价 Hover 悬浮公式透视与数据血统审计交互逻辑
                  </h3>
                  <div className="text-xs text-slate-700 space-y-2">
                    <p><strong>前置状态：</strong>位于 BOQ 组价工作台，鼠标移动至综合单价单元格或点击 [fx 公式] 芯片按钮。</p>
                    <ul className="list-disc list-inside space-y-1.5 ml-2">
                      <li>
                        <strong>Hover 悬浮即时透视 (PriceFormulaHoverCard)：</strong>鼠标悬停在综合单价单元格时，即刻弹出非遮挡式悬浮卡片，高亮展示核心数学模型 <code className="bg-blue-100/70 text-blue-900 px-1 rounded">[原币 × 汇率] × (1+关税) × (1+运杂) + 安装定额 = 直接费</code>，并将该行真实数据逐项代入，消除黑盒疑虑。
                      </li>
                      <li>
                        <strong>单价审计沉浸式弹窗：</strong>点击调出价格推导卡片，顶部直观呈现最终核定综合单价（DZD）、总价及 96% 置信度评级。
                      </li>
                      <li>
                        <strong>五维构成动态占比分解条：</strong>彩色进度条拆解主材采购、国际运杂与进口关税、安装人工、辅材机械及综合管理取费各自百分比与数额。
                      </li>
                      <li>
                        <strong>数据血统凭证溯源：</strong>清楚列明主材单价来源（历史签单合同编号、选定供应商、原币出厂价、产地国及是否加收30%关税）与定额工日基准来源。
                      </li>
                      <li>
                        <strong>步骤式分步数学演算：</strong>透明展示主材到港 CIF 折算、人工定额（工日×6500）、辅材机械系数及 10% 取费加成全部算式。
                      </li>
                      <li>
                        <strong>一键结构化公式复制：</strong>点击【复制推导公式】，将结构化计算步骤拷贝至剪贴板，便于商务人员粘贴至标前澄清答辩文件。
                      </li>
                    </ul>
                  </div>
                </div>

                {/* 4.9 供应商回函比选与一键智能采纳闭环交互 */}
                <div className="space-y-2 border border-emerald-200 rounded-xl p-4 bg-emerald-50/30">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">9</span>
                    供应商回函比选与一键智能采纳闭环交互逻辑 (QuoteAdoptionModal)
                  </h3>
                  <div className="text-xs text-slate-700 space-y-2">
                    <p><strong>前置状态：</strong>询价中心收到供应商正式回复，BOQ 清单对应行亮起【⚡收到新报价】提醒。</p>
                    <ul className="list-disc list-inside space-y-1.5 ml-2">
                      <li>
                        <strong>行内回函触达感知：</strong>工作台主材列通过闪电徽标提醒造价师有待比选回函；同时顶部过滤栏提供【有新回函/待比选】快速筛选项。
                      </li>
                      <li>
                        <strong>同口径到港折算比价：</strong>比选弹窗将各家不同币种报价（EUR、CNY、DZD）按汇率、国际运杂（9%）与关税统一折算为当地 DZD，实现公平同口径比选。
                      </li>
                      <li>
                        <strong>最低价推荐与价差预测：</strong>自动挂载【推荐最优价】金色徽标，并预估采纳后当前清单项综合单价的降幅（如 -5.2%）。
                      </li>
                      <li>
                        <strong>一键穿透采纳与全案重算：</strong>点击【一键采纳此报价】，即时回填单价、币种与供应商，并同步入库物资总库和历史签单库，全标段投标总报价实时刷新，弹出成功 Toast。
                      </li>
                    </ul>
                  </div>
                </div>
              </section>
            )}

            {/* 第五部分：异常处理与边界规范 */}
            {(activeSection === 'all' || activeSection === 'calc') && (
              <section className="space-y-4 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 text-blue-700 font-bold text-lg border-l-4 border-blue-600 pl-3">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <h2>五、异常处理与边界交互规范 (Exception & Edge Cases)</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      1. 零单价与缺项告警拦截
                    </h4>
                    <p className="text-slate-600">
                      若 BOQ 清单项未匹配到任何报价且人工工日为 0，表格操作列展示红色告警感叹号。导出标书时强制弹出阻断确认框，防止未报价标段流标。
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      2. 多币种高精度防丢机制
                    </h4>
                    <p className="text-slate-600">
                      所有原币与汇率运算在底层保持四位浮点精度，仅在界面展现与合价计算时使用四舍五入，杜绝由于分位舍入累积导致的“总合价与分项合价不平”问题。
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      3. 非法邮箱与重复添加拦截
                    </h4>
                    <p className="text-slate-600">
                      用户手动添加供应商邮箱时，前端执行标准 RFC 邮箱正则校验；若输入已在收件列表中的重复邮箱，立即提示“该企业邮箱已添加”，禁止重复发送。
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      4. 模板未闭合语法容错
                    </h4>
                    <p className="text-slate-600">
                      若用户在邮件模板中手动输入残缺变量（如 &#123;&#123;项目名称 漏掉后闭合），解析器保持原样字符输出并不触发页面白屏，并在预览区以黄色告警提示语法未闭合。
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* 文档尾部签名与审计区 */}
            <div className="pt-8 border-t border-slate-300 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span>中建二局海外工程商务部 · 数智造价研发组编制</span>
                <span className="mx-2">|</span>
                <span>遵循 FIDIC 国际工程招标商务合同规范</span>
              </div>
              <div className="font-mono text-slate-400">
                DOC_ID: PRD-CSCEC2-2026-COSTOS-V4.2 • A4/PDF READY
              </div>
            </div>

          </div>
        </div>

        {/* 底部浮层操作栏 (非打印模式) */}
        <div className="no-print bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>文档已校验完成，随时可一键另存为高保真 PDF 供领导或团队审阅</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadDirectPdfFile}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>生成 PDF 中...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>下载标准 PDF (.pdf)</span>
                </>
              )}
            </button>
            <button
              onClick={handlePrintPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>立即打印 / 另存为 PDF</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              关闭窗口
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
