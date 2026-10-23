<template>
  <div>
    <div class="toolbar">
      <a-button @click="$emit('back')">返回投标须知</a-button>
    </div>

    <a-card title="工程量清单" size="small">
      <a-alert
        type="info"
        show-icon
        style="margin-bottom: 12px"
        message="上传工程量清单后：① 按材料名称对照历史定额表，带回定额辅材/机械/人工；② 按以往项目的主材费回填，对不上的由大模型对照历史项目挑选主材费。点「重新匹配定额/主材费」会重新执行。"
      />
      <a-space wrap style="margin-bottom: 12px">
        <a-upload :before-upload="onUpload" :show-upload-list="false" accept=".xlsx,.xlsm">
          <a-button type="primary" :loading="uploading">上传工程量清单</a-button>
        </a-upload>
        <a-button :disabled="!data.row_count" :loading="applying" @click="reapplyQuota">
          重新匹配定额/主材费
        </a-button>
        <a-button :disabled="!data.row_count" :loading="exporting" @click="doExport">导出组价 Excel</a-button>
        <span v-if="data.filename" class="meta">
          清单 {{ data.filename }} · {{ data.row_count }} 行
          <template v-if="quotaMatch.total">
            · 定额 {{ quotaMatch.matched }}/{{ quotaMatch.total }}
          </template>
          <template v-if="priceMatch.total">
            · 主材费 {{ priceMatch.matched }}/{{ priceMatch.total }}
          </template>
        </span>
        <span v-if="priceBase.row_count" class="meta">
          · 单价库 {{ priceBase.row_count }} 条
        </span>
        <span v-else class="meta">· 单价库为空，请管理员先上传材料单价表</span>
      </a-space>

      <div v-if="data.row_count" class="filter-bar">
        <a-input-search
          v-model:value="listKeyword"
          allow-clear
          placeholder="搜索工程描述 / 规格"
          style="width: 260px"
        />
        <a-radio-group v-model:value="mainFeeFilter" button-style="solid" size="small">
          <a-radio-button value="all">全部 {{ filterCounts.all }}</a-radio-button>
          <a-radio-button value="missing">
            未匹配主材费 {{ filterCounts.missing }}
          </a-radio-button>
          <a-radio-button value="matched">已匹配 {{ filterCounts.matched }}</a-radio-button>
        </a-radio-group>
        <a-space wrap>
          <span class="meta">已选 {{ selectedKeys.length }} 条</span>
          <a-button size="small" @click="selectFiltered">勾选当前筛选</a-button>
          <a-button size="small" :disabled="!selectedKeys.length" @click="clearSelection">清空勾选</a-button>
          <a-button
            size="small"
            type="primary"
            ghost
            :disabled="!selectedKeys.length"
            :loading="rematchingSelected"
            @click="rematchSelectedMain"
          >
            对勾选重匹配主材费
          </a-button>
          <a-button
            size="small"
            type="primary"
            :disabled="!selectedKeys.length"
            @click="openInquiry"
          >
            发送询价邮件
          </a-button>
          <a-button size="small" :loading="syncingReplies" @click="syncReplies">
            收取回复回填
          </a-button>
        </a-space>
      </div>
      <p v-if="inquiries.length" class="meta" style="margin: 0 0 10px">
        最近询价：
        <span v-for="(q, i) in inquiries.slice(0, 3)" :key="q.id">
          {{ i ? '；' : '' }}{{ (q.emails || []).join(',') }} · {{ q.status === 'replied' ? '已回填' : q.sent ? '已发送' : '草稿' }} · {{ q.sent_at || q.created_at || '' }}
        </span>
      </p>

      <a-modal
        v-model:open="inquiryOpen"
        title="发送询价邮件给供应商"
        ok-text="发送"
        :confirm-loading="sendingInquiry"
        @ok="sendInquiry"
      >
        <p class="meta">将对勾选中尚未填写主材费的材料发信。收取回复时只认该供应商邮箱，且只看发送时间之后的邮件，并只回填本询价勾选行。</p>
        <a-form layout="vertical">
          <a-form-item label="供应商邮箱（多个用逗号分隔）" required>
            <a-input v-model:value="inquiryForm.emails" placeholder="supplier@example.com" />
          </a-form-item>
          <a-form-item label="补充说明">
            <a-textarea v-model:value="inquiryForm.note" :rows="3" placeholder="交货期、币种、税率等" />
          </a-form-item>
        </a-form>
        <p class="meta">本次勾选 {{ selectedKeys.length }} 条</p>
      </a-modal>

      <a-table
        v-if="data.row_count"
        class="sheet-table"
        bordered
        size="small"
        :columns="templateColumns"
        :data-source="filteredTemplateRows"
        :row-key="rowKey"
        :row-selection="rowSelection"
        :pagination="billPagination"
        @change="onBillTableChange"
        :scroll="{ x: 2800, y: 480 }"
      >
        <template #bodyCell="{ column, record, text }">
          <template v-if="quotaEditField(column.dataIndex)">
            <a-input-number
              v-if="isEditing(record, column.dataIndex)"
              v-model:value="draft"
              size="small"
              :controls="false"
              class="cell-input"
              autofocus
              @pressEnter="commitEdit(record, column.dataIndex)"
              @blur="commitEdit(record, column.dataIndex)"
              @keydown.esc="cancelEdit"
            />
            <button
              v-else
              type="button"
              class="cell-edit"
              :class="{ empty: isBlank(record[column.dataIndex]) }"
              @click="startEdit(record, column.dataIndex)"
            >
              {{ isBlank(record[column.dataIndex]) ? '填写' : record[column.dataIndex] }}
            </button>
          </template>
          <template v-else>{{ text }}</template>
        </template>
      </a-table>
      <a-empty v-else description="请先上传工程量清单" />
      <p v-if="data.row_count" class="meta" style="margin-top: 8px">
        材料费 = 主材费 + 定额辅材。人工费 = 6500 × 定额人工，辅材费 = 35 × 1.1 × 1 × 定额辅材，机械费 = 35 × 1 × 定额机械，综合取费 =（人工费 + 材料费 + 机械费）× 10%。定额里空着的格子可以点进去填写。
      </p>
      <div v-if="data.row_count" class="totals-block">
        <div class="totals-title">总价费用</div>
        <a-table
          class="sheet-table"
          bordered
          size="small"
          :columns="totalColumns"
          :data-source="totalRows"
          :pagination="false"
          row-key="name"
          style="max-width: 520px"
        />
      </div>
    </a-card>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { api } from './api'

const props = defineProps({
  projectId: { type: [Number, String], required: true },
})
defineEmits(['back'])

const uploading = ref(false)
const applying = ref(false)
const exporting = ref(false)
const data = ref({ rows: [], row_count: 0, sheet_count: 0, filename: '' })
const quotaBase = reactive({ files: [], row_count: 0, uploaded_at: null })
const quotaMatch = reactive({ matched: 0, total: 0 })
const priceBase = reactive({ files: [], row_count: 0, uploaded_at: null })
const priceMatch = reactive({ matched: 0, total: 0 })
const listKeyword = ref('')
const mainFeeFilter = ref('all') // all | missing | matched
const billPagination = reactive({
  current: 1,
  pageSize: 30,
  showSizeChanger: true,
  pageSizeOptions: ['30', '50', '100', '200'],
  showTotal: (total) => `共 ${total} 条`,
})
const selectedKeys = ref([])
const rematchingSelected = ref(false)
const inquiryOpen = ref(false)
const sendingInquiry = ref(false)
const syncingReplies = ref(false)
const inquiries = ref([])
const inquiryForm = reactive({ emails: '', note: '' })
const preview = reactive({
  rows: [],
  row_count: 0,
  total_amount: null,
  total_labor: null,
  total_material: null,
  total_machine: null,
  total_fee: null,
  params: {},
  built_at: null,
})

function subHead(title, dataIndex, width, align) {
  return {
    title,
    dataIndex,
    width,
    align,
    ellipsis: true,
    customHeaderCell: () => ({ class: 'quota-sub' }),
  }
}

function groupHead(title, children) {
  return {
    title,
    align: 'center',
    customHeaderCell: () => ({ class: 'quota-group' }),
    children,
  }
}

const purchaseColumns = [
  groupHead('主材采购', [
    subHead('参考品牌', 'brand', 120),
    subHead('产地', 'origin', 80),
  ]),
  groupHead('外采主材金额（币种）', [
    subHead('欧元', 'buy_eur', 80, 'right'),
    subHead('美元', 'buy_usd', 80, 'right'),
    subHead('人民币', 'buy_cny', 90, 'right'),
  ]),
  groupHead('外汇比例折算DA', [
    subHead('155', 'fx_eur', 90, 'right'),
    subHead('135', 'fx_usd', 90, 'right'),
    subHead('20', 'fx_cny', 80, 'right'),
  ]),
  groupHead('当地采购金额', [subHead('DA', 'buy_da', 100, 'right')]),
  groupHead('到及尔', [
    subHead('出口港杂2%+运输7%', 'port_fee', 150, 'right'),
    subHead('代理6%', 'agent_fee', 80, 'right'),
    subHead('关税', 'tariff', 70, 'right'),
    subHead('团结税2%', 'solidarity', 90, 'right'),
    subHead('进口杂费5%', 'import_fee', 100, 'right'),
    subHead('采购平台1%', 'platform_fee', 100, 'right'),
  ]),
]

const templateColumns = [
  { title: '编号', dataIndex: 'no', width: 88, fixed: 'left' },
  { title: '工程描述', dataIndex: 'desc', width: 200, ellipsis: true, fixed: 'left' },
  { title: '规格', dataIndex: 'spec', width: 220, ellipsis: true },
  { title: '单位', dataIndex: 'unit', width: 70 },
  { title: '数量', dataIndex: 'qty', width: 90, align: 'right' },
  { title: '综合单价', dataIndex: 'composite_price', width: 110, align: 'right' },
  { title: '人工费', dataIndex: 'labor_fee', width: 100, align: 'right' },
  { title: '材料费', dataIndex: 'material_fee', width: 100, align: 'right' },
  { title: '机械费', dataIndex: 'machine_fee', width: 100, align: 'right' },
  { title: '综合取费', dataIndex: 'overhead_fee', width: 100, align: 'right' },
  {
    title: '定额',
    align: 'center',
    customHeaderCell: () => ({ class: 'quota-group' }),
    children: [
      { title: '辅材', dataIndex: 'quota_aux', width: 90, align: 'right', customHeaderCell: () => ({ class: 'quota-sub' }) },
      { title: '机械', dataIndex: 'quota_machine', width: 90, align: 'right', customHeaderCell: () => ({ class: 'quota-sub' }) },
      { title: '人工', dataIndex: 'quota_labor', width: 90, align: 'right', customHeaderCell: () => ({ class: 'quota-sub' }) },
      { title: '主材费', dataIndex: 'main_material_fee', width: 110, align: 'right', customHeaderCell: () => ({ class: 'quota-sub' }) },
    ],
  },
  ...purchaseColumns,
]

const totalColumns = [
  { title: '费用项', dataIndex: 'name' },
  { title: '金额 (DA)', dataIndex: 'amount' },
]

function hasMainFee(r) {
  const v = r.main_material_fee
  return v !== null && v !== undefined && v !== '' && Number(v) > 0
}

function quotaMoney(qty, factor) {
  if (qty === null || qty === undefined || qty === '') return ''
  const n = Number(qty)
  if (Number.isNaN(n)) return ''
  return Math.round(n * factor * 100) / 100
}

function sumMoney(parts) {
  const nums = parts.map((v) => {
    if (v === null || v === undefined || v === '') return null
    const n = Number(v)
    return Number.isNaN(n) ? null : n
  })
  if (nums.every((n) => n === null)) return ''
  const total = nums.reduce((sum, n) => sum + (n || 0), 0)
  return Math.round(total * 100) / 100
}

function blankZero(v) {
  if (v === null || v === undefined || v === '') return ''
  const n = Number(v)
  if (Number.isNaN(n) || n === 0) return ''
  return Math.round(n * 100) / 100
}

function asPercent(v, fallback) {
  if (v === null || v === undefined || v === '') return fallback
  const n = Number(v)
  if (Number.isNaN(n)) return fallback
  const pct = Math.abs(n) <= 1 ? n * 100 : n
  const rounded = Math.round(pct * 100) / 100
  return `${rounded}%`
}

function purchaseFields(r) {
  const cur = String(r.currency || '').toUpperCase()
  let eur = blankZero(r.x_eur)
  let usd = blankZero(r.y_usd)
  let cny = blankZero(r.z_cny)
  let local = blankZero(r.ad_da)
  if (eur === '' && usd === '' && cny === '' && local === '') {
    const price = blankZero(r.unit_price_bt ?? r.purchase_unit ?? r.main_material_fee)
    if (cur.includes('EUR')) eur = price
    else if (cur.includes('USD')) usd = price
    else if (cur.includes('CNY') || cur.includes('RMB')) cny = price
    else if (cur.includes('DZD') || cur === 'DA') local = price
  }
  const times = (amount, rate) => (amount === '' ? '' : Math.round(Number(amount) * rate * 100) / 100)
  return {
    brand: r.supplier || '',
    origin: r.origin || '',
    buy_eur: eur,
    buy_usd: usd,
    buy_cny: cny,
    fx_eur: times(eur, 155),
    fx_usd: times(usd, 135),
    fx_cny: times(cny, 20),
    buy_da: local,
    port_fee: asPercent(r.ae, '7%'),
    agent_fee: asPercent(r.af, '6%'),
    tariff: asPercent(r.ag, '0%'),
    solidarity: asPercent(r.ah, '3%'),
    import_fee: asPercent(r.ai, '5%'),
    platform_fee: asPercent(r.aj, '1%'),
  }
}

const templateRows = computed(() =>
  (data.value.rows || []).map((r, idx) => {
    const laborFee = quotaMoney(r.quota_labor, 6500)
    const machineFee = quotaMoney(r.quota_machine, 35)
    const mainFee = r.main_material_fee ?? ''
    const materialFee = sumMoney([mainFee, r.quota_aux])
    const overheadFee = (() => {
      const direct = sumMoney([laborFee, materialFee, machineFee])
      if (direct === '') return ''
      return Math.round(Number(direct) * 0.1 * 100) / 100
    })()
    return {
      no: r.code || String(idx + 1),
      sheet: r.sheet || '',
      desc: r.desc || r.material_name || '',
      spec: r.spec || r.spec_detail || '',
      unit: r.unit || '',
      qty: r.qty ?? '',
      main_material_fee: mainFee,
      quota_aux: r.quota_aux ?? '',
      quota_machine: r.quota_machine ?? '',
      quota_labor: r.quota_labor ?? '',
      labor_fee: laborFee,
      material_fee: materialFee,
      machine_fee: machineFee,
      overhead_fee: overheadFee,
      composite_price: sumMoney([laborFee, materialFee, machineFee, overheadFee]),
      quota_match: r.quota_match || '',
      row: r.row,
      ...purchaseFields(r),
    }
  }),
)

const filterCounts = computed(() => {
  const rows = templateRows.value
  let matched = 0
  let missing = 0
  for (const r of rows) {
    if (hasMainFee(r)) matched += 1
    else missing += 1
  }
  return { all: rows.length, matched, missing }
})

const filteredTemplateRows = computed(() => {
  const kw = (listKeyword.value || '').trim().toLowerCase()
  return templateRows.value.filter((r) => {
    if (mainFeeFilter.value === 'missing' && hasMainFee(r)) return false
    if (mainFeeFilter.value === 'matched' && !hasMainFee(r)) return false
    if (!kw) return true
    const blob = `${r.desc || ''} ${r.spec || ''} ${r.unit || ''}`.toLowerCase()
    return blob.includes(kw)
  })
})

const rowSelection = computed(() => ({
  selectedRowKeys: selectedKeys.value,
  onChange: (keys) => {
    selectedKeys.value = keys
  },
  preserveSelectedRowKeys: true,
}))

function sumByQty(rows, key) {
  const total = rows.reduce((sum, r) => {
    const n = Number(r[key])
    const qty = Number(r.qty)
    if (Number.isNaN(n)) return sum
    return sum + n * (Number.isNaN(qty) ? 0 : qty)
  }, 0)
  return Math.round(total * 100) / 100
}

const totalRows = computed(() => {
  const rows = templateRows.value
  const labor = sumByQty(rows, 'labor_fee')
  const material = sumByQty(rows, 'material_fee')
  const machine = sumByQty(rows, 'machine_fee')
  const fee = sumByQty(rows, 'overhead_fee')
  const amount = sumByQty(rows, 'composite_price')
  return [
    { name: '人工费合计', amount: formatMoney(labor) },
    { name: '材料费合计', amount: formatMoney(material) },
    { name: '机械费合计', amount: formatMoney(machine) },
    { name: '综合取费合计', amount: formatMoney(fee) },
    { name: '合计总价', amount: formatMoney(amount) },
  ]
})

function rowKey(r) {
  return `${r.sheet || ''}|${r.row || r.no}`
}

const QUOTA_SAVE_FIELD = {
  quota_aux: 'quota_aux',
  quota_machine: 'quota_machine',
  quota_labor: 'quota_labor',
  content_aux: 'quota_aux',
  content_machine: 'quota_machine',
  content_labor: 'quota_labor',
  main_material_fee: 'main_material_fee',
}
const editing = ref({ key: '', field: '' })
const draft = ref(null)

function quotaEditField(dataIndex) {
  return QUOTA_SAVE_FIELD[dataIndex] || ''
}

function isBlank(value) {
  return value === null || value === undefined || value === ''
}

function isEditing(record, field) {
  return editing.value.key === rowKey(record) && editing.value.field === field
}

function startEdit(record, field) {
  editing.value = { key: rowKey(record), field }
  const current = record[field]
  draft.value = isBlank(current) ? null : Number(current)
}

function cancelEdit() {
  editing.value = { key: '', field: '' }
}

function findSource(record) {
  const rows = data.value.rows || []
  if (!isBlank(record.row)) {
    const hit = rows.find(
      (r) => String(r.sheet || '') === String(record.sheet || '') && Number(r.row) === Number(record.row),
    )
    if (hit) return hit
  }
  const code = record.code || record.no
  return rows.find(
    (r) => String(r.sheet || '') === String(record.sheet || '') && String(r.code || '') === String(code || ''),
  )
}

function commitEdit(record, field) {
  if (!isEditing(record, field)) return
  const saveField = QUOTA_SAVE_FIELD[field]
  const next = draft.value === null || draft.value === '' || Number.isNaN(Number(draft.value)) ? null : Number(draft.value)
  editing.value = { key: '', field: '' }
  const src = findSource(record)
  if (!src) {
    message.error('没有找到这一行')
    return
  }
  const prev = src[saveField]
  const same = (isBlank(prev) && next === null) || (!isBlank(prev) && next !== null && Number(prev) === next)
  if (same) return
  const contentField = { quota_aux: 'content_aux', quota_machine: 'content_machine', quota_labor: 'content_labor' }[saveField]
  src[saveField] = next
  if (contentField) src[contentField] = next ?? 0
  const previewRow = (preview.rows || []).find(
    (r) => String(r.sheet || '') === String(src.sheet || '') && Number(r.row) === Number(src.row),
  )
  if (previewRow) {
    previewRow[saveField] = next ?? ''
    if (contentField) previewRow[contentField] = next ?? ''
  }
  api
    .updateQuotaCell(props.projectId, {
      sheet: src.sheet || '',
      row: src.row,
      field: saveField,
      value: next,
    })
    .catch((err) => {
      src[saveField] = prev
      if (contentField) src[contentField] = prev ?? 0
      message.error(errText(err, '保存失败'))
    })
}

function onBillTableChange(pag) {
  billPagination.current = pag?.current || 1
  billPagination.pageSize = pag?.pageSize || billPagination.pageSize
}

function clearSelection() {
  selectedKeys.value = []
}

function selectFiltered() {
  selectedKeys.value = filteredTemplateRows.value.map((r) => rowKey(r))
  message.success(`已勾选当前筛选 ${selectedKeys.value.length} 条`)
}

function rematchSelectedMain() {
  if (!selectedKeys.value.length) return
  rematchingSelected.value = true
  api
    .applyMainMaterial(props.projectId, selectedKeys.value)
    .then(({ data: body }) => {
      applyOverview(body)
      const p = body?.price_match || {}
      message.success(p.message || `主材费 ${p.matched || 0}/${p.total || 0}`)
      // 若仍有未匹配，保持「未匹配」筛选，便于继续处理
      if ((p.matched || 0) < (p.total || 0)) {
        mainFeeFilter.value = 'missing'
      }
    })
    .catch((err) => message.error(errText(err, '主材费匹配失败')))
    .finally(() => {
      rematchingSelected.value = false
    })
}

function openInquiry() {
  if (!selectedKeys.value.length) {
    message.warning('请先勾选要询价的材料')
    return
  }
  inquiryOpen.value = true
}

function sendInquiry() {
  if (!inquiryForm.emails.trim()) {
    message.warning('请填写供应商邮箱')
    return Promise.reject()
  }
  sendingInquiry.value = true
  return api
    .createInquiry(props.projectId, {
      emails: inquiryForm.emails,
      row_keys: selectedKeys.value,
      note: inquiryForm.note,
    })
    .then(({ data: body }) => {
      if (body?.id) {
        inquiries.value = [body, ...inquiries.value.filter((q) => q.id !== body.id)].slice(0, 20)
      }
      if (body?.sent) {
        inquiryOpen.value = false
        message.success(body.message || '询价邮件已发送')
      } else {
        message.error(body?.message || '邮件没有发出。请在 .env 配置 SMTP_HOST、SMTP_USER、SMTP_PASSWORD、SMTP_FROM 后重试。', 8)
      }
    })
    .catch((err) => {
      message.error(errText(err, '发送询价失败'))
      return Promise.reject(err)
    })
    .finally(() => {
      sendingInquiry.value = false
    })
}

function syncReplies() {
  syncingReplies.value = true
  api
    .syncInquiryReplies(props.projectId)
    .then(({ data: body }) => {
      applyOverview(body)
      const r = body?.fill_result || {}
      message.success(r.message || `已回填 ${r.filled || 0} 行`)
    })
    .catch((err) => message.error(errText(err, '收取回复失败')))
    .finally(() => {
      syncingReplies.value = false
    })
}

function formatMoney(v) {
  if (v === null || v === undefined || v === '') return '—'
  return Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function applyOverview(body) {
  data.value = {
    rows: body?.rows || [],
    row_count: body?.row_count || 0,
    sheet_count: body?.sheet_count || 0,
    filename: body?.filename || '',
  }
  selectedKeys.value = []
  if (body?.quota_base) {
    Object.assign(quotaBase, {
      files: body.quota_base.files || [],
      row_count: body.quota_base.row_count || 0,
      uploaded_at: body.quota_base.uploaded_at || null,
    })
  }
  if (body?.quota_match) {
    Object.assign(quotaMatch, {
      matched: body.quota_match.matched || 0,
      total: body.quota_match.total || data.value.row_count || 0,
    })
  }
  const pb = body?.price_base || body?.local_price
  if (pb) {
    Object.assign(priceBase, {
      files: pb.files || [],
      row_count: pb.row_count || 0,
      uploaded_at: pb.uploaded_at || null,
    })
  }
  if (body?.price_match) {
    Object.assign(priceMatch, {
      matched: body.price_match.matched || 0,
      total: body.price_match.total || data.value.row_count || 0,
    })
  }
  if (Array.isArray(body?.inquiries)) {
    inquiries.value = body.inquiries
  }
  const src = body?.preview || null
  if (src) {
    Object.assign(preview, {
      rows: src.rows || [],
      row_count: src.row_count || 0,
      total_amount: src.total_amount ?? null,
      total_labor: src.total_labor ?? null,
      total_material: src.total_material ?? null,
      total_machine: src.total_machine ?? null,
      total_fee: src.total_fee ?? null,
      params: src.params || {},
      built_at: src.built_at || null,
    })
  }
}

function errText(err, fallback) {
  return err?.response?.data?.detail || err?.message || fallback
}

function load() {
  if (!props.projectId) return
  api
    .getQuotation(props.projectId)
    .then(({ data: body }) => applyOverview(body))
    .catch(() => applyOverview({ rows: [], row_count: 0 }))
}

function onUpload(file) {
  uploading.value = true
  api
    .uploadMaterialList(props.projectId, file)
    .then(({ data: body }) => {
      applyOverview(body)
      const m = body?.quota_match || {}
      const p = body?.price_match || {}
      message.success(
        `已提取 ${body.row_count || 0} 行；定额 ${m.matched || 0}/${m.total || body.row_count || 0}；主材费 ${p.matched || 0}/${p.total || body.row_count || 0}`,
      )
      if ((p.matched || 0) < (p.total || body.row_count || 0)) {
        mainFeeFilter.value = 'missing'
      }
    })
    .catch((err) => message.error(errText(err, '上传失败')))
    .finally(() => {
      uploading.value = false
    })
  return false
}

function reapplyQuota() {
  applying.value = true
  api
    .applyQuota(props.projectId)
    .then(({ data: body }) => {
      applyOverview(body)
      const m = body?.quota_match || {}
      const p = body?.price_match || {}
      const extra = []
      if (p.history_matched) extra.push(`历史主材费 ${p.history_matched}`)
      if (p.llm_filled) extra.push(`模型补 ${p.llm_filled}`)
      message.success(
        `定额 ${m.matched || 0}/${m.total || 0}；主材费 ${p.matched || 0}/${p.total || 0}${extra.length ? `（${extra.join('，')}）` : ''}${p.llm_error ? `；模型：${p.llm_error}` : ''}`,
      )
    })
    .catch((err) => message.error(errText(err, '匹配失败')))
    .finally(() => {
      applying.value = false
    })
}

async function doExport() {
  exporting.value = true
  try {
    const { data: blob } = await api.exportQuotationPricing(props.projectId)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '组价预览_已填入.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    message.error(errText(err, '导出失败'))
  } finally {
    exporting.value = false
  }
}

watch([listKeyword, mainFeeFilter], () => {
  billPagination.current = 1
})

watch(
  () => props.projectId,
  () => {
    billPagination.current = 1
    load()
  },
  { immediate: true },
)
</script>

<style scoped>
.toolbar {
  margin-bottom: 4px;
}
.meta {
  color: #666;
  font-size: 13px;
}
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding: 10px 12px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
}
.totals-block {
  margin-top: 16px;
}
.totals-title {
  margin-bottom: 8px;
  font-weight: 600;
  color: #243140;
}
.sheet-table :deep(.ant-table-container) {
  border: 1px solid #c5ced9;
  border-radius: 4px;
}
.sheet-table :deep(.ant-table-thead > tr > th),
.sheet-table :deep(.ant-table-tbody > tr > td),
.sheet-table :deep(.ant-table-cell) {
  border-color: #d5dde6 !important;
}
.sheet-table :deep(.ant-table-thead > tr > th) {
  background: #f4f7fb;
  color: #243140;
  font-weight: 600;
  text-align: center;
}
.sheet-table :deep(th.quota-group) {
  background: #d9e8f8 !important;
  color: #0d4c86;
  font-weight: 700;
  letter-spacing: 0.12em;
}
.sheet-table :deep(th.quota-sub) {
  background: #eef5fc !important;
  color: #1d5f96;
}
.sheet-table :deep(.ant-table-tbody > tr:hover > td) {
  background: #f3f8fd !important;
}
.sheet-table :deep(.ant-table-tbody > tr > td) {
  color: #243140;
}
.cell-edit {
  display: block;
  width: 100%;
  min-height: 22px;
  border: 1px dashed transparent;
  background: transparent;
  text-align: right;
  cursor: text;
  color: inherit;
  padding: 0 2px;
}
.cell-edit.empty {
  color: #8aa0b5;
  font-size: 12px;
  text-align: center;
}
.cell-edit:hover {
  border-color: #91b4d6;
  background: #f7fbff;
}
.cell-input {
  width: 100%;
}
</style>
