"""登录鉴权：账号密码 + Bearer Token。"""
from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from . import config, db

_bearer = HTTPBearer(auto_error=False)

PUBLIC_PATHS = {
    "/api/health",
    "/api/auth/login",
}


def _hash_password(password: str, salt: str) -> str:
    return hashlib.sha256(f"{salt}:{password}".encode("utf-8")).hexdigest()


def ensure_default_user() -> None:
    conn = db.get_conn()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          salt TEXT NOT NULL,
          display_name TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS sessions (
          token TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL,
          expires_at TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """
    )
    conn.commit()
    row = conn.execute("SELECT id FROM users WHERE username=?", (config.AUTH_USERNAME,)).fetchone()
    salt = secrets.token_hex(16)
    password_hash = _hash_password(config.AUTH_PASSWORD, salt)
    if row is None:
        conn.execute(
            "INSERT INTO users(username, password_hash, salt, display_name) VALUES(?,?,?,?)",
            (config.AUTH_USERNAME, password_hash, salt, config.AUTH_DISPLAY_NAME),
        )
    else:
        conn.execute(
            "UPDATE users SET password_hash=?, salt=?, display_name=? WHERE username=?",
            (password_hash, salt, config.AUTH_DISPLAY_NAME, config.AUTH_USERNAME),
        )
    conn.commit()


def login(username: str, password: str) -> Dict[str, Any]:
    ensure_default_user()
    conn = db.get_conn()
    row = db.row_dict(
        conn.execute(
            "SELECT id, username, password_hash, salt, display_name FROM users WHERE username=?",
            ((username or "").strip(),),
        ).fetchone()
    )
    if not row:
        raise ValueError("用户名或密码错误")
    digest = _hash_password(password or "", row["salt"])
    if not hmac.compare_digest(digest, row["password_hash"]):
        raise ValueError("用户名或密码错误")
    token = secrets.token_urlsafe(32)
    expires = (datetime.now() + timedelta(days=config.AUTH_TOKEN_DAYS)).strftime("%Y-%m-%d %H:%M:%S")
    conn.execute(
        "INSERT INTO sessions(token, user_id, expires_at) VALUES(?,?,?)",
        (token, row["id"], expires),
    )
    conn.commit()
    return {
        "token": token,
        "expires_at": expires,
        "user": _public_user(row),
    }


def logout(token: Optional[str]) -> None:
    if not token:
        return
    conn = db.get_conn()
    conn.execute("DELETE FROM sessions WHERE token=?", (token,))
    conn.commit()


def _public_user(row: Dict[str, Any]) -> Dict[str, Any]:
    username = row.get("username") or ""
    return {
        "id": row["id"],
        "username": username,
        "display_name": row.get("display_name") or username,
        "is_admin": str(username).strip().lower() == str(config.AUTH_USERNAME or "admin").strip().lower(),
    }


def get_user_by_token(token: Optional[str]) -> Optional[Dict[str, Any]]:
    if not token:
        return None
    conn = db.get_conn()
    row = db.row_dict(
        conn.execute(
            """
            SELECT u.id, u.username, u.display_name, s.expires_at
            FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.token=?
            """,
            (token,),
        ).fetchone()
    )
    if not row:
        return None
    try:
        expires = datetime.strptime(row["expires_at"], "%Y-%m-%d %H:%M:%S")
    except ValueError:
        return None
    if expires < datetime.now():
        conn.execute("DELETE FROM sessions WHERE token=?", (token,))
        conn.commit()
        return None
    return _public_user(row)


def extract_token(request: Request, credentials: Optional[HTTPAuthorizationCredentials] = None) -> Optional[str]:
    if credentials and credentials.credentials:
        return credentials.credentials
    auth = request.headers.get("Authorization") or ""
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return None


async def require_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> Dict[str, Any]:
    user = get_user_by_token(extract_token(request, credentials))
    if not user:
        raise HTTPException(401, "未登录或登录已过期")
    return user


async def require_admin(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> Dict[str, Any]:
    user = await require_user(request, credentials)
    if not user.get("is_admin"):
        raise HTTPException(403, "仅管理员可操作")
    return user
