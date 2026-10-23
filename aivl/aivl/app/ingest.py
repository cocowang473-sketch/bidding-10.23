"""ZIP 入库 + 文件地图（STEP1：先建文档地图，再定位公告）。"""
from __future__ import annotations

import logging
import re
import shutil
import threading
import zipfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from fastapi import UploadFile

from . import config, db
from .text_extract import detect_language, extract_text

logger = logging.getLogger(__name__)

NOTICE_SECTION_HINTS = (
    "第一部分",
    "招标公告",
    "招标通告",
    "avis",
    "appel d'offre",
    "appel d offre",
)
NOTICE_FILE_HINTS = (
    "招标通告",
    "招标公告",
    "avis",
    "appel",
    "notice",
    "annonce",
)
SKIP_NAMES = {".ds_store", "thumbs.db", "__macosx"}


def project_dir(project_id: int) -> Path:
    return Path(config.UPLOAD_DIR) / f"project_{project_id}"


def create_project(name: str, notes: str = "") -> Dict[str, Any]:
    conn = db.get_conn()
    cur = conn.execute(
        "INSERT INTO projects(name, notes, status) VALUES(?,?, 'created')",
        (name.strip() or "未命名项目", notes or ""),
    )
    conn.commit()
    return get_project(cur.lastrowid)  # type: ignore


def list_projects() -> List[Dict[str, Any]]:
    return db.rows(db.get_conn().execute("SELECT * FROM projects ORDER BY id DESC").fetchall())


def get_project(project_id: int) -> Optional[Dict[str, Any]]:
    row = db.row_dict(
        db.get_conn().execute("SELECT * FROM projects WHERE id=?", (project_id,)).fetchone()
    )
    if not row:
        return None
    row["settings"] = db.loads(row.pop("settings_json", None), {})
    return row


def get_project_settings(project_id: int) -> Dict[str, Any]:
    proj = get_project(project_id)
    return dict((proj or {}).get("settings") or {})


def update_project_settings(project_id: int, patch: Dict[str, Any]) -> Dict[str, Any]:
    conn = db.get_conn()
    row = db.row_dict(conn.execute("SELECT settings_json FROM projects WHERE id=?", (project_id,)).fetchone())
    if row is None:
        raise ValueError("项目不存在")
    settings = db.loads(row.get("settings_json"), {})
    settings.update({k: v for k, v in (patch or {}).items() if v is not None})
    conn.execute(
        "UPDATE projects SET settings_json=?, updated_at=datetime('now','localtime') WHERE id=?",
        (db.dumps(settings), project_id),
    )
    conn.commit()
    return get_project(project_id)  # type: ignore


def delete_project(project_id: int) -> bool:
    conn = db.get_conn()
    cur = conn.execute("DELETE FROM projects WHERE id=?", (project_id,))
    conn.commit()
    pdir = project_dir(project_id)
    if pdir.exists():
        shutil.rmtree(pdir, ignore_errors=True)
    return cur.rowcount > 0


def list_documents(project_id: int) -> List[Dict[str, Any]]:
    return db.rows(
        db.get_conn()
        .execute(
            "SELECT * FROM documents WHERE project_id=? ORDER BY rel_path",
            (project_id,),
        )
        .fetchall()
    )


def _classify_path(rel_path: str) -> Dict[str, Any]:
    parts = rel_path.replace("\\", "/").split("/")
    name = parts[-1]
    lower = rel_path.lower()
    name_l = name.lower()

    in_notice_section = any(
        any(h.lower() in p.lower() for h in NOTICE_SECTION_HINTS) for p in parts[:-1]
    ) or any(h.lower() in lower for h in ("1.第一部分", "第一部分、招标"))

    is_notice = False
    is_attachment = False
    role = "other"

    if name_l in SKIP_NAMES or name.startswith("~$"):
        role = "junk"
    elif in_notice_section:
        if any(h.lower() in name_l for h in NOTICE_FILE_HINTS) or re.search(
            r"1\.1|通告|公告|avis", name_l
        ):
            is_notice = True
            role = "primary_notice"
        elif "附件" in name or "annexe" in name_l or "1.2" in name_l or Path(name).suffix == "":
            # folder entries handled separately; files in 1.2附件
            is_attachment = True
            role = "notice_attachment"
        else:
            is_attachment = True
            role = "notice_section_file"
    elif any(x in lower for x in ("投标须知", "第二部分")):
        role = "instruction"
    elif any(x in lower for x in ("投标报价", "第三部分", "量单", "boq")):
        role = "pricing"
    elif any(x in lower for x in ("合同", "第四部分")):
        role = "contract"
    elif any(x in lower for x in ("技术", "第五部分", "cctp", "cctg", "图纸")):
        role = "technical"
    elif any(x in lower for x in ("答疑", "补遗", "clarif", "addend")):
        role = "supplement"
    elif "译" in name or "traduction" in name_l or "translation" in name_l:
        role = "translation"

    # 附件目录内文件
    if any("附件" in p or "1.2" in p.lower() for p in parts[:-1]):
        is_attachment = True
        if role == "other":
            role = "notice_attachment"
        in_notice_section = True

    return {
        "role": role,
        "is_notice": 1 if is_notice else 0,
        "is_attachment": 1 if is_attachment else 0,
        "in_notice_section": 1 if in_notice_section else 0,
    }


async def ingest_zip(project_id: int, file: UploadFile) -> Dict[str, Any]:
    """整包流式落盘后立即返回，解压建目录放到后台线程。"""
    proj = get_project(project_id)
    if not proj:
        raise ValueError("项目不存在")

    pdir = project_dir(project_id)
    if pdir.exists():
        shutil.rmtree(pdir, ignore_errors=True)
    raw_dir = pdir / "raw"
    extract_dir = pdir / "extracted"
    raw_dir.mkdir(parents=True, exist_ok=True)
    extract_dir.mkdir(parents=True, exist_ok=True)

    zip_name = file.filename or "package.zip"
    zip_path = raw_dir / re.sub(r"[^\w.\u4e00-\u9fff\-]+", "_", zip_name)

    size = 0
    with zip_path.open("wb") as out:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            out.write(chunk)
            size += len(chunk)
            if size > 800 * 1024 * 1024:
                raise ValueError("ZIP 超过 800MB 限制，请拆分或压缩后再传")

    if size < 22 or not zipfile.is_zipfile(zip_path):
        raise ValueError("上传文件不是有效的 ZIP 包")

    return _start_background_ingest(project_id, zip_path, extract_dir, zip_name, size)


def _start_background_ingest(
    project_id: int, zip_path: Path, extract_dir: Path, zip_name: str, size: int
) -> Dict[str, Any]:
    conn = db.get_conn()
    conn.execute(
        "UPDATE projects SET zip_name=?, status='extracting', updated_at=datetime('now','localtime') WHERE id=?",
        (zip_name, project_id),
    )
    conn.commit()

    threading.Thread(
        target=_ingest_zip_background,
        args=(project_id, str(zip_path), str(extract_dir), zip_name),
        name=f"ingest-zip-{project_id}",
        daemon=True,
    ).start()

    return {
        "project_id": project_id,
        "zip_name": zip_name,
        "size_bytes": size,
        "status": "extracting",
        "ok": True,
        "message": "文件已接收，正在后台解压建目录",
    }


def _ingest_zip_background(project_id: int, zip_path: str, extract_dir: str, zip_name: str) -> None:
    zpath = Path(zip_path)
    edir = Path(extract_dir)
    try:
        _safe_extract_zip(zpath, edir)
        inserted, notice_hits = _index_extracted_files(project_id, edir)
        conn = db.get_conn()
        conn.execute(
            "UPDATE projects SET zip_name=?, status='ingested', updated_at=datetime('now','localtime') WHERE id=?",
            (zip_name, project_id),
        )
        conn.commit()
        logger.info("ingest done project=%s files=%s notices=%s", project_id, inserted, notice_hits)
    except Exception as e:
        logger.exception("ingest failed project=%s: %s", project_id, e)
        try:
            conn = db.get_conn()
            conn.execute(
                "UPDATE projects SET status=?, updated_at=datetime('now','localtime') WHERE id=?",
                (f"ingest_failed:{type(e).__name__}", project_id),
            )
            conn.commit()
        except Exception:
            pass


def _index_extracted_files(project_id: int, extract_dir: Path) -> Tuple[int, int]:
    conn = db.get_conn()
    conn.execute("DELETE FROM documents WHERE project_id=?", (project_id,))
    conn.execute("DELETE FROM analyses WHERE project_id=?", (project_id,))

    batch: List[Tuple[Any, ...]] = []
    inserted = 0
    notice_hits = 0

    def flush() -> None:
        nonlocal batch
        if not batch:
            return
        conn.executemany(
            """INSERT INTO documents(
                project_id, rel_path, filename, ext, size_bytes, role, language,
                is_notice, is_attachment, in_notice_section, text_preview, meta_json)
               VALUES(?,?,?,?,?,?,?,?,?,?,?,?)""",
            batch,
        )
        conn.commit()
        batch = []

    for fp in extract_dir.rglob("*"):
        if not fp.is_file():
            continue
        if fp.name.lower() in SKIP_NAMES:
            continue
        rel = str(fp.relative_to(extract_dir)).replace("\\", "/")
        cls = _classify_path(rel)
        preview = ""
        lang = None
        meta: Dict[str, Any] = {"extract_deferred": True}
        suf = fp.suffix.lower()
        if cls["is_notice"] and suf in (".txt", ".md", ".csv"):
            try:
                text, method = extract_text(fp, max_chars=1500)
                preview = (text or "")[:1000]
                lang = detect_language(text) if text else None
                meta = {"extract_method": method}
            except Exception as e:
                meta = {"extract_method": f"skip:{type(e).__name__}"}

        batch.append(
            (
                project_id,
                rel,
                fp.name,
                fp.suffix.lower(),
                fp.stat().st_size,
                cls["role"],
                lang,
                cls["is_notice"],
                cls["is_attachment"],
                cls["in_notice_section"],
                preview,
                db.dumps(meta),
            )
        )
        inserted += 1
        if cls["is_notice"]:
            notice_hits += 1
        if len(batch) >= 300:
            flush()
    flush()
    return inserted, notice_hits


def _safe_extract_zip(zip_path: Path, dest: Path) -> None:
    """解压 ZIP；兼容中文文件名（Linux 常见 GBK/CP437 问题）。大包优先 GBK，减少重试。"""
    dest = dest.resolve()
    encodings = ("gbk", None, "utf-8", "cp437")
    last_err: Optional[Exception] = None
    for enc in encodings:
        try:
            kwargs = {"metadata_encoding": enc} if enc else {}
            try:
                zf = zipfile.ZipFile(zip_path, "r", **kwargs)  # type: ignore[arg-type]
            except TypeError:
                if enc:
                    continue
                zf = zipfile.ZipFile(zip_path, "r")
            with zf:
                for info in zf.infolist():
                    name = info.filename
                    target = (dest / name).resolve()
                    if not str(target).startswith(str(dest)):
                        continue
                    if info.is_dir():
                        target.mkdir(parents=True, exist_ok=True)
                        continue
                    target.parent.mkdir(parents=True, exist_ok=True)
                    with zf.open(info) as src, target.open("wb") as out:
                        shutil.copyfileobj(src, out, 1024 * 1024)
            return
        except Exception as e:
            last_err = e
            if dest.exists():
                for child in list(dest.iterdir()):
                    if child.is_dir():
                        shutil.rmtree(child, ignore_errors=True)
                    else:
                        child.unlink(missing_ok=True)
            continue
    if last_err:
        raise last_err
    raise zipfile.BadZipFile("无法解压 ZIP")


def build_tree(project_id: int) -> List[Dict[str, Any]]:
    """前端目录树。"""
    docs = list_documents(project_id)
    root: Dict[str, Any] = {"title": "/", "key": "/", "children": {}}

    def ensure(node, parts, doc=None):
        cur = node
        acc = []
        for i, part in enumerate(parts):
            acc.append(part)
            key = "/".join(acc)
            children = cur.setdefault("children", {})
            if part not in children:
                children[part] = {
                    "title": part,
                    "key": key,
                    "isLeaf": False,
                    "children": {},
                }
            cur = children[part]
            if i == len(parts) - 1 and doc is not None:
                cur.update(
                    {
                        "isLeaf": True,
                        "docId": doc["id"],
                        "role": doc["role"],
                        "isNotice": bool(doc["is_notice"]),
                        "isAttachment": bool(doc["is_attachment"]),
                        "inNoticeSection": bool(doc["in_notice_section"]),
                        "language": doc.get("language"),
                        "size": doc.get("size_bytes"),
                    }
                )

    for d in docs:
        parts = d["rel_path"].split("/")
        ensure(root, parts, d)

    def to_list(node_map: Dict[str, Any]) -> List[Dict[str, Any]]:
        out = []
        for _, v in sorted(node_map.items(), key=lambda x: x[0]):
            item = {k: v[k] for k in v if k != "children"}
            kids = to_list(v.get("children") or {})
            if kids:
                item["children"] = kids
                item["isLeaf"] = False
            out.append(item)
        return out

    return to_list(root.get("children") or {})


def find_notice_document(project_id: int) -> Optional[Dict[str, Any]]:
    docs = list_documents(project_id)
    # 优先明确标记
    for d in docs:
        if d["is_notice"]:
            return d
    # 其次：公告区内的 .doc/.docx/.pdf
    candidates = [
        d
        for d in docs
        if d["in_notice_section"]
        and d["ext"] in (".doc", ".docx", ".pdf", ".txt")
        and not d["is_attachment"]
    ]
    for d in candidates:
        if any(h in d["filename"] for h in ("通告", "公告", "avis", "Avis")):
            return d
    return candidates[0] if candidates else None


def absolute_doc_path(project_id: int, rel_path: str) -> Path:
    return project_dir(project_id) / "extracted" / rel_path
