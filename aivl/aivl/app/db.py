"""SQLite 存储：项目 / 文件地图 / 公告分析结果。"""
from __future__ import annotations

import json
import sqlite3
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional

from . import config

_local = threading.local()

_SCHEMA = """
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created',
  zip_name TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  rel_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  ext TEXT,
  size_bytes INTEGER,
  role TEXT NOT NULL DEFAULT 'unknown',
  language TEXT,
  is_notice INTEGER NOT NULL DEFAULT 0,
  is_attachment INTEGER NOT NULL DEFAULT 0,
  in_notice_section INTEGER NOT NULL DEFAULT 0,
  text_preview TEXT,
  meta_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  analysis_type TEXT NOT NULL DEFAULT 'notice',
  status TEXT NOT NULL DEFAULT 'pending',
  source_doc_id INTEGER,
  source_path TEXT,
  result_json TEXT,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);
"""


def get_conn() -> sqlite3.Connection:
    conn = getattr(_local, "conn", None)
    if conn is None:
        Path(config.DB_PATH).parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(config.DB_PATH, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        _local.conn = conn
    return conn


def init_db() -> None:
    conn = get_conn()
    conn.executescript(_SCHEMA)
    # 兼容迁移：项目设置（公告模板锁定等）
    cols = {r[1] for r in conn.execute("PRAGMA table_info(projects)").fetchall()}
    if "settings_json" not in cols:
        conn.execute("ALTER TABLE projects ADD COLUMN settings_json TEXT")
    conn.commit()
    from . import auth

    auth.ensure_default_user()


def dumps(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False)


def loads(text: Optional[str], default: Any = None) -> Any:
    if not text:
        return {} if default is None else default
    try:
        return json.loads(text)
    except Exception:
        return {} if default is None else default


def row_dict(row: Optional[sqlite3.Row]) -> Optional[Dict[str, Any]]:
    return dict(row) if row else None


def rows(rs: List[sqlite3.Row]) -> List[Dict[str, Any]]:
    return [dict(r) for r in rs]
