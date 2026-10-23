from __future__ import annotations

from typing import List, Optional
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field

from . import attachment_workbench as att_wb
from . import auth as auth_svc
from . import excel_export
from . import ingest
from . import instructions_analysis as inst_svc
from . import notice_analysis as notice_svc
from . import org_chart as org_chart_svc
from . import quotation as quote_svc
from . import remaining_attachments as remain_svc

api = APIRouter(prefix="/api")


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    notes: str = ""


class LoginBody(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=1, max_length=200)


class InstructionsPatch(BaseModel):
    workflow_step: Optional[int] = None
    conditions: Optional[dict] = None
    base_data: Optional[dict] = None
    attachment: Optional[dict] = None
    run_validate: bool = False
    complete: bool = False
    force_rescan: bool = False


class OrgMasterBody(BaseModel):
    enterprise: Optional[dict] = None
    legal_rep: Optional[dict] = None
    agent: Optional[dict] = None
    project: Optional[dict] = None


class AttachmentFieldsBody(BaseModel):
    fields: List[dict] = Field(default_factory=list)


class PersonnelTableBody(BaseModel):
    people: List[dict] = Field(default_factory=list)
    notes: Optional[str] = None


class OrgChartBody(BaseModel):
    nodes: Optional[List[dict]] = None
    confirm: Optional[dict] = None


class PlanWorkbenchBody(BaseModel):
    form_data: dict = Field(default_factory=dict)


@api.get("/health")
def health():
    from . import config
    from . import quotation as quote_svc

    mail = quote_svc._mail_settings()
    return {
        "ok": True,
        "llm_configured": bool(config.DASHSCOPE_API_KEY),
        "model": config.MODEL_NAME,
        "mail_configured": bool(mail.get("host") and mail.get("from") and mail.get("password")),
        "mail_from": mail.get("from") or "",
    }


@api.post("/auth/login")
def auth_login(body: LoginBody):
    try:
        return auth_svc.login(body.username, body.password)
    except ValueError as exc:
        raise HTTPException(401, str(exc)) from exc


@api.post("/auth/logout")
def auth_logout(request: Request, user=Depends(auth_svc.require_user)):
    auth_svc.logout(auth_svc.extract_token(request))
    return {"ok": True, "user": user["username"]}


@api.get("/auth/me")
def auth_me(user=Depends(auth_svc.require_user)):
    return {"user": user}


@api.get("/admin/quota-base")
def admin_get_quota_base(_user=Depends(auth_svc.require_admin)):
    return quote_svc.get_admin_material_base()


@api.post("/admin/quota-base")
async def admin_upload_quota_base(
    file: UploadFile = File(...),
    replace: bool = False,
    _user=Depends(auth_svc.require_admin),
):
    raw = await file.read()

    def _run():
        return quote_svc.save_admin_material_base(raw, file.filename or "", replace=replace)

    return _quote_or_400(_run)


@api.get("/projects")
def list_projects():
    return {"items": ingest.list_projects()}


@api.post("/projects")
def create_project(body: ProjectCreate):
    return ingest.create_project(body.name, body.notes)


@api.get("/projects/{project_id}")
def get_project(project_id: int):
    detail = notice_svc.project_detail(project_id)
    if not detail:
        raise HTTPException(404, "项目不存在")
    return detail


@api.delete("/projects/{project_id}")
def delete_project(project_id: int):
    if not ingest.delete_project(project_id):
        raise HTTPException(404, "项目不存在")
    return {"ok": True}


@api.post("/projects/{project_id}/upload-zip")
async def upload_zip(project_id: int, file: UploadFile = File(...)):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    name = (file.filename or "").lower()
    if not name.endswith(".zip"):
        raise HTTPException(400, "请上传 .zip 招标文件包")
    try:
        return await ingest.ingest_zip(project_id, file)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"{type(e).__name__}: {str(e)[:200]}")


class AnalyzeFocusBody(BaseModel):
    focus_keywords: Optional[str] = None
    template_mode: Optional[str] = None  # green_template | llm_general（仅公告）


@api.post("/projects/{project_id}/analyze-notice")
def analyze_notice(project_id: int, body: Optional[AnalyzeFocusBody] = None):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    try:
        kw = body.focus_keywords if body else None
        mode = body.template_mode if body else None
        return notice_svc.analyze_notice(project_id, focus_keywords=kw, template_mode=mode)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"{type(e).__name__}: {str(e)[:300]}")


@api.get("/projects/{project_id}/notice-analysis")
def get_notice_analysis(project_id: int):
    item = notice_svc.latest_notice_analysis(project_id)
    if not item:
        raise HTTPException(404, "尚无公告分析结果")
    return item


@api.get("/projects/{project_id}/instructions")
def get_instructions(project_id: int):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    return inst_svc.get_or_init_instructions(project_id)


@api.post("/projects/{project_id}/instructions/scan")
def scan_instructions(project_id: int, force: bool = False):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    try:
        return inst_svc.scan_instructions(project_id, force=force)
    except Exception as e:
        raise HTTPException(500, f"{type(e).__name__}: {str(e)[:300]}")


@api.post("/projects/{project_id}/instructions/analyze-body")
def analyze_instruction_body(project_id: int, body: Optional[AnalyzeFocusBody] = None):
    """分析《投标须知》正文并结构化展示。"""
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    try:
        kw = body.focus_keywords if body else None
        return inst_svc.analyze_instruction_body(project_id, focus_keywords=kw)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"{type(e).__name__}: {str(e)[:300]}")


@api.post("/projects/{project_id}/instructions/base-data/import")
async def import_base_data(project_id: int, file: UploadFile = File(...)):
    """导入文件分析回填统一基础数据。"""
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    try:
        raw = await file.read()
        if not raw:
            raise ValueError("上传文件为空")
        return inst_svc.import_base_data_file(project_id, raw, file.filename or "import.bin")
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"{type(e).__name__}: {str(e)[:300]}")


@api.patch("/projects/{project_id}/instructions")
def patch_instructions(project_id: int, body: InstructionsPatch):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    try:
        if body.force_rescan:
            return inst_svc.scan_instructions(project_id, force=True)
        payload = body.model_dump(exclude_none=True)
        payload.pop("force_rescan", None)
        return inst_svc.update_instructions(project_id, payload)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"{type(e).__name__}: {str(e)[:300]}")


@api.get("/projects/{project_id}/org-master")
def get_org_master(project_id: int):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    return att_wb.get_org_master(project_id)


@api.put("/projects/{project_id}/org-master")
def put_org_master(project_id: int, body: OrgMasterBody):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    return att_wb.save_org_master(project_id, body.model_dump(exclude_none=True))


@api.get("/projects/{project_id}/attachments/{code}/workbench")
def get_attachment_workbench(project_id: int, code: str):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    try:
        return att_wb.get_attachment_workbench(project_id, code)
    except ValueError as e:
        raise HTTPException(400, str(e))


@api.post("/projects/{project_id}/attachments/{code}/analyze-fields")
def analyze_attachment_fields(project_id: int, code: str):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    try:
        return att_wb.analyze_attachment_fields(project_id, code)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"{type(e).__name__}: {str(e)[:300]}")


@api.put("/projects/{project_id}/attachments/{code}/fields")
def save_attachment_fields(project_id: int, code: str, body: AttachmentFieldsBody):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    try:
        return att_wb.save_attachment_fields(project_id, code, body.fields)
    except ValueError as e:
        raise HTTPException(400, str(e))


@api.post("/projects/{project_id}/attachments/{code}/complete")
def complete_attachment(project_id: int, code: str):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    try:
        return att_wb.complete_attachment(project_id, code)
    except ValueError as e:
        raise HTTPException(400, str(e))


@api.get("/projects/{project_id}/attachments/{code}/personnel")
def get_personnel_table(project_id: int, code: str):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    try:
        return att_wb.get_personnel_table(project_id, code)
    except ValueError as e:
        raise HTTPException(400, str(e))


@api.put("/projects/{project_id}/attachments/{code}/personnel")
def save_personnel_table(project_id: int, code: str, body: PersonnelTableBody):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    try:
        return att_wb.save_personnel_table(project_id, code, body.people, notes=body.notes)
    except ValueError as e:
        raise HTTPException(400, str(e))


@api.post("/projects/{project_id}/attachments/{code}/personnel/import")
async def import_personnel_file(
    project_id: int,
    code: str,
    file: UploadFile = File(...),
    mode: str = "merge",
):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    try:
        raw = await file.read()
        if not raw:
            raise ValueError("上传文件为空")
        return att_wb.import_personnel_file(
            project_id,
            code,
            raw,
            file.filename or "import.bin",
            mode=mode,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"{type(e).__name__}: {str(e)[:300]}")


@api.post("/projects/{project_id}/attachments/{code}/import-fill")
async def import_fill_attachment(project_id: int, code: str, file: UploadFile = File(...)):
    """导入文件分析回填附件字段（不含组织图 A03、人员表 A04）。"""
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    try:
        raw = await file.read()
        if not raw:
            raise ValueError("上传文件为空")
        return att_wb.import_fill_attachment(
            project_id, code, raw, file.filename or "import.bin"
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"{type(e).__name__}: {str(e)[:300]}")


@api.get("/projects/{project_id}/attachments/{code}/org-chart")
def get_org_chart(project_id: int, code: str):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    try:
        return org_chart_svc.get_org_chart(project_id, code)
    except ValueError as e:
        raise HTTPException(400, str(e))


@api.post("/projects/{project_id}/attachments/{code}/org-chart/generate")
def generate_org_chart(project_id: int, code: str):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    try:
        return org_chart_svc.generate_org_chart(project_id, code)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"{type(e).__name__}: {str(e)[:300]}")


@api.put("/projects/{project_id}/attachments/{code}/org-chart")
def save_org_chart(project_id: int, code: str, body: OrgChartBody):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    try:
        return org_chart_svc.save_org_chart(
            project_id,
            code,
            nodes=body.nodes,
            confirm=body.confirm,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))


@api.get("/projects/{project_id}/attachments/{code}/plan-workbench")
def get_plan_workbench(project_id: int, code: str):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    try:
        return remain_svc.get_plan_workbench(project_id, code)
    except ValueError as e:
        raise HTTPException(400, str(e))


@api.put("/projects/{project_id}/attachments/{code}/plan-workbench")
def save_plan_workbench(project_id: int, code: str, body: PlanWorkbenchBody):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    try:
        return remain_svc.save_plan_workbench(project_id, code, body.form_data or {})
    except ValueError as e:
        raise HTTPException(400, str(e))


@api.post("/projects/{project_id}/attachments/{code}/plan-workbench/generate")
def generate_plan_workbench(project_id: int, code: str):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    try:
        return remain_svc.generate_plan_draft(project_id, code)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"{type(e).__name__}: {str(e)[:300]}")


@api.get("/projects/{project_id}/attachments/{code}/export-docx")
def export_attachment_docx(project_id: int, code: str):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    try:
        content, filename = att_wb.export_attachment_docx_bytes(project_id, code)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"{type(e).__name__}: {str(e)[:300]}")
    headers = {
        "Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}",
    }
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers=headers,
    )


@api.get("/projects/{project_id}/structured-export")
def get_structured_export(project_id: int, force: bool = False):
    """公告详情数据：与 Excel 解读表同源；首次生成较慢，之后读缓存。"""
    proj = ingest.get_project(project_id)
    if not proj:
        raise HTTPException(404, "项目不存在")
    if not proj.get("zip_name"):
        raise HTTPException(400, "请先上传招标 ZIP 包")
    try:
        item = excel_export.get_or_build_structured_export(project_id, force=force)
        result = dict(item.get("result") or {})
        # 若来自缓存，标记 cached
        if not result.get("fresh"):
            result["cached"] = True
        result.pop("fresh", None)
        return {
            "id": item.get("id"),
            "status": item.get("status"),
            "created_at": item.get("created_at"),
            "result": result,
        }
    except FileNotFoundError as e:
        raise HTTPException(500, str(e))
    except Exception as e:
        raise HTTPException(500, f"{type(e).__name__}: {str(e)[:300]}")


def _quote_or_400(fn):
    try:
        return fn()
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"{type(e).__name__}: {str(e)[:300]}")


@api.get("/projects/{project_id}/quotation")
def get_quotation(project_id: int):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    return quote_svc.get_overview(project_id)


@api.post("/projects/{project_id}/quotation/material-list")
async def upload_material_list(project_id: int, file: UploadFile = File(...)):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    raw = await file.read()
    return _quote_or_400(lambda: quote_svc.save_material_list(project_id, raw, file.filename or ""))


@api.get("/projects/{project_id}/quotation/quota-base")
def get_quota_base(project_id: int):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    return quote_svc.get_quota_base_summary()


@api.post("/projects/{project_id}/quotation/quota-base")
async def upload_quota_base(project_id: int, file: UploadFile = File(...), replace: bool = False):
    """上传定额基础历史表（可多次上传合并；replace=1 则覆盖）。"""
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    raw = await file.read()

    def _run():
        summary = quote_svc.save_quota_base(raw, file.filename or "", replace=replace)
        match = quote_svc.apply_quota_to_materials(project_id)
        overview = quote_svc.get_overview(project_id)
        overview["quota_base"] = summary
        overview["quota_match"] = match
        if overview.get("row_count"):
            preview = quote_svc.build_pricing_from_materials(project_id)
            overview["preview"] = {
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
        return overview

    return _quote_or_400(_run)


@api.post("/projects/{project_id}/quotation/apply-quota")
def apply_quota(project_id: int):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")

    def _run():
        match = quote_svc.apply_quota_to_materials(project_id)
        price_match = quote_svc.apply_main_material_from_price_base(project_id)
        history_match = quote_svc.apply_main_material_from_project_history(project_id, use_llm=True)
        price_match["matched"] = history_match.get("matched", price_match.get("matched"))
        price_match["history_matched"] = history_match.get("history_matched") or 0
        price_match["llm_filled"] = history_match.get("llm_filled") or 0
        price_match["llm_error"] = history_match.get("llm_error") or ""
        overview = quote_svc.get_overview(project_id)
        if overview.get("row_count"):
            preview = quote_svc.build_pricing_from_materials(project_id)
            overview["preview"] = {
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
        overview["quota_match"] = match
        overview["price_match"] = price_match
        return overview

    return _quote_or_400(_run)


class HistoryPriceApply(BaseModel):
    history_id: str
    row_keys: List[str] = Field(default_factory=list)


class InquiryCreate(BaseModel):
    emails: str = ""
    row_keys: List[str] = Field(default_factory=list)
    note: str = ""


class InquiryReply(BaseModel):
    reply_text: str = ""


class RowKeysBody(BaseModel):
    row_keys: List[str] = Field(default_factory=list)


class QuotaCellBody(BaseModel):
    sheet: str = ""
    row: int
    field: str
    value: Optional[float] = None


@api.post("/projects/{project_id}/quotation/quota-cell")
def update_quota_cell(project_id: int, body: QuotaCellBody):
    """手工填写定额辅材、机械、人工或主材费。"""
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    return _quote_or_400(
        lambda: quote_svc.update_material_cell(project_id, body.sheet, body.row, body.field, body.value)
    )


@api.post("/projects/{project_id}/quotation/apply-main-material")
def apply_main_material(project_id: int, body: Optional[RowKeysBody] = None):
    """勾选行或全量：对照材料单价基础库匹配主材费。"""
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    keys = body.row_keys if body and body.row_keys else None

    def _run():
        price_match = quote_svc.apply_main_material_from_price_base(project_id, keys)
        overview = quote_svc.get_overview(project_id)
        if overview.get("row_count"):
            preview = quote_svc.build_pricing_from_materials(project_id)
            overview["preview"] = {
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
        overview["price_match"] = price_match
        return overview

    return _quote_or_400(_run)


@api.post("/projects/{project_id}/quotation/fill-prices")
def fill_quotation_prices(project_id: int, body: Optional[RowKeysBody] = None):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    keys = body.row_keys if body and body.row_keys else None
    return _quote_or_400(lambda: quote_svc.fill_missing_prices_from_history(project_id, keys))


@api.get("/projects/{project_id}/quotation/price-history")
def quotation_price_history(project_id: int):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    rows = quote_svc.collect_price_history(project_id)
    return {"row_count": len(rows), "rows": rows[:400]}


@api.post("/projects/{project_id}/quotation/apply-history-price")
def quotation_apply_history_price(project_id: int, body: HistoryPriceApply):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    return _quote_or_400(lambda: quote_svc.apply_history_price_to_rows(project_id, body.row_keys, body.history_id))


@api.post("/projects/{project_id}/quotation/local-price")
async def upload_local_price_table(project_id: int, file: UploadFile = File(...)):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    raw = await file.read()
    return _quote_or_400(lambda: quote_svc.save_local_price_table(project_id, raw, file.filename or ""))


@api.post("/projects/{project_id}/quotation/fill-market-prices")
def fill_market_prices(project_id: int, body: Optional[RowKeysBody] = None):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    keys = body.row_keys if body and body.row_keys else None
    return _quote_or_400(lambda: quote_svc.fill_prices_from_market_llm(project_id, keys))


@api.post("/projects/{project_id}/quotation/fill-local-prices")
def fill_local_prices(project_id: int, body: Optional[RowKeysBody] = None):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    keys = body.row_keys if body and body.row_keys else None
    return _quote_or_400(lambda: quote_svc.fill_prices_from_local_table(project_id, keys))


@api.post("/projects/{project_id}/quotation/inquiries/sync-replies")
def sync_quotation_replies(project_id: int):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    return _quote_or_400(lambda: quote_svc.sync_supplier_replies(project_id))


@api.post("/projects/{project_id}/quotation/inquiries")
def create_quotation_inquiry(project_id: int, body: InquiryCreate):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    return _quote_or_400(
        lambda: quote_svc.create_supplier_inquiry(project_id, body.emails, body.row_keys, body.note)
    )


@api.post("/projects/{project_id}/quotation/inquiries/{inquiry_id}/reply")
def reply_quotation_inquiry(project_id: int, inquiry_id: str, body: InquiryReply):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    return _quote_or_400(lambda: quote_svc.apply_supplier_reply(project_id, inquiry_id, body.reply_text))


@api.post("/projects/{project_id}/quotation/build-pricing")
def build_quotation_pricing(project_id: int):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    return _quote_or_400(lambda: quote_svc.build_pricing_from_materials(project_id))


@api.get("/projects/{project_id}/quotation/preview")
def get_quotation_preview(project_id: int):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    return _quote_or_400(lambda: quote_svc.get_pricing_preview(project_id))


@api.get("/projects/{project_id}/quotation/export-pricing")
def export_quotation_pricing(project_id: int):
    if not ingest.get_project(project_id):
        raise HTTPException(404, "项目不存在")
    try:
        content, filename = quote_svc.export_pricing_bytes(project_id)
    except ValueError as e:
        raise HTTPException(400, str(e))
    headers = {"Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}"}
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )


@api.get("/projects/{project_id}/export-excel")
def export_excel(project_id: int):
    """新增：按结构化解读表模板导出 Excel（不改变原公告分析逻辑）。"""
    proj = ingest.get_project(project_id)
    if not proj:
        raise HTTPException(404, "项目不存在")
    if not proj.get("zip_name"):
        raise HTTPException(400, "请先上传招标 ZIP 包")
    try:
        content, meta = excel_export.build_workbook_bytes(project_id)
    except FileNotFoundError as e:
        raise HTTPException(500, str(e))
    except Exception as e:
        raise HTTPException(500, f"{type(e).__name__}: {str(e)[:300]}")
    filename = excel_export.export_filename(proj.get("name") or f"project_{project_id}")
    headers = {
        "Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}",
        "X-Export-Rows": str(meta.get("row_count", 0)),
        "X-Export-Files": str(meta.get("file_count", 0)),
    }
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )
