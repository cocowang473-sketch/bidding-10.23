import axios from 'axios'

const TOKEN_KEY = 'aivl_auth_token'

const client = axios.create({
  baseURL: '/api',
  timeout: 900000, // 全量解读导出需多文件分块抽取
})

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

client.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      const url = err?.config?.url || ''
      if (!String(url).includes('/auth/login')) {
        setToken('')
        window.dispatchEvent(new CustomEvent('auth:expired'))
      }
    }
    return Promise.reject(err)
  },
)

export const api = {
  health: () => client.get('/health'),
  login: (username, password) => client.post('/auth/login', { username, password }),
  logout: () => client.post('/auth/logout'),
  me: () => client.get('/auth/me'),
  listProjects: () => client.get('/projects'),
  createProject: (data) => client.post('/projects', data),
  getProject: (id) => client.get(`/projects/${id}`),
  deleteProject: (id) => client.delete(`/projects/${id}`),
  uploadZip: (id, file, onProgress) => {
    const fd = new FormData()
    fd.append('file', file)
    return client.post(`/projects/${id}/upload-zip`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 900000,
      onUploadProgress: onProgress,
    })
  },
  analyzeNotice: (id, focus_keywords, template_mode) =>
    client.post(`/projects/${id}/analyze-notice`, {
      focus_keywords: focus_keywords || null,
      template_mode: template_mode || null,
    }),
  getNoticeAnalysis: (id) => client.get(`/projects/${id}/notice-analysis`),
  getInstructions: (id) => client.get(`/projects/${id}/instructions`),
  scanInstructions: (id, force = false) =>
    client.post(`/projects/${id}/instructions/scan`, null, { params: { force } }),
  analyzeInstructionBody: (id, focus_keywords) =>
    client.post(`/projects/${id}/instructions/analyze-body`, { focus_keywords: focus_keywords || null }),
  importBaseData: (id, file, onProgress) => {
    const fd = new FormData()
    fd.append('file', file)
    return client.post(`/projects/${id}/instructions/base-data/import`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    })
  },
  patchInstructions: (id, data) => client.patch(`/projects/${id}/instructions`, data),
  importAttachmentFill: (id, code, file, onProgress) => {
    const fd = new FormData()
    fd.append('file', file)
    return client.post(`/projects/${id}/attachments/${code}/import-fill`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    })
  },
  getOrgMaster: (id) => client.get(`/projects/${id}/org-master`),
  saveOrgMaster: (id, data) => client.put(`/projects/${id}/org-master`, data),
  getAttachmentWorkbench: (id, code) => client.get(`/projects/${id}/attachments/${code}/workbench`),
  analyzeAttachmentFields: (id, code) =>
    client.post(`/projects/${id}/attachments/${code}/analyze-fields`),
  saveAttachmentFields: (id, code, fields) =>
    client.put(`/projects/${id}/attachments/${code}/fields`, { fields }),
  completeAttachment: (id, code) => client.post(`/projects/${id}/attachments/${code}/complete`),
  exportAttachmentDocx: (id, code) =>
    client.get(`/projects/${id}/attachments/${code}/export-docx`, { responseType: 'blob' }),
  getPersonnelTable: (id, code) => client.get(`/projects/${id}/attachments/${code}/personnel`),
  savePersonnelTable: (id, code, people, notes) =>
    client.put(`/projects/${id}/attachments/${code}/personnel`, { people, notes }),
  importPersonnelFile: (id, code, file, mode = 'merge', onProgress) => {
    const fd = new FormData()
    fd.append('file', file)
    return client.post(`/projects/${id}/attachments/${code}/personnel/import`, fd, {
      params: { mode },
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
      timeout: 300000,
    })
  },
  getOrgChart: (id, code) => client.get(`/projects/${id}/attachments/${code}/org-chart`),
  generateOrgChart: (id, code) =>
    client.post(`/projects/${id}/attachments/${code}/org-chart/generate`),
  saveOrgChart: (id, code, payload) =>
    client.put(`/projects/${id}/attachments/${code}/org-chart`, payload),
  getPlanWorkbench: (id, code) =>
    client.get(`/projects/${id}/attachments/${code}/plan-workbench`),
  savePlanWorkbench: (id, code, form_data) =>
    client.put(`/projects/${id}/attachments/${code}/plan-workbench`, { form_data }),
  generatePlanWorkbench: (id, code) =>
    client.post(`/projects/${id}/attachments/${code}/plan-workbench/generate`),
  getStructuredExport: (id, force = false) =>
    client.get(`/projects/${id}/structured-export`, { params: { force } }),
  exportExcel: (id) =>
    client.get(`/projects/${id}/export-excel`, { responseType: 'blob' }),
  getQuotation: (id) => client.get(`/projects/${id}/quotation`),
  uploadMaterialList: (id, file, onProgress) => {
    const fd = new FormData()
    fd.append('file', file)
    return client.post(`/projects/${id}/quotation/material-list`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
      timeout: 900000,
    })
  },
  uploadQuotaBase: (id, file, replace = false) => {
    const fd = new FormData()
    fd.append('file', file)
    return client.post(`/projects/${id}/quotation/quota-base`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: { replace: replace ? 1 : 0 },
      timeout: 900000,
    })
  },
  applyQuota: (id) => client.post(`/projects/${id}/quotation/apply-quota`, null, { timeout: 900000 }),
  updateQuotaCell: (id, body) => client.post(`/projects/${id}/quotation/quota-cell`, body),
  applyMainMaterial: (id, rowKeys = []) =>
    client.post(
      `/projects/${id}/quotation/apply-main-material`,
      { row_keys: rowKeys || [] },
      { timeout: 900000 },
    ),
  adminGetQuotaBase: () => client.get('/admin/quota-base'),
  adminUploadQuotaBase: (file, replace = false) => {
    const fd = new FormData()
    fd.append('file', file)
    return client.post('/admin/quota-base', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: { replace: replace ? 1 : 0 },
      timeout: 900000,
    })
  },
  buildQuotationPricing: (id) => client.post(`/projects/${id}/quotation/build-pricing`),
  fillQuotationPrices: (id, rowKeys) =>
    client.post(`/projects/${id}/quotation/fill-prices`, { row_keys: rowKeys || [] }),
  fillLocalPrices: (id, rowKeys) =>
    client.post(`/projects/${id}/quotation/fill-local-prices`, { row_keys: rowKeys || [] }),
  fillMarketPrices: (id, rowKeys) =>
    client.post(`/projects/${id}/quotation/fill-market-prices`, { row_keys: rowKeys || [] }, { timeout: 300000 }),
  getPriceHistory: (id) => client.get(`/projects/${id}/quotation/price-history`),
  applyHistoryPrice: (id, body) => client.post(`/projects/${id}/quotation/apply-history-price`, body),
  uploadLocalPrice: (id, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return client.post(`/projects/${id}/quotation/local-price`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  createInquiry: (id, body) => client.post(`/projects/${id}/quotation/inquiries`, body),
  syncInquiryReplies: (id) => client.post(`/projects/${id}/quotation/inquiries/sync-replies`),
  applyInquiryReply: (id, inquiryId, body) =>
    client.post(`/projects/${id}/quotation/inquiries/${inquiryId}/reply`, body),
  getQuotationPreview: (id) => client.get(`/projects/${id}/quotation/preview`),
  exportQuotationPricing: (id) =>
    client.get(`/projects/${id}/quotation/export-pricing`, { responseType: 'blob' }),
}

export default client
