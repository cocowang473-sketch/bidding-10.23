"""按《招标文件结构化解读表》模板导出 Excel。

设计原则（不写死具体项目/文件名）：
1. 从当前 ZIP 文件地图动态挑选「主依据」文档；
2. 按文件角色推断应覆盖的 Key（K01~K13）；
3. 分文件、分块抽取原子需求；
4. 「来源文件」必须回落到 ZIP 内真实文件名，禁止幻觉文件名。
"""
from __future__ import annotations

import io
import re
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from openpyxl import load_workbook
from openpyxl.worksheet.worksheet import Worksheet

from .ingest import absolute_doc_path, list_documents
from .llm import call_dashscope_json
from .notice_analysis import latest_notice_analysis
from .text_extract import extract_text

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE_PATH = ROOT / "templates" / "招标文件结构化解读表.xlsx"

HEADERS = [
    "需求ID",
    "一级Key",
    "模块",
    "子模块",
    "提取项",
    "招标文件关键信息",
    "关键参数/数量",
    "来源文件",
    "章节/条款",
    "PDF页码",
    "状态",
    "后续动作",
]

KEY_META = [
    ("K01", "K01 项目基本信息", "项目名称、地点、规模、进度节点"),
    ("K02", "K02 招标对象与范围", "招标对象、投标节点、澄清程序、履约要求"),
    ("K03", "K03 项目功能与规模", "床位、科室、手术部、急诊、技术科室、辅助设施"),
    ("K04", "K04 建筑与总体条件", "层数、结构、楼栋、能源中心、流线"),
    ("K05", "K05 设计责任与成果", "勘察、方案、Avant-Projet、执行设计、竣工图"),
    ("K06", "K06 专业系统范围", "强电、弱电、暖通、给排水、消防"),
    ("K08", "K08 标准与规范", "文件明确引用的标准与计算方法"),
    ("K09", "K09 设备材料及供货责任", "明确供货项及另行提供的附件"),
    ("K10", "K10 施工协调与现场责任", "临设、临水临电、清理、协调、保护、吊装"),
    ("K11", "K11 测试验收与交付", "调试、培训、文件语言、竣工资料、质量"),
    ("K12", "K12 投标商务与合同程序", "资料责任、现场条件、完整交付、报价责任"),
    ("K13", "K13 文件约束与待确认", "保密、冲突、缺失附件、文件版本"),
]

KEY_LABEL = {k: label for k, label, _ in KEY_META}

SHEET_KEY_FILTER = {
    "03_功能与建筑": {"K03", "K04"},
    "04_设计与施工": {"K05", "K10"},
    "05_机电技术要求": {"K06", "K08", "K09"},
    "06_验收商务约束": {"K11", "K12", "K13"},
}

# 文件角色 → 建议抽取 Key（通用启发式，不绑定具体项目名）
FOCUS_RULES: List[Tuple[Tuple[str, ...], List[str]]] = [
    # 先匹配更具体角色，避免「招标公告」目录污染保密/答疑等文件
    (("保密", "confident"), ["K13"]),
    (("答疑", "clarif", "补遗", "addend", "问题清单"), ["K02", "K12", "K13"]),
    (("通告", "avis d", "appel d"), ["K01", "K02", "K12", "K13"]),
    (("招标公告", "招标通告"), ["K01", "K02", "K12", "K13"]),
    (("annexe 1", "annexe1", "programme fonctionnel", "功能与技术", "功能要求"), ["K03", "K04"]),
    (
        (
            "annexe 2",
            "annexe2",
            "cctg",
            "clauses techniques",
            "一般技术条款",
            "技术条款要求",
            "中法对照",
        ),
        ["K05", "K06", "K08", "K09", "K10", "K11"],
    ),
    (("须知", "instruction aux"), ["K02", "K12"]),
    (("机翻", "附件1-2", "49-123"), ["K03", "K04", "K05", "K06", "K08", "K09", "K10", "K11"]),
    (("合同", "contrat", "contract"), ["K05", "K10", "K11", "K12", "K13"]),
]

SYSTEM_PROMPT = """你是招标文件结构化解读专家。
任务：把给定原文拆成「原子需求」行，写入统一解读表。
硬性规则：
1. 一条只表达一个可单独验证的事实；一句多条件必须拆多行。
2. 任何事实必须来自原文；禁止补充行业常识或推断。
3. 数字必须保留原文数值、单位和限定条件。
4. 状态只能是：已明确 / 文件冲突 / 文件未提供。
5. 「来源文件」必须使用我提供的真实文件名，禁止改写或编造。
6. 只输出 JSON，不要 markdown。
返回格式：
{
  "rows": [
    {
      "一级Key": "K01 项目基本信息",
      "模块": "...",
      "子模块": "...",
      "提取项": "...",
      "招标文件关键信息": "...",
      "关键参数/数量": "...或—",
      "来源文件": "必须等于给定文件名",
      "章节/条款": "...",
      "PDF页码": "P?或—",
      "状态": "已明确",
      "后续动作": null
    }
  ]
}
一级Key 仅允许：K01~K06、K08~K13（带中文全称）。
尽量多拆、细拆；宁可多行，也不要合并成笼统摘要。
单次响应最多 18 条，且必须是完整可解析 JSON。
"""


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").lower()).strip()


def _infer_focus_keys(filename: str, rel_path: str) -> List[str]:
    name = _norm(filename)
    path = _norm(rel_path)
    for tips, keys in FOCUS_RULES:
        if any(t in name for t in tips):
            return keys
    for tips, keys in FOCUS_RULES:
        if any(t in path for t in tips):
            return keys
    return ["K01", "K02", "K13"]


def _score_doc(d: Dict[str, Any]) -> int:
    """动态打分挑选主依据；不写死文件名。"""
    name = d.get("filename") or ""
    path = d.get("rel_path") or ""
    s = _norm(f"{name} {path}")
    if name.startswith("._") or d.get("role") == "junk":
        return -999
    score = 0
    # 机翻/翻译件显著降权：同主题优先原件
    if any(x in s for x in ("机翻", "翻译", "traduction", "translation", "中法对照")):
        score -= 80
    if d.get("is_notice"):
        score += 120
    if d.get("in_notice_section"):
        score += 35
    if any(x in s for x in ("通告", "公告", "avis")):
        score += 80
    if any(x in s for x in ("答疑", "clarif", "补遗")):
        score += 70
    if "保密" in s and "承诺书" not in s:
        score += 55
    if "保密承诺" in s:
        score += 20
    if "补充文件" in path or "补充材料" in path or "法语文件" in path:
        score += 80
    if any(x in s for x in ("annexe 1", "annexe1", "programme fonctionnel", "功能与技术")):
        score += 95
    if any(x in s for x in ("annexe 2", "annexe2", "cctg", "clauses techniques", "一般技术条款")):
        score += 95
    if "补充文件" in path or "法语" in path:
        score += 25
    if any(x in s for x in ("须知", "instruction")):
        score += 40
    # 合并扫描件可作交叉核验，略低于独立 Annex
    if "49-123" in s or "附件1-2" in s:
        score += 45
    # 投标人提交附件模板不是招标解读主依据
    if "需投标人提交" in path or "附件0" in name:
        score -= 40
    # 安全交底/手册不是结构化解读主依据
    if any(
        x in s
        for x in (
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
    ):
        score -= 120
    if any(x in s for x in ("业主合同", "一般技术条款要求")):
        score += 15  # 低于独立 ANNEXE，避免抢占 Annex 抽取顺序
    if any(x in s for x in ("annexe 1", "annexe1", "annexe 2", "annexe2", "programme fonctionnel")):
        score += 25
    ext = (d.get("ext") or "").lower()
    if ext == ".pdf":
        score += 8
    elif ext in (".doc", ".docx", ".txt"):
        score += 5
    else:
        score -= 20
    size = int(d.get("size_bytes") or 0)
    if size > 50_000:
        score += 5
    if size > 500_000:
        score += 5
    return score


def _role_signature(filename: str, rel_path: str) -> str:
    """按角色归并，避免同主题多份扫描件重复抽取。"""
    s = _norm(f"{filename} {rel_path}")
    if any(x in s for x in ("通告", "avis")) and "答疑" not in s:
        return "notice"
    if any(x in s for x in ("答疑", "clarif", "问题清单")):
        return "clarif"
    if "保密" in s or "confident" in s:
        return "confidential"
    if any(x in s for x in ("annexe 1", "annexe1", "programme fonctionnel", "功能与技术")):
        return "annex1"
    if "业主合同" in s or "一般技术条款要求" in s:
        return "owner_tech"
    if any(x in s for x in ("annexe 2", "annexe2", "cctg", "clauses techniques", "一般技术条款", "中法对照")):
        return "annex2"
    if "49-123" in s or "附件1-2" in s:
        return "annex_bundle"
    if any(x in s for x in ("合同", "contrat", "contract")):
        return "contract"
    return ",".join(_infer_focus_keys(filename, rel_path))


def pick_primary_docs(project_id: int, limit: int = 8) -> List[Dict[str, Any]]:
    docs = list_documents(project_id)
    # 先原件后翻译
    ranked = sorted(
        docs,
        key=lambda d: (
            1 if any(x in _norm(d.get("filename") or "") for x in ("机翻", "翻译", "traduction", "中法对照")) else 0,
            -_score_doc(d),
        ),
    )
    picked: List[Dict[str, Any]] = []
    seen_roles: Set[str] = set()
    for d in ranked:
        if _score_doc(d) < 50:
            continue
        name = d.get("filename") or ""
        path = d.get("rel_path") or ""
        s = _norm(name)
        if any(
            x in s
            for x in (
                "安全技术交底",
                "安全指导",
                "安全生产",
                "管理手册",
                "检查表",
                "评分表",
                "会签表",
                "higiene",
                "seguridad",
                "medicina del trabajo",
            )
        ):
            continue
        role = _role_signature(name, path)
        is_trans = any(x in s for x in ("机翻", "翻译", "traduction", "中法对照"))
        # 同角色只保留一份主依据（优先原件）
        if role in seen_roles:
            continue
        # Annex1/2 已入选时，合并扫描件/业主一般技术条款不再占坑
        if role in ("annex_bundle", "owner_tech") and ({"annex1", "annex2"} & seen_roles):
            continue
        if is_trans and len(picked) >= max(3, limit - 2):
            continue
        picked.append(d)
        seen_roles.add(role)
        if len(picked) >= limit:
            break
    return picked


def _readable_ratio(text: str) -> float:
    if not text:
        return 0.0
    good = 0
    for ch in text:
        o = ord(ch)
        if 0x4E00 <= o <= 0x9FFF:
            good += 1
        elif ch.isascii() and (ch.isalnum() or ch.isspace() or ch in ".,;:()/-%"):
            good += 1
    return good / max(len(text), 1)


def _is_usable_text(text: str, method: str = "") -> bool:
    if not text or len(text.strip()) < 200:
        return False
    if _readable_ratio(text) < 0.25:
        return False
    if method == "ole":
        if not re.search(
            r"[。；，：]|(\b(le|la|les|des|pour|projet|offre|annexe)\b)|(项目|工程|投标|招标|医院|合同)",
            text,
            re.I,
        ):
            return False
    return True


def _extract_full_text(project_id: int, d: Dict[str, Any], max_chars: int = 60000) -> Tuple[str, str]:
    path = absolute_doc_path(project_id, d["rel_path"])
    text, method = extract_text(path, max_chars=max_chars)
    if not _is_usable_text(text, method) and d.get("text_preview"):
        prev = d["text_preview"]
        if _is_usable_text(prev, "preview"):
            return prev, "preview"
    return text, method


def _topic_boost(original_name: str, candidate_name: str, candidate_path: str) -> float:
    o = _norm(original_name)
    c = _norm(candidate_name + " " + candidate_path)
    boost = 0.0
    if any(x in o for x in ("annexe 1", "annexe1", "programme", "功能")) and any(
        x in c for x in ("annexe 1", "annexe1", "programme", "功能", "49-123", "附件1-2")
    ):
        boost += 20
    if any(x in o for x in ("annexe 2", "annexe2", "cctg", "clauses techniques", "一般技术")) and any(
        x in c
        for x in (
            "annexe 2",
            "annexe2",
            "cctg",
            "clauses techniques",
            "中法对照",
            "一般技术",
            "49-123",
            "附件1-2",
        )
    ):
        boost += 20
    if any(x in o for x in ("通告", "公告")) and any(x in c for x in ("通告", "公告", "avis")):
        boost += 15
    if any(x in o for x in ("答疑", "clarif")) and any(x in c for x in ("答疑", "clarif", "问题清单")):
        boost += 15
    if any(x in o for x in ("annexe 2", "annexe2", "cctg", "一般技术", "业主合同")) and any(
        x in c for x in ("cctg", "中法对照", "一般技术", "clauses techniques", "业主合同")
    ):
        boost += 22
    if any(x in o for x in ("合同", "contrat", "附件1-2", "49-123")) and any(
        x in c for x in ("机翻", "contrat", "附件1-2", "49-123", "主合同")
    ):
        boost += 18
    # 一般技术条款优先对照译本，避免落到整本合同机翻
    if any(x in o for x in ("一般技术", "业主合同", "cctg", "annexe 2")) and "机翻" in c and "cctg" not in c and "中法对照" not in c:
        boost -= 12
    if any(x in c for x in ("安全技术交底", "安全指导", "检查表", "评分表", "会签表", "交底")):
        boost -= 40
    if any(x in c for x in ("需投标人提交", "附件0")):
        boost -= 20
    return boost


def _find_readable_fallback(
    project_id: int,
    focus_keys: List[str],
    exclude_names: Set[str],
    original_name: str = "",
) -> Optional[Tuple[Dict[str, Any], str, str]]:
    """原文不可读时，找同主题可读件（不写死文件名）。

    先按文件名启发式预排序，只对 Top-N 候选做文本抽取，避免扫全包卡死。
    """
    focus_set = set(focus_keys)
    candidates: List[Tuple[float, Dict[str, Any]]] = []
    for d in list_documents(project_id):
        name = d.get("filename") or ""
        path = d.get("rel_path") or ""
        if name in exclude_names or name.startswith("._") or d.get("role") == "junk":
            continue
        if any(
            x in _norm(name)
            for x in ("安全技术交底", "安全指导", "检查表", "评分表", "会签表", "higiene", "seguridad")
        ):
            continue
        keys = set(_infer_focus_keys(name, path))
        overlap = len(focus_set & keys)
        s = _norm(name + " " + path)
        if overlap == 0:
            if any(k in focus_set for k in ("K03", "K04", "K05", "K06", "K08", "K09", "K10", "K11")) and any(
                x in s
                for x in (
                    "机翻",
                    "中法对照",
                    "annexe",
                    "programme",
                    "cctg",
                    "技术条款",
                    "49-123",
                    "附件1-2",
                )
            ):
                overlap = 1
            else:
                continue
        pre = overlap * 10 + _topic_boost(original_name, name, path)
        if any(x in s for x in ("中法对照", "机翻", "翻译")):
            pre += 8
        ext = (d.get("ext") or "").lower()
        if ext in (".docx", ".txt"):
            pre += 3
        if ext == ".pdf":
            pre += 1
        if ext == ".doc":
            pre -= 1
        candidates.append((pre, d))

    candidates.sort(key=lambda x: -x[0])
    best = None
    best_score = -1.0
    for pre, d in candidates[:6]:
        name = d.get("filename") or ""
        path = d.get("rel_path") or ""
        text, method = _extract_full_text(project_id, d, max_chars=90000)
        if not _is_usable_text(text, method):
            continue
        ratio = _readable_ratio(text)
        score = pre + ratio * 5 + min(len(text), 60000) / 8000
        if method in ("pdf", "docx", "plain", "preview", "com"):
            score += 4
        if method == "ole":
            score -= 8
        if score > best_score:
            best_score = score
            best = (d, text, method)
    return best


def _chunk_text(text: str, chunk_size: int = 9000, overlap: int = 400, max_chunks: int = 12) -> List[str]:
    text = (text or "").strip()
    if not text:
        return []
    if len(text) <= chunk_size:
        return [text]
    chunks = []
    i = 0
    while i < len(text) and len(chunks) < max_chunks:
        chunks.append(text[i : i + chunk_size])
        i += chunk_size - overlap
    return chunks


def _guess_param(text: str) -> str:
    m = re.search(
        r"(\d+(?:[.,]\d+)?\s*(?:床|ha|公顷|㎡|m²|m2|平方米|个月|日|天|%|小时|h|kva|kw|mm|dn\d+)?)",
        text,
        re.I,
    )
    return m.group(1).replace(" ", "") if m else "—"


def _rows_from_notice_analysis(project_id: int, known_files: Set[str]) -> List[Dict[str, Any]]:
    analysis = latest_notice_analysis(project_id)
    if not analysis or analysis.get("status") != "done":
        return []
    result = analysis.get("result") or {}
    source = result.get("source") or {}
    source_name = source.get("filename") or "1.1 招标通告.doc"
    if source_name not in known_files:
        for n in known_files:
            if "通告" in n or "公告" in n:
                source_name = n
                break
    key_map = {
        "project_name": ("K01", "项目概况", "项目名称", "项目名称"),
        "location": ("K01", "项目概况", "项目地点", "所在地"),
        "scale": ("K01", "项目概况", "建筑规模", "规模"),
        "start_date": ("K01", "项目进度", "启动/开工", "日期"),
        "duration": ("K01", "项目进度", "工期", "总工期"),
        "employer": ("K02", "招标主体", "招标人", "业主/招标人"),
        "main_contractor": ("K02", "招标主体", "总包方", "总包"),
        "scope": ("K02", "招标范围", "本次招标对象", "分包专业"),
        "bid_deadline": ("K02", "投标程序", "截标日期", "投标截止"),
        "qa_deadline": ("K02", "投标程序", "澄清截止", "疑问提交"),
        "site_visit": ("K02", "现场考察", "现场踏勘", "踏勘安排"),
        "submit_place": ("K02", "投标程序", "递交地点", "送达地点"),
        "price_form": ("K12", "报价", "报价形式", "计价方式"),
        "currency": ("K12", "报价", "币种", "计价货币"),
        "confidentiality": ("K13", "保密", "保密义务", "保密要求"),
    }
    rows: List[Dict[str, Any]] = []
    for f in result.get("fields") or []:
        if not f.get("value"):
            continue
        meta = key_map.get(f.get("key") or "")
        if not meta:
            continue
        code, module, sub, item = meta
        rows.append(
            {
                "一级Key": KEY_LABEL[code],
                "模块": module,
                "子模块": sub,
                "提取项": item,
                "招标文件关键信息": str(f.get("value")),
                "关键参数/数量": _guess_param(str(f.get("value"))),
                "来源文件": source_name,
                "章节/条款": "招标通告",
                "PDF页码": "—",
                "状态": "已明确",
                "后续动作": None,
            }
        )
    for ar in result.get("atomic_requirements") or []:
        text = (ar.get("text") or "").strip()
        if not text:
            continue
        rows.append(
            {
                "一级Key": KEY_LABEL["K02"],
                "模块": "公告要求",
                "子模块": "原子要求",
                "提取项": text[:40],
                "招标文件关键信息": text,
                "关键参数/数量": ar.get("param") or "—",
                "来源文件": source_name,
                "章节/条款": "招标通告",
                "PDF页码": "—",
                "状态": "已明确",
                "后续动作": None,
            }
        )
    return rows


def _normalize_row(r: Dict[str, Any], forced_filename: str, allowed_keys: List[str]) -> Optional[Dict[str, Any]]:
    info = str(r.get("招标文件关键信息") or "").strip()
    if not info:
        return None
    key_raw = str(r.get("一级Key") or "")
    m = re.match(r"(K\d+)", key_raw)
    code = m.group(1) if m else ""
    if code not in KEY_LABEL:
        code = allowed_keys[0] if allowed_keys else "K13"
    if allowed_keys and code not in allowed_keys:
        code = allowed_keys[0]
    status = str(r.get("状态") or "已明确")
    if status not in ("已明确", "文件冲突", "文件未提供"):
        status = "已明确"
    return {
        "一级Key": KEY_LABEL[code],
        "模块": str(r.get("模块") or "未分类"),
        "子模块": str(r.get("子模块") or "—"),
        "提取项": str(r.get("提取项") or info[:40]),
        "招标文件关键信息": info,
        "关键参数/数量": str(r.get("关键参数/数量") or _guess_param(info)),
        "来源文件": forced_filename,
        "章节/条款": str(r.get("章节/条款") or "—"),
        "PDF页码": str(r.get("PDF页码") or "—"),
        "状态": status,
        "后续动作": r.get("后续动作"),
    }


def _llm_extract_one_chunk(
    filename: str,
    focus_keys: List[str],
    chunk: str,
    chunk_idx: int,
    chunk_total: int,
) -> List[Dict[str, Any]]:
    focus_desc = "、".join(f"{k} {KEY_LABEL[k].split(' ', 1)[-1]}" for k in focus_keys if k in KEY_LABEL)
    prompt = (
        f"真实文件名（来源文件必须填这个）: {filename}\n"
        f"本文件重点抽取 Key: {focus_desc}\n"
        f"原文分块: {chunk_idx + 1}/{chunk_total}\n"
        f"硬限制：本块最多输出 18 条原子需求，优先含数字/规模/系统/责任的硬指标；"
        f"必须输出完整可解析 JSON（不要中途截断）。\n"
        f"请从下列原文拆出原子需求行：\n\n{chunk}"
    )
    result = call_dashscope_json(prompt, SYSTEM_PROMPT, temperature=0.1)
    rows = []
    for r in result.get("rows") or []:
        if not isinstance(r, dict):
            continue
        nr = _normalize_row(r, filename, focus_keys)
        if nr:
            rows.append(nr)
    return rows


def extract_rows_from_package(project_id: int) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    all_docs = list_documents(project_id)
    known_files = {d["filename"] for d in all_docs if d.get("filename")}
    primary = pick_primary_docs(project_id, limit=6)
    meta: Dict[str, Any] = {
        "primary_docs": [],
        "llm_errors": [],
        "chunks_done": 0,
        "fallbacks": [],
    }
    rows: List[Dict[str, Any]] = []
    rows.extend(_rows_from_notice_analysis(project_id, known_files))

    used_extract_names: Set[str] = set()
    used_focus_by_text: Dict[str, Set[str]] = defaultdict(set)
    extract_jobs: List[Dict[str, Any]] = []

    for d in primary:
        filename = d["filename"]
        focus = _infer_focus_keys(filename, d.get("rel_path") or "")
        text, method = _extract_full_text(project_id, d, max_chars=90000)
        # Excel「来源文件」优先写包内角色主文件名（与样表一致）；文本可读性不足时另找回退件
        source_for_rows = filename
        text_source_name = filename
        note = None
        if not _is_usable_text(text, method):
            fb = _find_readable_fallback(
                project_id,
                focus,
                exclude_names={filename},
                original_name=filename,
            )
            if fb:
                fd, ftext, fmethod = fb
                meta["fallbacks"].append(
                    {"original": filename, "fallback": fd["filename"], "reason": "原文不可读/疑似扫描件"}
                )
                text_source_name = fd["filename"]
                text, method = ftext, fmethod
                note = f"原件「{filename}」无法提取文本，已用可读件「{text_source_name}」抽取；来源文件仍记原件名"
                # 回退件只补充文本，不改变原件角色 Key（避免 Annex1 被扩成整本合同 Key）
            else:
                meta["llm_errors"].append(f"{filename}: 原文不可读且无可用回退文件")
                meta["primary_docs"].append(
                    {
                        "filename": filename,
                        "rel_path": d.get("rel_path"),
                        "focus_keys": focus,
                        "extract_method": method,
                        "text_len": len(text),
                        "chunks": 0,
                        "score": _score_doc(d),
                        "skipped": "unreadable",
                    }
                )
                continue

        focus_set = set(focus)
        already = used_focus_by_text.get(text_source_name) or set()
        new_focus = sorted(focus_set - already)
        if text_source_name in used_extract_names and not new_focus:
            meta["primary_docs"].append(
                {
                    "filename": filename,
                    "text_source": text_source_name,
                    "skipped": "duplicate_extract_source",
                }
            )
            continue
        if new_focus:
            focus = new_focus
        used_extract_names.add(text_source_name)
        used_focus_by_text[text_source_name].update(focus)

        # 技术附件多分块；公告类限短文本少调用（速度优先）
        heavy = any(k in focus for k in ("K03", "K04", "K05", "K06", "K08", "K09"))
        if not heavy:
            text = text[:10000]
            max_chunks = 1
            chunk_size = 10000
        elif len(text) > 40000:
            max_chunks = 5
            chunk_size = 6500
        elif len(text) > 20000:
            max_chunks = 4
            chunk_size = 6500
        else:
            max_chunks = 2
            chunk_size = 6500
        chunks = _chunk_text(text, chunk_size=chunk_size, overlap=250, max_chunks=max_chunks)
        chunks = [c for c in chunks if _is_usable_text(c, method) or len(c.strip()) > 800]
        if not chunks and text.strip():
            chunks = [text[:chunk_size]]
        meta["primary_docs"].append(
            {
                "filename": filename,
                "text_source": text_source_name,
                "rel_path": d.get("rel_path"),
                "focus_keys": focus,
                "extract_method": method,
                "text_len": len(text),
                "readable": round(_readable_ratio(text), 3),
                "chunks": len(chunks),
                "score": _score_doc(d),
                "note": note,
            }
        )
        extract_jobs.append(
            {
                "source_filename": source_for_rows,
                "focus": focus,
                "chunks": chunks,
                "note": note,
            }
        )

    # 并行抽块：显著缩短总等待（原先串行每块 30~90s）
    from concurrent.futures import ThreadPoolExecutor, as_completed

    llm_tasks = []
    for job in extract_jobs:
        filename = job["source_filename"]
        focus = job["focus"]
        chunks = job["chunks"]
        if not chunks:
            continue
        print(f"[export] queue {filename} chunks={len(chunks)} focus={focus}", flush=True)
        for i, chunk in enumerate(chunks):
            llm_tasks.append((filename, focus, chunk, i, len(chunks), job.get("note")))

    def _run_one(task):
        filename, focus, chunk, i, total, note = task
        part = _llm_extract_one_chunk(filename, focus, chunk, i, total)
        if note:
            for r in part:
                if not r.get("后续动作"):
                    r["后续动作"] = note
        return filename, i, total, part

    workers = min(3, max(1, len(llm_tasks)))
    print(f"[export] parallel extract tasks={len(llm_tasks)} workers={workers}", flush=True)
    if llm_tasks:
        with ThreadPoolExecutor(max_workers=workers) as pool:
            futs = {pool.submit(_run_one, t): t for t in llm_tasks}
            for fut in as_completed(futs):
                t = futs[fut]
                try:
                    fn, idx, tot, part = fut.result()
                    rows.extend(part)
                    meta["chunks_done"] += 1
                    print(f"[export] {fn} chunk {idx+1}/{tot} -> {len(part)} rows", flush=True)
                except Exception as e:
                    meta["llm_errors"].append(
                        f"{t[0]}#{t[3] + 1}: {type(e).__name__}: {str(e)[:160]}"
                    )
                    print(f"[export] {t[0]} chunk {t[3]+1} ERROR {e}", flush=True)

    # 覆盖检查：对重点 Key，若完全没有行且包内也无对应主文件 → 标记文件未提供
    present_codes = set()
    for r in rows:
        m = re.match(r"(K\d+)", str(r.get("一级Key") or ""))
        if m:
            present_codes.add(m.group(1))

    available_focus: Set[str] = set()
    for d in primary:
        available_focus.update(_infer_focus_keys(d["filename"], d.get("rel_path") or ""))
    for job in extract_jobs:
        available_focus.update(job["focus"])

    for code, label, cover in KEY_META:
        if code in present_codes:
            continue
        if code in available_focus:
            continue
        rows.append(
            {
                "一级Key": label,
                "模块": "覆盖检查",
                "子模块": "缺失检测",
                "提取项": f"{code}覆盖",
                "招标文件关键信息": f"当前上传包中未识别到可支撑「{cover}」的可读主依据文件。",
                "关键参数/数量": "—",
                "来源文件": "—",
                "章节/条款": "—",
                "PDF页码": "—",
                "状态": "文件未提供",
                "后续动作": "请确认招标包是否包含对应 Annex/技术/合同文件，或提供可检索文本版/OCR 版",
            }
        )

    rows = _assign_ids(_dedupe_rows(rows))
    for r in rows:
        src = r.get("来源文件") or "—"
        if src != "—" and src not in known_files:
            hit = next((n for n in known_files if src in n or n in src), None)
            r["来源文件"] = hit or "—"
            if not hit:
                r["状态"] = "文件冲突"
                r["后续动作"] = (str(r.get("后续动作") or "") + "；来源文件名无法在 ZIP 中核验").strip("；")
    meta["row_count"] = len(rows)
    return rows, meta


def _dedupe_rows(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen = set()
    out = []
    for r in rows:
        key = (
            r.get("一级Key"),
            re.sub(r"\s+", "", str(r.get("招标文件关键信息") or "")[:120]),
            r.get("来源文件"),
        )
        if key in seen:
            continue
        seen.add(key)
        out.append(r)
    return out


def _assign_ids(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    counters: Dict[str, int] = defaultdict(int)

    def key_code(r: Dict[str, Any]) -> str:
        m = re.match(r"(K\d+)", str(r.get("一级Key") or ""))
        return m.group(1) if m else "K99"

    ordered = []
    for r in sorted(rows, key=lambda x: (key_code(x), x.get("模块") or "", x.get("提取项") or "")):
        code = key_code(r)
        counters[code] += 1
        item = dict(r)
        item["需求ID"] = f"{code}-{counters[code]:03d}"
        if code in KEY_LABEL:
            item["一级Key"] = KEY_LABEL[code]
        ordered.append(item)
    return ordered


def _build_file_index(project_id: int, primary: List[Dict[str, Any]], extract_meta: Optional[Dict[str, Any]] = None) -> List[List[Any]]:
    """文件索引列主依据 + 实际用于抽取的回退文件。"""
    rows = [["编号", "文件名", "文件类型", "主要内容", "使用定位"]]
    listed: Set[str] = set()
    idx = 1

    def add_row(d: Dict[str, Any], locate: str, extra: str = ""):
        nonlocal idx
        name = d.get("filename") or ""
        if not name or name in listed:
            return
        listed.add(name)
        focus = _infer_focus_keys(name, d.get("rel_path") or "")
        s = _norm(name)
        if any(x in s for x in ("机翻", "翻译", "traduction", "中法对照")):
            ftype = "翻译/工作文件"
        elif d.get("is_notice") or any(x in s for x in ("通告", "答疑", "annexe", "cctg")):
            ftype = "招标/技术主文件"
        else:
            ftype = ROLE_TYPE_MAP_SAFE(d.get("role"))
        rows.append(
            [
                f"F{idx:02d}",
                name,
                ftype,
                f"路径: {d.get('rel_path')}；建议Key: {','.join(focus)}" + (f"；{extra}" if extra else ""),
                locate,
            ]
        )
        idx += 1

    by_name = {d["filename"]: d for d in list_documents(project_id)}
    for d in primary:
        add_row(d, "主依据")
    for fb in (extract_meta or {}).get("fallbacks") or []:
        fd = by_name.get(fb.get("fallback") or "")
        if fd:
            add_row(fd, "主依据（原件不可读时的可读回退）", f"回退自 {fb.get('original')}")
    return rows


def ROLE_TYPE_MAP_SAFE(role: Optional[str]) -> str:
    return {
        "primary_notice": "招标通告",
        "notice_attachment": "公告区附件",
        "notice_section_file": "公告区文件",
        "instruction": "投标须知",
        "pricing": "投标报价/量单",
        "contract": "合同",
        "technical": "技术资料",
        "supplement": "补遗/答疑",
        "translation": "翻译件",
        "other": "其他",
    }.get(role or "other", role or "其他")


def _clear_data_rows(ws: Worksheet, keep_header: bool = True) -> None:
    start = 2 if keep_header else 1
    if ws.max_row and ws.max_row >= start:
        ws.delete_rows(start, ws.max_row - start + 1)


def _write_requirement_sheet(ws: Worksheet, rows: List[Dict[str, Any]]) -> None:
    _clear_data_rows(ws, True)
    for col, h in enumerate(HEADERS, 1):
        ws.cell(1, col, h)
    for i, r in enumerate(rows, 2):
        for col, h in enumerate(HEADERS, 1):
            ws.cell(i, col, r.get(h))


def _update_index_sheet(ws: Worksheet, rows: List[Dict[str, Any]], file_count: int) -> None:
    total = len(rows)
    status_count: Dict[str, int] = defaultdict(int)
    sources = set()
    for r in rows:
        status_count[str(r.get("状态") or "")] += 1
        if r.get("来源文件") and r.get("来源文件") != "—":
            sources.add(r["来源文件"])
    ws["A1"] = "招标文件结构化解读（系统导出·动态来源）"
    ws["I4"] = total
    ws["I5"] = status_count.get("已明确", 0)
    ws["I6"] = status_count.get("文件冲突", 0)
    ws["I7"] = status_count.get("文件未提供", 0)
    ws["I8"] = max(file_count, len(sources))


def build_workbook_bytes(project_id: int) -> Tuple[bytes, Dict[str, Any]]:
    if not TEMPLATE_PATH.exists():
        raise FileNotFoundError(f"模板不存在: {TEMPLATE_PATH}")

    primary = pick_primary_docs(project_id, limit=8)
    rows, extract_meta = extract_rows_from_package(project_id)
    file_index = _build_file_index(project_id, primary, extract_meta)

    wb = load_workbook(TEMPLATE_PATH)
    if "01_招标解读总表" in wb.sheetnames:
        _write_requirement_sheet(wb["01_招标解读总表"], rows)
    for sheet, keys in SHEET_KEY_FILTER.items():
        if sheet not in wb.sheetnames:
            continue
        subset = []
        for r in rows:
            m = re.match(r"(K\d+)", str(r.get("一级Key") or ""))
            if m and m.group(1) in keys:
                subset.append(r)
        _write_requirement_sheet(wb[sheet], subset)
    if "02_文件索引" in wb.sheetnames:
        ws = wb["02_文件索引"]
        _clear_data_rows(ws, False)
        for r_i, row in enumerate(file_index, 1):
            for c_i, val in enumerate(row, 1):
                ws.cell(r_i, c_i, val)
    if "00_使用说明与索引" in wb.sheetnames:
        _update_index_sheet(wb["00_使用说明与索引"], rows, len(file_index) - 1)

    buf = io.BytesIO()
    wb.save(buf)
    meta = {
        "row_count": len(rows),
        "file_count": len(file_index) - 1,
        "source_docs": [d["filename"] for d in primary],
        "extract": extract_meta,
        "llm_error": "; ".join(extract_meta.get("llm_errors") or [])[:500] or None,
    }
    return buf.getvalue(), meta


def export_filename(project_name: str) -> str:
    safe = re.sub(r"[^\w\u4e00-\u9fff\-]+", "_", project_name or "项目")
    return f"{safe}_招标文件结构化解读表.xlsx"


STRUCTURED_EXPORT_TYPE = "structured_export"


def find_package_interpretation_xlsx(project_id: int) -> Optional[Dict[str, Any]]:
    """ZIP 内已有《招标文件结构化解读表》时优先使用（与样表一致）。"""
    docs = list_documents(project_id)
    cands: List[Dict[str, Any]] = []
    for d in docs:
        fn = d.get("filename") or ""
        ext = (d.get("ext") or "").lower()
        if ext not in (".xlsx", ".xlsm"):
            continue
        if fn.startswith("._"):
            continue
        if "解读表" in fn or "结构化解读" in fn:
            cands.append(d)
    if not cands:
        return None
    cands.sort(
        key=lambda d: (
            0 if "含项目概述" in (d.get("filename") or "") else 1,
            0 if "结构化解读表" in (d.get("filename") or "") else 1,
            -(int(d.get("size_bytes") or 0)),
        )
    )
    return cands[0]


def _row_to_header_dict(header: List[str], values: tuple) -> Dict[str, Any]:
    obj: Dict[str, Any] = {}
    for i, h in enumerate(header):
        if not h:
            continue
        val = values[i] if i < len(values) else None
        if val is None:
            obj[h] = None
        else:
            obj[h] = val
    # 统一为标准列
    out: Dict[str, Any] = {}
    for h in HEADERS:
        out[h] = obj.get(h)
    # 保留表头里有但标准列没有的字段
    for h, v in obj.items():
        if h and h not in out:
            out[h] = v
    return out


def _detect_sheet_header(rows: List[tuple], max_scan: int = 20) -> Tuple[int, List[str]]:
    """返回 (header_row_index_0based, header_list)。跳过标题/说明行。"""
    for idx, values in enumerate(rows[:max_scan]):
        if not values:
            continue
        header = [str(c).strip() if c is not None else "" for c in values]
        non_empty = [h for h in header if h]
        if len(non_empty) < 2:
            continue
        joined = " ".join(non_empty)
        if "需求ID" in non_empty and ("一级Key" in non_empty or "提取项" in non_empty):
            return idx, header
        if "类别" in non_empty and "提取项" in non_empty:
            return idx, header
        if "编号" in non_empty and "文件名" in non_empty:
            return idx, header
        # 说明页常见表头
        if "字段" in non_empty and ("说明" in joined or "内容" in joined):
            return idx, header
    # 兜底：第一行非空
    for idx, values in enumerate(rows[:max_scan]):
        if values and any(v is not None and str(v).strip() for v in values):
            return idx, [str(c).strip() if c is not None else "" for c in values]
    return 0, list(HEADERS)


def load_interpretation_from_package_xlsx(project_id: int, doc: Dict[str, Any]) -> Dict[str, Any]:
    path = absolute_doc_path(project_id, doc["rel_path"])
    if not path.exists():
        raise FileNotFoundError(f"解读表不存在: {doc.get('rel_path')}")
    wb = load_workbook(path, data_only=True)
    sheets_out: List[Dict[str, Any]] = []
    main_rows: List[Dict[str, Any]] = []
    for name in wb.sheetnames:
        ws = wb[name]
        all_rows = list(ws.iter_rows(values_only=True))
        if not all_rows:
            sheets_out.append({"name": name, "rows": [], "headers": list(HEADERS), "title": None})
            continue
        hdr_idx, header = _detect_sheet_header(all_rows)
        # 去重表头（合并单元格可能导致重复列名）
        clean_header: List[str] = []
        seen_h: Set[str] = set()
        for h in header:
            if not h or h in seen_h:
                continue
            seen_h.add(h)
            clean_header.append(h)
        header = clean_header or [h for h in header if h]
        if "项目概述" in name:
            overview_cols = {
                "类别",
                "提取项",
                "概述信息",
                "详细信息/关键值",
                "来源文件",
                "章节/页码",
                "核验状态",
                "说明/后续动作",
            }
            header = [h for h in header if h in overview_cols]
        title = None
        # 保留表头前的标题行（如「00_项目概述」大标题）
        if hdr_idx > 0:
            for pre in all_rows[:hdr_idx]:
                if not pre:
                    continue
                texts = [str(c).strip() for c in pre if c is not None and str(c).strip()]
                if texts:
                    title = texts[0]
                    break
        rows: List[Dict[str, Any]] = []
        # 原始含空列的表头，用于按位置取值
        raw_header = [str(c).strip() if c is not None else "" for c in (all_rows[hdr_idx] or ())]
        for values in all_rows[hdr_idx + 1 :]:
            if not values or not any(v is not None and str(v).strip() for v in values):
                continue
            if "需求ID" in header:
                rows.append(_row_to_header_dict(raw_header, values))
            else:
                item: Dict[str, Any] = {}
                for i, h in enumerate(raw_header):
                    if not h or h in item:
                        continue
                    if "项目概述" in name and h not in header:
                        continue
                    item[h] = values[i] if i < len(values) else None
                if any(v is not None and str(v).strip() for v in item.values()):
                    rows.append(item)
        sheets_out.append(
            {
                "name": name,
                "rows": rows,
                "headers": [h for h in header if h] or list(HEADERS),
                "title": title,
            }
        )
        if "总表" in name or name.startswith("01"):
            main_rows = [r for r in rows if r.get("需求ID") or r.get("一级Key")]
    if not main_rows:
        for sh in sheets_out:
            if sh["rows"] and (sh["rows"][0].get("需求ID") is not None or "需求ID" in (sh.get("headers") or [])):
                main_rows = sh["rows"]
                break
    # 保证「00_项目概述」等页签不被丢弃（含项目概述的解读表必须保留）
    names = {s["name"] for s in sheets_out}
    for name in wb.sheetnames:
        if name not in names:
            sheets_out.append({"name": name, "rows": [], "headers": list(HEADERS), "title": None})
    return {
        "headers": list(HEADERS),
        "rows": main_rows,
        "sheets": sheets_out,
        "row_count": len(main_rows),
        "file_count": 1,
        "source": "package_xlsx",
        "source_file": doc.get("filename"),
        "source_path": doc.get("rel_path"),
        "source_docs": [doc.get("filename")],
        "note": "已从包内《结构化解读表》载入（含「00_项目概述」等全部分表）",
        "cached": False,
    }


def latest_structured_export(project_id: int) -> Optional[Dict[str, Any]]:
    from . import db

    row = db.row_dict(
        db.get_conn()
        .execute(
            """SELECT * FROM analyses WHERE project_id=? AND analysis_type=?
               ORDER BY id DESC LIMIT 1""",
            (project_id, STRUCTURED_EXPORT_TYPE),
        )
        .fetchone()
    )
    if not row:
        return None
    row["result"] = db.loads(row.pop("result_json", None), {})
    return row


def _save_structured_export(project_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
    from . import db

    conn = db.get_conn()
    cur = conn.execute(
        """INSERT INTO analyses(project_id, analysis_type, status, result_json)
           VALUES(?,?, 'done', ?)""",
        (project_id, STRUCTURED_EXPORT_TYPE, db.dumps(payload)),
    )
    conn.commit()
    item = latest_structured_export(project_id) or {
        "id": cur.lastrowid,
        "project_id": project_id,
        "analysis_type": STRUCTURED_EXPORT_TYPE,
        "status": "done",
        "result": payload,
    }
    if item.get("result") is not None:
        item["result"] = {**(item.get("result") or {}), "cached": False, "fresh": True}
    return item


def _overview_sheet_ok(result: Dict[str, Any]) -> bool:
    """含项目概述的解读表必须保留且可展示「00_项目概述」。"""
    sheets = result.get("sheets") or []
    overview = next((s for s in sheets if "项目概述" in str(s.get("name") or "")), None)
    if overview is None:
        # 若源文件名含「含项目概述」却无该页，视为损坏缓存
        src = str(result.get("source_file") or "")
        return "含项目概述" not in src
    headers = overview.get("headers") or []
    return "类别" in headers and "提取项" in headers and len(overview.get("rows") or []) > 0


def get_or_build_structured_export(project_id: int, force: bool = False) -> Dict[str, Any]:
    """公告详情：优先读 ZIP 内解读表；否则从补充文件等主依据抽取。"""
    package_doc = find_package_interpretation_xlsx(project_id)

    if not force:
        cached = latest_structured_export(project_id)
        result = (cached or {}).get("result") or {}
        if cached and cached.get("status") == "done" and result.get("rows") is not None:
            if package_doc:
                same = result.get("source") == "package_xlsx" and result.get("source_file") == package_doc.get(
                    "filename"
                )
                if same and _overview_sheet_ok(result):
                    return cached
            else:
                return cached

    if package_doc:
        payload = load_interpretation_from_package_xlsx(project_id, package_doc)
        return _save_structured_export(project_id, payload)

    # 无现成解读表：优先抽取「补充文件」目录 + 公告/须知
    primary = pick_primary_docs(project_id, limit=8)
    rows, extract_meta = extract_rows_from_package(project_id)
    file_index = _build_file_index(project_id, primary, extract_meta)
    payload = {
        "headers": list(HEADERS),
        "rows": rows,
        "sheets": [{"name": "01_招标解读总表", "rows": rows, "headers": list(HEADERS)}],
        "row_count": len(rows),
        "file_count": max(0, len(file_index) - 1),
        "source": "supplement_extract",
        "source_docs": [d["filename"] for d in primary],
        "extract": extract_meta,
        "note": "未找到包内解读表，已从补充文件/主依据文档分析生成",
        "cached": False,
    }
    return _save_structured_export(project_id, payload)
