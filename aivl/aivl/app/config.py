"""配置：优先读本项目 .env，密钥可与 wam-ai 共用。"""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env", override=True)
# 兜底：若本项目未配密钥，尝试加载 wam-ai 的 .env（不覆盖已有值）
_wam_env = Path(r"D:\fd\wam-ai\wam-ai\server\.env")
if _wam_env.exists():
    load_dotenv(_wam_env, override=False)

DB_PATH = os.getenv("DB_PATH", str(ROOT / "bid.db"))
if not os.path.isabs(DB_PATH):
    DB_PATH = str(ROOT / DB_PATH)

UPLOAD_DIR = os.getenv("UPLOAD_DIR", str(ROOT / "uploads"))
if not os.path.isabs(UPLOAD_DIR):
    UPLOAD_DIR = str(ROOT / UPLOAD_DIR)

DASHSCOPE_API = os.getenv(
    "DASHSCOPE_API",
    "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
)
DASHSCOPE_API_KEY = os.getenv("DASHSCOPE_API_KEY", "")
MODEL_NAME = os.getenv("MODEL_NAME", "qwen-plus")

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465") or "465")
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "") or SMTP_USER
SMTP_SSL = os.getenv("SMTP_SSL", "1") not in ("0", "false", "False")

AUTH_USERNAME = os.getenv("AUTH_USERNAME", "admin")
AUTH_PASSWORD = os.getenv("AUTH_PASSWORD", "Aivl@2026!Bid#9x")
AUTH_DISPLAY_NAME = os.getenv("AUTH_DISPLAY_NAME", "管理员")
AUTH_TOKEN_DAYS = int(os.getenv("AUTH_TOKEN_DAYS", "7") or "7")
