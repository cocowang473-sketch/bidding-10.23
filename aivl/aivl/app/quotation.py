"""投标报价：上传工程量清单 → 填入组价模板（工程描述/规格/单位/数量）→ 预览并汇总总价。"""
from __future__ import annotations

import json
import os
import re
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from openpyxl import load_workbook

from . import config
from .ingest import project_dir

# 工程量清单 / 旧材料清单 → 组价模板字段
TEMPLATE_COLUMN_ALIASES: List[Tuple[str, List[str]]] = [
    ("code", ["序号", "编号"]),
    ("desc", ["中文翻译", "项次", "分项", "工程描述", "材料名称"]),
    ("spec", ["DESIGNATIONS DES LOTS", "DESIGNATIONS", "DESIGNATION", "规格明细", "规格型号", "规格"]),
    ("unit", ["单位"]),
    ("qty", ["工程量", "数量"]),
    ("remark", ["备注"]),
    # 电梯专项没有「中文翻译 / DESIGNATIONS」，编号列是梯号，其余列拼进规格
    ("lift_name", ["编号"]),
    ("lift_load", ["载重"]),
    ("lift_car", ["轿厢尺寸"]),
    ("lift_door", ["厅门"]),
    ("lift_stops", ["层站"]),
    ("lift_speed", ["速度"]),
]

# 兼容旧「材料设备清单」价税字段（上传后仍可解析，但前台不再做补单价）
LEGACY_PRICE_ALIASES: List[Tuple[str, List[str]]] = [
    ("order_no", ["订单编号"]),
    ("sign_date", ["签单日期"]),
    ("supplier", ["供货商"]),
    ("spec_detail", ["规格明细"]),
    ("spec_model", ["规格型号"]),
    (
        "unit_price_bt",
        [
            "单价BT折后",
            "单价HT折后",
            "单价（BT折后）",
            "单价(BT折后)",
            "单价(HT折后)",
            "单价（HT折后）",
            "HT折后",
            "BT折后",
        ],
    ),
    ("bt_ex_tax", ["BT不含税", "HT不含税"]),
    ("currency", ["币种"]),
    ("tax_rate", ["税率"]),
    ("unit_price_tax", ["含税单价"]),
    ("total_tax", ["含税合价"]),
]

COLUMN_ALIASES: List[Tuple[str, List[str]]] = TEMPLATE_COLUMN_ALIASES + LEGACY_PRICE_ALIASES

COLUMNS: List[tuple] = [
    ("desc", "工程描述"),
    ("spec", "规格"),
    ("unit", "单位"),
    ("qty", "数量"),
]

# 组价模板默认费率（对齐模板第 4 行样例）
DEFAULT_RATES = {
    "labor_rate": 6500.0,  # R1 人工费 = 6500 × 定额人工
    "fx_eur": 155.0,  # AA3
    "fx_usd": 135.0,  # AB3
    "fx_cny": 20.0,  # AC3
    "site_freight": 0.02,  # AM1
    "ae": 0.07,  # 出口港杂+运输
    "af": 0.06,  # 代理
    "ag": 0.0,  # 关税
    "ah": 0.03,  # 团结税
    "ai": 0.05,  # 进口杂费
    "aj": 0.01,  # 采购平台
    "fee_rate": 0.10,  # J 列综合取费
    "aux_unit": 35.0,
    "machine_unit": 35.0,
    "labor_fx_ratio": 0.60,
}


def _dir(project_id: int) -> Path:
    path = project_dir(project_id) / "quotation"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _state_path(project_id: int) -> Path:
    return _dir(project_id) / "material_list.json"


def _preview_path(project_id: int) -> Path:
    return _dir(project_id) / "pricing_preview.json"


def _filled_path(project_id: int) -> Path:
    return _dir(project_id) / "pricing_filled.xlsx"


def template_path() -> Path:
    candidates = [
        Path(config.ROOT) / "templates" / "组价模板（自用）.xlsx",
        Path(r"c:\Users\cgwang5\Downloads\机电分包招标文件\组价模板（自用）.xlsx"),
    ]
    for path in candidates:
        if path.exists():
            return path
    raise FileNotFoundError("未找到组价模板（自用）.xlsx，请放到项目 templates 目录")


def _norm(text: str) -> str:
    return re.sub(r"[\s\n\r（）()]", "", text or "").upper()


def _cell_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d")
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def _to_float(value: Any) -> Optional[float]:
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().replace(",", "").replace("，", "").replace("%", "")
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        m = re.search(r"-?\d+(\.\d+)?", text)
        return float(m.group(0)) if m else None


def _match_alias(cell_text: str, aliases: List[str]) -> bool:
    norm = _norm(cell_text)
    if not norm:
        return False
    for alias in aliases:
        a = _norm(alias)
        if not a:
            continue
        if a == norm or a in norm or norm in a:
            return True
    return False


def _header_mapping(heads: List[Tuple[int, str]]) -> Dict[str, int]:
    alias_map = list(COLUMN_ALIASES)
    # 长别名优先，避免 DESIGNATION 抢先匹配 DESIGNATIONS DES LOTS。
    # 同长度时保持原顺序：code（序号）先于 lift_name（编号）。
    alias_map.sort(key=lambda item: max(len(_norm(a)) for a in item[1]), reverse=True)
    mapping: Dict[str, int] = {}
    used = set()
    for key, aliases in alias_map:
        for col, text in heads:
            if col in used or not text:
                continue
            if _match_alias(text, aliases):
                mapping[key] = col
                used.add(col)
                break
    return mapping


def _rebind_exact_header(heads: List[Tuple[int, str]], mapping: Dict[str, int], key: str, label: str) -> None:
    """按表头全文占用列，避免「编号」被更长别名「订单编号」的包含匹配抢走。"""
    target = _norm(label)
    for col, text in heads:
        if _norm(text) != target:
            continue
        for owned, owned_col in list(mapping.items()):
            if owned_col == col and owned != key:
                mapping.pop(owned, None)
        mapping[key] = col
        return


def _bind_lift_headers(heads: List[Tuple[int, str]], mapping: Dict[str, int]) -> None:
    labels = {_norm(text) for _, text in heads if text}
    if _norm("载重") not in labels and _norm("轿厢尺寸") not in labels:
        return
    _rebind_exact_header(heads, mapping, "code", "序号")
    _rebind_exact_header(heads, mapping, "lift_name", "编号")
    for key, label in (
        ("lift_load", "载重"),
        ("lift_car", "轿厢尺寸"),
        ("lift_door", "厅门"),
        ("lift_stops", "层站"),
        ("lift_speed", "速度"),
    ):
        _rebind_exact_header(heads, mapping, key, label)


def _absorb_code_column(ws, header_row: int, mapping: Dict[str, int], max_col: int) -> None:
    """CFO 类清单把「序号」单独放在其他表头的下一行。"""
    if mapping.get("code"):
        return
    nxt = header_row + 1
    if nxt > (ws.max_row or 0):
        return
    used = set(mapping.values())
    labels = {_norm("序号"), _norm("编号")}
    for col in range(1, max_col + 1):
        if col in used:
            continue
        if _norm(_cell_text(ws.cell(nxt, col).value)) in labels:
            mapping["code"] = col
            return


def _find_header(ws) -> tuple:
    """返回 (表头行号, {字段key: 列号1基})。支持工程量清单、电梯专项与旧材料清单。"""
    max_row = min(ws.max_row or 1, 40)
    max_col = min(ws.max_column or 1, 40)
    for row in range(1, max_row + 1):
        heads = [(col, _cell_text(ws.cell(row, col).value)) for col in range(1, max_col + 1)]
        if not any(text for _, text in heads):
            continue
        mapping = _header_mapping(heads)
        _bind_lift_headers(heads, mapping)
        has_unit = "unit" in mapping
        has_qty = "qty" in mapping
        has_desc = "desc" in mapping or "spec" in mapping
        has_lift = any(k in mapping for k in ("lift_name", "lift_load", "lift_car"))
        # 工程量清单：单位+工程量+描述；电梯专项：单位+工程量+载重/梯号；旧清单：材料名称+数量
        if has_unit and has_qty and (has_desc or has_lift):
            _absorb_code_column(ws, row, mapping, max_col)
            return row, mapping
    raise ValueError("未识别到清单表头，请含「单位」「工程量/数量」及描述列")


def _one_line(text: str) -> str:
    return re.sub(r"[\s\u00a0]+", " ", text or "").strip()


def _lift_spec(raw: Dict[str, Any]) -> str:
    parts = []
    for label, key in (
        ("载重", "lift_load"),
        ("轿厢尺寸", "lift_car"),
        ("厅门", "lift_door"),
        ("层站", "lift_stops"),
        ("速度", "lift_speed"),
    ):
        val = _one_line(raw.get(key) or "")
        if val:
            parts.append(f"{label} {val}")
    return "；".join(parts)


def _is_section_row(desc: str, spec: str, unit: str, qty: Optional[float]) -> bool:
    """章节/分类行：无单位或无数，不进入组价明细。"""
    if unit and qty is not None:
        return False
    # 有单位但数量为空，或两者皆空
    return True


def _parse_sheet_rows(ws, sheet_name: str) -> List[Dict[str, Any]]:
    title = (sheet_name or "").strip()
    if _norm(title) in {_norm("RECAP"), _norm("汇总"), _norm("总表")}:
        return []

    header_row, mapping = _find_header(ws)
    rows: List[Dict[str, Any]] = []
    blank_run = 0
    for row_idx in range(header_row + 1, (ws.max_row or header_row) + 1):
        raw: Dict[str, Any] = {}
        has_value = False
        for key, _aliases in COLUMN_ALIASES:
            col = mapping.get(key)
            text = _cell_text(ws.cell(row_idx, col).value) if col else ""
            raw[key] = text
            if text:
                has_value = True
        if not has_value:
            blank_run += 1
            if blank_run >= 40:
                break
            continue
        blank_run = 0

        desc = _one_line(raw.get("desc") or "")
        spec = _one_line(raw.get("spec") or "")
        # 旧清单：规格明细/型号并入规格
        if not spec:
            parts = [raw.get("spec_detail") or "", raw.get("spec_model") or ""]
            spec = " / ".join(p for p in parts if p)
        # 电梯专项：梯号作工程描述，载重/轿厢/厅门/层站/速度作规格
        lift_name = _one_line(raw.get("lift_name") or "")
        lift_spec = _lift_spec(raw)
        if not desc and lift_name:
            desc = lift_name if "电梯" in lift_name else f"电梯 {lift_name}"
        if not spec and lift_spec:
            spec = lift_spec
        if not desc and spec and not lift_spec:
            desc, spec = spec, ""
        unit = _one_line(raw.get("unit") or "")
        code = _one_line(raw.get("code") or "")
        if code in {"序号", "编号"}:
            code = ""
        if _norm(desc) in {_norm("合计"), _norm("总计"), _norm("小计"), _norm("TOTAL")}:
            continue
        if _norm(unit) in {_norm("合计"), _norm("总计"), _norm("小计")}:
            continue
        qty = _to_float(raw.get("qty"))
        if _is_section_row(desc, spec, unit, qty):
            continue
        if not desc and not spec:
            continue

        item = {
            "row": row_idx,
            "sheet": sheet_name,
            "code": code,
            "desc": desc,
            "spec": spec,
            "unit": unit,
            "qty": "" if qty is None else (_cell_text(qty) if qty == int(qty) else str(qty)),
            "remark": raw.get("remark") or "",
            # 下游组价计算仍读这些键
            "material_name": desc,
            "spec_detail": spec,
            "spec_model": "",
            "order_no": raw.get("order_no") or raw.get("code") or "",
            "sign_date": raw.get("sign_date") or "",
            "supplier": raw.get("supplier") or "",
            "unit_price_bt": raw.get("unit_price_bt") or "",
            "bt_ex_tax": raw.get("bt_ex_tax") or "",
            "currency": raw.get("currency") or "",
            "tax_rate": raw.get("tax_rate") or "",
            "unit_price_tax": raw.get("unit_price_tax") or "",
            "total_tax": raw.get("total_tax") or "",
        }
        rows.append(item)
    return rows


def _empty_material() -> Dict[str, Any]:
    return {
        "filename": "",
        "uploaded_at": None,
        "row_count": 0,
        "columns": [{"key": key, "label": label} for key, label in COLUMNS],
        "rows": [],
    }


def get_material_list(project_id: int) -> Dict[str, Any]:
    path = _state_path(project_id)
    if not path.exists():
        return _empty_material()
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return _empty_material()
    if not isinstance(data, dict):
        return _empty_material()
    data.setdefault("columns", _empty_material()["columns"])
    data.setdefault("rows", [])
    data["row_count"] = len(data["rows"])
    return data


def save_material_list(project_id: int, file_bytes: bytes, filename: str) -> Dict[str, Any]:
    name = filename or "工程量清单.xlsx"
    suffix = Path(name).suffix.lower()
    if suffix not in (".xlsx", ".xlsm"):
        raise ValueError("请上传 .xlsx 工程量清单")
    if not file_bytes:
        raise ValueError("上传文件为空")

    dest = _dir(project_id) / "material_list.xlsx"
    dest.write_bytes(file_bytes)

    wb = load_workbook(dest, data_only=True)
    rows: List[Dict[str, Any]] = []
    errors: List[str] = []
    try:
        for ws in wb.worksheets:
            try:
                sheet_rows = _parse_sheet_rows(ws, ws.title)
                rows.extend(sheet_rows)
            except ValueError as e:
                errors.append(f"{ws.title}: {e}")
    finally:
        wb.close()

    if not rows:
        detail = "；".join(errors[:3]) if errors else "没有可读取的明细行"
        raise ValueError(f"清单里没有可填入组价模板的行（{detail}）")

    payload = {
        "filename": Path(name).name,
        "uploaded_at": datetime.now().isoformat(timespec="seconds"),
        "row_count": len(rows),
        "sheet_count": len({r.get("sheet") for r in rows}),
        "columns": [{"key": key, "label": label} for key, label in COLUMNS],
        "rows": rows,
    }
    _state_path(project_id).write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    apply_quota_to_materials(project_id)
    price_match = apply_main_material_from_price_base(project_id)
    history_match = apply_main_material_from_project_history(project_id, use_llm=False)
    if history_match.get("matched") is not None:
        price_match["matched"] = history_match["matched"]
        price_match["history_matched"] = history_match.get("history_matched") or 0
    payload = get_material_list(project_id)
    preview = build_pricing_from_materials(project_id)
    payload["preview"] = {
        "row_count": preview.get("row_count", 0),
        "total_amount": preview.get("total_amount"),
        "total_labor": preview.get("total_labor"),
        "total_material": preview.get("total_material"),
        "total_machine": preview.get("total_machine"),
        "total_fee": preview.get("total_fee"),
        "built_at": preview.get("built_at"),
        "params": preview.get("params"),
        "rows": preview.get("rows") or [],
    }
    payload["quota_base"] = get_quota_base_summary()
    payload["quota_match"] = {
        "matched": sum(1 for r in payload["rows"] if r.get("quota_matched")),
        "total": payload["row_count"],
    }
    payload["price_base"] = get_material_price_base_summary()
    payload["price_match"] = price_match
    return payload


def _quota_catalog_path() -> Path:
    root = Path(config.UPLOAD_DIR) / "quota_base"
    root.mkdir(parents=True, exist_ok=True)
    return root / "catalog.json"


def _fold_name(text: str) -> str:
    s = re.sub(r"[\s\n\r\t　（）()\[\]【】，,。．.、/\\-—_]", "", str(text or ""))
    return s.lower()


def _quota_triplet_under_header(ws, max_row: int, max_col: int) -> Dict[str, int]:
    """优先取「定额」表头下面的辅材/机械/人工，而不是单价拆分里的辅材费/机械费。"""
    for row in range(1, max_row + 1):
        for col in range(1, max_col + 1):
            if _norm(_cell_text(ws.cell(row, col).value)) != _norm("定额"):
                continue
            subrow = row + 1
            if subrow > (ws.max_row or 1):
                continue
            found: Dict[str, int] = {}
            for c in range(col, min(col + 8, max_col + 1)):
                label = _norm(_cell_text(ws.cell(subrow, c).value))
                if label == _norm("辅材"):
                    found["aux"] = c
                elif label == _norm("机械"):
                    found["machine"] = c
                elif label == _norm("人工"):
                    found["labor"] = c
            if found.get("aux") and found.get("machine") and found.get("labor"):
                return found
    return {}


def _find_quota_columns(ws) -> Optional[Dict[str, int]]:
    """定位 材料名称（中文翻译）+ 定额.辅材/机械/人工 列。"""
    max_row = min(ws.max_row or 1, 8)
    max_col = min(ws.max_column or 1, 60)
    name_col = None
    unit_col = None
    grouped = _quota_triplet_under_header(ws, max_row, max_col)
    aux_col = grouped.get("aux")
    machine_col = grouped.get("machine")
    labor_col = grouped.get("labor")
    exact = {
        _norm("辅材"): "aux",
        _norm("机械"): "machine",
        _norm("人工"): "labor",
    }

    for row in range(1, max_row + 1):
        for col in range(1, max_col + 1):
            text = _cell_text(ws.cell(row, col).value)
            if not text:
                continue
            if name_col is None and _match_alias(text, ["中文翻译", "项次", "分项", "工程描述", "材料名称"]):
                # 避免把「强电/弱电」等分类标题当名称列：必须是表头行常见词
                if _norm(text) not in {_norm("强电"), _norm("弱电")}:
                    name_col = col
            if unit_col is None and _norm(text) == _norm("单位"):
                unit_col = col
            if grouped:
                continue
            kind = exact.get(_norm(text))
            if kind == "aux" and aux_col is None:
                aux_col = col
            elif kind == "machine" and machine_col is None:
                machine_col = col
            elif kind == "labor" and labor_col is None:
                labor_col = col

    if not name_col or not (aux_col and machine_col and labor_col):
        return None
    return {
        "name": name_col,
        "unit": unit_col or 0,
        "aux": aux_col,
        "machine": machine_col,
        "labor": labor_col,
        "main": _find_unit_main_fee_col(ws) or 0,
        "main_alt": _find_alt_main_fee_col(ws, _find_unit_main_fee_col(ws) or 0),
    }


def _find_unit_main_fee_col(ws) -> Optional[int]:
    """取「单价拆分」下面的主材费，不取总价区里的主材费。"""
    max_row = min(ws.max_row or 1, 8)
    max_col = min(ws.max_column or 1, 60)
    for row in range(1, max_row + 1):
        for col in range(1, max_col + 1):
            label = _cell_text(ws.cell(row, col).value)
            if "单价拆分" not in label:
                continue
            sub = row + 1
            if sub > max_row:
                continue
            for c in range(col, min(col + 12, max_col + 1)):
                if _norm(_cell_text(ws.cell(sub, c).value)) == _norm("主材费"):
                    return c
    for row in range(1, max_row + 1):
        for col in range(1, max_col + 1):
            if _norm(_cell_text(ws.cell(row, col).value)) == _norm("主材费"):
                return col
    return None


def _find_alt_main_fee_col(ws, primary: int) -> int:
    """单价拆分为空时，用同一表头行里另一列「主材费」。"""
    max_row = min(ws.max_row or 1, 8)
    max_col = min(ws.max_column or 1, 60)
    for row in range(1, max_row + 1):
        found = []
        for col in range(1, max_col + 1):
            if _norm(_cell_text(ws.cell(row, col).value)) == _norm("主材费"):
                found.append(col)
        if not found:
            continue
        for col in found:
            if col != primary:
                return col
    return 0


def _parse_quota_sheet(ws, sheet_name: str, source_file: str) -> List[Dict[str, Any]]:
    title = sheet_name or ""
    if any(k in title for k in ("RECAP", "汇总", "总表")):
        return []
    cols = _find_quota_columns(ws)
    if not cols:
        return []

    # 数据从含「序号」的行之后开始，否则从第 3 行
    start = 3
    for row in range(1, min(6, (ws.max_row or 1) + 1)):
        if _match_alias(_cell_text(ws.cell(row, 1).value), ["序号"]):
            start = row + 1
            break

    rows: List[Dict[str, Any]] = []
    blank = 0
    for row_idx in range(start, (ws.max_row or start) + 1):
        name = _one_line(_cell_text(ws.cell(row_idx, cols["name"]).value))
        if not name:
            blank += 1
            if blank >= 40:
                break
            continue
        blank = 0
        aux = _to_float(ws.cell(row_idx, cols["aux"]).value)
        machine = _to_float(ws.cell(row_idx, cols["machine"]).value)
        labor = _to_float(ws.cell(row_idx, cols["labor"]).value)
        main_fee = _to_float(ws.cell(row_idx, cols["main"]).value) if cols.get("main") else None
        if main_fee is None and cols.get("main_alt"):
            main_fee = _to_float(ws.cell(row_idx, cols["main_alt"]).value)
        if aux is None and machine is None and labor is None and main_fee is None:
            continue
        unit = _cell_text(ws.cell(row_idx, cols["unit"]).value) if cols["unit"] else ""
        rows.append(
            {
                "name": name,
                "name_key": _fold_name(name),
                "unit": unit,
                "quota_aux": aux,
                "quota_machine": machine,
                "quota_labor": labor,
                "main_material_fee": main_fee,
                "source_sheet": sheet_name,
                "source_file": source_file,
                "priority": 2 if "完整" in sheet_name else 1,
            }
        )
    return rows


def parse_quota_workbook(file_bytes: bytes, filename: str) -> List[Dict[str, Any]]:
    dest = Path(config.UPLOAD_DIR) / "quota_base" / "uploads"
    dest.mkdir(parents=True, exist_ok=True)
    safe = re.sub(r"[^\w\u4e00-\u9fff.\-]+", "_", filename or "quota.xlsx")
    path = dest / safe
    path.write_bytes(file_bytes)
    load_path = path
    if path.suffix.lower() == ".et":
        load_path = path.with_suffix(".xlsx")
        load_path.write_bytes(file_bytes)
    wb = load_workbook(load_path, data_only=True)
    items: List[Dict[str, Any]] = []
    try:
        # 先普通表再完整表，后者覆盖同名
        sheets = sorted(wb.worksheets, key=lambda s: (0 if "完整" in (s.title or "") else 1, s.title or ""))
        for ws in sheets:
            items.extend(_parse_quota_sheet(ws, ws.title, Path(filename).name))
    finally:
        wb.close()
    return items


def get_quota_catalog() -> Dict[str, Any]:
    path = _quota_catalog_path()
    if not path.exists():
        return {"files": [], "row_count": 0, "rows": [], "by_key": {}}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {"files": [], "row_count": 0, "rows": [], "by_key": {}}
    rows = data.get("rows") or []
    by_key = {r["name_key"]: r for r in rows if r.get("name_key")}
    data["by_key"] = by_key
    data["row_count"] = len(rows)
    return data


def get_quota_base_summary() -> Dict[str, Any]:
    cat = get_quota_catalog()
    return {
        "files": cat.get("files") or [],
        "row_count": cat.get("row_count") or 0,
        "uploaded_at": cat.get("uploaded_at"),
    }


def _quota_numbers_present(row: Dict[str, Any]) -> bool:
    if any(row.get(k) is not None for k in ("quota_aux", "quota_machine", "quota_labor")):
        return True
    return row.get("main_material_fee") is not None


def _merge_quota_rows(new_rows: List[Dict[str, Any]], filename: str, replace: bool = False) -> Dict[str, Any]:
    """同名材料：同一批内「完整量单」优先；新写入的一批覆盖旧历史。"""
    existing = [] if replace else list(get_quota_catalog().get("rows") or [])
    tagged: List[Dict[str, Any]] = []
    for row in existing:
        key = row.get("name_key") or _fold_name(row.get("name") or "")
        if not key or not _quota_numbers_present(row):
            continue
        item = dict(row)
        item["name_key"] = key
        item["_batch"] = 0
        tagged.append(item)
    fresh = 0
    for row in new_rows:
        key = row.get("name_key") or _fold_name(row.get("name") or "")
        if not key or not _quota_numbers_present(row):
            continue
        item = dict(row)
        item["name_key"] = key
        item["_batch"] = 1
        tagged.append(item)
        fresh += 1
    tagged.sort(key=lambda row: (int(row.get("_batch") or 0), int(row.get("priority") or 0)))
    merged: Dict[str, Dict[str, Any]] = {}
    keep_fields = ("quota_aux", "quota_machine", "quota_labor", "main_material_fee", "unit")
    for row in tagged:
        row.pop("_batch", None)
        prev = merged.get(row["name_key"])
        if prev:
            for field in keep_fields:
                if row.get(field) in (None, "") and prev.get(field) not in (None, ""):
                    row[field] = prev.get(field)
        merged[row["name_key"]] = row

    files = [] if replace else list(get_quota_catalog().get("files") or [])
    files = [f for f in files if f.get("filename") != filename]
    files.append(
        {
            "filename": filename,
            "row_count": fresh,
            "uploaded_at": datetime.now().isoformat(timespec="seconds"),
        }
    )
    payload = {
        "files": files,
        "rows": list(merged.values()),
        "row_count": len(merged),
        "uploaded_at": datetime.now().isoformat(timespec="seconds"),
    }
    _quota_catalog_path().write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    return get_quota_base_summary()


def save_quota_base(file_bytes: bytes, filename: str, replace: bool = False) -> Dict[str, Any]:
    name = filename or "定额基础数据.xlsx"
    suffix = Path(name).suffix.lower()
    if suffix not in (".xlsx", ".xlsm", ".et"):
        raise ValueError("请上传 .xlsx 或 .et 定额历史表")
    if not file_bytes:
        raise ValueError("上传文件为空")

    new_rows = parse_quota_workbook(file_bytes, name)
    if not new_rows:
        raise ValueError("未识别到定额「辅材/机械/人工」数据，请确认表头含「中文翻译」与「定额」子列")
    return _merge_quota_rows(new_rows, Path(name).name, replace=replace)


def _quota_name_keys(name: str) -> List[str]:
    """材料名称全文，以及冒号前的名称（单元格里常把说明接在名称后面）。"""
    text = _one_line(name)
    keys: List[str] = []
    full = _fold_name(text)
    if full:
        keys.append(full)
    for sep in ("：", ":"):
        if sep not in text:
            continue
        head = _fold_name(text.split(sep, 1)[0])
        if head and head not in keys and len(head) >= 4:
            keys.append(head)
        break
    return keys


def _match_quota_row(name: str, unit: str, catalog: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """按材料名称对齐历史定额。只接受同名，或几乎同名，避免「服务器」套到「超融合服务器」。"""
    by_key: Dict[str, Dict[str, Any]] = catalog.get("by_key") or {}
    if not by_key:
        return None
    keys = _quota_name_keys(name)
    if not keys:
        return None
    for key in keys:
        hit = by_key.get(key)
        if hit:
            return hit
    best = None
    best_score = 0.0
    query = keys[0]
    if len(query) < 4:
        return None
    for key in keys:
        for lib_key, row in by_key.items():
            if not lib_key or len(lib_key) < 4:
                continue
            if key not in lib_key and lib_key not in key:
                continue
            shorter = min(len(key), len(lib_key))
            longer = max(len(key), len(lib_key))
            if shorter / longer < 0.85:
                continue
            score = float(shorter)
            if unit and row.get("unit") and _fold_name(unit) == _fold_name(row.get("unit") or ""):
                score += 5
            if score > best_score:
                best_score = score
                best = row
    return best


def archive_project_quota(project_id: int) -> Dict[str, Any]:
    """组价完成后，把已匹配到的材料名称和定额数量写入历史库，供下一个项目查找。"""
    materials = get_material_list(project_id)
    filename = f"项目{project_id}-定额历史"
    rows: List[Dict[str, Any]] = []
    for item in materials.get("rows") or []:
        aux = _to_float(item.get("quota_aux")) if item.get("quota_aux") not in ("", None) else None
        machine = _to_float(item.get("quota_machine")) if item.get("quota_machine") not in ("", None) else None
        labor = _to_float(item.get("quota_labor")) if item.get("quota_labor") not in ("", None) else None
        if aux is None and machine is None and labor is None:
            main = _to_float(item.get("main_material_fee"))
            if main is None:
                continue
        name = _one_line(item.get("desc") or item.get("material_name") or "")
        if not _fold_name(name):
            continue
        rows.append(
            {
                "name": name,
                "name_key": _fold_name(name),
                "unit": item.get("unit") or "",
                "quota_aux": aux,
                "quota_machine": machine,
                "quota_labor": labor,
                "main_material_fee": _to_float(item.get("main_material_fee")),
                "source_sheet": item.get("sheet") or "",
                "source_file": filename,
                "priority": 2,
            }
        )
    if not rows:
        return get_quota_base_summary()
    return _merge_quota_rows(rows, filename, replace=False)


def apply_quota_to_materials(project_id: int) -> Dict[str, Any]:
    """用定额基础库匹配工程描述，回填辅材/机械/人工含量。"""
    materials = get_material_list(project_id)
    rows = materials.get("rows") or []
    if not rows:
        return {"matched": 0, "total": 0}
    catalog = get_quota_catalog()
    if not catalog.get("row_count"):
        return {"matched": 0, "total": len(rows), "message": "尚未上传定额基础数据表"}

    matched = 0
    for item in rows:
        name = item.get("desc") or item.get("material_name") or ""
        hit = _match_quota_row(name, item.get("unit") or "", catalog)
        manual = set(item.get("manual_fields") or [])
        if not hit:
            item["quota_matched"] = bool(manual & {"quota_aux", "quota_machine", "quota_labor"})
            item["quota_match"] = item.get("quota_match") or ""
            for field, content in (
                ("quota_aux", "content_aux"),
                ("quota_machine", "content_machine"),
                ("quota_labor", "content_labor"),
            ):
                if field in manual:
                    continue
                item[field] = None
                item[content] = 0
            continue
        matched += 1
        item["quota_matched"] = True
        item["quota_match"] = f"定额:{hit.get('source_file')}/{hit.get('source_sheet')}"
        for field, content in (
            ("quota_aux", "content_aux"),
            ("quota_machine", "content_machine"),
            ("quota_labor", "content_labor"),
        ):
            if field in manual:
                continue
            item[field] = hit.get(field)
            item[content] = hit.get(field) or 0

    materials["rows"] = rows
    materials["row_count"] = len(rows)
    _state_path(project_id).write_text(json.dumps(materials, ensure_ascii=False), encoding="utf-8")
    return {"matched": matched, "total": len(rows)}


def _history_fee_rows(catalog: Dict[str, Any]) -> List[Dict[str, Any]]:
    rows = []
    for idx, row in enumerate(catalog.get("rows") or []):
        fee = _to_float(row.get("main_material_fee"))
        if fee is None:
            continue
        rows.append(
            {
                "id": f"h{idx}",
                "name": row.get("name") or "",
                "unit": row.get("unit") or "",
                "main_material_fee": fee,
                "sheet": row.get("source_sheet") or "",
                "source_file": row.get("source_file") or "",
            }
        )
    return rows


def _name_overlap(query: str, library: str) -> float:
    left = _fold_name(query)
    right = _fold_name(library)
    if not left or not right:
        return 0.0
    if left == right:
        return 100.0
    if left in right or right in left:
        shorter = min(len(left), len(right))
        longer = max(len(left), len(right))
        return 40.0 + 40.0 * shorter / longer
    common = len(set(left) & set(right))
    return 20.0 * common / max(len(set(left)), 1)


def _fill_history_main_fee(item: Dict[str, Any], hit: Dict[str, Any], via: str) -> None:
    fee = _to_float(hit.get("main_material_fee"))
    if fee is None:
        return
    item["main_material_fee"] = _round2(fee)
    item["price_matched"] = True
    item["price_source"] = f"{via}:{hit.get('source_file') or hit.get('sheet') or ''}/{hit.get('name') or ''}"


def _llm_pick_history_fees(missing: List[Dict[str, Any]], candidates: List[Dict[str, Any]]) -> Dict[str, str]:
    from .llm import call_dashscope_json

    queries = []
    pool_ids = set()
    pool: List[Dict[str, Any]] = []
    for item in missing:
        name = item.get("desc") or item.get("material_name") or ""
        ranked = sorted(candidates, key=lambda row: _name_overlap(name, row.get("name") or ""), reverse=True)
        nearby = [row for row in ranked[:12] if _name_overlap(name, row.get("name") or "") >= 8]
        for row in nearby:
            if row["id"] not in pool_ids:
                pool_ids.add(row["id"])
                pool.append(row)
        queries.append(
            {
                "key": _row_key(item),
                "name": name,
                "spec": (item.get("spec") or item.get("spec_detail") or "")[:160],
                "unit": item.get("unit") or "",
            }
        )
    if not queries or not pool:
        return {}
    prompt = (
        "下面是以往项目报价里的材料名称和主材费。请为每条新清单材料挑选同一项的历史记录，用来回填主材费。\n"
        "规则：只能返回候选里的 id，不能编造主材费；名称同类但规格、截面、芯数明显不同就不要匹配；没有把握时 history_id 为 null。\n"
        "只输出 JSON：{\"matches\":[{\"key\":\"工作表|行号\",\"history_id\":\"h1或null\"}]}\n\n"
        f"新清单：\n{json.dumps(queries, ensure_ascii=False)}\n\n"
        f"以往项目：\n{json.dumps([{k: row[k] for k in ('id', 'name', 'unit', 'main_material_fee', 'sheet')} for row in pool[:80]], ensure_ascii=False)}"
    )
    parsed = call_dashscope_json(
        prompt,
        "你是造价员，只从给定的以往项目记录里为材料选择主材费，不臆造价格。",
        temperature=0.1,
    )
    chosen: Dict[str, str] = {}
    rows = parsed.get("matches") if isinstance(parsed, dict) else None
    if not isinstance(rows, list):
        return chosen
    valid = {row["id"] for row in pool}
    for row in rows:
        if not isinstance(row, dict):
            continue
        key = str(row.get("key") or "")
        hid = row.get("history_id")
        if key and hid in valid:
            chosen[key] = str(hid)
    return chosen


def apply_main_material_from_project_history(
    project_id: int,
    use_llm: bool = False,
) -> Dict[str, Any]:
    """先按材料名称对照以往项目的主材费，对不上的再交给大模型从这些历史记录里挑选。"""
    materials = get_material_list(project_id)
    rows = materials.get("rows") or []
    if not rows:
        return {"matched": 0, "total": 0, "history_matched": 0, "llm_filled": 0}
    catalog = get_quota_catalog()
    history = _history_fee_rows(catalog)
    by_id = {row["id"]: row for row in history}
    history_matched = 0
    for item in rows:
        if not item.get("material_name"):
            item["material_name"] = item.get("desc") or ""
        if "main_material_fee" in set(item.get("manual_fields") or []):
            continue
        hit = _match_quota_row(item.get("desc") or item.get("material_name") or "", item.get("unit") or "", catalog)
        fee = _to_float((hit or {}).get("main_material_fee"))
        if hit and fee is not None:
            _fill_history_main_fee(item, hit, "历史项目")
            history_matched += 1

    llm_filled = 0
    llm_error = ""
    if use_llm and history:
        missing = [
            item
            for item in rows
            if item.get("main_material_fee") in (None, "")
            and "main_material_fee" not in set(item.get("manual_fields") or [])
        ]
        try:
            for start in range(0, len(missing), 20):
                picked = _llm_pick_history_fees(missing[start : start + 20], history)
                for item in missing[start : start + 20]:
                    hid = picked.get(_row_key(item))
                    hit = by_id.get(hid or "")
                    if not hit:
                        continue
                    _fill_history_main_fee(item, hit, "历史项目模型")
                    llm_filled += 1
        except Exception as exc:
            llm_error = str(exc)[:180]

    matched = sum(1 for item in rows if item.get("main_material_fee") not in (None, ""))
    materials["rows"] = rows
    materials["row_count"] = len(rows)
    _state_path(project_id).write_text(json.dumps(materials, ensure_ascii=False), encoding="utf-8")
    return {
        "matched": matched,
        "total": len(rows),
        "history_matched": history_matched,
        "llm_filled": llm_filled,
        "llm_error": llm_error,
    }


def update_material_cell(project_id: int, sheet: str, row: int, field: str, value: Any) -> Dict[str, Any]:
    """手工填写定额辅材/机械/人工或主材费。空值表示清空，之后重新匹配可以再填。"""
    linked = {
        "quota_aux": "content_aux",
        "quota_machine": "content_machine",
        "quota_labor": "content_labor",
        "main_material_fee": "",
    }
    if field not in linked:
        raise ValueError("这一列不能手工修改")
    materials = get_material_list(project_id)
    target = None
    for item in materials.get("rows") or []:
        if str(item.get("sheet") or "") == str(sheet or "") and int(item.get("row") or 0) == int(row):
            target = item
            break
    if target is None:
        raise ValueError("没有找到这一行")
    if value in (None, ""):
        number = None
    else:
        number = _to_float(value)
        if number is None:
            raise ValueError("请填写数字")
        number = _round2(number) if field == "main_material_fee" else round(float(number), 4)
    manual = [name for name in (target.get("manual_fields") or []) if name != field]
    target[field] = number
    if linked[field]:
        target[linked[field]] = 0 if number is None else number
    if field == "main_material_fee":
        target["price_matched"] = number is not None
        target["price_source"] = "手工填写" if number is not None else ""
    if number is not None:
        manual.append(field)
    target["manual_fields"] = manual
    _state_path(project_id).write_text(json.dumps(materials, ensure_ascii=False), encoding="utf-8")
    return {"sheet": sheet, "row": row, "field": field, "value": number}


def _currency_bucket(raw: str) -> str:
    text = (raw or "").strip().upper().replace(" ", "")
    if any(x in text for x in ("EUR", "EURO", "欧元")):
        return "EUR"
    if any(x in text for x in ("USD", "US$", "美元")):
        return "USD"
    if any(x in text for x in ("CNY", "RMB", "人民币", "￥", "¥")):
        return "CNY"
    if any(x in text for x in ("DA", "DZD", "第纳尔")):
        return "DA"
    return "CNY"


def _tax_rate(item: Dict[str, Any]) -> Optional[float]:
    rate = _to_float(item.get("tax_rate"))
    if rate is None or rate <= 0:
        return None
    return rate / 100.0 if rate >= 1 else rate


def _positive(value: Any) -> Optional[float]:
    num = _to_float(value)
    if num is None or num <= 0:
        return None
    return num


def _unit_purchase(item: Dict[str, Any]) -> Optional[float]:
    """当地 DA/DZD 用含税单价（实付价）；进口币种用 HT/BT 折后，关税由模板另计。0 视为未填单价。"""
    bucket = _currency_bucket(str(item.get("currency") or ""))
    ht = _positive(item.get("unit_price_bt"))
    tax_price = _positive(item.get("unit_price_tax"))
    rate = _tax_rate(item)
    qty = _to_float(item.get("qty"))

    if bucket == "DA":
        if tax_price is not None:
            return tax_price
        if ht is not None and rate and rate < 1:
            return ht * (1 + rate)
        if ht is not None:
            return ht
        total = _positive(item.get("total_tax"))
        if qty and qty > 0 and total is not None:
            return total / qty
        return None

    if ht is not None:
        return ht
    if tax_price is not None and rate and rate < 1:
        return tax_price / (1 + rate)
    if tax_price is not None:
        return tax_price
    total = _positive(item.get("bt_ex_tax")) or _positive(item.get("total_tax"))
    if qty and qty > 0 and total is not None:
        return total / qty
    return None


def _read_template_params(path: Path) -> Dict[str, float]:
    params = dict(DEFAULT_RATES)
    wb = load_workbook(path, data_only=True)
    try:
        ws = wb.worksheets[0]
        freight = _to_float(ws["AM1"].value)
        fx_eur = _to_float(ws["AA3"].value)
        fx_usd = _to_float(ws["AB3"].value)
        fx_cny = _to_float(ws["AC3"].value)
        # 人工单价固定 6500
        if freight is not None:
            params["site_freight"] = freight
        if fx_eur is not None:
            params["fx_eur"] = fx_eur
        if fx_usd is not None:
            params["fx_usd"] = fx_usd
        if fx_cny is not None:
            params["fx_cny"] = fx_cny
        for key, cell in (
            ("ae", "AE4"),
            ("af", "AF4"),
            ("ag", "AG4"),
            ("ah", "AH4"),
            ("ai", "AI4"),
            ("aj", "AJ4"),
        ):
            val = _to_float(ws[cell].value)
            if val is not None:
                params[key] = val
    finally:
        wb.close()
    return params


def _round2(value: float) -> float:
    return round(float(value), 2)


def _calc_row(item: Dict[str, Any], index: int, params: Dict[str, float]) -> Dict[str, Any]:
    qty = _to_float(item.get("qty"))
    if qty is None:
        qty = 1.0
    purchase = _unit_purchase(item)
    bucket = _currency_bucket(str(item.get("currency") or ""))
    x = y = z = 0.0
    ad = 0.0
    if purchase is not None:
        if bucket == "EUR":
            x = purchase
        elif bucket == "USD":
            y = purchase
        elif bucket == "DA":
            ad = purchase
        else:
            z = purchase

    # 组价模板含量：优先用定额基础库匹配到的 人工/辅材/机械
    o = _to_float(item.get("content_labor") or item.get("quota_labor")) or 0.0
    p = _to_float(item.get("content_aux") or item.get("quota_aux")) or 0.0
    q = _to_float(item.get("content_machine") or item.get("quota_machine")) or 0.0
    ae, af, ag, ah, ai, aj = params["ae"], params["af"], params["ag"], params["ah"], params["ai"], params["aj"]

    aa = x * params["fx_eur"]
    ab = y * params["fx_usd"]
    ac = z * params["fx_cny"]
    foreign = aa + ab + ac
    ak = foreign * (1 + ae + af) * (1 + ag + ah + ai + aj)
    al = ad
    am = (ak + al) * params["site_freight"]
    an = ak + al + am
    ao = foreign * (1 + ae + af)

    r_labor = _round2(params["labor_rate"] * o)
    t_aux = _round2(p * params["aux_unit"] * 1.1)  # 辅材费 = 35 × 1.1 × 定额辅材
    u_machine = _round2(q * params["machine_unit"])
    library_main = _to_float(item.get("main_material_fee"))
    s_main = _round2(library_main) if library_main is not None else 0.0

    g = r_labor
    h = _round2(s_main + p)  # 材料费 = 主材费 + 定额辅材
    i = u_machine
    j = _round2((g + h + i) * params["fee_rate"])  # 综合取费
    f_unit = _round2(g + h + i + j)  # 综合单价
    k_total = _round2(qty * f_unit)  # 合价
    l_labor_fx = _round2(g * qty * params["labor_fx_ratio"])
    m_mat_fx = _round2(ao * qty)

    desc = item.get("desc") or item.get("material_name") or ""
    spec = item.get("spec") or ""
    if not spec:
        spec_parts = [item.get("spec_detail") or "", item.get("spec_model") or ""]
        spec = " / ".join(part for part in spec_parts if part)
    notes = " | ".join(
        part
        for part in (
            item.get("quota_match") or "",
            item.get("sheet") or "",
            item.get("order_no") or "",
            item.get("remark") or "",
            item.get("sign_date") or "",
        )
        if part
    )

    return {
        "no": index,
        "row": item.get("row"),
        "code": item.get("code") or str(index),
        "desc": desc,
        "spec": spec,
        "unit": item.get("unit") or "",
        "qty": qty,
        "unit_price": f_unit,  # F 综合单价
        "labor": g,  # G 人工费
        "material": h,  # H 材料费
        "machine": i,  # I 机械费
        "fee": j,  # J 综合取费
        "total": k_total,  # K 合价
        "labor_fx": l_labor_fx,  # L
        "material_fx": m_mat_fx,  # M
        "remark": notes,  # N
        "supplier": item.get("supplier") or "",
        "sheet": item.get("sheet") or "",
        "currency": bucket,
        "purchase_unit": purchase,
        "main_material": None if library_main is None else s_main,
        "aux": t_aux,
        "content_labor": o,
        "content_aux": p,
        "content_machine": q,
        "quota_aux": _to_float(item.get("quota_aux")),
        "quota_machine": _to_float(item.get("quota_machine")),
        "quota_labor": _to_float(item.get("quota_labor")),
        "quota_match": item.get("quota_match") or "",
        "price_match": item.get("price_source") or "",
        "main_material_fee": _to_float(item.get("main_material_fee")),
        "landed_unit": _round2(an),
        "foreign_da": _round2(foreign),
        "x_eur": x,
        "y_usd": y,
        "z_cny": z,
        "ad_da": ad,
        "ae": ae,
        "af": af,
        "ag": ag,
        "ah": ah,
        "ai": ai,
        "aj": aj,
    }


def build_pricing_from_materials(project_id: int) -> Dict[str, Any]:
    materials = get_material_list(project_id)
    rows_src = materials.get("rows") or []
    if not rows_src:
        raise ValueError("请先上传材料设备清单")

    tpl = template_path()
    params = _read_template_params(tpl)
    preview_rows = [_calc_row(item, idx, params) for idx, item in enumerate(rows_src, start=1)]
    total_amount = _round2(sum(r["total"] for r in preview_rows))
    total_labor = _round2(sum(r["labor"] * r["qty"] for r in preview_rows))
    total_material = _round2(sum(r["material"] * r["qty"] for r in preview_rows))
    total_machine = _round2(sum(r["machine"] * r["qty"] for r in preview_rows))
    total_fee = _round2(sum(r["fee"] * r["qty"] for r in preview_rows))

    filled = _write_filled_workbook(tpl, preview_rows, params)
    _filled_path(project_id).write_bytes(filled)

    payload = {
        "built_at": datetime.now().isoformat(timespec="seconds"),
        "template": tpl.name,
        "source_file": materials.get("filename") or "",
        "row_count": len(preview_rows),
        "params": params,
        "total_amount": total_amount,
        "total_labor": total_labor,
        "total_material": total_material,
        "total_machine": total_machine,
        "total_fee": total_fee,
        "rows": preview_rows,
    }
    _preview_path(project_id).write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    archive_project_quota(project_id)
    return payload


def _write_filled_workbook(tpl: Path, rows: List[Dict[str, Any]], params: Dict[str, float]) -> bytes:
    import io

    wb = load_workbook(tpl)
    ws = wb.worksheets[0]
    # 清掉样例行与说明区，从第 4 行起写入
    if ws.max_row and ws.max_row >= 4:
        ws.delete_rows(4, ws.max_row - 3)

    ws["R1"] = params["labor_rate"]
    ws["AM1"] = params["site_freight"]
    ws["AA3"] = params["fx_eur"]
    ws["AB3"] = params["fx_usd"]
    ws["AC3"] = params["fx_cny"]

    for item in rows:
        r = 3 + int(item["no"])
        ws.cell(r, 1, item.get("code") or item["no"])
        ws.cell(r, 2, item["desc"])
        ws.cell(r, 3, item["spec"])
        ws.cell(r, 4, item["unit"])
        ws.cell(r, 5, item["qty"])
        ws.cell(r, 6, f"=SUM(G{r}:J{r})")
        ws.cell(r, 7, f"=R{r}")
        ws.cell(r, 8, f"=S{r}+P{r}")
        ws.cell(r, 9, f"=U{r}")
        ws.cell(r, 10, f"=SUM(G{r}:I{r})*10%")
        ws.cell(r, 11, f"=E{r}*F{r}")
        ws.cell(r, 12, f"=G{r}*E{r}*{params['labor_fx_ratio']}")
        ws.cell(r, 13, f"=AO{r}*E{r}")
        ws.cell(r, 14, item["remark"])
        ws.cell(r, 15, item["content_labor"])
        ws.cell(r, 16, item["content_aux"])
        ws.cell(r, 17, item["content_machine"])
        ws.cell(r, 18, f"=ROUND($R$1*O{r}*1,2)")
        ws.cell(r, 19, item.get("main_material") if item.get("main_material") not in (None, "") else None)
        ws.cell(r, 20, f"=ROUND(P{r}*{params['aux_unit']}*1.1*1,2)")
        ws.cell(r, 21, f"=ROUND(Q{r}*{params['machine_unit']}*1,2)")
        ws.cell(r, 22, item["supplier"])
        ws.cell(r, 23, "")
        ws.cell(r, 24, item["x_eur"] or None)
        ws.cell(r, 25, item["y_usd"] or None)
        ws.cell(r, 26, item["z_cny"] or None)
        ws.cell(r, 27, f"=X{r}*$AA$3")
        ws.cell(r, 28, f"=Y{r}*$AB$3")
        ws.cell(r, 29, f"=Z{r}*$AC$3")
        ws.cell(r, 30, item["ad_da"] or None)
        ws.cell(r, 31, item["ae"])
        ws.cell(r, 32, item["af"])
        ws.cell(r, 33, item["ag"])
        ws.cell(r, 34, item["ah"])
        ws.cell(r, 35, item["ai"])
        ws.cell(r, 36, item["aj"])
        ws.cell(r, 37, f"=SUM(AA{r}:AC{r})*(1+(AE{r}+AF{r}))*(1+(AG{r}+AH{r}+AI{r}+AJ{r}))")
        ws.cell(r, 38, f"=AD{r}")
        ws.cell(r, 39, f"=SUM(AK{r}:AL{r})*$AM$1")
        ws.cell(r, 40, f"=SUM(AK{r}:AM{r})")
        ws.cell(r, 41, f"=SUM(AA{r}:AC{r})*(1+AE{r}+AF{r})")
        ws.cell(r, 42, f"=G{r}*$E{r}")
        ws.cell(r, 43, f"=H{r}*$E{r}")
        ws.cell(r, 44, f"=I{r}*$E{r}")
        ws.cell(r, 45, f"=J{r}*$E{r}")

    # 合计行
    last = 3 + len(rows)
    total_row = last + 1
    ws.cell(total_row, 2, "合计")
    ws.cell(total_row, 11, f"=SUM(K4:K{last})")
    ws.cell(total_row, 42, f"=SUM(AP4:AP{last})")
    ws.cell(total_row, 43, f"=SUM(AQ4:AQ{last})")
    ws.cell(total_row, 44, f"=SUM(AR4:AR{last})")
    ws.cell(total_row, 45, f"=SUM(AS4:AS{last})")

    buf = io.BytesIO()
    wb.save(buf)
    wb.close()
    return buf.getvalue()


def _has_unit_price(item: Dict[str, Any]) -> bool:
    return _positive(item.get("unit_price_bt")) is not None or _positive(item.get("unit_price_tax")) is not None


def _fold_text(value: Any) -> str:
    return re.sub(r"[\s\n\r（）()/_.,，。]", "", str(value or "")).lower()


def _spec_text(item: Dict[str, Any]) -> str:
    return " ".join(p for p in (item.get("spec_detail") or "", item.get("spec_model") or "") if p)


def _history_score(query: Dict[str, Any], hist: Dict[str, Any]) -> int:
    qn, hn = _fold_text(query.get("material_name")), _fold_text(hist.get("material_name"))
    qs, hs = _fold_text(_spec_text(query)), _fold_text(_spec_text(hist))
    score = 0
    if qn and qn == hn:
        score += 50
    elif qn and hn and (qn in hn or hn in qn):
        score += 28
    elif qn and hn:
        score += min(12, len(set(qn) & set(hn)))
    if qs and hs and qs == hs:
        score += 40
    elif qs and hs and (qs in hs or hs in qs):
        score += 24
    elif qs and hs:
        qnums = set(re.findall(r"\d+", qs))
        hnums = set(re.findall(r"\d+", hs))
        if qnums and qnums == hnums:
            score += 22
        elif qnums & hnums:
            score += 8 * len(qnums & hnums)
    qu, hu = _fold_text(query.get("unit")), _fold_text(hist.get("unit"))
    if qu and hu and qu == hu:
        score += 8
    return score


def _catalog_key(item: Dict[str, Any]) -> tuple:
    return (
        _fold_text(item.get("material_name")),
        _fold_text(_spec_text(item)),
        _fold_text(item.get("unit")),
        str(item.get("unit_price_bt") or ""),
        str(item.get("unit_price_tax") or ""),
    )


def _append_history(
    catalog: List[Dict[str, Any]],
    seen: set,
    item: Dict[str, Any],
    project_name: str,
    source: str,
    as_of: str = "",
) -> None:
    if not _has_unit_price(item):
        return
    key = _catalog_key(item)
    if key in seen:
        return
    seen.add(key)
    catalog.append(
        {
            "id": f"h{len(catalog) + 1}",
            "project": project_name,
            "source": source,
            "material_name": item.get("material_name") or "",
            "spec_detail": item.get("spec_detail") or "",
            "spec_model": item.get("spec_model") or "",
            "unit": item.get("unit") or "",
            "currency": item.get("currency") or "",
            "tax_rate": item.get("tax_rate") or "",
            "unit_price_bt": item.get("unit_price_bt") or "",
            "unit_price_tax": item.get("unit_price_tax") or "",
            "supplier": item.get("supplier") or "",
            "as_of": as_of or item.get("sign_date") or "",
        }
    )


def collect_price_history(project_id: int) -> List[Dict[str, Any]]:
    """历史单价：各项目已保存的材料清单，以及招标包里的采购清单。"""
    from . import ingest

    catalog: List[Dict[str, Any]] = []
    seen: set = set()
    root = Path(config.UPLOAD_DIR)
    names = {p["id"]: p.get("name") or f"项目{p['id']}" for p in ingest.list_projects()}

    if root.exists():
        for path in root.glob("project_*/quotation/material_list.json"):
            try:
                pid = int(path.parts[-3].split("_", 1)[1])
            except (IndexError, ValueError):
                continue
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
            except Exception:
                continue
            label = names.get(pid) or f"项目{pid}"
            as_of = str(data.get("uploaded_at") or "")
            for item in data.get("rows") or []:
                _append_history(catalog, seen, item, label, data.get("filename") or path.name, as_of)

        for path in root.glob("project_*/extracted/**/*.xlsx"):
            if path.name.startswith(("~$", "._")) or "采购" not in path.name:
                continue
            try:
                pid = int(path.relative_to(root).parts[0].split("_", 1)[1])
            except (IndexError, ValueError):
                continue
            label = names.get(pid) or f"项目{pid}"
            as_of = datetime.fromtimestamp(path.stat().st_mtime).isoformat(timespec="seconds")
            wb = load_workbook(path, data_only=True)
            try:
                for ws in wb.worksheets:
                    try:
                        rows = _parse_sheet_rows(ws, ws.title)
                    except ValueError:
                        continue
                    for item in rows:
                        _append_history(catalog, seen, item, label, path.name, as_of)
            finally:
                wb.close()
    return catalog


def _apply_history_price(item: Dict[str, Any], hist: Dict[str, Any], prefix: str = "历史单价") -> None:
    if hist.get("unit_price_bt"):
        item["unit_price_bt"] = str(hist["unit_price_bt"])
    if hist.get("unit_price_tax"):
        item["unit_price_tax"] = str(hist["unit_price_tax"])
    if not item.get("currency") and hist.get("currency"):
        item["currency"] = hist["currency"]
    if not item.get("tax_rate") and hist.get("tax_rate"):
        item["tax_rate"] = str(hist["tax_rate"])
    if not item.get("supplier") and hist.get("supplier"):
        item["supplier"] = hist["supplier"]
    qty = _to_float(item.get("qty"))
    ht = _to_float(item.get("unit_price_bt"))
    tax = _to_float(item.get("unit_price_tax"))
    if qty and qty > 0:
        if ht is not None:
            item["bt_ex_tax"] = _num_text(ht * qty)
        if tax is not None:
            item["total_tax"] = _num_text(tax * qty)
    source = f"{prefix}:{hist.get('project')}/{hist.get('material_name')}"
    spec = _spec_text(hist)
    if spec:
        source += f"/{spec.splitlines()[0][:40]}"
    item["price_source"] = source
    item["price_matched"] = True
    purchase = _unit_purchase(item)
    if purchase is not None:
        item["main_material_fee"] = _round2(purchase)
    remark = item.get("remark") or ""
    if source not in remark:
        item["remark"] = f"{remark} | {source}".strip(" |")


def _num_text(value: float) -> str:
    return f"{value:.6f}".rstrip("0").rstrip(".")


def _llm_pick_prices(missing: List[Dict[str, Any]], candidates: List[Dict[str, Any]]) -> Dict[str, str]:
    from .llm import call_dashscope_json

    hist_lines = []
    for h in candidates:
        hist_lines.append(
            {
                "id": h["id"],
                "project": h["project"],
                "name": h["material_name"],
                "spec": _spec_text(h)[:180],
                "unit": h["unit"],
                "currency": h["currency"],
                "ht": h["unit_price_bt"],
                "tax": h["unit_price_tax"],
            }
        )
    queries = []
    for item in missing:
        queries.append(
            {
                "key": f"{item.get('sheet')}|{item.get('row')}",
                "name": item.get("material_name") or item.get("desc") or "",
                "spec": _spec_text(item)[:180],
                "unit": item.get("unit") or "",
            }
        )
    prompt = (
        "从「材料单价基础库」中，为每条工程量清单材料选择同类型且规格最接近的一条，采用其单价作为主材费。\n"
        "规则：只能返回基础库记录里的 id，不能编造单价；名称同类但截面/芯数/规格数字明显不同则不要匹配；"
        "没有可靠对应时 history_id 为 null。\n"
        "只输出 JSON：{\"matches\":[{\"key\":\"工作表|行号\",\"history_id\":\"h1或null\",\"reason\":\"简短理由\"}]}\n\n"
        f"工程量清单材料：\n{json.dumps(queries, ensure_ascii=False)}\n\n"
        f"材料单价基础库：\n{json.dumps(hist_lines, ensure_ascii=False)}"
    )
    parsed = call_dashscope_json(
        prompt,
        "你是机电材料询价员，只根据给定材料单价基础库匹配同类材料并带回单价作主材费，不臆造价格。",
        temperature=0.1,
    )
    chosen: Dict[str, str] = {}
    rows = parsed.get("matches") if isinstance(parsed, dict) else None
    if not isinstance(rows, list):
        return chosen
    valid = {h["id"] for h in candidates}
    for row in rows:
        if not isinstance(row, dict):
            continue
        key = str(row.get("key") or "")
        hid = row.get("history_id")
        if key and hid in valid:
            chosen[key] = str(hid)
    return chosen


def _llm_pick_prices_batched(
    missing: List[Dict[str, Any]],
    candidates: List[Dict[str, Any]],
    batch_size: int = 30,
) -> Dict[str, str]:
    chosen: Dict[str, str] = {}
    if not missing or not candidates:
        return chosen
    for i in range(0, len(missing), batch_size):
        batch = missing[i : i + batch_size]
        pool = candidates
        if len(candidates) > 100:
            # 每批优先用该批候选，避免 prompt 过大
            seen_ids = set()
            pool = []
            for item in batch:
                for h in item.get("_candidates") or candidates:
                    if h["id"] not in seen_ids:
                        seen_ids.add(h["id"])
                        pool.append(h)
            pool = pool[:100] or candidates[:100]
        chosen.update(_llm_pick_prices(batch, pool))
    return chosen


def _goods_core(folded: str) -> str:
    for suffix in ("电缆", "缆", "线"):
        if folded.endswith(suffix) and len(folded) - len(suffix) >= 2:
            return folded[: -len(suffix)]
    return folded


def _names_correspond(query: str, library: str) -> bool:
    """工程描述与基础库材料名称同名，或一方包含另一方（裸铜线可对裸铜缆）。"""
    left = _fold_text(query)
    right = _fold_text(library)
    if len(left) < 2 or len(right) < 2:
        return False
    if left == right or right in left or left in right:
        return True
    left_core = _goods_core(left)
    right_core = _goods_core(right)
    if len(left_core) < 2 or len(right_core) < 2:
        return False
    return left_core == right_core or right_core in left or left_core in right


def _size_numbers(text: str) -> set:
    found = set()
    for raw in re.findall(r"\d+(?:[.,]\d+)?", text or ""):
        try:
            value = float(raw.replace(",", "."))
        except ValueError:
            continue
        if value < 2 or value > 2000:
            continue
        found.add(int(value) if value.is_integer() else value)
    return found


def _library_unit_price(row: Dict[str, Any]) -> Optional[float]:
    """基础库列表里的「单价」列，优先折后单价。"""
    return _positive(row.get("unit_price_bt")) or _positive(row.get("unit_price_tax"))


def _row_blob(*parts: Any) -> str:
    return " ".join(str(part) for part in parts if part)


def _pick_price_base_row(item: Dict[str, Any], price_rows: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """按材料名称在单价库中找一条。同名多条时用规格数字区分，区分不开则不填。"""
    query_name = item.get("material_name") or item.get("desc") or ""
    query_blob = _row_blob(query_name, item.get("spec"), item.get("spec_detail"), item.get("spec_model"))
    query_nums = _size_numbers(query_blob)
    query_unit = _fold_text(item.get("unit"))
    hits = []
    for row in price_rows:
        lib_name = row.get("material_name") or row.get("desc") or ""
        if _names_correspond(query_name, lib_name) or _names_correspond(query_blob, lib_name):
            hits.append(row)
    if not hits:
        return None

    scored: List[Tuple[int, Dict[str, Any]]] = []
    for row in hits:
        blob = _row_blob(
            row.get("material_name"),
            row.get("desc"),
            row.get("spec"),
            row.get("spec_detail"),
            row.get("spec_model"),
        )
        lib_nums = _size_numbers(blob)
        score = 0
        if _fold_text(query_name) == _fold_text(row.get("material_name") or row.get("desc")):
            score += 100
        overlap = query_nums & lib_nums
        score += 20 * len(overlap)
        if query_nums and lib_nums and not overlap:
            score -= 40
        if query_unit and query_unit == _fold_text(row.get("unit")):
            score += 8
        scored.append((score, row))
    scored.sort(key=lambda pair: pair[0], reverse=True)
    best_score = scored[0][0]
    top = [row for score, row in scored if score == best_score]
    if query_nums:
        top = [
            row
            for row in top
            if query_nums
            & _size_numbers(
                _row_blob(row.get("material_name"), row.get("spec"), row.get("spec_detail"), row.get("spec_model"))
            )
        ]
        if not top:
            return None
    prices = {_library_unit_price(row) for row in top}
    prices.discard(None)
    if len(prices) == 1:
        return top[0]
    if not query_nums:
        return None
    top.sort(key=lambda row: str(row.get("sign_date") or ""), reverse=True)
    return top[0]


def _fill_main_material_fee(item: Dict[str, Any], hist: Dict[str, Any]) -> bool:
    price = _library_unit_price(hist)
    if price is None:
        return False
    if hist.get("unit_price_bt"):
        item["unit_price_bt"] = str(hist.get("unit_price_bt"))
    if not item.get("currency") and hist.get("currency"):
        item["currency"] = hist.get("currency") or ""
    if not item.get("supplier") and hist.get("supplier"):
        item["supplier"] = hist.get("supplier") or ""
    name = hist.get("material_name") or hist.get("desc") or ""
    spec = _row_blob(hist.get("spec_detail"), hist.get("spec"), hist.get("spec_model"))[:40]
    source = f"材料单价库:{name}"
    if spec:
        source += f"/{spec}"
    item["price_source"] = source
    item["price_matched"] = True
    item["main_material_fee"] = _round2(price)
    remark = item.get("remark") or ""
    if source not in remark:
        item["remark"] = f"{remark} | {source}".strip(" |")
    return True


def apply_main_material_from_price_base(
    project_id: int,
    row_keys: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """按材料名称对照材料单价基础库，能对上就把「单价」写入主材费。

    row_keys 可选：仅处理指定行（用于勾选后补匹配）。
    """
    materials = get_material_list(project_id)
    rows = materials.get("rows") or []
    total_all = len(rows)
    if not rows:
        return {"matched": 0, "total": 0, "message": "尚无工程量清单"}

    wanted = {str(k) for k in (row_keys or []) if k}
    scope = [item for item in rows if _row_key(item) in wanted] if wanted else rows
    if wanted and not scope:
        return {"matched": 0, "total": 0, "message": "未找到勾选的清单行"}

    table = get_local_price_table(project_id)
    price_rows = [r for r in (table.get("rows") or []) if _has_unit_price(r)]
    if not price_rows:
        for item in scope:
            if "main_material_fee" in set(item.get("manual_fields") or []):
                continue
            item["price_matched"] = False
            item["main_material_fee"] = None
        materials["rows"] = rows
        _state_path(project_id).write_text(json.dumps(materials, ensure_ascii=False), encoding="utf-8")
        return {"matched": 0, "total": len(scope), "message": "材料单价基础库为空"}

    for item in scope:
        if not item.get("material_name"):
            item["material_name"] = item.get("desc") or ""

    # 勾选重跑：允许对勾选行重新匹配（先清再填）；未勾选则只补还没有主材费的行
    if wanted:
        for item in scope:
            if "main_material_fee" in set(item.get("manual_fields") or []):
                continue
            item["unit_price_bt"] = ""
            item["unit_price_tax"] = ""
            item["main_material_fee"] = None
            item["price_matched"] = False
            item["price_source"] = ""
        missing = [
            item
            for item in scope
            if "main_material_fee" not in set(item.get("manual_fields") or [])
        ]
    else:
        missing = [
            item
            for item in scope
            if item.get("main_material_fee") in (None, "")
            and not _has_unit_price(item)
            and "main_material_fee" not in set(item.get("manual_fields") or [])
        ]

    for item in missing:
        hit = _pick_price_base_row(item, price_rows)
        if hit:
            _fill_main_material_fee(item, hit)

    for item in rows:
        if item.get("price_matched") and item.get("main_material_fee") not in (None, ""):
            continue
        if _has_unit_price(item):
            shown = _library_unit_price(item)
            if shown is not None:
                item["main_material_fee"] = _round2(shown)
                item["price_matched"] = True
            else:
                item["price_matched"] = False
                item["main_material_fee"] = None
        elif item.get("main_material_fee") in (None, ""):
            item["price_matched"] = False
            item["main_material_fee"] = None

    matched_all = sum(1 for r in rows if r.get("price_matched") and r.get("main_material_fee") is not None)
    matched_scope = sum(1 for r in scope if r.get("price_matched") and r.get("main_material_fee") is not None)
    materials["rows"] = rows
    materials["row_count"] = len(rows)
    _state_path(project_id).write_text(json.dumps(materials, ensure_ascii=False), encoding="utf-8")
    if matched_scope:
        build_pricing_from_materials(project_id)

    message = f"主材费已匹配 {matched_all}/{total_all}"
    if wanted:
        message = f"勾选行主材费匹配 {matched_scope}/{len(scope)}（全库 {matched_all}/{total_all}）"
    return {
        "matched": matched_all,
        "total": total_all,
        "scope_matched": matched_scope,
        "scope_total": len(scope),
        "message": message,
    }


def _parse_when(value: Any) -> Optional[datetime]:
    text = str(value or "").strip()
    if not text:
        return None
    text = text.replace("Z", "")
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(text[:19] if "T" in fmt or len(text) > 10 else text[:10], fmt)
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(text[:19])
    except ValueError:
        return None


def _within_recent_months(value: Any, months: int = 3) -> bool:
    when = _parse_when(value)
    if when is None:
        return False
    return when >= datetime.now() - timedelta(days=31 * months)


def _same_material_type(query: Dict[str, Any], hist: Dict[str, Any]) -> bool:
    qn = _fold_text(query.get("material_name"))
    hn = _fold_text(hist.get("material_name"))
    if not qn or qn != hn:
        return False
    qs = _fold_text(_spec_text(query))
    hs = _fold_text(_spec_text(hist))
    if not qs or not hs or qs == hs or qs in hs or hs in qs:
        return True
    qnums = set(re.findall(r"\d+", qs))
    hnums = set(re.findall(r"\d+", hs))
    return bool(qnums and hnums and qnums == hnums)


def fill_missing_prices_from_history(project_id: int, row_keys: Optional[List[str]] = None) -> Dict[str, Any]:
    materials = get_material_list(project_id)
    rows = materials.get("rows") or []
    if not rows:
        raise ValueError("请先上传材料设备清单")
    missing = [item for item in rows if not _has_unit_price(item)]
    if row_keys:
        wanted = {str(key) for key in row_keys if key}
        missing = [item for item in missing if _row_key(item) in wanted]
    if not missing:
        overview = get_overview(project_id)
        overview["fill_result"] = {"filled": 0, "unmatched": 0, "message": "所选材料单价已齐全"}
        return overview

    catalog = [
        item
        for item in collect_price_history(project_id)
        if _within_recent_months(item.get("as_of")) and _has_unit_price(item)
    ]
    filled = 0
    for item in missing:
        matches = [h for h in catalog if _same_material_type(item, h)]
        if not matches:
            continue
        matches.sort(key=lambda h: _parse_when(h.get("as_of")) or datetime.min, reverse=True)
        _apply_history_price(item, matches[0], prefix="近三个月历史")
        filled += 1

    unmatched = len(missing) - filled
    if filled:
        materials["rows"] = rows
        materials["row_count"] = len(rows)
        _state_path(project_id).write_text(json.dumps(materials, ensure_ascii=False), encoding="utf-8")
        build_pricing_from_materials(project_id)

    overview = get_overview(project_id)
    if not catalog and not filled:
        message = "近三个月系统项目里没有可参考单价，未填写"
    elif filled:
        message = f"已用近三个月同类单价填写 {filled} 行"
        if unmatched:
            message += f"，{unmatched} 行没有同类单价，未填"
    else:
        message = "近三个月没有同类型单价，未填写"
    overview["fill_result"] = {
        "filled": filled,
        "unmatched": unmatched,
        "history_count": len(catalog),
        "message": message,
    }
    return overview


def _row_key(item: Dict[str, Any]) -> str:
    return f"{item.get('sheet') or ''}|{item.get('row')}"


def _find_rows(rows: List[Dict[str, Any]], row_keys: List[str]) -> List[Dict[str, Any]]:
    wanted = {str(k) for k in row_keys if k}
    if not wanted:
        return []
    return [item for item in rows if _row_key(item) in wanted]


def apply_history_price_to_rows(project_id: int, row_keys: List[str], history_id: str) -> Dict[str, Any]:
    materials = get_material_list(project_id)
    rows = materials.get("rows") or []
    if not rows:
        raise ValueError("请先上传材料设备清单")
    targets = [item for item in _find_rows(rows, row_keys) if not _has_unit_price(item)]
    if not targets:
        raise ValueError("请勾选尚未填写单价的材料行")
    catalog = collect_price_history(project_id)
    hist = next((h for h in catalog if h["id"] == history_id), None)
    if not hist:
        raise ValueError("未找到这条历史材料，请重新打开历史列表后再选")
    for item in targets:
        _apply_history_price(item, hist)
    materials["rows"] = rows
    _state_path(project_id).write_text(json.dumps(materials, ensure_ascii=False), encoding="utf-8")
    build_pricing_from_materials(project_id)
    overview = get_overview(project_id)
    overview["fill_result"] = {
        "filled": len(targets),
        "message": f"已用历史材料「{hist.get('material_name')}」填写 {len(targets)} 行单价",
    }
    return overview


def fill_prices_from_market_llm(project_id: int, row_keys: Optional[List[str]] = None) -> Dict[str, Any]:
    """按材料名称/规格分析市场行情，填写缺单价行。"""
    from .llm import call_dashscope_json

    materials = get_material_list(project_id)
    rows = materials.get("rows") or []
    if not rows:
        raise ValueError("请先上传材料设备清单")
    missing = [item for item in rows if not _has_unit_price(item)]
    if row_keys:
        wanted = {str(key) for key in row_keys if key}
        missing = [item for item in missing if _row_key(item) in wanted]
    if not missing:
        overview = get_overview(project_id)
        overview["fill_result"] = {"filled": 0, "message": "所选材料单价已齐全"}
        return overview
    if len(missing) > 40:
        raise ValueError("一次最多分析 40 行，请分批勾选")

    catalog = collect_price_history(project_id)
    refs: List[Dict[str, Any]] = []
    for item in missing:
        ranked = sorted(catalog, key=lambda h: _history_score(item, h), reverse=True)[:3]
        for h in ranked:
            if _history_score(item, h) < 15:
                continue
            refs.append(
                {
                    "for": _row_key(item),
                    "name": h.get("material_name"),
                    "spec": _spec_text(h)[:120],
                    "unit": h.get("unit"),
                    "ht": h.get("unit_price_bt"),
                    "tax": h.get("unit_price_tax"),
                    "currency": h.get("currency"),
                    "project": h.get("project"),
                }
            )

    queries = [
        {
            "key": _row_key(item),
            "name": item.get("material_name") or "",
            "spec": _spec_text(item)[:180],
            "unit": item.get("unit") or "",
            "qty": item.get("qty") or "",
            "currency": item.get("currency") or "DZD",
            "tax_rate": item.get("tax_rate") or "0.19",
            "supplier": item.get("supplier") or "",
        }
        for item in missing
    ]
    parsed = call_dashscope_json(
        "你是阿尔及利亚机电工程材料询价专家。根据材料名称、规格、单位，给出合理市场采购参考单价。\n"
        "规则：\n"
        "1) 币种默认 DZD（第纳尔）；当地采购价给出含税单价 unit_price_tax，并尽量给出折后不含税单价 unit_price_ht。\n"
        "2) 若给出历史参考价，可在其附近浮动，不要照搬明显不符规格的价格。\n"
        "3) 规格数字（截面、芯数、型号）不一致时按当前规格独立估价。\n"
        "4) 无法判断时该行可省略，不要编造离谱价格。\n"
        "5) 只输出 JSON：{\"prices\":[{\"key\":\"工作表|行号\",\"unit_price_ht\":数字,\"unit_price_tax\":数字,\"currency\":\"DZD\",\"tax_rate\":0.19,\"reason\":\"一句话依据\"}]}\n\n"
        f"待估价材料：\n{json.dumps(queries, ensure_ascii=False)}\n\n"
        f"历史参考（可选）：\n{json.dumps(refs[:60], ensure_ascii=False)}",
        "你只输出可解析的 JSON，单价为阿尔及利亚当地市场参考采购价。",
        temperature=0.2,
    )
    got = parsed.get("prices") if isinstance(parsed, dict) else None
    if not isinstance(got, list) or not got:
        raise ValueError("未返回可用的市场单价，请稍后重试")

    by_key = {_row_key(item): item for item in missing}
    filled = 0
    for row in got:
        if not isinstance(row, dict):
            continue
        item = by_key.get(str(row.get("key") or ""))
        if not item:
            continue
        ht = _positive(row.get("unit_price_ht"))
        tax = _positive(row.get("unit_price_tax") or row.get("unit_price"))
        rate = _tax_rate({"tax_rate": row.get("tax_rate") or item.get("tax_rate") or "0.19"})
        if tax is None and ht is not None and rate:
            tax = ht * (1 + rate)
        if ht is None and tax is not None and rate:
            ht = tax / (1 + rate)
        if ht is None and tax is None:
            continue
        hist = {
            "project": "市场行情",
            "material_name": item.get("material_name") or "",
            "spec_detail": str(row.get("reason") or "")[:80],
            "unit_price_bt": _num_text(ht) if ht is not None else "",
            "unit_price_tax": _num_text(tax) if tax is not None else "",
            "currency": str(row.get("currency") or item.get("currency") or "DZD"),
            "tax_rate": "" if row.get("tax_rate") in (None, "") else str(row.get("tax_rate")),
            "supplier": item.get("supplier") or "",
        }
        if not hist["tax_rate"] and item.get("tax_rate"):
            hist["tax_rate"] = str(item.get("tax_rate"))
        _apply_history_price(item, hist, prefix="市场行情")
        filled += 1

    if filled:
        materials["rows"] = rows
        _state_path(project_id).write_text(json.dumps(materials, ensure_ascii=False), encoding="utf-8")
        build_pricing_from_materials(project_id)

    overview = get_overview(project_id)
    overview["fill_result"] = {
        "filled": filled,
        "unmatched": len(missing) - filled,
        "message": f"已按市场行情填写 {filled} 行单价" + (f"，{len(missing) - filled} 行未给出" if filled < len(missing) else ""),
    }
    return overview


def _shared_price_dir() -> Path:
    path = Path(config.UPLOAD_DIR) / "shared"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _local_price_path(_project_id: int = 0) -> Path:
    """当地材料价格表是全部项目共享的基础库，不按项目分开存。"""
    return _shared_price_dir() / "material_price_base.json"


def _material_key(item: Dict[str, Any]) -> tuple:
    return (
        _fold_text(item.get("material_name")),
        _fold_text(_spec_text(item)),
        _fold_text(item.get("unit")),
    )


def _read_price_base() -> Dict[str, Any]:
    path = _local_price_path()
    if path.exists():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            data = {}
        if isinstance(data, dict):
            data.setdefault("rows", [])
            data["row_count"] = len(data["rows"])
            data["shared"] = True
            return data
    seeded = _seed_price_base_from_projects()
    if seeded:
        return seeded
    return {"filename": "", "uploaded_at": None, "row_count": 0, "rows": [], "shared": True}


def _seed_price_base_from_projects() -> Optional[Dict[str, Any]]:
    root = Path(config.UPLOAD_DIR)
    if not root.exists():
        return None
    merged: Dict[tuple, Dict[str, Any]] = {}
    latest_name = ""
    latest_at = None
    for path in root.glob("project_*/quotation/local_price.json"):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        latest_name = data.get("filename") or latest_name
        latest_at = data.get("uploaded_at") or latest_at
        for item in data.get("rows") or []:
            if _has_unit_price(item):
                merged[_material_key(item)] = item
    if not merged:
        return None
    payload = {
        "filename": latest_name,
        "uploaded_at": latest_at,
        "row_count": len(merged),
        "rows": list(merged.values()),
        "shared": True,
    }
    _local_price_path().write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    return payload


def get_local_price_table(project_id: int = 0) -> Dict[str, Any]:
    return _read_price_base()


def _exact_or_contains_alias(cell_text: str, aliases: List[str]) -> bool:
    """单价列表头用更严匹配，避免「单价」误匹配工程量清单无关列。"""
    norm = _norm(cell_text)
    if not norm:
        return False
    for alias in aliases:
        a = _norm(alias)
        if not a:
            continue
        if a == norm or a in norm:
            return True
    return False


def _find_price_header(ws) -> tuple:
    """材料采购单价表：材料名称 + 折后/含税单价列（数量可选）。"""
    name_aliases = ["材料名称", "物料名称", "设备名称"]
    price_bt_aliases = [a for k, als in LEGACY_PRICE_ALIASES if k == "unit_price_bt" for a in als]
    price_tax_aliases = [a for k, als in LEGACY_PRICE_ALIASES if k == "unit_price_tax" for a in als]
    other_keys = [k for k, _ in COLUMN_ALIASES if k not in ("desc", "unit_price_bt", "unit_price_tax")]
    max_row = min(ws.max_row or 1, 40)
    max_col = min(ws.max_column or 1, 40)
    for row in range(1, max_row + 1):
        heads = [(col, _cell_text(ws.cell(row, col).value)) for col in range(1, max_col + 1)]
        if not any(text for _, text in heads):
            continue
        # 定额工程量表：有「定额/辅材/机械/人工」子表头时跳过，避免误入库
        head_blob = " ".join(t for _, t in heads)
        if any(k in head_blob for k in ("定额", "辅材", "中文翻译")) and "单价(HT" not in head_blob and "单价（HT" not in head_blob:
            if "材料名称" not in head_blob and "供货商" not in head_blob:
                continue
        mapping: Dict[str, int] = {}
        used = set()
        for col, text in heads:
            if not text or col in used:
                continue
            if "desc" not in mapping and _exact_or_contains_alias(text, name_aliases):
                mapping["desc"] = col
                used.add(col)
            elif "unit_price_bt" not in mapping and _exact_or_contains_alias(text, price_bt_aliases):
                mapping["unit_price_bt"] = col
                used.add(col)
            elif "unit_price_tax" not in mapping and _exact_or_contains_alias(text, price_tax_aliases):
                mapping["unit_price_tax"] = col
                used.add(col)
        for key in other_keys:
            if key in mapping:
                continue
            aliases = next(a for k, a in COLUMN_ALIASES if k == key)
            for col, text in heads:
                if col in used or not text:
                    continue
                if _exact_or_contains_alias(text, aliases):
                    mapping[key] = col
                    used.add(col)
                    break
        has_name = "desc" in mapping
        has_price = "unit_price_bt" in mapping or "unit_price_tax" in mapping
        if has_name and has_price:
            return row, mapping
    raise ValueError("未识别到单价表头")


def _rows_from_price_mapping(ws, sheet_name: str, header_row: int, mapping: Dict[str, int]) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    blank_run = 0
    for row_idx in range(header_row + 1, (ws.max_row or header_row) + 1):
        raw: Dict[str, Any] = {}
        has_value = False
        for key, _aliases in COLUMN_ALIASES:
            col = mapping.get(key)
            text = _cell_text(ws.cell(row_idx, col).value) if col else ""
            raw[key] = text
            if text:
                has_value = True
        if not has_value:
            blank_run += 1
            if blank_run >= 40:
                break
            continue
        blank_run = 0
        desc = raw.get("desc") or ""
        spec = raw.get("spec") or ""
        if not spec:
            parts = [raw.get("spec_detail") or "", raw.get("spec_model") or ""]
            spec = " / ".join(p for p in parts if p)
        if not desc and not spec:
            continue
        item = {
            "row": row_idx,
            "sheet": sheet_name,
            "code": raw.get("code") or "",
            "desc": desc or spec,
            "spec": spec if desc else "",
            "unit": raw.get("unit") or "",
            "qty": raw.get("qty") or "",
            "remark": raw.get("remark") or "",
            "material_name": desc or spec,
            "spec_detail": spec if desc else "",
            "spec_model": "",
            "order_no": raw.get("order_no") or raw.get("code") or "",
            "sign_date": raw.get("sign_date") or "",
            "supplier": raw.get("supplier") or "",
            "unit_price_bt": raw.get("unit_price_bt") or "",
            "bt_ex_tax": raw.get("bt_ex_tax") or "",
            "currency": raw.get("currency") or "",
            "tax_rate": raw.get("tax_rate") or "",
            "unit_price_tax": raw.get("unit_price_tax") or "",
            "total_tax": raw.get("total_tax") or "",
            "parse_method": "heuristic",
        }
        if _has_unit_price(item):
            rows.append(item)
    return rows


def _sheet_as_tsv(ws, max_rows: int = 500, max_col: int = 24) -> str:
    end_row = min(ws.max_row or 1, max_rows)
    end_col = min(ws.max_column or 1, max_col)
    lines: List[str] = []
    for r in range(1, end_row + 1):
        cells = []
        empty = True
        for c in range(1, end_col + 1):
            text = _cell_text(ws.cell(r, c).value).replace("\t", " ").replace("\n", " ")
            if text:
                empty = False
            cells.append(text)
        if empty:
            continue
        while cells and not cells[-1]:
            cells.pop()
        lines.append("\t".join(cells))
    return "\n".join(lines)


def _sheet_looks_like_quota_boq(ws, title: str) -> bool:
    """工程量/定额量单：不应进入材料采购单价库。"""
    t = title or ""
    if any(k in t for k in ("完整量单", "量单", "BOQ", "工程量")):
        return True
    blob = []
    for r in range(1, min((ws.max_row or 1), 6) + 1):
        for c in range(1, min((ws.max_column or 1), 20) + 1):
            text = _cell_text(ws.cell(r, c).value)
            if text:
                blob.append(text)
    joined = " ".join(blob)
    has_quota = ("定额" in joined and ("辅材" in joined or "机械" in joined or "人工" in joined))
    has_procure = ("材料名称" in joined and ("供货商" in joined or "单价(HT" in joined or "单价（HT" in joined or "含税单价" in joined))
    return has_quota and not has_procure


MATERIAL_PRICE_EXTRACT_SYSTEM = (
    "你是机电工程「材料/机械采购单价表」解析专家。表头可能不统一，请从表格文本抽取采购单价行。\n"
    "参考列：订单编号、签单日期、供货商、材料名称、规格明细、规格型号、单位、数量、"
    "单价(HT折后)、HT不含税、币种、税率、含税单价、含税合价、备注。\n"
    "只输出 JSON：{\"rows\":[{\"material_name\":\"\",\"spec\":\"\",\"unit\":\"\","
    "\"unit_price_ht\":数字或null,\"unit_price_tax\":数字或null,\"currency\":\"\","
    "\"tax_rate\":数字或null,\"supplier\":\"\",\"order_no\":\"\",\"sign_date\":\"\","
    "\"qty\":数字或null,\"remark\":\"\"}]}\n"
    "规则：\n"
    "1. 禁止编造表中没有的单价；没有单价的行不要输出。\n"
    "2. 材料名称优先中文；规格合并外语型号与中文说明（规格明细/型号）。\n"
    "3. 单价(HT/BT折后)/不含税单价 → unit_price_ht；含税单价 → unit_price_tax。\n"
    "4. 表头、合计、空行、章节标题、纯工程量定额行（仅辅材/机械/人工无采购单价）忽略。\n"
    "5. 币种常见 DZD/EUR/USD/CNY；税率常见 0.19。\n"
)


def _normalize_llm_price_row(row: Dict[str, Any], sheet_name: str, idx: int) -> Optional[Dict[str, Any]]:
    if not isinstance(row, dict):
        return None
    name = _cell_text(row.get("material_name") or row.get("name") or row.get("desc"))
    spec = _cell_text(row.get("spec") or row.get("spec_detail"))
    if not name and not spec:
        return None
    ht = _positive(row.get("unit_price_ht") or row.get("unit_price_bt") or row.get("unit_price"))
    tax = _positive(row.get("unit_price_tax"))
    if ht is None and tax is None:
        return None
    return {
        "row": idx,
        "sheet": sheet_name,
        "code": "",
        "desc": name or spec,
        "spec": spec if name else "",
        "unit": _cell_text(row.get("unit")),
        "qty": "" if row.get("qty") is None else _cell_text(row.get("qty")),
        "remark": _cell_text(row.get("remark")),
        "material_name": name or spec,
        "spec_detail": spec if name else "",
        "spec_model": "",
        "order_no": _cell_text(row.get("order_no")),
        "sign_date": _cell_text(row.get("sign_date")),
        "supplier": _cell_text(row.get("supplier")),
        "unit_price_bt": _num_text(ht) if ht is not None else "",
        "bt_ex_tax": "",
        "currency": _cell_text(row.get("currency")) or "DZD",
        "tax_rate": _cell_text(row.get("tax_rate")),
        "unit_price_tax": _num_text(tax) if tax is not None else "",
        "total_tax": "",
        "parse_method": "llm",
    }


def _llm_extract_material_prices(tsv: str, filename: str, sheet_name: str) -> List[Dict[str, Any]]:
    from .llm import call_dashscope_json

    if len((tsv or "").strip()) < 20:
        return []
    # 大表按块提取，每块带首行表头
    lines = tsv.splitlines()
    header = lines[0] if lines else ""
    body = lines[1:] if len(lines) > 1 else []
    chunk_size = 45
    collected: List[Dict[str, Any]] = []
    if not body:
        chunks = [tsv]
    else:
        chunks = []
        for i in range(0, len(body), chunk_size):
            part = body[i : i + chunk_size]
            chunks.append(header + "\n" + "\n".join(part) if header else "\n".join(part))

    for ci, chunk in enumerate(chunks):
        prompt = (
            f"文件名: {filename}\n工作表: {sheet_name}\n块: {ci + 1}/{len(chunks)}\n"
            f"表格文本(TSV，列用 Tab 分隔):\n{chunk[:14000]}"
        )
        try:
            parsed = call_dashscope_json(prompt, MATERIAL_PRICE_EXTRACT_SYSTEM, temperature=0.1)
        except Exception:
            continue
        rows = parsed.get("rows") if isinstance(parsed, dict) else None
        if not isinstance(rows, list):
            continue
        for j, row in enumerate(rows):
            item = _normalize_llm_price_row(row, sheet_name, 1000 * (ci + 1) + j)
            if item:
                collected.append(item)
    return collected


def parse_material_price_workbook(
    file_bytes: bytes,
    filename: str,
    use_llm: bool = True,
    prefer_llm: bool = False,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """解析材料/机械采购单价表。

    prefer_llm=True（管理员上传）：各有内容的工作表一律走大模型抽取，适配表头不统一。
    否则：先规则解析，失败再用模型。
    """
    dest = _shared_price_dir() / "uploads"
    dest.mkdir(parents=True, exist_ok=True)
    safe = re.sub(r"[^\w\u4e00-\u9fff.\-]+", "_", filename or "price.xlsx")
    path = dest / safe
    path.write_bytes(file_bytes)
    wb = load_workbook(path, data_only=True)
    items: List[Dict[str, Any]] = []
    sheet_meta: List[Dict[str, Any]] = []
    try:
        for ws in wb.worksheets:
            title = ws.title or ""
            if any(k in title for k in ("RECAP", "汇总", "总表")):
                continue
            if _sheet_looks_like_quota_boq(ws, title):
                sheet_meta.append({"sheet": title, "method": "skip_boq", "row_count": 0})
                continue

            tsv = _sheet_as_tsv(ws, max_rows=800)
            data_lines = [ln for ln in tsv.splitlines() if ln.strip()]
            if len(data_lines) < 2:
                sheet_meta.append({"sheet": title, "method": "empty", "row_count": 0})
                continue

            priced: List[Dict[str, Any]] = []
            method = "none"

            if prefer_llm and use_llm:
                priced = _llm_extract_material_prices(tsv, Path(filename).name, title)
                method = "llm" if priced else "llm_empty"
                # 模型未抽到时，再用采购表规则兜底（标准模板可本地解析）
                if not priced:
                    try:
                        header_row, mapping = _find_price_header(ws)
                        priced = _rows_from_price_mapping(ws, title, header_row, mapping)
                        method = "heuristic_fallback" if priced else method
                    except ValueError:
                        pass
            else:
                try:
                    header_row, mapping = _find_price_header(ws)
                    priced = _rows_from_price_mapping(ws, title, header_row, mapping)
                    method = "heuristic" if priced else "none"
                except ValueError:
                    priced = []
                if not priced and use_llm:
                    priced = _llm_extract_material_prices(tsv, Path(filename).name, title)
                    method = "llm" if priced else "llm_empty"

            sheet_meta.append({"sheet": title, "method": method, "row_count": len(priced)})
            items.extend(priced)
    finally:
        wb.close()
    return items, sheet_meta


def _price_row_from_reply(item: Dict[str, Any], hist: Dict[str, Any], inquiry_id: str) -> Dict[str, Any]:
    name = item.get("material_name") or item.get("desc") or ""
    spec = item.get("spec") or item.get("spec_detail") or ""
    return {
        "row": item.get("row"),
        "sheet": "供应商回复",
        "code": item.get("code") or "",
        "desc": name,
        "spec": spec,
        "unit": item.get("unit") or "",
        "qty": item.get("qty") or "",
        "remark": f"询价 {inquiry_id}",
        "material_name": name,
        "spec_detail": spec,
        "spec_model": item.get("spec_model") or "",
        "order_no": inquiry_id,
        "sign_date": datetime.now().date().isoformat(),
        "supplier": hist.get("supplier") or "",
        "unit_price_bt": hist.get("unit_price_bt") or "",
        "bt_ex_tax": "",
        "currency": hist.get("currency") or item.get("currency") or "",
        "tax_rate": hist.get("tax_rate") or "",
        "unit_price_tax": hist.get("unit_price_tax") or "",
        "total_tax": "",
        "parse_method": "supplier_reply",
    }


def archive_reply_prices_to_base(incoming: List[Dict[str, Any]], inquiry_id: str, sender: str = "") -> int:
    """把供应商回复里对上的单价写入共享材料单价基础库。同名同规格同单位则更新。"""
    priced = [row for row in incoming if _has_unit_price(row)]
    if not priced:
        return 0
    existing = _read_price_base()
    by_key: Dict[tuple, Dict[str, Any]] = {}
    for item in existing.get("rows") or []:
        if _has_unit_price(item):
            by_key[_material_key(item)] = item
    stored_keys = []
    for item in priced:
        key = _material_key(item)
        by_key[key] = item
        if key not in stored_keys:
            stored_keys.append(key)
    seen = set()
    ordered: List[Dict[str, Any]] = []
    for key in stored_keys:
        seen.add(key)
        ordered.append(by_key[key])
    for item in existing.get("rows") or []:
        key = _material_key(item)
        if key in seen or key not in by_key:
            continue
        seen.add(key)
        ordered.append(by_key[key])
    now = datetime.now().isoformat(timespec="seconds")
    label = f"供应商回复 {inquiry_id}"
    files = [f for f in (existing.get("files") or []) if f.get("filename") != label]
    files.insert(
        0,
        {
            "filename": label,
            "row_count": len(stored_keys),
            "uploaded_at": now,
            "supplier": sender,
        },
    )
    payload = {
        "filename": existing.get("filename") or label,
        "uploaded_at": now,
        "row_count": len(ordered),
        "rows": ordered,
        "files": files,
        "sheet_meta": existing.get("sheet_meta") or [],
        "parse_methods": existing.get("parse_methods") or [],
        "shared": True,
    }
    _local_price_path().write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    return len(stored_keys)


def get_material_price_base_summary() -> Dict[str, Any]:
    data = _read_price_base()
    return {
        "files": data.get("files") or (
            [{"filename": data.get("filename"), "row_count": data.get("row_count"), "uploaded_at": data.get("uploaded_at")}]
            if data.get("filename")
            else []
        ),
        "row_count": data.get("row_count") or 0,
        "uploaded_at": data.get("uploaded_at"),
        "filename": data.get("filename") or "",
        "shared": True,
    }


def save_local_price_table(
    project_id: int,
    file_bytes: bytes,
    filename: str,
    replace: bool = False,
    use_llm: bool = True,
    prefer_llm: bool = False,
) -> Dict[str, Any]:
    name = filename or "当地材料价格表.xlsx"
    if Path(name).suffix.lower() not in (".xlsx", ".xlsm"):
        raise ValueError("请上传 .xlsx 当地材料价格表")
    if not file_bytes:
        raise ValueError("上传文件为空")
    dest = _shared_price_dir() / "material_price_base.xlsx"
    dest.write_bytes(file_bytes)

    incoming, sheet_meta = parse_material_price_workbook(
        file_bytes, name, use_llm=use_llm, prefer_llm=prefer_llm
    )
    if not incoming:
        raise ValueError(
            "未识别到带单价的材料行。请上传「材料/机械采购」类单价表；"
            "格式不统一时由大模型抽取，请确认已配置 DASHSCOPE_API_KEY"
        )

    existing = {"rows": [], "files": []} if replace else _read_price_base()
    merged: Dict[tuple, Dict[str, Any]] = {}
    for item in existing.get("rows") or []:
        if _has_unit_price(item):
            merged[_material_key(item)] = item
    added = 0
    updated = 0
    for item in incoming:
        key = _material_key(item)
        if key in merged:
            updated += 1
        else:
            added += 1
        merged[key] = item

    files = [] if replace else list(existing.get("files") or [])
    # 兼容旧结构只有 filename
    if not files and existing.get("filename"):
        files = [
            {
                "filename": existing.get("filename"),
                "row_count": existing.get("row_count") or 0,
                "uploaded_at": existing.get("uploaded_at"),
            }
        ]
    files = [f for f in files if f.get("filename") != Path(name).name]
    files.append(
        {
            "filename": Path(name).name,
            "row_count": len(incoming),
            "uploaded_at": datetime.now().isoformat(timespec="seconds"),
            "sheets": sheet_meta,
        }
    )
    methods = sorted({m.get("method") for m in sheet_meta if m.get("row_count")})
    payload = {
        "filename": Path(name).name,
        "uploaded_at": datetime.now().isoformat(timespec="seconds"),
        "row_count": len(merged),
        "added": added,
        "updated": updated,
        "rows": list(merged.values()),
        "files": files,
        "sheet_meta": sheet_meta,
        "parse_methods": methods,
        "shared": True,
    }
    _local_price_path().write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    return {
        "filename": payload["filename"],
        "uploaded_at": payload["uploaded_at"],
        "row_count": payload["row_count"],
        "added": added,
        "updated": updated,
        "incoming": len(incoming),
        "sheet_meta": sheet_meta,
        "parse_methods": methods,
        "files": files,
        "shared": True,
    }


def save_admin_material_base(file_bytes: bytes, filename: str, replace: bool = False) -> Dict[str, Any]:
    """管理员上传材料/机械采购单价表：默认大模型抽取（表头不统一），规则仅作兜底。"""
    price_summary = save_local_price_table(
        0, file_bytes, filename, replace=replace, use_llm=True, prefer_llm=True
    )
    price_rows = [
        r for r in (_read_price_base().get("rows") or []) if _has_unit_price(r)
    ]
    sample = []
    for r in price_rows[:50]:
        sample.append(
            {
                "name": r.get("material_name") or r.get("desc") or "",
                "spec": _spec_text(r)[:200],
                "unit": r.get("unit") or "",
                "unit_price_bt": r.get("unit_price_bt") or "",
                "unit_price_tax": r.get("unit_price_tax") or "",
                "currency": r.get("currency") or "",
                "supplier": r.get("supplier") or "",
                "source_sheet": r.get("sheet") or "",
                "source_file": (price_summary or {}).get("filename") or "",
                "parse_method": r.get("parse_method") or "",
                "name_key": "|".join(_material_key(r)),
            }
        )

    methods = "、".join(price_summary.get("parse_methods") or []) or "llm"
    msg = (
        f"单价入库 {price_summary.get('incoming') or 0} 条（{methods}），"
        f"库内共 {price_summary.get('row_count') or 0} 条"
    )
    return {
        **get_material_price_base_summary(),
        "sample_rows": sample,
        "price": price_summary,
        "sheet_meta": price_summary.get("sheet_meta") or [],
        "message": msg,
    }


def get_admin_material_base() -> Dict[str, Any]:
    data = _read_price_base()
    rows = [r for r in (data.get("rows") or []) if _has_unit_price(r)]
    sample = []
    for r in rows[:50]:
        sample.append(
            {
                "name": r.get("material_name") or r.get("desc") or "",
                "spec": _spec_text(r)[:200],
                "unit": r.get("unit") or "",
                "unit_price_bt": r.get("unit_price_bt") or "",
                "unit_price_tax": r.get("unit_price_tax") or "",
                "currency": r.get("currency") or "",
                "supplier": r.get("supplier") or "",
                "source_sheet": r.get("sheet") or "",
                "source_file": data.get("filename") or "",
                "parse_method": r.get("parse_method") or "",
                "name_key": "|".join(_material_key(r)),
            }
        )
    return {
        **get_material_price_base_summary(),
        "row_count": len(rows),
        "sample_rows": sample,
    }


def fill_prices_from_local_table(project_id: int, row_keys: Optional[List[str]] = None) -> Dict[str, Any]:
    materials = get_material_list(project_id)
    rows = materials.get("rows") or []
    if not rows:
        raise ValueError("请先上传材料设备清单")
    missing = [item for item in rows if not _has_unit_price(item)]
    if row_keys:
        wanted = {str(key) for key in row_keys if key}
        missing = [item for item in missing if _row_key(item) in wanted]
    if not missing:
        overview = get_overview(project_id)
        overview["fill_result"] = {"filled": 0, "message": "清单单价已齐全"}
        return overview
    table = get_local_price_table(project_id)
    if not table.get("rows"):
        raise ValueError("共享价格库还没有数据，请先上传当地材料价格表")
    catalog: List[Dict[str, Any]] = []
    seen: set = set()
    for item in table["rows"]:
        _append_history(catalog, seen, item, table.get("filename") or "当地价格表", table.get("filename") or "")
    if not catalog:
        raise ValueError("当地价格表里没有可用单价")
    by_id = {h["id"]: h for h in catalog}
    pending: List[Dict[str, Any]] = []
    for item in missing:
        ranked = sorted(catalog, key=lambda h: _history_score(item, h), reverse=True)
        best = ranked[0]
        exact = (
            _fold_text(item.get("material_name")) == _fold_text(best.get("material_name"))
            and _fold_text(_spec_text(item)) == _fold_text(_spec_text(best))
            and _history_score(item, best) >= 80
        )
        if exact:
            _apply_history_price(item, best, prefix="共享价格库")
            continue
        if _history_score(item, best) < 20:
            continue
        item["_candidates"] = ranked[:8]
        pending.append(item)
    llm_error = ""
    if pending:
        pool: List[Dict[str, Any]] = []
        seen_ids = set()
        for item in pending:
            for h in item.get("_candidates") or []:
                if h["id"] not in seen_ids:
                    seen_ids.add(h["id"])
                    pool.append(h)
        try:
            picked = _llm_pick_prices(pending, pool[:80])
        except Exception as e:
            picked = {}
            llm_error = str(e)[:180]
        for item in pending:
            hid = picked.get(f"{item.get('sheet')}|{item.get('row')}")
            if hid and hid in by_id:
                _apply_history_price(item, by_id[hid], prefix="共享价格库")
            item.pop("_candidates", None)
    for item in rows:
        item.pop("_candidates", None)
    filled = sum(1 for item in missing if _has_unit_price(item))
    unmatched = len(missing) - filled
    if filled:
        materials["rows"] = rows
        _state_path(project_id).write_text(json.dumps(materials, ensure_ascii=False), encoding="utf-8")
        build_pricing_from_materials(project_id)
    overview = get_overview(project_id)
    message = f"已按共享价格库补 {filled} 行单价"
    if unmatched:
        message += f"，{unmatched} 行未匹配"
    if llm_error and not filled:
        message += f"（模型：{llm_error}）"
    overview["fill_result"] = {"filled": filled, "unmatched": unmatched, "llm_error": llm_error, "message": message}
    return overview


def _inquiry_path(project_id: int) -> Path:
    return _dir(project_id) / "inquiries.json"


def list_inquiries(project_id: int) -> List[Dict[str, Any]]:
    path = _inquiry_path(project_id)
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return []
    return data if isinstance(data, list) else []


def _save_inquiries(project_id: int, items: List[Dict[str, Any]]) -> None:
    _inquiry_path(project_id).write_text(json.dumps(items, ensure_ascii=False), encoding="utf-8")


def _split_emails(raw: str) -> List[str]:
    parts = re.split(r"[,;，；\s]+", raw or "")
    emails = []
    for part in parts:
        text = part.strip()
        if text and "@" in text and text not in emails:
            emails.append(text)
    return emails


def _inquiry_body(rows: List[Dict[str, Any]], note: str) -> str:
    lines = ["您好，请对以下材料报价（请回复单价、币种，如有税率请一并说明）：", ""]
    for idx, item in enumerate(rows, start=1):
        name = item.get("material_name") or item.get("desc") or ""
        spec = (_spec_text(item) or item.get("spec") or "").replace("\n", " ")
        lines.append(
            f"{idx}. {name} | 规格: {spec} | 单位: {item.get('unit') or ''} | 数量: {item.get('qty') or ''}"
        )
    if note:
        lines.extend(["", f"补充说明：{note}"])
    lines.extend(["", "谢谢。"])
    return "\n".join(lines)


def _mail_settings() -> Dict[str, Any]:
    """每次发信/收信都重新读 .env，避免服务启动后才写入配置。"""
    from dotenv import load_dotenv

    load_dotenv(Path(config.ROOT) / ".env", override=True)
    user = os.getenv("SMTP_USER", "") or os.getenv("SMTP_FROM", "")
    return {
        "host": os.getenv("SMTP_HOST", ""),
        "port": int(os.getenv("SMTP_PORT", "465") or "465"),
        "ssl": os.getenv("SMTP_SSL", "1") not in ("0", "false", "False"),
        "user": user,
        "password": os.getenv("SMTP_PASSWORD", ""),
        "from": os.getenv("SMTP_FROM", "") or user,
        "imap_host": os.getenv("IMAP_HOST", "")
        or (
            "imap.qq.com"
            if "qq.com" in user
            else "imap.163.com"
            if "163.com" in user
            else "imap.gmail.com"
            if "gmail.com" in user
            else ""
        ),
        "imap_port": int(os.getenv("IMAP_PORT", "993") or "993"),
    }


def _send_smtp(recipients: List[str], subject: str, body: str) -> None:
    import smtplib
    from email.message import EmailMessage

    mail = _mail_settings()
    if not mail["host"] or not mail["from"] or not mail["password"]:
        raise RuntimeError("未配置 SMTP")
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = mail["from"]
    msg["To"] = ", ".join(recipients)
    msg.set_content(body)
    if mail["ssl"]:
        with smtplib.SMTP_SSL(mail["host"], mail["port"], timeout=30) as smtp:
            smtp.login(mail["user"], mail["password"])
            smtp.send_message(msg)
    else:
        with smtplib.SMTP(mail["host"], mail["port"], timeout=30) as smtp:
            smtp.starttls()
            smtp.login(mail["user"], mail["password"])
            smtp.send_message(msg)


def create_supplier_inquiry(project_id: int, emails: str, row_keys: List[str], note: str = "") -> Dict[str, Any]:
    materials = get_material_list(project_id)
    rows = materials.get("rows") or []
    selected = _find_rows(rows, row_keys)
    targets = [
        item
        for item in selected
        if item.get("main_material_fee") in (None, "")
        and "main_material_fee" not in set(item.get("manual_fields") or [])
    ]
    if not targets:
        raise ValueError("请勾选尚未填写主材费的材料")
    recipients = _split_emails(emails)
    if not recipients:
        raise ValueError("请填写供应商邮箱")
    inquiry_id = datetime.now().strftime("%Y%m%d%H%M%S")
    subject = f"材料询价 {inquiry_id}（{len(targets)}项）"
    body = _inquiry_body(targets, note)
    sent = False
    send_error = ""
    try:
        _send_smtp(recipients, subject, body)
        sent = True
    except Exception as e:
        send_error = str(e)[:180]
    mail = _mail_settings()
    sent_at = datetime.now().isoformat(timespec="seconds")
    inquiry = {
        "id": inquiry_id,
        "created_at": sent_at,
        "sent_at": sent_at if sent else "",
        "emails": recipients,
        "subject": subject,
        "body": body,
        "note": note or "",
        "sent": sent,
        "send_error": send_error,
        "row_keys": [_row_key(item) for item in targets],
        "status": "sent" if sent else "draft",
    }
    items = list_inquiries(project_id)
    items.insert(0, inquiry)
    _save_inquiries(project_id, items[:50])
    inquiry["message"] = (
        f"询价邮件已从 {mail['from']} 发出。收到供应商回复后点「收取回复回填」。"
        if sent
        else (
            "未配置发信邮箱，邮件没有发出。请在项目根目录 .env 填写 SMTP_HOST、SMTP_USER、SMTP_PASSWORD、SMTP_FROM 后重启接口再发送。"
            if "未配置" in send_error
            else f"邮件未发出：{send_error}"
        )
    )
    return inquiry


def _decode_mail_text(msg: Any) -> str:
    chunks: List[str] = []
    parts = msg.walk() if msg.is_multipart() else [msg]
    for part in parts:
        if part.get_content_maintype() == "multipart":
            continue
        if part.get_content_type() not in ("text/plain", "text/html"):
            continue
        payload = part.get_payload(decode=True) or b""
        charset = part.get_content_charset() or "utf-8"
        text = payload.decode(charset, errors="replace")
        if part.get_content_type() == "text/html":
            text = re.sub(r"<[^>]+>", " ", text)
        chunks.append(text)
        if part.get_content_type() == "text/plain":
            break
    return "\n".join(chunks)


def _header_text(value: Any) -> str:
    import email.header

    parts = email.header.decode_header(value or "")
    out = []
    for chunk, enc in parts:
        if isinstance(chunk, bytes):
            out.append(chunk.decode(enc or "utf-8", errors="replace"))
        else:
            out.append(str(chunk))
    return "".join(out)


def _extract_mail_addrs(value: Any) -> List[str]:
    import email.utils

    text = _header_text(value)
    addrs = []
    for _, addr in email.utils.getaddresses([text]):
        addr = (addr or "").strip().lower()
        if addr and "@" in addr and addr not in addrs:
            addrs.append(addr)
    return addrs


def _mail_datetime(msg: Any) -> Optional[datetime]:
    import email.utils

    raw = msg.get("Date")
    if not raw:
        return None
    try:
        when = email.utils.parsedate_to_datetime(raw)
    except Exception:
        return None
    if when is None:
        return None
    if when.tzinfo is not None:
        when = when.astimezone().replace(tzinfo=None)
    return when


def _inquiry_sent_at(inquiry: Dict[str, Any]) -> Optional[datetime]:
    return _parse_when(inquiry.get("sent_at") or inquiry.get("created_at"))


def _missing_main_fee(item: Dict[str, Any]) -> bool:
    if "main_material_fee" in set(item.get("manual_fields") or []):
        return False
    return item.get("main_material_fee") in (None, "")


def sync_supplier_replies(project_id: int) -> Dict[str, Any]:
    """从发信邮箱收件箱读取询价回复，仅按对应供应商邮箱、发送时间之后的邮件回填。"""
    import email
    import imaplib

    mail = _mail_settings()
    if not mail["imap_host"] or not mail["user"] or not mail["password"]:
        raise ValueError("未配置收信邮箱（IMAP_HOST / SMTP_USER / SMTP_PASSWORD），无法自动读取回复")

    materials = get_material_list(project_id)
    rows = materials.get("rows") or []
    missing_keys = {_row_key(item) for item in rows if _missing_main_fee(item)}
    inquiries = list_inquiries(project_id)
    pending = [
        item
        for item in inquiries
        if item.get("id")
        and item.get("sent")
        and item.get("emails")
        and (
            item.get("status") == "sent"
            or any(key in missing_keys for key in (item.get("row_keys") or []))
        )
    ]
    if not pending and not missing_keys:
        overview = get_overview(project_id)
        overview["fill_result"] = {"filled": 0, "message": "没有缺主材费的材料，无需收取回复"}
        return overview
    if not pending:
        overview = get_overview(project_id)
        overview["fill_result"] = {"filled": 0, "message": "没有待收取的询价邮件，请先发送询价"}
        return overview

    earliest = min((_inquiry_sent_at(item) or datetime.now()) for item in pending)
    since = earliest - timedelta(minutes=1)
    filled_total = 0
    archived_total = 0
    scanned = 0
    matched_mails = 0
    client = imaplib.IMAP4_SSL(mail["imap_host"], mail["imap_port"])
    try:
        client.login(mail["user"], mail["password"])
        client.select("INBOX")
        typ, data = client.search(None, "ALL")
        ids = data[0].split() if typ == "OK" and data and data[0] else []
        recent = list(reversed(ids[-80:]))
        mailbox: List[Dict[str, Any]] = []
        for mid in recent:
            typ, msg_data = client.fetch(mid, "(BODY.PEEK[])")
            if typ != "OK" or not msg_data:
                continue
            raw = next((part[1] for part in msg_data if isinstance(part, tuple) and len(part) > 1), None)
            if not raw:
                continue
            msg = email.message_from_bytes(raw)
            when = _mail_datetime(msg)
            if when and when < since:
                continue
            subject = _header_text(msg.get("Subject"))
            body = _decode_mail_text(msg)
            from_addrs = _extract_mail_addrs(msg.get("From"))
            mailbox.append(
                {
                    "subject": subject,
                    "body": body,
                    "text": f"{subject}\n{body}",
                    "from_addrs": from_addrs,
                    "date": when,
                }
            )
            scanned += 1

        for inquiry in pending:
            token = str(inquiry["id"])
            recipients = {str(e).strip().lower() for e in (inquiry.get("emails") or []) if e}
            sent_at = _inquiry_sent_at(inquiry)
            candidates = []
            for m in mailbox:
                if sent_at and m.get("date") and m["date"] < sent_at:
                    continue
                if recipients and not (set(m.get("from_addrs") or []) & recipients):
                    continue
                if token not in (m.get("text") or "") and token not in (m.get("subject") or ""):
                    continue
                candidates.append(m)
            if not candidates:
                continue
            matched_mails += 1
            matched = max(candidates, key=lambda item: item.get("date") or datetime.min)
            try:
                result = apply_supplier_reply(project_id, token, matched["text"], use_llm=True)
            except ValueError:
                continue
            filled_total += int((result.get("fill_result") or {}).get("filled") or 0)
            archived_total += int((result.get("fill_result") or {}).get("archived") or 0)
    finally:
        try:
            client.logout()
        except Exception:
            pass

    overview = get_overview(project_id)
    still_missing = sum(1 for item in overview.get("rows") or [] if _missing_main_fee(item))
    if filled_total:
        message = (
            f"已按供应商邮箱与发送时间对齐，回填 {filled_total} 行主材费"
            f"（匹配到 {matched_mails} 封回复），并写入材料单价基础库 {archived_total} 条"
        )
    elif scanned == 0:
        message = "邮箱收件箱为空，或发送时间之后没有新邮件"
    else:
        message = f"已扫描 {scanned} 封邮件，未找到对应供应商、且含询价编号的回复"
        if still_missing == 0:
            message = "主材费已齐全，没有需要填写的材料"
    overview["fill_result"] = {
        "filled": filled_total,
        "archived": archived_total,
        "scanned": scanned,
        "matched_mails": matched_mails,
        "message": message,
    }
    return overview


def _price_mentioned(reply: str, value: Optional[float]) -> bool:
    if value is None:
        return False
    text = reply.replace(",", "").replace("，", "").replace(" ", "")
    plain = f"{value:.6f}".rstrip("0").rstrip(".")
    if plain and plain in text:
        return True
    if abs(value - round(value)) < 1e-9 and str(int(round(value))) in text:
        return True
    return False


def _extract_prices_from_reply(reply: str, targets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """从回复里直接抓「单价: 110」一类写法，不依赖模型。"""
    lines = [ln.strip() for ln in (reply or "").splitlines() if ln.strip()]
    results: List[Dict[str, Any]] = []
    for item in targets:
        key = _row_key(item)
        name = str(item.get("material_name") or "").strip()
        price = None
        for line in lines:
            if "单价" not in line and "unit price" not in line.lower():
                continue
            if name and name not in line and _fold_text(name) not in _fold_text(line):
                # 只有一条待填时，允许整封信只有一个单价
                if len(targets) > 1:
                    continue
            m = re.search(r"(?:单价|含税单价|折后单价|unit\s*price)\s*[:：=]?\s*([0-9]+(?:\.[0-9]+)?)", line, re.I)
            if m:
                price = _positive(m.group(1))
                if price is not None:
                    break
        if price is None and len(targets) == 1:
            m = re.search(r"(?:单价|含税单价|折后单价|unit\s*price)\s*[:：=]?\s*([0-9]+(?:\.[0-9]+)?)", reply, re.I)
            if m:
                price = _positive(m.group(1))
        if price is None:
            continue
        results.append(
            {
                "key": key,
                "unit_price_ht": price,
                "unit_price_tax": None,
                "currency": item.get("currency") or "DZD",
                "tax_rate": item.get("tax_rate") or "",
            }
        )
    return results


def apply_supplier_reply(
    project_id: int,
    inquiry_id: str,
    reply_text: str,
    use_llm: bool = True,
) -> Dict[str, Any]:
    from .llm import call_dashscope_json

    reply = (reply_text or "").strip()
    if len(reply) < 2:
        raise ValueError("请粘贴供应商回复内容")
    inquiries = list_inquiries(project_id)
    inquiry = next((item for item in inquiries if item.get("id") == inquiry_id), None)
    if not inquiry:
        raise ValueError("未找到这条询价，请先生成询价邮件")
    materials = get_material_list(project_id)
    rows = materials.get("rows") or []
    allowed_keys = set(inquiry.get("row_keys") or [])
    targets = [
        item
        for item in _find_rows(rows, list(allowed_keys))
        if _row_key(item) in allowed_keys and _missing_main_fee(item)
    ]
    if not targets:
        overview = get_overview(project_id)
        overview["fill_result"] = {"filled": 0, "message": "该询价对应材料的主材费已齐全"}
        return overview

    queries = [
        {
            "key": _row_key(item),
            "name": item.get("material_name") or item.get("desc") or "",
            "spec": (_spec_text(item) or item.get("spec") or "")[:160],
            "unit": item.get("unit") or "",
            "qty": item.get("qty") or "",
            "currency": item.get("currency") or "DZD",
            "tax_rate": item.get("tax_rate") or "",
        }
        for item in targets
    ]
    got: Any = None
    if use_llm:
        try:
            parsed = call_dashscope_json(
                "下面是供应商回复的整封邮件（可能含原询价引用）。请从任意自然语言、表格、中英文里提取材料单价。\n"
                "规则：\n"
                "1) 只能对应到「询价材料」列表里的 key，禁止填到列表外的材料。\n"
                "2) 不要求固定模板，只要能对应到询价材料就提取。\n"
                "3) 「单价 100」「单价:100」「unit price 100」都算有效。\n"
                "4) 只提取明确数字，不要臆造；无法对应则为 null。\n"
                "5) 默认当地采购：若只给一个单价，填到 unit_price_ht；含税另说才填 unit_price_tax。\n"
                "只输出 JSON：{\"prices\":[{\"key\":\"工作表|行号\",\"unit_price_ht\":数字或null,\"unit_price_tax\":数字或null,\"currency\":\"\",\"tax_rate\":数字或null,\"reason\":\"简短\"}]}\n\n"
                f"询价材料：\n{json.dumps(queries, ensure_ascii=False)}\n\n邮件内容：\n{reply[:9000]}",
                "你是询价员，从自由格式供应商邮件中提取单价，只回填本询价勾选材料，不编造。",
                temperature=0.1,
            )
            got = parsed.get("prices") if isinstance(parsed, dict) else None
        except Exception:
            got = None
    if not isinstance(got, list) or not got:
        got = _extract_prices_from_reply(reply, targets)
    if not isinstance(got, list) or not got:
        raise ValueError("回复里没有识别到单价")

    by_key = {_row_key(item): item for item in targets}
    filled = 0
    archived_rows: List[Dict[str, Any]] = []
    sender = "、".join(inquiry.get("emails") or [])
    for row in got:
        if not isinstance(row, dict):
            continue
        key = str(row.get("key") or "")
        if key not in allowed_keys:
            continue
        item = by_key.get(key)
        if not item:
            continue
        ht = _positive(row.get("unit_price_ht"))
        tax = _positive(row.get("unit_price_tax") or row.get("unit_price"))
        if ht is not None and not _price_mentioned(reply, ht):
            ht = None
        if tax is not None and not _price_mentioned(reply, tax):
            tax = None
        if ht is None and tax is None:
            continue
        rate = _tax_rate(item) or _tax_rate({"tax_rate": row.get("tax_rate")})
        if tax is None and ht is not None and rate:
            tax = ht * (1 + rate)
        hist = {
            "project": sender or "供应商",
            "material_name": item.get("material_name") or item.get("desc") or "",
            "spec_detail": str(row.get("reason") or "")[:80],
            "unit_price_bt": _num_text(ht) if ht is not None else "",
            "unit_price_tax": _num_text(tax) if tax is not None else "",
            "currency": str(row.get("currency") or item.get("currency") or "DZD"),
            "tax_rate": str(item.get("tax_rate") or row.get("tax_rate") or ""),
            "supplier": sender,
        }
        _apply_history_price(item, hist, prefix="供应商回复")
        shown = ht if ht is not None else tax
        if shown is not None:
            item["main_material_fee"] = _round2(shown)
            item["price_matched"] = True
        archived_rows.append(_price_row_from_reply(item, hist, inquiry_id))
        filled += 1
    archived = 0
    if filled:
        materials["rows"] = rows
        _state_path(project_id).write_text(json.dumps(materials, ensure_ascii=False), encoding="utf-8")
        build_pricing_from_materials(project_id)
        inquiry["status"] = "replied"
        inquiry["replied_at"] = datetime.now().isoformat(timespec="seconds")
        inquiry["reply_from"] = sender
        _save_inquiries(project_id, inquiries)
        archived = archive_reply_prices_to_base(archived_rows, inquiry_id, sender)
    overview = get_overview(project_id)
    if filled:
        message = f"已按供应商回复填写 {filled} 行主材费，并写入材料单价基础库 {archived} 条"
    else:
        message = "回复里没有可对上的单价"
    overview["fill_result"] = {
        "filled": filled,
        "archived": archived,
        "message": message,
    }
    return overview


def get_pricing_preview(project_id: int) -> Dict[str, Any]:
    path = _preview_path(project_id)
    if not path.exists():
        materials = get_material_list(project_id)
        if materials.get("rows"):
            return build_pricing_from_materials(project_id)
        return {
            "row_count": 0,
            "total_amount": None,
            "rows": [],
            "built_at": None,
        }
    return json.loads(path.read_text(encoding="utf-8"))


def get_overview(project_id: int) -> Dict[str, Any]:
    materials = get_material_list(project_id)
    preview = get_pricing_preview(project_id)
    match_count = sum(1 for r in (materials.get("rows") or []) if r.get("quota_matched"))
    price_matched = sum(
        1 for r in (materials.get("rows") or []) if r.get("price_matched") and r.get("main_material_fee") is not None
    )
    return {
        **materials,
        "preview": {
            "row_count": preview.get("row_count", 0),
            "total_amount": preview.get("total_amount"),
            "total_labor": preview.get("total_labor"),
            "total_material": preview.get("total_material"),
            "total_machine": preview.get("total_machine"),
            "total_fee": preview.get("total_fee"),
            "built_at": preview.get("built_at"),
            "template": preview.get("template"),
            "params": preview.get("params"),
            "rows": preview.get("rows") or [],
        },
        "quota_base": get_quota_base_summary(),
        "quota_match": {
            "matched": match_count,
            "total": materials.get("row_count") or 0,
        },
        "price_base": get_material_price_base_summary(),
        "price_match": {
            "matched": price_matched,
            "total": materials.get("row_count") or 0,
        },
        "local_price": {
            "filename": get_local_price_table(project_id).get("filename") or "",
            "row_count": get_local_price_table(project_id).get("row_count") or 0,
            "uploaded_at": get_local_price_table(project_id).get("uploaded_at"),
        },
        "inquiries": list_inquiries(project_id)[:20],
    }


def export_pricing_bytes(project_id: int) -> Tuple[bytes, str]:
    path = _filled_path(project_id)
    if not path.exists():
        build_pricing_from_materials(project_id)
    if not path.exists():
        raise ValueError("尚无组价结果，请先上传材料设备清单")
    return path.read_bytes(), "组价预览_已填入.xlsx"
