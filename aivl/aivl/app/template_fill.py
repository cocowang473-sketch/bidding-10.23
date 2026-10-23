"""在招标附件原件上填值并导出，尽量保留原版式。

策略：
1. 通用识别空白形态（下划线/空格 + 括号标签、冒号后空位、年月日空位），不绑死某一种附件
2. 用字段 label/evidence/value 匹配空白并套打；填入文字加 underline（压在横线上）
3. 剩余空白再交给大模型补全（要求只替换小片段）
"""
from __future__ import annotations

import io
import json
import re
import tempfile
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

from docx import Document
from docx.oxml.ns import qn
from docx.table import Table
from docx.text.paragraph import Paragraph


FILL_PLAN_SYSTEM = """你是招投标 Word 附件套打专家。只为「尚未填上」的空白输出替换指令。

硬性规则：
1. old 必须是原文中真实出现的连续子串，尽量小，只覆盖一个空白（可含紧邻标签如 (姓名)），禁止整句替换。
2. new 一般是填入值本身；若原文空白是下划线/多空格横线，underline 必须为 true（文字压在横线上），不要改成括号包住。
3. 正确：old=\"        (姓名)\" new=\"王二\" underline=true
4. 错误：old整句「我……法定代表人」new整句（禁止，会丢掉横线）
5. 不要改已印好的专名（招标人、项目名等固定正文）。
6. 只输出 JSON：{\"replacements\":[{\"old\":\"...\",\"new\":\"...\",\"underline\":true}]}
若无需补充，返回 {\"replacements\":[]}
"""


def _norm(s: str) -> str:
    return re.sub(r"[\s　]+", "", (s or "").strip().lower())


def _fields_ready(fields_list: Sequence[Dict[str, Any]]) -> List[Dict[str, str]]:
    out: List[Dict[str, str]] = []
    for f in fields_list:
        val = str(f.get("value") or "").strip()
        if not val:
            continue
        item = {
            "key": str(f.get("key") or ""),
            "label": str(f.get("label") or ""),
            "value": val,
            "evidence": str(f.get("evidence") or ""),
        }
        # 姓名/身份证 → 拆出姓名供「代理人：」等短空白
        if "name_id" in item["key"] or "身份证" in item["label"]:
            if "/" in val:
                name, id_no = val.split("/", 1)
                item["name_only"] = name.strip()
                item["id_only"] = id_no.strip()
            else:
                item["name_only"] = val
        out.append(item)
    return out


def _parse_ymd(raw: str) -> Optional[Tuple[str, str, str]]:
    s = (raw or "").strip()
    if not s:
        return None
    m = re.search(r"(\d{4})\s*[年/\-.]\s*(\d{1,2})\s*[月/\-.]\s*(\d{1,2})", s)
    if m:
        return m.group(1), str(int(m.group(2))), str(int(m.group(3)))
    m = re.match(r"^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$", s)
    if m:
        return m.group(1), str(int(m.group(2))), str(int(m.group(3)))
    return None


def _resolve_dates(fields: Sequence[Dict[str, str]]) -> Dict[str, Tuple[str, str, str]]:
    """从字段中解析完整日期，按用途归类。"""
    by_key = {f["key"]: f["value"] for f in fields}
    dates: Dict[str, Tuple[str, str, str]] = {}

    def pick(*keys: str, contains: Sequence[str] = ()) -> Optional[Tuple[str, str, str]]:
        for k in keys:
            if k in by_key:
                p = _parse_ymd(by_key[k])
                if p:
                    return p
        for f in fields:
            if any(c in f["key"] or c in f["label"] for c in contains):
                p = _parse_ymd(f["value"])
                if p:
                    return p
        return None

    # 同一组 year/month/day 若都写成完整日期，取第一个
    valid = pick(
        "auth_valid_until",
        "valid_until",
        "expiry_date",
        "valid_until_year",
        "valid_until_month",
        "valid_until_day",
        contains=("valid", "有效", "expiry"),
    )
    sign = pick(
        "sign_date",
        "date",
        "signature_date",
        "sign_date_year",
        "sign_date_month",
        "sign_date_day",
        contains=("sign", "日期"),
    )
    if valid:
        dates["valid"] = valid
    if sign:
        dates["sign"] = sign
    return dates


def _match_value_for_label(label: str, fields: Sequence[Dict[str, str]]) -> Optional[Tuple[str, bool]]:
    """括号/冒号标签 → 填入值。返回 (value, prefer_name_only)。"""
    lab = (label or "").strip()
    if not lab:
        return None
    nlab = _norm(lab)

    # 标签别名
    alias_groups = [
        (("姓名/身份证号", "姓名身份证号", "name_id"), "name_id", False),
        (("投标人名称", "公司名称", "bidder"), "bidder", False),
        (("单位名称", "被授权单位", "授权单位"), "unit", False),
        (("签字人姓名",), "legal", False),
        (("姓名",), "name", True),  # 短「姓名」优先法定代表人；代理人行另走冒号
    ]

    # 直接 label / evidence 命中
    for f in fields:
        if _norm(f["label"]) == nlab:
            if "身份证" in lab or "name_id" in f["key"]:
                return f["value"], False
            if nlab == _norm("姓名") and f.get("name_only") and "agent" in f["key"]:
                continue
            return f["value"], False
        if f["evidence"] and lab in f["evidence"] and _norm(f["label"]) and (
            _norm(f["label"]) in nlab or nlab in _norm(f["label"])
        ):
            return f["value"], False

    # 别名规则
    for aliases, kind, _ in alias_groups:
        if not any(_norm(a) == nlab or nlab in _norm(a) or _norm(a) in nlab for a in aliases):
            continue
        for f in fields:
            k, l = f["key"], f["label"]
            if kind == "name_id" and ("name_id" in k or "身份证" in l):
                return f["value"], False
            if kind == "bidder" and any(x in k or x in l for x in ("bidder", "投标人", "company_name", "公司名称")):
                if "agent" in k:
                    continue
                return f["value"], False
            if kind == "unit" and any(x in k or x in l for x in ("unit", "org", "单位")):
                return f["value"], False
            if kind == "legal" and any(x in k or x in l for x in ("legal", "签字人", "法定代表")):
                return f["value"], False
            if kind == "name" and any(x in k or x in l for x in ("legal_rep", "legal", "签字人", "法定代表")):
                return f["value"], False
            if kind == "name" and k in ("legal_rep_name",) or l in ("姓名",):
                if "legal" in k or l == "姓名":
                    return f["value"], False
    # 短「姓名」：优先 legal_rep_name
    if nlab == _norm("姓名"):
        for f in fields:
            if f["key"] in ("legal_rep_name", "signer_name") or "法定代表" in f["label"] or "签字人" in f["label"]:
                return f["value"], False
        for f in fields:
            if f["key"] == "agent_name" or (f.get("name_only") and "agent" in f["key"]):
                return f.get("name_only") or f["value"], True
    return None


def _match_value_for_colon(label: str, fields: Sequence[Dict[str, str]]) -> Optional[str]:
    lab = (label or "").strip()
    nlab = _norm(lab)

    for f in fields:
        fl = _norm(f["label"])
        fk = f["key"]
        if nlab == _norm("代理人"):
            if "name_id" in fk or fk == "agent_name" or "代理人" in f["label"]:
                return f.get("name_only") or f["value"].split("/")[0].strip()
            continue
        if fl == nlab or nlab == fl:
            return f["value"]

    rules = [
        ("性别", lambda f: f["key"].endswith("_gender") or f["key"] == "gender" or f["label"].endswith("性别")),
        ("年龄", lambda f: f["key"].endswith("_age") or f["key"] == "age" or f["label"].endswith("年龄")),
        (
            "单位",
            lambda f: f["key"] in ("agent_company", "agent_org_name")
            or (f["label"].endswith("单位") and "名称" not in f["label"]),
        ),
        ("部门", lambda f: f["key"].endswith("_department") or f["key"].endswith("_dept") or f["label"].endswith("部门")),
        ("职务", lambda f: f["key"].endswith("_position") or f["key"].endswith("_title") or f["label"].endswith("职务")),
    ]
    for name, pred in rules:
        if nlab != _norm(name):
            continue
        for f in fields:
            if pred(f):
                return f["value"]
        # 单位兜底
        if name == "单位":
            for f in fields:
                if any(x in f["key"] for x in ("company", "unit", "org")):
                    return f["value"]
    return None


def build_structural_replacements(
    paragraphs: Sequence[str],
    fields_list: Sequence[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """通用结构套打：空白+标签 / 冒号空位 / 年月日。"""
    fields = _fields_ready(fields_list)
    if not fields:
        return []
    dates = _resolve_dates(fields)
    ops: List[Dict[str, Any]] = []
    used_olds = set()

    def add(old: str, new: str, underline: bool = True) -> None:
        if not old or old == new or old in used_olds:
            return
        used_olds.add(old)
        ops.append({"old": old, "new": new, "underline": underline})

    blob_paras = list(paragraphs)

    # 1) 下划线/空格 + (标签) 或 （标签）
    label_blank = re.compile(
        r"(?P<blank>[_\s　＿—－]{2,})\s*(?P<l>[（(])(?P<label>[^）)]+?)(?P<r>[)）])"
    )
    bare_label = re.compile(r"(?P<l>[（(])(?P<label>[^）)]+?)(?P<r>[)）])")

    for p in blob_paras:
        for m in label_blank.finditer(p):
            lab = m.group("label").strip()
            # 跳过固定说明
            if lab in ("盖章", "签字并盖章", "签字并加盖章", "招标人"):
                continue
            matched = _match_value_for_label(lab, fields)
            if not matched:
                continue
            val, _ = matched
            add(m.group(0), val, True)

        # 无前导空白、仅 (标签) 且标签是待填项
        for m in bare_label.finditer(p):
            lab = m.group("label").strip()
            if lab in ("盖章", "签字并盖章", "签字并加盖章", "招标人", "小写", "大写"):
                continue
            # 已被带空白规则覆盖则跳过
            span = m.group(0)
            if any(span in o for o in used_olds):
                continue
            # 若前面已是填好的值则跳过
            matched = _match_value_for_label(lab, fields)
            if not matched:
                continue
            # 仅当标签本身像占位（短标签）且未被 blank 规则吃掉
            if re.match(r"^(姓名|投标人名称|单位名称|签字人姓名|公司名称|姓名/身份证号)$", lab):
                # 若同段已有 blank+label 匹配，bare 可能是重复——检查 old 是否还在
                full = None
                for m2 in label_blank.finditer(p):
                    if m2.group("label").strip() == lab:
                        full = m2.group(0)
                        break
                if full and full in used_olds:
                    continue
                if full:
                    continue  # 留给 blank 规则；若 blank 未匹配则下面处理
                val, _ = matched
                add(span, f"{m.group('l')}{val}{m.group('r')}", False)

    # 2) 冒号后空白：代理人：____ / 年龄：（行末可无空格）
    colon_blank = re.compile(
        r"(?P<label>[\u4e00-\u9fffA-Za-z]{1,8})：(?P<blank>[_\s　]*)(?=(?:[\u4e00-\u9fffA-Za-z]{1,8}：)|$)"
    )
    for p in blob_paras:
        for m in colon_blank.finditer(p):
            lab = m.group("label")
            blank = m.group("blank")
            # 已有非空白内容则跳过（避免重复填）
            if blank and re.search(r"[^\s_　]", blank):
                continue
            # 行末无空白也允许填（年龄：、职务：）
            if not blank and not (m.end() == len(p) or p[m.end() : m.end() + 1] in ("",)):
                # 后面紧跟下一标签时 blank 可为空
                pass
            val = _match_value_for_colon(lab, fields)
            if not val:
                continue
            add(m.group(0), f"{lab}：{val} ", True)

    # 3) 日期：有效期至20  年  月  日 / 日期：   年  月  日
    if "valid" in dates:
        y, mo, d = dates["valid"]
        for p in blob_paras:
            m = re.search(r"有效期至\s*20\s*年\s*月\s*日", p)
            if m:
                add(m.group(0), f"有效期至{y}年{mo}月{d}日", False)
            m = re.search(r"有效期至\s*\d{0,4}\s*年\s*\d{0,2}\s*月\s*\d{0,2}\s*日", p)
            if m and "年" in m.group(0) and re.search(r"年\s*月\s*日", m.group(0)):
                add(m.group(0), f"有效期至{y}年{mo}月{d}日", False)
    if "sign" in dates:
        y, mo, d = dates["sign"]
        for p in blob_paras:
            m = re.search(r"日期：\s*\d*\s*年\s*\d*\s*月\s*\d*\s*日", p)
            if m:
                add(m.group(0), f"日期：{y}年{mo}月{d}日", False)

    # 长 old 优先
    ops.sort(key=lambda x: len(x["old"]), reverse=True)
    return ops


def plan_replacements_with_llm(
    paragraphs: Sequence[str],
    fields_list: Sequence[Dict[str, Any]],
    kind: str = "",
    already: Optional[Sequence[Dict[str, Any]]] = None,
) -> List[Dict[str, Any]]:
    filled = _fields_ready(fields_list)
    if not filled:
        return []
    paras = [p for p in paragraphs if (p or "").strip()]
    if not paras:
        return []

    # 模拟已应用的结构替换，让模型只补剩余
    sim = list(paras)
    for item in already or []:
        old, new = item.get("old") or "", item.get("new") or ""
        if old and old in "".join(sim):
            sim = [p.replace(old, new, 1) for p in sim]

    from .llm import call_dashscope_json

    prompt = (
        f"附件类型 hint（仅供参考）: {kind or 'unknown'}\n\n"
        f"已填字段:\n{json.dumps(filled, ensure_ascii=False)}\n\n"
        f"已完成的替换（勿重复）:\n{json.dumps(list(already or []), ensure_ascii=False)}\n\n"
        "当前模板段落（请基于这些原文取 old）:\n"
        + "\n".join(f"[{i}] {p}" for i, p in enumerate(sim))
    )
    try:
        result = call_dashscope_json(prompt, FILL_PLAN_SYSTEM, temperature=0.1)
    except Exception:
        return []
    raw = result.get("replacements") if isinstance(result, dict) else None
    if not isinstance(raw, list):
        return []

    # 校验：old 必须在原始段落中；拒绝过长整句（超过 40 字且含多个句读）
    ops: List[Dict[str, Any]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        old = str(item.get("old") or "")
        new = str(item.get("new") or "")
        if not old or new == old:
            continue
        if not any(old in p for p in paras):
            # 也可能在 sim 中
            if not any(old in p for p in sim):
                continue
        if len(old) > 36 and (old.count("，") + old.count("。") >= 1):
            continue
        if len(old) > 50:
            continue
        ops.append({"old": old, "new": new, "underline": bool(item.get("underline"))})
    ops.sort(key=lambda x: len(x["old"]), reverse=True)
    return ops


def _iter_paragraphs(doc: Document) -> Iterable[Paragraph]:
    for p in doc.paragraphs:
        yield p
    for table in doc.tables:
        yield from _iter_table_paragraphs(table)
    for section in doc.sections:
        for part in (
            section.header,
            section.footer,
            getattr(section, "first_page_header", None),
            getattr(section, "first_page_footer", None),
            getattr(section, "even_page_header", None),
            getattr(section, "even_page_footer", None),
        ):
            if part is None:
                continue
            try:
                for p in part.paragraphs:
                    yield p
                for table in part.tables:
                    yield from _iter_table_paragraphs(table)
            except Exception:
                continue


def _iter_table_paragraphs(table: Table) -> Iterable[Paragraph]:
    for row in table.rows:
        for cell in row.cells:
            for p in cell.paragraphs:
                yield p
            for nested in cell.tables:
                yield from _iter_table_paragraphs(nested)


def _ensure_east_asia_font(run) -> None:
    try:
        r = run._element
        rPr = r.get_or_add_rPr()
        rFonts = rPr.get_or_add_rFonts()
        if not rFonts.get(qn("w:eastAsia")):
            rFonts.set(qn("w:eastAsia"), "宋体")
    except Exception:
        pass


def _replace_paragraph_span(
    paragraph: Paragraph,
    start: int,
    end: int,
    new: str,
    underline: bool = False,
) -> None:
    runs = list(paragraph.runs)
    if not runs:
        run = paragraph.add_run(new)
        if underline:
            run.font.underline = True
        _ensure_east_asia_font(run)
        return

    spans: List[Tuple[Any, int, int]] = []
    pos = 0
    for run in runs:
        t = run.text or ""
        spans.append((run, pos, pos + len(t)))
        pos += len(t)
    if start < 0 or start > pos:
        return
    end = min(end, pos)
    first_i = last_i = None
    for i, (_run, rs, re_) in enumerate(spans):
        if re_ <= start:
            continue
        if rs >= end:
            break
        if first_i is None:
            first_i = i
        last_i = i
    if first_i is None or last_i is None:
        return

    first_run, fs, _fe = spans[first_i]
    last_run, ls, _le = spans[last_i]
    prefix = (first_run.text or "")[: max(0, start - fs)]
    suffix = (last_run.text or "")[max(0, end - ls) :]

    for i in range(first_i + 1, last_i + 1):
        spans[i][0].text = ""

    if not underline:
        if first_i == last_i:
            first_run.text = prefix + new + suffix
        else:
            first_run.text = prefix + new
            if suffix:
                suf = paragraph.add_run(suffix)
                _ensure_east_asia_font(suf)
                first_run._element.addnext(suf._element)
        return

    first_run.text = prefix
    new_run = paragraph.add_run(new)
    new_run.font.underline = True
    _ensure_east_asia_font(new_run)
    first_run._element.addnext(new_run._element)
    if suffix:
        suf_run = paragraph.add_run(suffix)
        _ensure_east_asia_font(suf_run)
        new_run._element.addnext(suf_run._element)


def _apply_replacements_to_paragraph(paragraph: Paragraph, replacements: Sequence[Dict[str, Any]]) -> None:
    for item in replacements:
        old = str(item.get("old") or "")
        new = str(item.get("new") or "")
        underline = bool(item.get("underline"))
        if not old:
            continue
        text = paragraph.text
        idx = text.find(old)
        if idx < 0:
            continue
        _replace_paragraph_span(paragraph, idx, idx + len(old), new, underline=underline)


def apply_replacements_to_docx_path(docx_path: Path, replacements: Sequence[Dict[str, Any]]) -> bytes:
    doc = Document(str(docx_path))
    for paragraph in _iter_paragraphs(doc):
        if not paragraph.text or not paragraph.text.strip():
            continue
        _apply_replacements_to_paragraph(paragraph, replacements)
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def convert_to_docx(src: Path, dst: Path) -> bool:
    try:
        import win32com.client  # type: ignore
    except Exception:
        return False

    with tempfile.TemporaryDirectory(prefix="aivl_conv_") as td:
        td_path = Path(td)
        src_copy = td_path / f"src{src.suffix.lower()}"
        dst_tmp = td_path / "out.docx"
        try:
            src_copy.write_bytes(src.read_bytes())
        except Exception:
            return False

        abs_src = str(src_copy.resolve())
        abs_dst = str(dst_tmp.resolve())
        prog_ids = ("Word.Application", "KWPS.Application", "wps.Application")
        wd_format_xml = 16

        for prog in prog_ids:
            app = None
            try:
                app = win32com.client.Dispatch(prog)
                app.Visible = False
                try:
                    app.DisplayAlerts = 0
                except Exception:
                    pass
                doc = app.Documents.Open(abs_src, False, True)
                try:
                    doc.SaveAs2(abs_dst, FileFormat=wd_format_xml)
                except Exception:
                    doc.SaveAs(abs_dst, FileFormat=wd_format_xml)
                doc.Close(False)
                if dst_tmp.exists() and dst_tmp.stat().st_size > 0:
                    dst.write_bytes(dst_tmp.read_bytes())
                    return True
            except Exception:
                continue
            finally:
                if app is not None:
                    try:
                        app.Quit()
                    except Exception:
                        pass
        return False


def _merge_ops(*groups: Sequence[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen = set()
    out: List[Dict[str, Any]] = []
    for group in groups:
        for item in group:
            old = item.get("old") or ""
            if not old or old in seen:
                continue
            seen.add(old)
            out.append(item)
    out.sort(key=lambda x: len(x["old"]), reverse=True)
    return out


def fill_original_attachment(
    src_path: Path,
    fields_list: Sequence[Dict[str, Any]],
    kind: str,
) -> Optional[bytes]:
    if not src_path.exists():
        return None
    if not any(str(f.get("value") or "").strip() for f in fields_list):
        if src_path.suffix.lower() == ".docx":
            return src_path.read_bytes()
        return None

    suffix = src_path.suffix.lower()
    with tempfile.TemporaryDirectory(prefix="aivl_fill_") as td:
        td_path = Path(td)
        work_docx = td_path / "work.docx"

        if suffix == ".docx":
            work_docx.write_bytes(src_path.read_bytes())
        elif suffix == ".doc":
            if not convert_to_docx(src_path, work_docx):
                return None
        else:
            return None

        try:
            doc = Document(str(work_docx))
            paragraphs = [p.text for p in _iter_paragraphs(doc)]
            structural = build_structural_replacements(paragraphs, fields_list)
            llm_ops = plan_replacements_with_llm(
                paragraphs, fields_list, kind, already=structural
            )
            replacements = _merge_ops(structural, llm_ops)
            if not replacements:
                return work_docx.read_bytes()
            return apply_replacements_to_docx_path(work_docx, replacements)
        except Exception:
            return None


def build_fill_ops(fields_list: Sequence[Dict[str, Any]], kind: str):
    """兼容旧接口。"""
    return []
