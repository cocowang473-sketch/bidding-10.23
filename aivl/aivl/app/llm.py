"""DashScope LLM —— 对齐 D:\\fd\\wam-ai\\wam-ai\\server\\llm.py 的调用方式。"""
from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional

import urllib.error
import urllib.request

from . import config


def call_dashscope(
    prompt: str,
    system_prompt: str = "You are a data analysis expert, accurately extracting and verifying data.",
    temperature: float = 0.3,
    max_tokens: int = 4000,
) -> str:
    if not config.DASHSCOPE_API_KEY:
        raise RuntimeError("未配置 DASHSCOPE_API_KEY，请在 .env 或 wam-ai/.env 中设置")
    body = {
        "model": config.MODEL_NAME,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        "stream": False,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    req = urllib.request.Request(
        config.DASHSCOPE_API,
        data=json.dumps(body).encode("utf-8"),
        method="POST",
    )
    req.add_header("Content-Type", "application/json; charset=utf-8")
    req.add_header("Authorization", f"Bearer {config.DASHSCOPE_API_KEY}")
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            return result["choices"][0]["message"]["content"]
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"DashScope API error: {e.code} - {error_body[:500]}") from e


def parse_llm_json(text: Any) -> Dict[str, Any]:
    if isinstance(text, dict):
        return text
    if not text or not isinstance(text, str):
        return {}
    s = text.strip()
    try:
        return json.loads(s)
    except Exception:
        pass
    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", s)
    if m:
        try:
            return json.loads(m.group(1).strip())
        except Exception:
            pass
    start, end = s.find("{"), s.rfind("}")
    if start >= 0 and end > start:
        try:
            return json.loads(s[start : end + 1])
        except Exception:
            pass
    # 截断 JSON 抢救：尽量捞出已完整的 row 对象
    salvaged = _salvage_rows_from_truncated_json(s)
    if salvaged:
        return {"rows": salvaged}
    return {"raw_content": s}


def _salvage_rows_from_truncated_json(s: str) -> List[Dict[str, Any]]:
    """模型输出被 max_tokens 截断时，回收已写完的 row 对象。"""
    rows: List[Dict[str, Any]] = []
    if "一级Key" not in s:
        return rows
    marker = '"一级Key"'
    idx = 0
    n = len(s)
    while idx < n:
        mpos = s.find(marker, idx)
        if mpos < 0:
            break
        start = s.rfind("{", 0, mpos)
        if start < 0:
            idx = mpos + len(marker)
            continue
        depth = 0
        end = -1
        in_str = False
        esc = False
        for j in range(start, n):
            ch = s[j]
            if in_str:
                if esc:
                    esc = False
                elif ch == "\\":
                    esc = True
                elif ch == '"':
                    in_str = False
                continue
            if ch == '"':
                in_str = True
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    end = j
                    break
        if end < 0:
            break
        frag = s[start : end + 1]
        idx = end + 1
        try:
            obj = json.loads(frag)
        except Exception:
            continue
        if isinstance(obj, dict) and (obj.get("招标文件关键信息") or obj.get("提取项")):
            rows.append(obj)
    return rows


def call_dashscope_json(
    prompt: str,
    system_prompt: str,
    temperature: float = 0.2,
) -> Dict[str, Any]:
    content = call_dashscope(prompt, system_prompt, temperature=temperature, max_tokens=8000)
    return parse_llm_json(content)
