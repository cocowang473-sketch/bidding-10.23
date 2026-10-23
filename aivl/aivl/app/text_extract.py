"""多格式文本提取：docx/pdf/txt；.doc 优先 Word/WPS COM，失败则 ole 粗提。"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Tuple


def extract_text(path: Path, max_chars: int = 30000) -> Tuple[str, str]:
    """返回 (text, method)。"""
    suffix = path.suffix.lower()
    try:
        if suffix in (".txt", ".md", ".csv"):
            return path.read_text(encoding="utf-8", errors="ignore")[:max_chars], "plain"
        if suffix == ".docx":
            from docx import Document

            doc = Document(str(path))
            text = "\n".join(p.text for p in doc.paragraphs if p.text and p.text.strip())
            return text[:max_chars], "docx"
        if suffix == ".pdf":
            import fitz

            doc = fitz.open(str(path))
            # 导出解读时可到约 80 页；普通预览仍受 max_chars 截断
            page_limit = 120 if max_chars >= 50000 else (80 if max_chars >= 40000 else 40)
            parts = []
            for i, page in enumerate(doc):
                if i >= page_limit:
                    break
                parts.append(page.get_text())
            return "\n".join(parts)[:max_chars], "pdf"
        if suffix == ".doc":
            text, method = _extract_doc(path)
            return text[:max_chars], method
    except Exception as e:
        return f"", f"error:{type(e).__name__}:{e}"
    return "", "unsupported"


def _extract_doc(path: Path) -> Tuple[str, str]:
    # 1) olefile 粗提（快，避免 Word/WPS COM 卡死）
    try:
        import olefile

        if olefile.isOleFile(str(path)):
            ole = olefile.OleFileIO(str(path))
            if ole.exists("WordDocument"):
                raw = ole.openstream("WordDocument").read()
                ole.close()
                chunks = re.findall(rb"[\x20-\x7e\xc0-\xff]{6,}", raw)
                joined = b"\n".join(chunks).decode("latin-1", errors="ignore")
                u16 = raw.decode("utf-16le", errors="ignore")
                u16_clean = "".join(ch if (ch.isprintable() or ch in "\n\r\t") else " " for ch in u16)
                u16_clean = re.sub(r" {2,}", " ", u16_clean)
                candidate = u16_clean if len(u16_clean) > len(joined) else joined
                candidate = re.sub(r"\n{3,}", "\n\n", candidate)
                if len(candidate.strip()) > 200:
                    return candidate, "ole"
    except Exception:
        pass
    # 2) Word/WPS COM 兜底
    text = _via_com(path, ("Word.Application", "KWPS.Application", "wps.Application"))
    if text.strip():
        return text, "com"
    return "", "doc_failed"


def _via_com(path: Path, prog_ids) -> str:
    try:
        import win32com.client  # type: ignore
    except Exception:
        return ""
    abs_path = str(path.resolve())
    for prog in prog_ids:
        app = None
        try:
            app = win32com.client.Dispatch(prog)
            app.Visible = False
            try:
                app.DisplayAlerts = 0
            except Exception:
                pass
            doc = app.Documents.Open(abs_path, False, True)
            text = doc.Content.Text
            doc.Close(False)
            return text or ""
        except Exception:
            continue
        finally:
            if app is not None:
                try:
                    app.Quit()
                except Exception:
                    pass
    return ""


def detect_language(text: str) -> str:
    if not text:
        return "unknown"
    fr_hits = len(re.findall(r"\b(le|la|les|des|pour|projet|offre|appel|dossiers?)\b", text.lower()))
    zh_hits = len(re.findall(r"[\u4e00-\u9fff]", text))
    if zh_hits > 40 and fr_hits > 5:
        return "zh-fr"
    if fr_hits > 8 and zh_hits < 20:
        return "fr"
    if zh_hits > 20:
        return "zh"
    return "unknown"
