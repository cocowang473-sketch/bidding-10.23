import {
  AivlAuthToken,
  AivlHealth,
  AivlProject,
  InstructionsAttachment,
  InstructionsBaseData,
  InstructionsRecord,
  InstructionsState,
  NoticeAnalysisResult,
  NoticeTemplateMode,
} from '../types/bidding';

const API_BASE = '/aivl'; // Vite 代理到 http://127.0.0.1:8000/api
const TOKEN_KEY = 'aivl.token';
const PROJECT_KEY = 'bidcraft.aivl.projectId';

const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'ChangeMe@Strong1';

export class AivlApiError extends Error {
  status: number;
  body?: unknown;
  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export function getStoredToken(): string | null {
  return typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
}

export function setStoredToken(token: string | null): void {
  if (typeof localStorage === 'undefined') return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getStoredProjectId(): number | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(PROJECT_KEY);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function setStoredProjectId(id: number | null): void {
  if (typeof localStorage === 'undefined') return;
  if (id === null) localStorage.removeItem(PROJECT_KEY);
  else localStorage.setItem(PROJECT_KEY, String(id));
}

async function parseError(res: Response): Promise<AivlApiError> {
  let body: unknown = undefined;
  let detail = `${res.status} ${res.statusText}`;
  try {
    body = await res.json();
    if (body && typeof body === 'object' && 'detail' in (body as Record<string, unknown>)) {
      const d = (body as Record<string, unknown>).detail;
      if (typeof d === 'string') detail = d;
    }
  } catch {
    // ignore
  }
  return new AivlApiError(detail, res.status, body);
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  opts: { withAuth?: boolean; retryOn401?: boolean } = {}
): Promise<T> {
  const { withAuth = true, retryOn401 = true } = opts;
  const headers = new Headers(init.headers || {});
  if (!(init.body instanceof FormData) && init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (withAuth) {
    const token = getStoredToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 401 && retryOn401 && withAuth) {
    setStoredToken(null);
    await ensureLoggedIn(true);
    return request<T>(path, init, { withAuth, retryOn401: false });
  }
  if (!res.ok) throw await parseError(res);
  const ct = res.headers.get('Content-Type') || '';
  if (ct.includes('application/json')) return res.json() as Promise<T>;
  return (await res.text()) as unknown as T;
}

export async function login(
  username = DEFAULT_USERNAME,
  password = DEFAULT_PASSWORD
): Promise<AivlAuthToken> {
  const res = await request<AivlAuthToken>(
    '/auth/login',
    { method: 'POST', body: JSON.stringify({ username, password }) },
    { withAuth: false }
  );
  if (res.token) setStoredToken(res.token);
  return res;
}

export async function ensureLoggedIn(force = false): Promise<void> {
  if (!force && getStoredToken()) return;
  await login();
}

export async function logout(): Promise<void> {
  try {
    await request('/auth/logout', { method: 'POST' }, { retryOn401: false });
  } finally {
    setStoredToken(null);
  }
}

export async function health(): Promise<AivlHealth> {
  return request<AivlHealth>('/health', { method: 'GET' }, { withAuth: false });
}

// —— Projects ——

export async function listProjects(): Promise<{ items: AivlProject[] }> {
  return request('/projects');
}

export async function createProject(name: string, notes?: string): Promise<AivlProject> {
  return request('/projects', { method: 'POST', body: JSON.stringify({ name, notes }) });
}

export async function getProject(projectId: number): Promise<AivlProject> {
  return request(`/projects/${projectId}`);
}

export async function uploadZip(
  projectId: number,
  file: File,
  onProgress?: (loaded: number, total: number) => void
): Promise<{ ok: boolean; files?: number; project?: AivlProject }> {
  // 使用 XHR 以便报告进度;fetch 的 upload progress 浏览器支持仍不完整
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/projects/${projectId}/upload-zip`);
    const token = getStoredToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.timeout = 900_000;
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && onProgress) onProgress(ev.loaded, ev.total);
    };
    xhr.onload = () => {
      try {
        const body = xhr.responseText ? JSON.parse(xhr.responseText) : {};
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(body);
        } else {
          const detail =
            typeof body === 'object' && body && 'detail' in body
              ? String((body as Record<string, unknown>).detail)
              : `${xhr.status} ${xhr.statusText}`;
          reject(new AivlApiError(detail, xhr.status, body));
        }
      } catch (e) {
        reject(new AivlApiError('上传响应解析失败', xhr.status));
      }
    };
    xhr.onerror = () => reject(new AivlApiError('网络错误,无法连接后端', 0));
    xhr.ontimeout = () => reject(new AivlApiError('上传超时', 0));
    xhr.send(form);
  });
}

// —— Notice ——

export async function analyzeNotice(
  projectId: number,
  opts: { focus_keywords?: string; template_mode?: NoticeTemplateMode } = {}
): Promise<NoticeAnalysisResult> {
  const body: Record<string, unknown> = {};
  if (opts.focus_keywords) body.focus_keywords = opts.focus_keywords;
  if (opts.template_mode) body.template_mode = opts.template_mode;
  return request(`/projects/${projectId}/analyze-notice`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getNoticeAnalysis(projectId: number): Promise<NoticeAnalysisResult | null> {
  try {
    return await request<NoticeAnalysisResult>(`/projects/${projectId}/notice-analysis`);
  } catch (e) {
    if (e instanceof AivlApiError && e.status === 404) return null;
    throw e;
  }
}

// —— Instructions ——

export async function getInstructions(projectId: number): Promise<InstructionsRecord> {
  return request(`/projects/${projectId}/instructions`);
}

export async function scanInstructions(
  projectId: number,
  force = false
): Promise<InstructionsRecord> {
  const qs = force ? '?force=true' : '';
  return request(`/projects/${projectId}/instructions/scan${qs}`, { method: 'POST' });
}

export async function analyzeInstructionBody(
  projectId: number,
  focus_keywords?: string
): Promise<InstructionsRecord> {
  const body: Record<string, unknown> = {};
  if (focus_keywords) body.focus_keywords = focus_keywords;
  return request(`/projects/${projectId}/instructions/analyze-body`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function importBaseData(
  projectId: number,
  file: File
): Promise<InstructionsRecord> {
  const form = new FormData();
  form.append('file', file);
  return request(`/projects/${projectId}/instructions/base-data/import`, {
    method: 'POST',
    body: form,
  });
}

export interface InstructionsPatchBody {
  workflow_step?: number;
  conditions?: Record<string, unknown>;
  base_data?: InstructionsBaseData;
  attachment?: Partial<InstructionsAttachment> & { kind?: string; code?: string };
  run_validate?: boolean;
  complete?: boolean;
  force_rescan?: boolean;
}

export async function patchInstructions(
  projectId: number,
  body: InstructionsPatchBody
): Promise<InstructionsRecord> {
  return request(`/projects/${projectId}/instructions`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

// —— File Management ——

export interface BiddingFileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: BiddingFileNode[];
}

export async function getProjectFiles(projectId: number): Promise<BiddingFileNode[]> {
  return request(`/projects/${projectId}/files`);
}

export async function getFileContent(projectId: number, filePath: string): Promise<string> {
  return request(`/projects/${projectId}/files/content?path=${encodeURIComponent(filePath)}`);
}

export type { InstructionsState };
