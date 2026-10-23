# 招标文件公告分析（第一步）

Vue3 + Ant Design Vue · FastAPI · 复用 `D:\fd\wam-ai` 的 DashScope（qwen-plus）能力。

## 本步做什么

1. 后台创建项目  
2. 上传招标文件 **ZIP**  
3. 解压并生成 **文件地图**（识别「1.第一部分、招标公告及其他」中的公告 vs 附件）  
4. 读取 `1.1 招标通告`（支持法语），提取关键信息（带原文证据）

> 按《招标文件的处理方法》：先建文件地图，再读公告；不做全文瞎摘要。

## 启动

```powershell
# 后端
$env:NO_PROXY='*'
.\.venv\Scripts\python.exe run.py

# 前端（另开终端）
cd web
npm install
npm run dev
```

或：`.\service-control.ps1`

- 前端 http://localhost:5173  
- 后端 http://127.0.0.1:8000  

密钥：优先读本目录 `.env` 的 `DASHSCOPE_API_KEY`；未配时自动加载 `D:\fd\wam-ai\wam-ai\server\.env`。

## 生产打包 / 部署

前后端打成单端口包（前端构建进 `static/`，由 FastAPI 一并托管）：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\pack-deploy.ps1
```

产物：`release\aivl-deploy-*.zip`  
解压后复制 `.env.example` → `.env`，执行 `start.ps1`（Windows）或 `./start.sh`（Linux），访问 `http://服务器IP:8000`。详见 `DEPLOY.md`。

## 说明

- `.doc` 优先 Word/WPS COM 读取，失败则 ole 粗提；建议有通告的 docx/pdf 更稳。  
- 后续步骤（须知/合同/BOQ 原子需求库）未做，仅公告 STEP1。
