from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from . import auth as auth_svc
from . import config, db
from .routes import api

STATIC_DIR = Path(config.ROOT) / "static"


@asynccontextmanager
async def lifespan(_: FastAPI):
    Path(config.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    db.init_db()
    yield


app = FastAPI(title="AI 投标报价系统", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api)


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)
    path = request.url.path
    if path.startswith("/api/") and path not in auth_svc.PUBLIC_PATHS:
        if path not in ("/api/auth/logout", "/api/auth/me"):
            token = auth_svc.extract_token(request)
            user = auth_svc.get_user_by_token(token)
            if not user:
                return JSONResponse({"detail": "未登录或登录已过期"}, status_code=401)
            request.state.user = user
    return await call_next(request)


def _has_frontend() -> bool:
    return (STATIC_DIR / "index.html").is_file()


if _has_frontend():
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/")
    def spa_index():
        return FileResponse(STATIC_DIR / "index.html")

    @app.get("/{full_path:path}")
    def spa_fallback(full_path: str):
        # API 已由 router 处理；其余静态资源或回退到 index.html
        candidate = STATIC_DIR / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(STATIC_DIR / "index.html")
else:

    @app.get("/")
    def root():
        return {"service": "aivl", "api": "/api/health", "hint": "前端未打包，请先 npm run build"}
