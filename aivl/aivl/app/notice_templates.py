"""招标公告提取模板：基础绿字段模板 vs 通用字段模板。"""
from __future__ import annotations

from typing import Any, Dict, List

# 与《招标文件结构化解读》样表绿字字段对齐，按章节分组
GREEN_TEMPLATE_SECTIONS: List[Dict[str, Any]] = [
    {
        "key": "project",
        "title": "一、项目基本信息",
        "fields": [
            {"key": "project_name_zh", "label": "项目中文名称"},
            {"key": "lot_name", "label": "标段名称"},
            {"key": "country", "label": "项目所在国家"},
            {"key": "city_province", "label": "项目所在城市/省"},
            {"key": "project_type", "label": "工程类型"},
            {"key": "purpose", "label": "工程用途描述"},
            {"key": "site_area", "label": "占地面积"},
            {"key": "hospital_building_area", "label": "医院楼建筑面积"},
            {"key": "vrd_area", "label": "VRD面积"},
            {"key": "main_composition", "label": "主要组成（单体/配套）"},
            {"key": "structure_form", "label": "医院楼结构形式"},
            {"key": "has_basement", "label": "是否有地下室"},
            {"key": "floors_above", "label": "地上层数"},
            {"key": "layout_desc", "label": "楼栋/平面布局描述"},
            {"key": "project_start_date", "label": "项目启动日期"},
            {"key": "delivery_date", "label": "交付日期"},
            {"key": "commencement_date", "label": "开工令日期"},
            {"key": "tenderer_name", "label": "招标方单位名称"},
            {"key": "gc_contacts", "label": "总包商联系人"},
            {"key": "gc_phones", "label": "总包商联系电话"},
            {"key": "contact_emails", "label": "联系邮箱"},
        ],
    },
    {
        "key": "timeline",
        "title": "二、投标关键时间与提交流程",
        "fields": [
            {"key": "doc_pickup_deadline", "label": "领取标书截止时间"},
            {"key": "doc_pickup_place", "label": "领取标书地点"},
            {"key": "bid_deadline", "label": "投标截止时间（截标时间）"},
            {"key": "submit_address", "label": "标书送达地址"},
            {"key": "site_visit", "label": "现场考察是否允许/安排"},
            {"key": "clarification_deadline", "label": "澄清/答疑提问截止时间"},
            {"key": "clarification_submit_form", "label": "澄清/答疑提交形式"},
            {"key": "clarification_reply_date", "label": "招标方答复发出时间"},
            {"key": "clarification_reply_form", "label": "答复发出形式"},
        ],
    },
    {
        "key": "compliance",
        "title": "三、文件组成与合规性要求",
        "fields": [
            {"key": "oral_statement_constraint", "label": "投标人对口头陈述的约束"},
            {"key": "written_clarification", "label": "书面澄清机制"},
            {"key": "stamp_requirement", "label": "盖章要求（澄清文件）"},
        ],
    },
    {
        "key": "pricing",
        "title": "四、报价与计价规则",
        "fields": [
            {"key": "performance_guarantee", "label": "分包合同签署后履约保障"},
        ],
    },
    {
        "key": "contract",
        "title": "六、合同条款与风险点",
        "fields": [
            {"key": "guarantee_defined", "label": "保函（履约/预付款/质保）已明确内容"},
        ],
    },
    {
        "key": "translation",
        "title": "七、翻译与双语一致性",
        "fields": [
            {"key": "language_identified", "label": "文件语言识别结果"},
        ],
    },
    {
        "key": "confidentiality",
        "title": "八、保密与信息安全",
        "fields": [
            {"key": "confidentiality_scope", "label": "保密范围描述"},
            {"key": "confidentiality_prohibit", "label": "禁止泄露对象"},
        ],
    },
]

LLM_GENERAL_FIELDS: List[Dict[str, str]] = [
    {"key": "project_name", "label": "项目名称"},
    {"key": "employer", "label": "招标人/业主"},
    {"key": "main_contractor", "label": "总包方"},
    {"key": "location", "label": "项目地点"},
    {"key": "project_type", "label": "工程类型"},
    {"key": "scope", "label": "招标范围/专业"},
    {"key": "scale", "label": "规模（床位/面积等）"},
    {"key": "duration", "label": "工期"},
    {"key": "start_date", "label": "计划开工"},
    {"key": "bid_deadline", "label": "投标截止时间"},
    {"key": "submit_place", "label": "递交地点"},
    {"key": "contact", "label": "联系人及方式"},
    {"key": "price_form", "label": "报价形式（固定总价/单价等）"},
    {"key": "currency", "label": "计价币种"},
    {"key": "language", "label": "文件语言要求"},
    {"key": "site_visit", "label": "现场考察"},
    {"key": "qa_deadline", "label": "答疑截止"},
    {"key": "doc_composition", "label": "投标文件组成要点"},
    {"key": "confidentiality", "label": "保密要求"},
    {"key": "other_key_points", "label": "其他关键提示"},
]

MODE_GREEN = "green_template"
MODE_LLM = "llm_general"

MODE_LABELS = {
    MODE_GREEN: "基础模板（绿字段重点提取）",
    MODE_LLM: "通用字段提取",
}


def flatten_green_fields() -> List[Dict[str, str]]:
    out: List[Dict[str, str]] = []
    for sec in GREEN_TEMPLATE_SECTIONS:
        for f in sec["fields"]:
            out.append(
                {
                    "key": f["key"],
                    "label": f["label"],
                    "section": sec["key"],
                    "section_title": sec["title"],
                }
            )
    return out


def fields_for_mode(mode: str) -> List[Dict[str, str]]:
    if mode == MODE_GREEN:
        return flatten_green_fields()
    return [dict(f) for f in LLM_GENERAL_FIELDS]


def normalize_mode(mode: Any) -> str:
    m = str(mode or "").strip()
    if m in (MODE_GREEN, MODE_LLM):
        return m
    return ""
