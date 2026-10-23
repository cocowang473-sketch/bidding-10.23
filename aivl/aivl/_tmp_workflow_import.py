"""Batch updates: remove conditions step UX, add import-fill for base data & attachments."""
from pathlib import Path
import re

# ---- instructions_analysis.py ----
p = Path("app/instructions_analysis.py")
t = p.read_text(encoding="utf-8")

# category labels
repls = [
    ('"category_label": "条件触发·可自动生成"', '"category_label": "可导入分析回填"'),
    ('"category_label": "报价驱动·可自动生成"', '"category_label": "可导入分析回填"'),
    ('"category_label": "人员数据·半自动"', '"category_label": "人员数据·可导入识别"'),
    ('"category_label": "计划测算·人工调整"', '"category_label": "可导入分析回填"'),
    ('"category_label": "设备匹配·人工调整"', '"category_label": "可导入分析回填"'),
    ('"category_label": "专业软件编制"', '"category_label": "可导入分析回填"'),
    ('"category_label": "法务重点审查"', '"category_label": "可导入分析回填"'),
    ('"category_label": "标准文本·可自动预填"', '"category_label": "可导入分析回填"'),
]
for a, b in repls:
    t = t.replace(a, b)

# empty state workflow_version
t = t.replace(
    '"workflow_step": 0,\n        "instruction_doc":',
    '"workflow_step": 0,\n        "workflow_version": WORKFLOW_VERSION,\n        "instruction_doc":',
)

# get_or_init: migrate after load
old_goi = """def get_or_init_instructions(project_id: int) -> Dict[str, Any]:"""
if " _migrate_workflow_step(state)" not in t:
    # find return paths - inject after state loaded from result
    t = t.replace(
        """    if current and current.get("status") == "done" and current.get("result"):
        state = current["result"]
        # 保留用户已改数据，仅在 force 扫描时刷新文件地图
""",
        """    if current and current.get("status") == "done" and current.get("result"):
        state = current["result"]
        _migrate_workflow_step(state)
        # 保留用户已改数据，仅在 force 扫描时刷新文件地图
""",
    )
    # also after _empty_state
    if "_migrate_workflow_step(state)" not in t:
        # try alternate pattern
        m = re.search(r"def get_or_init_instructions\(project_id: int\).*?\n    return ", t, re.S)
        print("goi migrate inject status", "_migrate_workflow_step" in t)

# Append import_base_data_file at end of file
if "def import_base_data_file" not in t:
    t += '''


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
    safe = re.sub(r"[^\\w\\u4e00-\\u9fff.\\-]+", "_", filename or "import.bin")
    path = root / f"{uuid.uuid4().hex[:8]}_{safe}"
    path.write_bytes(file_bytes)

    text, method = att_wb._extract_import_text(path)
    if len(text.strip()) < 20:
        raise ValueError(f"无法读取导入文件内容（method={method}）")

    prompt = f"文件名: {filename}\\n提取方法: {method}\\n\\n原文:\\n{text[:16000]}"
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
    for k, v in fields.items():
        if k not in base:
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
    # persist
    conn = db.get_conn()
    conn.execute(
        """INSERT INTO analyses(project_id, analysis_type, status, result_json)
           VALUES(?,?, 'done', ?)""",
        (project_id, "instructions", db.dumps(state)),
    )
    conn.commit()
    return {
        "base_data": base,
        "filled_keys": filled,
        "filename": filename,
        "extract_method": method,
    }
'''

p.write_text(t, encoding="utf-8")
print("instructions_analysis updated")

# Wire migrate into get_or_init more carefully
t = p.read_text(encoding="utf-8")
goi = t[t.find("def get_or_init_instructions"): t.find("def get_or_init_instructions") + 1200]
print("--- goi snippet ---")
print(goi[:800])
