"""第一步：读取招标公告（可含法语），提取关键信息。"""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from . import db
from .ingest import absolute_doc_path, find_notice_document, get_project_settings, list_documents, update_project_settings
from .llm import call_dashscope_json
from .notice_templates import (
    MODE_GREEN,
    MODE_LABELS,
    MODE_LLM,
    fields_for_mode,
    normalize_mode,
)
from .text_extract import detect_language, extract_text

SYSTEM_PROMPT = """你是海外工程招投标文件分析专家。
任务：从招标通告/招标公告原文，以及 ZIP 内「补充文件」目录相关原文中提取结构化关键信息。
硬性规则：
1. 任何事实必须有原文证据 evidence（短摘录）；文件没写就不要编造，value 置 null，status=missing。
2. 不要补充行业常识；不要把“建议/通常”改写成“必须”。
3. 数字必须保留原文数值、单位和限定条件。
4. 原文可能是法语或中法双语：界面字段用中文 label，value 可用中文表述，但 evidence 尽量保留原文。
5. 主公告优先用于截标时间、递交地点、联系人、招标范围；补充文件优先补全公告未写清的业主/招标人、技术规模、工期与附件依据。
6. evidence 若摘自补充文件，请在短摘录前标注文件名，例如「[ANNEXE 1.pdf] …」。
7. 只输出 JSON，不要 markdown。
"""

GREEN_SYSTEM_PROMPT = SYSTEM_PROMPT + """
本任务使用「基础/解读表绿字段模板」：只围绕给定绿字段清单做重点提取。
绿字段对应解读样表中已用绿色标出的重点信息；请逐字段检索主公告与补充文件原文并回填。
若某绿字段原文没有，value=null、status=missing，不要用建议填写语凑数。
"""

_SKIP_SUPPLEMENT_HINTS = (
    "安全技术交底",
    "安全指导",
    "安全生产",
    "管理手册",
    "检查表",
    "评分表",
    "会签表",
    "交底记录",
    "higiene",
    "seguridad",
    "medicina del trabajo",
)

_SUPPLEMENT_EXTS = {".doc", ".docx", ".pdf", ".txt", ".xlsx", ".xlsm"}


def _is_supplement_path(rel_path: str) -> bool:
    p = rel_path or ""
    return "补充文件" in p or "补充材料" in p


def _collect_supplement_corpus(
    project_id: int,
    notice_id: int,
    budget: int = 24000,
    limit: int = 5,
) -> Tuple[str, List[Dict[str, Any]]]:
    """从「补充文件」目录（及公告区内答疑）抽取辅助原文，供公告字段补全。"""
    from .excel_export import (
        _extract_full_text,
        _find_readable_fallback,
        _infer_focus_keys,
        _is_usable_text,
        _role_signature,
        _score_doc,
    )

    candidates: List[Tuple[int, Dict[str, Any]]] = []
    for d in list_documents(project_id):
        if d.get("id") == notice_id:
            continue
        name = d.get("filename") or ""
        path = d.get("rel_path") or ""
        if name.startswith("._") or d.get("role") == "junk":
            continue
        ext = (d.get("ext") or "").lower()
        if ext not in _SUPPLEMENT_EXTS:
            continue
        blob = f"{name} {path}".lower()
        if any(h.lower() in blob for h in _SKIP_SUPPLEMENT_HINTS):
            continue
        in_supp = _is_supplement_path(path)
        is_clarif = d.get("in_notice_section") and any(
            x in name for x in ("答疑", "补遗", "clarif", "Clarif")
        )
        if not in_supp and not is_clarif:
            continue
        score = int(_score_doc(d) or 0)
        if in_supp:
            score += 40
        if is_clarif:
            score += 25
        # 扫描版 PDF 常抽不出字：可读译本/表格优先
        if any(x in blob for x in ("中法对照", "机翻", "翻译", "摘录")):
            score += 35
        if ext in (".docx", ".xlsx", ".xlsm", ".txt"):
            score += 20
        if score < 40:
            continue
        candidates.append((score, d))

    candidates.sort(key=lambda x: -x[0])
    seen_roles: set = set()
    picked: List[Dict[str, Any]] = []
    for score, d in candidates:
        role = _role_signature(d.get("filename") or "", d.get("rel_path") or "")
        if role in seen_roles:
            continue
        seen_roles.add(role)
        picked.append(d)
        if len(picked) >= limit:
            break

    if not picked:
        return "", []

    per_cap = max(3500, budget // max(1, len(picked)))
    remaining = budget
    blocks: List[str] = []
    used: List[Dict[str, Any]] = []
    exclude_names = {d.get("filename") or "" for d in picked}

    for d in picked:
        if remaining < 600:
            break
        take_budget = min(per_cap, remaining)
        text, method = _extract_full_text(project_id, d, max_chars=take_budget + 1500)
        source_doc = d
        fallback_from = None
        if not _is_usable_text(text, method):
            fb = _find_readable_fallback(
                project_id,
                _infer_focus_keys(d.get("filename") or "", d.get("rel_path") or ""),
                exclude_names=exclude_names | {u.get("filename") or "" for u in used},
                original_name=d.get("filename") or "",
            )
            if fb:
                source_doc, text, method = fb
                fallback_from = d.get("filename")
                exclude_names.add(source_doc.get("filename") or "")
            else:
                continue
        text = (text or "").strip()
        if len(text) < 60:
            continue
        chunk = text[:take_budget]
        label_path = source_doc.get("rel_path") or d.get("rel_path")
        note = f"；原件不可读，已用可读件替代自 {fallback_from}" if fallback_from else ""
        blocks.append(f"===== 补充来源: {label_path} (提取:{method}{note}) =====\n{chunk}")
        used.append(
            {
                "id": source_doc.get("id"),
                "filename": source_doc.get("filename"),
                "rel_path": source_doc.get("rel_path"),
                "extract_method": method,
                "text_length": len(chunk),
                "from_supplement_dir": _is_supplement_path(source_doc.get("rel_path") or "")
                or _is_supplement_path(d.get("rel_path") or ""),
                "fallback_of": fallback_from,
            }
        )
        remaining -= len(chunk)

    return "\n\n".join(blocks), used


def _field_schema() -> List[Dict[str, str]]:
    return fields_for_mode(MODE_LLM)


def resolve_notice_mode(project_id: int, requested: Optional[str]) -> str:
    """返回最终模式；若项目已锁定则强制使用锁定值。"""
    settings = get_project_settings(project_id)
    locked = normalize_mode(settings.get("notice_template_mode"))
    req = normalize_mode(requested)
    if locked:
        if req and req != locked:
            raise ValueError(
                f"本项目已锁定公告分析模板为「{MODE_LABELS.get(locked, locked)}」，不可再切换。"
                "如需其他模板请新建项目。"
            )
        return locked
    if not req:
        raise ValueError("请选择公告分析模板：基础模板（绿字段）或通用字段提取")
    return req


def analyze_notice(
    project_id: int,
    focus_keywords: Optional[str] = None,
    template_mode: Optional[str] = None,
) -> Dict[str, Any]:
    notice = find_notice_document(project_id)
    conn = db.get_conn()
    if not notice:
        cur = conn.execute(
            """INSERT INTO analyses(project_id, analysis_type, status, error)
               VALUES(?,?, 'failed', ?)""",
            (project_id, "notice", "未在 ZIP 中定位到招标通告/公告文件（请确认存在「1.第一部分、招标公告及其他」及「1.1 招标通告」）"),
        )
        conn.commit()
        raise ValueError("未定位到招标通告文件")

    mode = resolve_notice_mode(project_id, template_mode)
    schema = fields_for_mode(mode)

    # 选定即锁定（本项目不可再换模板）
    settings = get_project_settings(project_id)
    if not normalize_mode(settings.get("notice_template_mode")):
        update_project_settings(
            project_id,
            {
                "notice_template_mode": mode,
                "notice_template_locked": True,
                "notice_template_label": MODE_LABELS.get(mode, mode),
            },
        )

    path = absolute_doc_path(project_id, notice["rel_path"])
    text, method = extract_text(path, max_chars=28000)
    if not text.strip():
        cur = conn.execute(
            """INSERT INTO analyses(project_id, analysis_type, status, source_doc_id, source_path, error)
               VALUES(?,?, 'failed', ?, ?, ?)""",
            (
                project_id,
                "notice",
                notice["id"],
                notice["rel_path"],
                f"无法读取公告文本（method={method}）。若为旧版 .doc，请安装 Word/WPS 或转为 docx/pdf 后重试。",
            ),
        )
        conn.commit()
        raise ValueError(f"无法读取公告文本（{method}）")

    lang = detect_language(text)
    conn.execute(
        "UPDATE documents SET text_preview=?, language=?, meta_json=? WHERE id=?",
        (
            text[:4000],
            lang,
            db.dumps({"extract_method": method}),
            notice["id"],
        ),
    )

    attachments = [
        {
            "id": d["id"],
            "filename": d["filename"],
            "rel_path": d["rel_path"],
            "role": d["role"],
        }
        for d in list_documents(project_id)
        if d["in_notice_section"] and d["id"] != notice["id"]
    ]

    supplement_text, supplement_docs = _collect_supplement_corpus(
        project_id, notice["id"], budget=24000, limit=5
    )

    focus = (focus_keywords or "").strip()
    focus_block = ""
    if focus:
        focus_block = (
            "\n【用户特别关注】以下关键词/信息点在上一轮可能未被提取或提取不全，"
            "请务必在主公告与补充文件原文中仔细检索并优先补全到 fields / atomic_requirements / open_questions；"
            "若原文确实没有，对应 value 置 null、status=missing，并在 open_questions 说明：\n"
            f"{focus}\n"
        )

    if mode == MODE_GREEN:
        schema_desc = [
            {
                "key": f["key"],
                "label": f["label"],
                "section": f.get("section_title") or f.get("section"),
            }
            for f in schema
        ]
        mode_hint = (
            "【模板】基础解读表 · 绿字段重点提取。请严格按下列绿字段清单逐项提取，"
            "每条 fields 需带 section（章节名）。\n"
            f"绿字段清单: {schema_desc}\n"
        )
        system = GREEN_SYSTEM_PROMPT
    else:
        mode_hint = f"【模板】通用字段提取。字段清单: {schema}\n"
        system = SYSTEM_PROMPT

    supplement_block = ""
    if supplement_text:
        names = "、".join(d.get("filename") or "" for d in supplement_docs)
        supplement_block = (
            f"\n【补充文件目录等辅助原文】已纳入 {len(supplement_docs)} 份："
            f"{names}\n"
            "请用其补全主公告缺失字段（尤其招标人/业主、技术与规模等）；"
            "与主公告冲突时以主公告商务条款为准，并在 open_questions 注明差异。\n\n"
            f"{supplement_text}\n"
        )

    prompt = (
        "请根据下列招标通告原文（及补充文件原文），提取字段。返回 JSON：\n"
        "{\n"
        '  "fields": [{"key":"...","label":"...","section":"...|null","value":"...|null","evidence":"...","status":"ok|missing","confidence":0.0}],\n'
        '  "atomic_requirements": [{"text":"一条可验证的原子要求","param":"关键参数或null","evidence":"..."}],\n'
        '  "open_questions": ["文件未写清、需答疑确认的问题"],\n'
        '  "focus_hits": [{"keyword":"用户关键词","value":"...|null","evidence":"...","status":"ok|missing"}]\n'
        "}\n"
        "若提供了用户关注关键词：除标准 fields 外，请在 focus_hits 中逐条回传检索结果；"
        "能映射到标准字段的同时写入 fields。\n\n"
        f"{mode_hint}"
        f"{focus_block}\n"
        f"来源文件: {notice['rel_path']}\n"
        f"检测语言: {lang}\n"
        f"提取方式: {method}\n"
        f"补充文件数: {len(supplement_docs)}\n\n"
        f"【主公告原文】\n{text[:20000]}\n"
        f"{supplement_block}"
    )

    try:
        result = call_dashscope_json(prompt, system)
    except Exception as e:
        conn.execute(
            """INSERT INTO analyses(project_id, analysis_type, status, source_doc_id, source_path, error)
               VALUES(?,?, 'failed', ?, ?, ?)""",
            (project_id, "notice", notice["id"], notice["rel_path"], str(e)[:800]),
        )
        conn.execute(
            "UPDATE projects SET status='analyze_failed', updated_at=datetime('now','localtime') WHERE id=?",
            (project_id,),
        )
        conn.commit()
        raise

    fields = result.get("fields") or []
    # 绿模板：补全未返回的字段为 missing，便于前端按章节展示
    if mode == MODE_GREEN:
        by_key = {str(f.get("key")): f for f in fields if isinstance(f, dict) and f.get("key")}
        merged = []
        for spec in schema:
            hit = by_key.get(spec["key"])
            if hit:
                hit = dict(hit)
                hit.setdefault("label", spec["label"])
                hit.setdefault("section", spec.get("section_title"))
                merged.append(hit)
            else:
                merged.append(
                    {
                        "key": spec["key"],
                        "label": spec["label"],
                        "section": spec.get("section_title"),
                        "value": None,
                        "evidence": None,
                        "status": "missing",
                        "confidence": 0,
                    }
                )
        fields = merged

    payload = {
        "source": {
            "doc_id": notice["id"],
            "path": notice["rel_path"],
            "filename": notice["filename"],
            "language": lang,
            "extract_method": method,
            "text_length": len(text),
            "supplement_docs": supplement_docs,
            "supplement_count": len(supplement_docs),
            "supplement_chars": sum(int(d.get("text_length") or 0) for d in supplement_docs),
        },
        "template_mode": mode,
        "template_label": MODE_LABELS.get(mode, mode),
        "focus_keywords": focus or None,
        "attachments_in_section": attachments,
        "fields": fields,
        "atomic_requirements": result.get("atomic_requirements") or [],
        "open_questions": result.get("open_questions") or [],
        "focus_hits": result.get("focus_hits") or [],
        "raw": result.get("raw_content"),
    }

    if payload["raw"] and not payload["fields"]:
        payload["fields"] = [
            {
                "key": f["key"],
                "label": f["label"],
                "section": f.get("section_title"),
                "value": None,
                "evidence": None,
                "status": "missing",
                "confidence": 0,
            }
            for f in schema
        ]
        payload["parse_warning"] = "模型未返回标准 JSON fields，已保留 raw_content"

    cur = conn.execute(
        """INSERT INTO analyses(project_id, analysis_type, status, source_doc_id, source_path, result_json)
           VALUES(?,?, 'done', ?, ?, ?)""",
        (project_id, "notice", notice["id"], notice["rel_path"], db.dumps(payload)),
    )
    conn.execute(
        "UPDATE projects SET status='notice_analyzed', updated_at=datetime('now','localtime') WHERE id=?",
        (project_id,),
    )
    conn.commit()
    return get_analysis(cur.lastrowid)  # type: ignore


def get_analysis(analysis_id: int) -> Optional[Dict[str, Any]]:
    row = db.row_dict(
        db.get_conn().execute("SELECT * FROM analyses WHERE id=?", (analysis_id,)).fetchone()
    )
    if not row:
        return None
    row["result"] = db.loads(row.pop("result_json", None), {})
    return row


def latest_notice_analysis(project_id: int) -> Optional[Dict[str, Any]]:
    row = db.row_dict(
        db.get_conn()
        .execute(
            """SELECT * FROM analyses WHERE project_id=? AND analysis_type='notice'
               ORDER BY id DESC LIMIT 1""",
            (project_id,),
        )
        .fetchone()
    )
    if not row:
        return None
    row["result"] = db.loads(row.pop("result_json", None), {})
    return row


def project_detail(project_id: int) -> Optional[Dict[str, Any]]:
    from .ingest import build_tree, get_project
    from . import instructions_analysis as inst_svc

    proj = get_project(project_id)
    if not proj:
        return None
    return {
        "project": proj,
        "documents": list_documents(project_id),
        "tree": build_tree(project_id),
        "notice_analysis": latest_notice_analysis(project_id),
        "notice_doc": find_notice_document(project_id),
        "instructions_analysis": inst_svc.latest_instructions(project_id),
        "notice_template": {
            "mode": (proj.get("settings") or {}).get("notice_template_mode"),
            "locked": bool((proj.get("settings") or {}).get("notice_template_locked")),
            "label": (proj.get("settings") or {}).get("notice_template_label"),
            "options": [
                {"value": MODE_GREEN, "label": MODE_LABELS[MODE_GREEN]},
                {"value": MODE_LLM, "label": MODE_LABELS[MODE_LLM]},
            ],
        },
        "structured_export": _structured_export_summary(project_id),
    }


def _structured_export_summary(project_id: int) -> Dict[str, Any]:
    from . import excel_export

    item = excel_export.latest_structured_export(project_id)
    if not item or item.get("status") != "done":
        return {"ready": False, "row_count": 0}
    result = item.get("result") or {}
    return {
        "ready": True,
        "row_count": result.get("row_count") or len(result.get("rows") or []),
        "id": item.get("id"),
        "created_at": item.get("created_at"),
    }
