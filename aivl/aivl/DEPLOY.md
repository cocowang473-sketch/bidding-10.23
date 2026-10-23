# AI 投标报价系统 · 部署包

单进程部署：FastAPI 同时提供 `/api` 与前端页面。

## 环境要求

- Windows / Linux
- Python 3.10+
- 出网访问 DashScope（若需大模型能力）

## 安装与启动（Windows）

```powershell
# 1. 解压后进入目录
cd aivl

# 2. 配置环境变量（必改密码与密钥）
copy .env.example .env
notepad .env

# 3. 一键启动（自动建 venv、装依赖）
.\start.ps1
```

浏览器打开：`http://服务器IP:8000`

## 安装与启动（Linux）

```bash
cd aivl
cp .env.example .env
nano .env
chmod +x start.sh
./start.sh
```

## 说明

- 默认监听 `0.0.0.0:8000`（可用 `.env` 的 `HOST`/`PORT` 修改）
- 数据文件：`bid.db`、`uploads/`（首次启动自动创建）
- 登录账号见 `.env` 中 `AUTH_USERNAME` / `AUTH_PASSWORD`
- 本包不含 Python 虚拟环境与 `node_modules`，目标机只需 Python
