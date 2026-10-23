"""第三阶段：投标须知 —— 动态识别附件清单、条件判断、联动状态与校验。

设计原则：
1. 附件数量/文件名不写死，按当前 ZIP 动态扫描；
2. 用关键词推断附件语义类型（授权/承诺/人员/进度…）；
3. 状态机驱动交互；正式 Word 套打可后续迭代。
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

from . import db
from .ingest import absolute_doc_path, list_documents
from .llm import call_dashscope_json
from .notice_analysis import latest_notice_analysis
from .text_extract import extract_text

# 语义类型 → 展示名 / 生成级别 / 默认流程状态
KIND_META: Dict[str, Dict[str, Any]] = {
    "power_of_attorney": {
        "title": "授权委托书",
        "category": "conditional_auto",
        "category_label": "可导入分析回填",
        "gen_level": "auto",
        "default_status": "pending_decision",
    },
    "bid_commitment": {
        "title": "投标承诺函",
        "category": "quote_driven",
        "category_label": "可导入分析回填",
        "gen_level": "auto",
        "default_status": "to_prepare",
    },
    "org_chart": {
        "title": "分包商项目管理组织机构图",
        "category": "personnel_link",
        "category_label": "人员联动·自动出图",
        "gen_level": "auto",
        "default_status": "to_prepare",
        "depends_on": ["personnel_plan"],
    },
    "personnel_plan": {
        "title": "施工管理人员配备计划及主要管理人员履历",
        "category": "personnel",
        "category_label": "人员数据·可导入识别",
        "gen_level": "semi",
        "default_status": "to_prepare",
    },
    "labor_plan": {
        "title": "劳动力配置计划和劳动力曲线",
        "category": "plan_calc",
        "category_label": "可导入分析回填",
        "gen_level": "semi",
        "default_status": "to_prepare",
        "depends_on": ["schedule"],
    },
    "equipment_plan": {
        "title": "施工机械设备、机具和周转材料配备计划",
        "category": "plan_calc",
        "category_label": "可导入分析回填",
        "gen_level": "semi",
        "default_status": "to_prepare",
        "depends_on": ["schedule"],
    },
    "schedule": {
        "title": "进度计划",
        "category": "professional",
        "category_label": "可导入分析回填",
        "gen_level": "external",
        "default_status": "pending_p6",
    },
    "labor_agreement": {
        "title": "劳务协议书",
        "category": "legal",
        "category_label": "可导入分析回填",
        "gen_level": "legal",
        "default_status": "pending_decision",
    },
    "confidentiality": {
        "title": "保密承诺书",
        "category": "standard_auto",
        "category_label": "可导入分析回填",
        "gen_level": "auto",
        "default_status": "to_prepare",
    },
    "instruction_body": {
        "title": "投标须知正文",
        "category": "reference",
        "category_label": "须知正文·只读依据",
        "gen_level": "none",
        "default_status": "done",
    },
    "other_attachment": {
        "title": "其他须知附件",
        "category": "other",
        "category_label": "其他附件·人工处理",
        "gen_level": "semi",
        "default_status": "to_prepare",
    },
}

KIND_MATCHERS: List[Tuple[str, Tuple[str, ...]]] = [
    ("power_of_attorney", ("授权委托",)),
    ("bid_commitment", ("投标承诺", "承诺函")),
    ("org_chart", ("组织机构", "组织架构")),
    ("personnel_plan", ("管理人员配备", "管理人员履历", "施工管理人员")),
    ("labor_plan", ("劳动力配置", "劳动力曲线")),
    ("equipment_plan", ("机械设备", "周转材料", "机具和周转")),
    ("schedule", ("进度计划",)),
    ("labor_agreement", ("劳务协议",)),
    ("confidentiality", ("保密承诺",)),
    ("instruction_body", ("投标须知", "2.1")),
]

STATUS_LABEL = {
    "pending_decision": "待判断",
    "not_required": "无需提交",
    "to_prepare": "待编制",
    "drafting": "编制中",
    "pending_confirm": "待人工确认",
    "pending_legal": "待法务审定",
    "pending_p6": "待专业软件",
    "done": "已完成",
    "conflict": "冲突",
    "skipped": "已跳过",
}

WORKFLOW_STEPS = [
    {"key": "identify", "title": "识别清单", "desc": "动态扫描附件并确认纳入范围"},
    {"key": "base_data", "title": "基础数据", "desc": "统一项目与企业信息，可导入文件分析回填"},
    {"key": "prepare", "title": "分级编制", "desc": "按附件类型推进编制（除组织图/人员表外可导入分析）"},
    {"key": "validate", "title": "联动校验", "desc": "名称/金额/人员/进度一致性"},
    {"key": "export", "title": "完成导出", "desc": "导出待签章清单并完成本阶段"},
]

WORKFLOW_VERSION = 2


def _migrate_workflow_step(state: Dict[str, Any]) -> None:
    """去掉「条件确认」后的步骤号迁移：旧 0,1cond,2base,3prep,4val,5exp → 新 0,1base,2prep,3val,4exp。"""
    if int(state.get("workflow_version") or 0) >= WORKFLOW_VERSION:
        state["workflow_steps"] = WORKFLOW_STEPS
        return
    old = int(state.get("workflow_step") or 0)
    mapping = {0: 0, 1: 1, 2: 1, 3: 2, 4: 3, 5: 4}
    state["workflow_step"] = mapping.get(old, min(old, len(WORKFLOW_STEPS) - 1))
    state["workflow_version"] = WORKFLOW_VERSION
    state["workflow_steps"] = WORKFLOW_STEPS


def _norm(s: str) -> str:
    return re.sub(r"\s+", "", (s or "").lower())


def _infer_kind(filename: str, rel_path: str) -> str:
    s = _norm(f"{filename} {rel_path}")
    for kind, tips in KIND_MATCHERS:
        if any(_norm(t) in s for t in tips):
            # 「2.1 投标须知」正文优先，避免附件路径误伤
            if kind == "instruction_body":
                if "附件" in filename or re.search(r"附件\s*0?\d", filename):
                    continue
                if "须知" in filename or "2.1" in filename.replace(" ", ""):
                    return kind
                continue
            return kind
    return "other_attachment"


def _in_instruction_section(rel_path: str, filename: str) -> bool:
    s = f"{rel_path}/{filename}"
    return any(x in s for x in ("第二部分", "投标须知", "2.第二部分"))


def discover_instruction_docs(project_id: int) -> Dict[str, Any]:
    """从 ZIP 文件地图动态发现须知正文与附件（限定须知目录，不扫全包杂项附件）。"""
    docs = list_documents(project_id)
    instruction_doc = None
    attachments: List[Dict[str, Any]] = []
    seen_kinds: Dict[str, int] = {}

    section_docs = []
    for d in docs:
        name = d.get("filename") or ""
        path = d.get("rel_path") or ""
        if name.startswith("._") or d.get("role") == "junk":
            continue
        if d.get("role") == "instruction" or _in_instruction_section(path, name):
            section_docs.append(d)

    candidates = []
    for d in section_docs:
        name = d.get("filename") or ""
        path = d.get("rel_path") or ""
        kind = _infer_kind(name, path)
        candidates.append((kind, d))

    for kind, d in candidates:
        if kind == "instruction_body":
            instruction_doc = {
                "doc_id": d["id"],
                "filename": d["filename"],
                "rel_path": d["rel_path"],
            }
            break
    if not instruction_doc:
        for d in section_docs:
            if "须知" in (d.get("filename") or "") and "附件" not in (d.get("filename") or ""):
                instruction_doc = {
                    "doc_id": d["id"],
                    "filename": d["filename"],
                    "rel_path": d["rel_path"],
                }
                break

    code_i = 1
    for kind, d in candidates:
        if kind == "instruction_body":
            continue
        name = d.get("filename") or ""
        # 须知目录内：优先「附件01—09」形态；其它杂文件默认不纳入清单（可手动，但先不展示）
        is_numbered = bool(re.search(r"附件\s*0?[1-9](?!\d)", name))
        if kind == "other_attachment" and not is_numbered:
            continue
        if kind != "other_attachment" and kind in seen_kinds:
            continue
        if kind == "other_attachment":
            # 编号附件但未识别语义：仍纳入，避免漏项
            pass
        meta = KIND_META.get(kind, KIND_META["other_attachment"])
        code = f"A{code_i:02d}"
        code_i += 1
        if kind != "other_attachment":
            seen_kinds[kind] = 1
        attachments.append(
            {
                "code": code,
                "kind": kind,
                "title": meta["title"] if kind != "other_attachment" else name,
                "category": meta["category"],
                "category_label": meta["category_label"],
                "gen_level": meta["gen_level"],
                "depends_on": list(meta.get("depends_on") or []),
                "doc_id": d["id"],
                "filename": d["filename"],
                "rel_path": d["rel_path"],
                "status": meta["default_status"],
                "status_label": STATUS_LABEL.get(meta["default_status"], meta["default_status"]),
                "included": True,
                "form_data": {},
                "notes": "",
                "decision": {},
            }
        )

    order = {k: i for i, (k, _) in enumerate(KIND_MATCHERS)}
    attachments.sort(key=lambda a: (order.get(a["kind"], 99), a["filename"] or ""))
    for i, a in enumerate(attachments, 1):
        a["code"] = f"A{i:02d}"

    return {"instruction_doc": instruction_doc, "attachments": attachments}


def _base_data_from_notice(project_id: int) -> Dict[str, Any]:
    analysis = latest_notice_analysis(project_id)
    fields = {}
    if analysis and analysis.get("status") == "done":
        for f in (analysis.get("result") or {}).get("fields") or []:
            if f.get("key") and f.get("value"):
                fields[f["key"]] = f["value"]
    return {
        "project_name": fields.get("project_name") or "",
        "employer": fields.get("employer") or "",
        "main_contractor": fields.get("main_contractor") or "",
        "scope": fields.get("scope") or "",
        "bid_deadline": fields.get("bid_deadline") or "",
        "currency": fields.get("currency") or "阿尔及利亚第纳尔（DA）",
        "site_visit": fields.get("site_visit") or "",
        "bidder_name": "",
        "legal_representative": "",
        "agent_name": "",
        "locked_quote": None,
        "from_notice": bool(fields),
    }


def _empty_state(project_id: int) -> Dict[str, Any]:
    discovered = discover_instruction_docs(project_id)
    return {
        "workflow_step": 0,
        "workflow_version": WORKFLOW_VERSION,
        "instruction_doc": discovered["instruction_doc"],
        "attachments": discovered["attachments"],
        "conditions": {
            "auth_filing": None,
            "auth_proof_note": "",
            "labor_checks": {
                "use_employer_quota": None,
                "non_employer_work": None,
                "accept_advance_deduct": None,
                "need_liability_boundary": None,
            },
            "labor_applicable": None,
            "site_visit_confirm": None,
        },
        "base_data": _base_data_from_notice(project_id),
        "validation": {"passed": False, "items": []},
        "completed": False,
        "links": [
            {"from": "personnel_plan", "to": "org_chart", "label": "人员名单 → 组织机构图"},
            {"from": "schedule", "to": "labor_plan", "label": "进度计划 → 劳动力曲线"},
            {"from": "schedule", "to": "equipment_plan", "label": "进度计划 → 设备进场"},
            {"from": "locked_quote", "to": "bid_commitment", "label": "锁定报价 → 承诺函金额"},
            {"from": "company", "to": "power_of_attorney,bid_commitment,labor_agreement,confidentiality", "label": "企业信息 → 01/02/08/09"},
        ],
        "workflow_steps": WORKFLOW_STEPS,
        "instruction_brief": None,
    }


def latest_instructions(project_id: int) -> Optional[Dict[str, Any]]:
    row = db.row_dict(
        db.get_conn()
        .execute(
            """SELECT * FROM analyses WHERE project_id=? AND analysis_type='instructions'
               ORDER BY id DESC LIMIT 1""",
            (project_id,),
        )
        .fetchone()
    )
    if not row:
        return None
    row["result"] = db.loads(row.pop("result_json", None), {})
    return row


def _save_state(project_id: int, state: Dict[str, Any], status: str = "done") -> Dict[str, Any]:
    conn = db.get_conn()
    src = (state.get("instruction_doc") or {})
    cur = conn.execute(
        """INSERT INTO analyses(project_id, analysis_type, status, source_doc_id, source_path, result_json)
           VALUES(?,?,?,?,?,?)""",
        (
            project_id,
            "instructions",
            status,
            src.get("doc_id"),
            src.get("rel_path"),
            db.dumps(state),
        ),
    )
    if state.get("completed"):
        conn.execute(
            "UPDATE projects SET status='instructions_done', updated_at=datetime('now','localtime') WHERE id=?",
            (project_id,),
        )
    else:
        conn.execute(
            "UPDATE projects SET status='instructions_in_progress', updated_at=datetime('now','localtime') WHERE id=?",
            (project_id,),
        )
    conn.commit()
    row = db.row_dict(conn.execute("SELECT * FROM analyses WHERE id=?", (cur.lastrowid,)).fetchone())
    assert row
    row["result"] = db.loads(row.pop("result_json", None), {})
    return row


def get_or_init_instructions(project_id: int) -> Dict[str, Any]:
    existing = latest_instructions(project_id)
    if existing and existing.get("status") in ("done", "in_progress") and existing.get("result"):
        st = existing["result"]
        _migrate_workflow_step(st)
        for a in st.get("attachments") or []:
            a["status_label"] = STATUS_LABEL.get(a.get("status") or "", a.get("status"))
            # 刷新展示标签（导入能力）
            meta = KIND_META.get(a.get("kind") or "", {})
            if meta.get("category_label"):
                a["category_label"] = meta["category_label"]
        existing["result"] = st
        return existing
    state = _empty_state(project_id)
    return _save_state(project_id, state, status="in_progress")


def scan_instructions(project_id: int, force: bool = False) -> Dict[str, Any]:
    """重新扫描 ZIP，保留用户已填条件/表单（按 kind 合并）。"""
    existing = latest_instructions(project_id)
    old = (existing or {}).get("result") or {}
    if old:
        _migrate_workflow_step(old)
    state = _empty_state(project_id)
    if old and not force:
        # 合并旧决策
        state["conditions"] = {**state["conditions"], **(old.get("conditions") or {})}
        state["base_data"] = {**state["base_data"], **(old.get("base_data") or {})}
        state["workflow_step"] = old.get("workflow_step", 0)
        state["workflow_version"] = WORKFLOW_VERSION
        state["completed"] = False
        if old.get("instruction_brief"):
            state["instruction_brief"] = old["instruction_brief"]
        old_by_kind = {a["kind"]: a for a in (old.get("attachments") or []) if a.get("kind")}
        for a in state["attachments"]:
            prev = old_by_kind.get(a["kind"])
            if not prev:
                continue
            for k in ("status", "included", "form_data", "notes", "decision"):
                if k in prev and prev[k] is not None:
                    a[k] = prev[k]
            a["status_label"] = STATUS_LABEL.get(a.get("status") or "", a.get("status"))
    return _save_state(project_id, state, status="in_progress")


def _apply_condition_effects(state: Dict[str, Any]) -> None:
    cond = state.get("conditions") or {}
    auth = cond.get("auth_filing")
    labor_ok = cond.get("labor_applicable")
    for a in state.get("attachments") or []:
        if a.get("kind") == "power_of_attorney":
            if auth == "filed":
                a["status"] = "not_required"
                a["decision"] = {**(a.get("decision") or {}), "auth_filing": "filed"}
            elif auth == "not_filed":
                if a.get("status") in ("pending_decision", "not_required"):
                    a["status"] = "to_prepare"
                a["decision"] = {**(a.get("decision") or {}), "auth_filing": "not_filed"}
            elif auth == "unknown":
                a["status"] = "pending_decision"
                a["decision"] = {**(a.get("decision") or {}), "auth_filing": "unknown"}
        if a.get("kind") == "labor_agreement":
            if labor_ok is False:
                a["status"] = "pending_decision"
                a["notes"] = (a.get("notes") or "") + "；需向招标方澄清是否仍须签署"
            elif labor_ok is True and a.get("status") == "pending_decision":
                a["status"] = "pending_legal"
        a["status_label"] = STATUS_LABEL.get(a.get("status") or "", a.get("status"))


def update_instructions(project_id: int, patch: Dict[str, Any]) -> Dict[str, Any]:
    current = get_or_init_instructions(project_id)
    state = current.get("result") or _empty_state(project_id)
    _migrate_workflow_step(state)

    if "workflow_step" in patch:
        step = int(patch["workflow_step"])
        state["workflow_step"] = max(0, min(step, len(WORKFLOW_STEPS) - 1))

    if "conditions" in patch and isinstance(patch["conditions"], dict):
        state["conditions"] = {**state.get("conditions", {}), **patch["conditions"]}
        if "labor_checks" in patch["conditions"] and isinstance(patch["conditions"]["labor_checks"], dict):
            state["conditions"]["labor_checks"] = {
                **(state.get("conditions", {}).get("labor_checks") or {}),
                **patch["conditions"]["labor_checks"],
            }
        _apply_condition_effects(state)

    if "base_data" in patch and isinstance(patch["base_data"], dict):
        state["base_data"] = {**state.get("base_data", {}), **patch["base_data"]}

    if "attachment" in patch and isinstance(patch["attachment"], dict):
        att = patch["attachment"]
        key = att.get("code") or att.get("kind")
        for a in state.get("attachments") or []:
            if a.get("code") == key or a.get("kind") == key:
                for k in ("status", "included", "notes", "form_data", "decision"):
                    if k in att:
                        a[k] = att[k]
                a["status_label"] = STATUS_LABEL.get(a.get("status") or "", a.get("status"))
                break

    if patch.get("run_validate"):
        state["validation"] = run_validation(state)

    if patch.get("complete"):
        state["validation"] = run_validation(state)
        if not state["validation"].get("passed"):
            raise ValueError("一致性校验未通过，请先处理冲突项")
        state["completed"] = True
        state["workflow_step"] = len(WORKFLOW_STEPS) - 1

    return _save_state(project_id, state, status="done" if state.get("completed") else "in_progress")


def run_validation(state: Dict[str, Any]) -> Dict[str, Any]:
    items: List[Dict[str, Any]] = []
    base = state.get("base_data") or {}
    cond = state.get("conditions") or {}
    atts = [a for a in (state.get("attachments") or []) if a.get("included")]
    by_kind = {a["kind"]: a for a in atts}

    def ok(code: str, name: str, passed: bool, detail: str) -> None:
        items.append({"code": code, "name": name, "passed": passed, "detail": detail})

    # 基础名称
    ok(
        "V01",
        "项目名称已填写",
        bool(str(base.get("project_name") or "").strip()),
        base.get("project_name") or "缺失",
    )
    ok(
        "V02",
        "招标方已填写",
        bool(str(base.get("employer") or "").strip()),
        base.get("employer") or "缺失",
    )
    ok(
        "V03",
        "投标人已填写",
        bool(str(base.get("bidder_name") or "").strip()),
        base.get("bidder_name") or "缺失（请在基础数据中补充）",
    )

    # 附件01
    a01 = by_kind.get("power_of_attorney")
    if a01:
        auth = cond.get("auth_filing")
        if auth == "unknown" or a01.get("status") == "pending_decision":
            ok("V04", "授权委托书提交条件", False, "仍为「无法确认/待判断」，不得省略")
        elif auth == "filed":
            ok("V04", "授权委托书提交条件", a01.get("status") == "not_required", "已备案→无需提交")
        else:
            ok(
                "V04",
                "授权委托书提交条件",
                a01.get("status") in ("to_prepare", "drafting", "pending_confirm", "done"),
                f"未备案，当前状态={a01.get('status_label')}",
            )

    # 附件08
    a08 = by_kind.get("labor_agreement")
    if a08 and a08.get("included"):
        checks = cond.get("labor_checks") or {}
        missing = [k for k, v in checks.items() if v is None]
        if cond.get("labor_applicable") is None:
            ok("V05", "劳务协议适用性", False, "尚未确认是否适用实际用工场景")
        elif missing:
            ok("V05", "劳务协议四项确认", False, f"未确认：{', '.join(missing)}")
        elif a08.get("status") not in ("done", "pending_legal"):
            ok("V05", "劳务协议法务状态", False, "须进入待法务审定或已完成")
        else:
            ok("V05", "劳务协议审查", True, a08.get("status_label") or "ok")

    # 附件02 报价
    a02 = by_kind.get("bid_commitment")
    if a02 and a02.get("included"):
        quote = base.get("locked_quote")
        site = cond.get("site_visit_confirm")
        if quote in (None, ""):
            ok("V06", "承诺函金额来源", False, "尚未锁定最终报价（可先编制草稿，定稿前须锁定）")
        else:
            ok("V06", "承诺函金额来源", True, f"已锁定报价：{quote}")
        if not site:
            ok("V07", "现场考察确认", False, "生成承诺函前须确认考察情况")
        else:
            ok("V07", "现场考察确认", True, str(site))

    # 联动：03 依赖 04
    if by_kind.get("org_chart") and by_kind.get("personnel_plan"):
        p4 = by_kind["personnel_plan"]
        p3 = by_kind["org_chart"]
        if p3.get("status") == "done" and p4.get("status") not in ("done", "pending_confirm"):
            ok("V08", "组织机构与人员名单", False, "附件03已完成但人员名单未确认")
        else:
            ok("V08", "组织机构与人员名单", True, "依赖关系可接受")

    # 05/06 依赖 07
    sch = by_kind.get("schedule")
    for kind, label in (("labor_plan", "劳动力"), ("equipment_plan", "设备计划")):
        att = by_kind.get(kind)
        if not att or not sch:
            continue
        if att.get("status") == "done" and sch.get("status") not in ("done",):
            ok(f"V09-{kind}", f"{label}与进度计划", False, "下游已完成但进度计划未回传确认")
        else:
            ok(f"V09-{kind}", f"{label}与进度计划", True, "依赖关系可接受")

    # 纳入附件不得仍为待判断（01/08 除外已检）
    stuck = [
        a
        for a in atts
        if a.get("status") == "pending_decision"
        and a.get("kind") not in ("power_of_attorney", "labor_agreement")
    ]
    ok("V10", "无遗留待判断附件", not stuck, "、".join(a["title"] for a in stuck) or "无")

    passed = all(i["passed"] for i in items)
    return {"passed": passed, "items": items, "summary": f"{sum(1 for i in items if i['passed'])}/{len(items)} 通过"}


INSTRUCTION_BODY_SYSTEM = """你是海外工程招投标文件分析专家。
任务：阅读《投标须知》原文，提炼对投标编制真正有用的结构化要点。
硬性规则：
1. 只写原文有依据的内容，禁止行业常识补全；数字/日期/币种保留原文。
2. evidence 尽量摘录原文短句。
3. 只输出 JSON，不要 markdown。
返回格式：
{
  "summary": "100字内总述",
  "key_fields": [
    {"key":"bid_deadline","label":"截标时间","value":"...","evidence":"..."},
    {"key":"currency","label":"计价币种","value":"...","evidence":"..."},
    {"key":"price_form","label":"报价形式","value":"...","evidence":"..."},
    {"key":"employer","label":"招标方","value":"...","evidence":"..."},
    {"key":"project_name","label":"工程名称","value":"...","evidence":"..."},
    {"key":"scope","label":"报价/工作范围要点","value":"...","evidence":"..."},
    {"key":"duration","label":"工期要求","value":"...","evidence":"..."},
    {"key":"submit_place","label":"标书送达地址","value":"...","evidence":"..."},
    {"key":"qualification","label":"投标人资质要求","value":"...","evidence":"..."}
  ],
  "sections": [
    {"title":"章节名","points":["要点1","要点2"]}
  ],
  "mandatory_rules": ["必须遵守的硬性规则"],
  "attachment_hints": ["须知中对附件01—09或提交材料的要求"],
  "risks_open_questions": ["风险点或原文未写清需确认的问题"]
}
sections 建议覆盖：招标目的、工程综合说明、资质与招标形式、报价说明、工期质量安全、截标与递交、评标/否决/其他约束。
"""


def _clean_instruction_text(raw: str) -> str:
    chars = []
    for ch in raw or "":
        o = ord(ch)
        if 0x4E00 <= o <= 0x9FFF:
            chars.append(ch)
        elif ch.isascii() and (ch.isalnum() or ch.isspace() or ch in ".,;:()/-_%"):
            chars.append(ch)
        elif ch in "，。；：、（）【】《》—·":
            chars.append(ch)
    text = "".join(chars)
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def analyze_instruction_body(project_id: int, focus_keywords: Optional[str] = None) -> Dict[str, Any]:
    """分析《2.1 投标须知》正文，写入 instruction_brief 并回填基础数据空字段。"""
    current = get_or_init_instructions(project_id)
    state = current["result"]
    doc = state.get("instruction_doc")
    if not doc:
        discovered = discover_instruction_docs(project_id)
        doc = discovered.get("instruction_doc")
        state["instruction_doc"] = doc
    if not doc:
        raise ValueError("未在 ZIP 中定位到《投标须知》正文（如 2.1 投标须知.doc）")

    path = absolute_doc_path(project_id, doc["rel_path"])
    raw, method = extract_text(path, max_chars=35000)
    text = _clean_instruction_text(raw)
    if len(text) < 120:
        raise ValueError(f"须知正文文本不可读或过短（method={method}，len={len(text)}）")

    focus = (focus_keywords or "").strip()
    focus_block = ""
    if focus:
        focus_block = (
            "\n【用户特别关注】以下关键词/信息点在上一轮可能未被体现，"
            "请务必在原文中检索并补入 key_fields / sections / risks_open_questions；"
            "同时在 focus_hits 中逐条回传。若原文没有，focus_hits.status=missing：\n"
            f"{focus}\n"
        )

    prompt = (
        f"文件名: {doc.get('filename')}\n"
        f"路径: {doc.get('rel_path')}\n"
        f"{focus_block}"
        "请在返回 JSON 中增加可选字段：\n"
        '  "focus_hits": [{"keyword":"...","value":"...|null","evidence":"...","status":"ok|missing"}]\n'
        f"请提炼下列《投标须知》原文的关键内容：\n\n{text[:28000]}"
    )
    result = call_dashscope_json(prompt, INSTRUCTION_BODY_SYSTEM, temperature=0.1)

    key_fields = []
    for f in result.get("key_fields") or []:
        if not isinstance(f, dict):
            continue
        if not (f.get("label") or f.get("key")):
            continue
        key_fields.append(
            {
                "key": str(f.get("key") or ""),
                "label": str(f.get("label") or f.get("key") or ""),
                "value": f.get("value"),
                "evidence": f.get("evidence") or "",
            }
        )
    sections = []
    for s in result.get("sections") or []:
        if not isinstance(s, dict):
            continue
        title = str(s.get("title") or "").strip()
        points = [str(p) for p in (s.get("points") or []) if p]
        if title or points:
            sections.append({"title": title or "未命名", "points": points})

    focus_hits = []
    for h in result.get("focus_hits") or []:
        if not isinstance(h, dict):
            continue
        kw = str(h.get("keyword") or "").strip()
        if not kw:
            continue
        focus_hits.append(
            {
                "keyword": kw,
                "value": h.get("value"),
                "evidence": h.get("evidence") or "",
                "status": h.get("status") or ("ok" if h.get("value") else "missing"),
            }
        )

    brief = {
        "summary": str(result.get("summary") or "").strip(),
        "key_fields": key_fields,
        "sections": sections,
        "mandatory_rules": [str(x) for x in (result.get("mandatory_rules") or []) if x],
        "attachment_hints": [str(x) for x in (result.get("attachment_hints") or []) if x],
        "risks_open_questions": [str(x) for x in (result.get("risks_open_questions") or []) if x],
        "focus_keywords": focus or None,
        "focus_hits": focus_hits,
        "source": {
            "filename": doc.get("filename"),
            "rel_path": doc.get("rel_path"),
            "doc_id": doc.get("doc_id"),
            "extract_method": method,
            "text_length": len(text),
        },
    }
    if not brief["summary"] and not key_fields and not sections:
        # 模型异常时至少给出可展示摘要
        brief["summary"] = text[:180]
        brief["sections"] = [{"title": "原文摘录", "points": [p.strip() for p in text.split("\n") if p.strip()][:12]}]
        brief["parse_warning"] = "模型未返回标准结构，已降级为原文摘录"

    state["instruction_brief"] = brief

    # 回填基础数据空字段
    base = state.get("base_data") or {}
    field_map = {
        "project_name": "project_name",
        "employer": "employer",
        "bid_deadline": "bid_deadline",
        "currency": "currency",
        "scope": "scope",
        "site_visit": "site_visit",
    }
    for f in key_fields:
        k = f.get("key")
        v = f.get("value")
        if not k or not v:
            continue
        bk = field_map.get(k)
        if bk and not str(base.get(bk) or "").strip():
            base[bk] = v
    state["base_data"] = base

    return _save_state(project_id, state, status="in_progress")



BASE_DATA_IMPORT_SYSTEM = """你是招投标基础信息提取助手。
从用户上传的企业/项目资料中提取基础数据字段。
规则：只提取原文有的信息，没有则 value 置空字符串；只输出 JSON。
返回：
{
  "fields": {
    "project_name": "",
    "employer": "",
    "main_contractor": "",
    "scope": "",
    "bid_deadline": "",
    "currency": "",
    "bidder_name": "",
    "legal_representative": "",
    "agent_name": "",
    "locked_quote": ""
  }
}
"""


def import_base_data_file(project_id: int, file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """导入文件并分析回填基础数据字段。"""
    import uuid
    from pathlib import Path

    from . import attachment_workbench as att_wb
    from . import config

    root = Path(config.UPLOAD_DIR) / f"project_{project_id}" / "base_data_imports"
    root.mkdir(parents=True, exist_ok=True)
    safe = re.sub(r"[^\w\u4e00-\u9fff.\-]+", "_", filename or "import.bin")
    path = root / f"{uuid.uuid4().hex[:8]}_{safe}"
    path.write_bytes(file_bytes)

    text, method = att_wb._extract_import_text(path)
    if len(text.strip()) < 20:
        raise ValueError(f"无法读取导入文件内容（method={method}）")

    prompt = f"文件名: {filename}\n提取方法: {method}\n\n原文:\n{text[:16000]}"
    result = call_dashscope_json(prompt, BASE_DATA_IMPORT_SYSTEM, temperature=0.1)
    fields = result.get("fields") if isinstance(result.get("fields"), dict) else {}
    # 也兼容扁平返回
    if not fields:
        fields = {k: result.get(k, "") for k in (
            "project_name", "employer", "main_contractor", "scope", "bid_deadline",
            "currency", "bidder_name", "legal_representative", "agent_name", "locked_quote",
        )}

    current = get_or_init_instructions(project_id)
    state = current["result"]
    _migrate_workflow_step(state)
    base = dict(state.get("base_data") or {})
    filled = []
    allow = {
        "project_name", "employer", "main_contractor", "scope", "bid_deadline",
        "currency", "bidder_name", "legal_representative", "agent_name", "locked_quote",
    }
    for k, v in fields.items():
        if k not in allow:
            continue
        val = "" if v is None else str(v).strip()
        if val:
            base[k] = val
            filled.append(k)
    base["from_notice"] = bool(base.get("from_notice"))
    base["import_meta"] = {
        "filename": filename,
        "method": method,
        "filled_keys": filled,
    }
    state["base_data"] = base
    state["workflow_steps"] = WORKFLOW_STEPS
    saved = _save_state(project_id, state, status="in_progress")
    return {
        "base_data": base,
        "filled_keys": filled,
        "filename": filename,
        "extract_method": method,
        "instructions": saved,
    }
