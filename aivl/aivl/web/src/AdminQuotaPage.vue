<template>
  <div class="admin-quota">
    <a-card title="材料单价基础库（管理员）" size="small">
      <a-alert
        type="info"
        show-icon
        style="margin-bottom: 16px"
        message="请上传「材料、机械采购」类单价表（订单编号/供货商/材料名称/规格/单位/单价(HT折后)/含税单价等）。表头格式不统一时由大模型自动分析抽取后入库；可多次上传合并。供应商回复邮件里对上的单价也会写入本库。请勿上传工程量清单或定额量单。"
      />

      <a-space wrap style="margin-bottom: 16px">
        <a-upload :before-upload="onUpload" :show-upload-list="false" accept=".xlsx,.xlsm">
          <a-button type="primary" :loading="uploading">上传材料单价表</a-button>
        </a-upload>
        <a-upload :before-upload="onReplace" :show-upload-list="false" accept=".xlsx,.xlsm">
          <a-button danger :loading="replacing">覆盖上传（清空后重导）</a-button>
        </a-upload>
        <a-button :loading="loading" @click="load">刷新</a-button>
        <span class="meta">当前库 {{ summary.row_count || 0 }} 条</span>
      </a-space>

      <a-table
        size="small"
        :loading="loading"
        :columns="fileColumns"
        :data-source="summary.files || []"
        :pagination="false"
        row-key="filename"
        style="margin-bottom: 16px"
      />

      <a-divider>基础库样例（前 50 条）</a-divider>
      <a-table
        size="small"
        :loading="loading"
        :columns="rowColumns"
        :data-source="sampleRows"
        :pagination="{ pageSize: 20 }"
        :scroll="{ x: 1400, y: 480 }"
        row-key="name_key"
      />
    </a-card>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { api } from './api'

const loading = ref(false)
const uploading = ref(false)
const replacing = ref(false)
const summary = reactive({ files: [], row_count: 0, uploaded_at: null })
const sampleRows = ref([])

const fileColumns = [
  { title: '文件名', dataIndex: 'filename', ellipsis: true },
  { title: '解析行数', dataIndex: 'row_count', width: 100 },
  { title: '上传时间', dataIndex: 'uploaded_at', width: 180 },
]

const rowColumns = [
  { title: '材料名称', dataIndex: 'name', width: 160, ellipsis: true },
  { title: '规格', dataIndex: 'spec', width: 320, ellipsis: true },
  { title: '单位', dataIndex: 'unit', width: 80 },
  { title: '单价', dataIndex: 'unit_price_bt', width: 120 },
  { title: '供货商', dataIndex: 'supplier', width: 180, ellipsis: true },
]

function applyBody(body) {
  Object.assign(summary, {
    files: body?.files || [],
    row_count: body?.row_count || 0,
    uploaded_at: body?.uploaded_at || null,
  })
  sampleRows.value = (body?.sample_rows || []).map((r, i) => ({
    ...r,
    name_key: r.name_key || `${r.name || 'row'}-${i}`,
  }))
}

function errText(err, fallback) {
  return err?.response?.data?.detail || err?.message || fallback
}

function load() {
  loading.value = true
  api
    .adminGetQuotaBase()
    .then(({ data }) => applyBody(data))
    .catch((err) => message.error(errText(err, '加载失败')))
    .finally(() => {
      loading.value = false
    })
}

function doUpload(file, replace) {
  const flag = replace ? replacing : uploading
  flag.value = true
  api
    .adminUploadQuotaBase(file, replace)
    .then(({ data }) => {
      applyBody(data)
      message.success(data?.message || '上传成功')
    })
    .catch((err) => message.error(errText(err, '上传失败')))
    .finally(() => {
      flag.value = false
    })
}

function onUpload(file) {
  doUpload(file, false)
  return false
}

function onReplace(file) {
  Modal.confirm({
    title: '确认覆盖？',
    content: '将清空现有材料单价基础库，仅保留本次上传文件的数据。',
    okType: 'danger',
    onOk: () => doUpload(file, true),
  })
  return false
}

onMounted(load)
</script>

<style scoped>
.meta {
  color: #666;
  font-size: 13px;
}
</style>
