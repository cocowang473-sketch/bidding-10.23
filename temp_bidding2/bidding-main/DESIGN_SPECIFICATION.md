# 海外工程智能投标系统 (CostOS) · 平台设计规范与新增功能实施指南

本文档为平台后续新增功能、Restyling 或模块重构的标准设计宪章与开发指引，确保团队在扩展系统时保持视觉语言统一、业务逻辑严谨、交互符合企业级 B 端 SaaS 标准。

---

## 一、 核心设计价值观与反原型化戒律 (Design Philosophy & Anti-Slop Rules)

### 1. 企业级商业 B 端 SaaS 定位
- **对标标杆**：广联达造价平台、SAP Ariba、Procore、Linear、Stripe Dashboard。
- **业务场景**：面向海外工程商务部、造价工程师、法务合同专家，界面风格应当**克制、沉稳、严谨、精密**。
- **色彩主基调**：以深空海军蓝 (`slate-900`) 与企业科技蓝 (`blue-600` / `blue-700`) 为骨架，严禁使用非企业级的高饱和度霓虹渐变或糖果色。

### 2. 严厉禁止的“原型/AI 痕迹” (Banned Anti-Patterns)
- ❌ **严禁把内部原型调试标记写在界面上**：如 `方案 A / 方案 B`、`v4.2.0-preview`、`调试控制台` 等，对外必须是一套确定的、正式的商业化版本。
- ❌ **严禁胶囊药丸徽标堆叠 (Zero-Pill Discipline)**：
  - 静态元数据（国别、时间、币种、合同号）必须以**未封箱的干净文本**加标点分隔符（`·`）排布，严禁连续堆叠 3~4 个 `rounded-full` 药丸标签。
  - 仅支持两种容器标签：
    1. **可点击的交互式分段控制器 (Segmented Controls)**：按钮矩阵（如全部/测算中/已锁定）。
    2. **极其紧凑的等宽字状态计数标**：`text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700`。
- ❌ **严禁死链接或占位虚假卡片**：每一个卡片和按钮都必须具备可运行的交互事件、弹窗、跳转或数据联动。

---

## 二、 色彩系统与语义规范 (Color System & Semantic Tokens)

在招标与造价体系中，颜色具备极强的业务法律效应，**严禁混用**：

| 语义角色 | Tailwind 类名 | 业务规定场景 |
| :--- | :--- | :--- |
| **已提取原件内容 (绿色)** | `bg-emerald-50/60 text-emerald-950 border-emerald-300 border-l-4 border-l-emerald-500` | **专属于从官方招标文件原件中精准提取的内容**，附带置信度与法文条款出处。严禁未确认内容标绿！ |
| **待确认建议项 (中性底色)** | `bg-white hover:bg-slate-50 border-slate-200 border-l-4 border-l-slate-300 text-slate-800` | **专属于系统建议填报、待人工核验复核的内容**。保持纯净底色（不标绿色），必须配有“待确认理由”与“一键确认采纳”按钮。 |
| **主操作 / 品牌蓝** | `bg-blue-600 hover:bg-blue-700 text-white` | 一级保存、确认提交、进入工作台、双库匹配等主要行动点 (CTA)。 |
| **次级操作 / 辅助** | `bg-white hover:bg-slate-50 text-slate-700 border border-slate-200` | 导出、查看证据、关闭、重置等二级操作。 |
| **高危 / 删除** | `text-red-600 hover:bg-red-50 border-red-200` | 删除标段、清空清单等破坏性动作。 |
| **预警 / 临期** | `bg-amber-50 text-amber-800 border-amber-200` | 临近截标日期预警、待比选报价提醒。 |

---

## 三、 字体与数字排版规范 (Typography & Formats)

1. **数值与编码等宽对齐**：
   - 所有的**标段编号**、**金额**、**汇率**、**工日**、**置信度百分比**必须附加 `font-mono`，确保表格上下行数字严格垂直对齐，方便造价员核算。
   - 示例：`<span className="font-mono font-bold text-slate-900">{price.toLocaleString()} DZD</span>`
2. **中法双语规范**：
   - 中文作为主显标题 (`text-sm font-bold text-slate-900`)；
   - 法文官方原件名作为辅助对比，采用衬线斜体 (`font-serif italic text-slate-500 text-xs`)；
   - 在涉及法律效力处，明确注明以法文原件为准。

---

## 四、 页面结构与信息架构分层 (Information Architecture)

如果后续要扩展新功能，必须严格遵循以下三层树形架构，**切忌将深层功能或弹窗随意列入左侧边栏**：

```
Level 1: 平台全局一级垂直边栏 (AppSidebar)
  ├── 1. 多标管理与项目总览 (Tenders Hub)
  ├── 2. 标段综合工作台 (Workbench)
  │     ├── 2.0 标段综合工作台驾驶舱 (Overview)
  │     ├── 2.1 招标公告与官方文件解析 (Attachments & 8-Category Matrix)
  │     ├── 2.2 投标须知与标书装配 (Proposal Canvas & Variables)
  │     └── 2.3 清单智能组价工作台 (BOQ Pricing Engine)
  ├── 3. 工程物资与资产库 (Dual Database)
  │     ├── 物资定额总库 / 历史签单台账 / 物料别名映射
  ├── 4. 供应商询价与协同中心 (Supply Chain RFQ)
  │     ├── 询价跟踪 / 横向比选看板 / 邮件模板库
  └── 5. 成本测算与国际费率引擎 (Cost Config & FX)
```

### 侧边栏规范准则：
- 边栏只放**业务域入口**，不放“动作型功能”（例如“导入Excel”绝不能变成边栏一级菜单，它属于清单工作台内部的操作）。
- 标段工作台内永远保持：`总览 ➔ 1.公告解析 ➔ 2.须知装配 ➔ 3.清单组价` 的标准时间线顺序。

---

## 五、 “八大板块结构化提取清单”标准实现模版

新增提取字段或新增分析维度时，必须对齐以下结构模型：

```typescript
interface ExtractionFieldItem {
  id: string;
  categoryKey:
    | 'project'          // 一、项目基本信息
    | 'timeline'         // 二、投标关键时间与提交流程
    | 'compliance'       // 三、文件组成与合规性要求
    | 'pricing'          // 四、报价与计价规则
    | 'boq'              // 五、BOQ工程量清单与组价要素
    | 'contract'         // 六、合同条款与风险点
    | 'translation'      // 七、翻译与双语一致性
    | 'confidentiality'; // 八、保密与信息安全
  docSource: 'doc1_notice' | 'doc2_contract' | 'doc3_boq';
  docSourceName: string;
  sourceClause?: string;     // 如 "RC 第 1.1 款"
  pageNumber?: number;
  fieldNameZh: string;       // 中文标准字段
  fieldNameFr?: string;      // 法文对应名称
  value: string;             // 提取值或建议值
  valueFr?: string;
  priority: 'preset' | 'discovered'; // 🎯 预设关键点 vs 💡 补充识别重要内容
  status: 'extracted' | 'suggested'; // 'extracted' = 绿色高亮; 'suggested' = 纯白底待核验
  confidenceScore?: number;  // 85 ~ 99%
  suggestedValue?: string;   // 待确认时的推荐参考值
  note?: string;             // 待确认理由
  confirmedBy?: string;      // 人工复核确认人
  confirmedAt?: string;
  linkedVariableKey?: string; // 双向联动到标书组件的变量名
  linkedBoqItemMatch?: string;// 双向联动到工程量清单项
}
```

### 交互必修体验：
1. **双模切换**：必须同时提供卡片详尽视图与表格密集视图 (`viewLayout: 'cards' | 'table'`)。
2. **采纳操作**：待确认项点击“确认采纳建议”后，行内立即无刷新转为绿色 (`status: 'extracted'`)，并自动同步回填至 `variableValues`。
3. **穿透联动**：带 `linkedVariableKey` 的字段必须提供“联动标书”跳转按钮；涉及价格与清单要素的字段提供“联动量单”跳转按钮。

---

## 六、 新功能开发自查 Checklist (Definition of Done)

在完成任何新功能页面或组件后，请逐项核对：

- [ ] **视觉统一**：是否复用了 `bg-white rounded-xl border border-slate-200 shadow-2xs` 标准卡片容器？
- [ ] **无多余胶囊**：是否杜绝了无序的 `rounded-full` 标签，使用分段控制栏与简洁分隔符？
- [ ] **多标隔离**：新功能产生的数据是否挂在当前 `activeTender` 标段下，是否支持切换标段时数据独立？
- [ ] **双语适配**：涉及对外或对非工程人员的字段，是否有法文原件对照（或双语模式切换）？
- [ ] **无死操作**：每一个表格操作列（查看、编辑、采纳、跳转）均有明确且流畅的微交互或弹窗反馈？
- [ ] **编译健康**：运行 `tsc --noEmit` 与构建打包工具，确认零类型报错与零 Lint 警告。
