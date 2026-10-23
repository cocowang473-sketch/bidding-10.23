# -*- coding: utf-8 -*-
import json
from pathlib import Path

root = Path(r"C:\Users\cgwang5\.cursor\projects\d-fd-aivl\agent-transcripts")
files = list(root.rglob("*.jsonl"))
print("transcripts", len(files))

ops = []
writes = []
for fp in files:
    for line in fp.read_text(encoding="utf-8", errors="replace").splitlines():
        try:
            obj = json.loads(line)
        except Exception:
            continue
        msg = obj.get("message") or obj
        content = msg.get("content") if isinstance(msg, dict) else None
        if not isinstance(content, list):
            continue
        for part in content:
            if not isinstance(part, dict):
                continue
            if part.get("type") != "tool_use":
                continue
            name = part.get("name")
            inp = part.get("input") or {}
            path = str(inp.get("path") or "")
            if "App.vue" not in path.replace("\\", "/"):
                continue
            if name == "Write":
                writes.append((fp.name, len(inp.get("contents") or "")))
                ops.append(("write", None, inp.get("contents"), str(fp)))
            elif name == "StrReplace":
                ops.append(("str", inp.get("old_string"), inp.get("new_string"), str(fp)))

print("App.vue ops", len(ops), "writes", writes)
for kind, a, b, src in ops[-20:]:
    preview = (b or a or "")[:80].replace("\n", " ")
    print(kind, Path(src).name, preview)

# Try rebuild from history base + all str replaces in order within each file chronologically
# Prefer starting from largest write if any
base = None
if writes:
    # find write content from ops
    for kind, a, b, src in ops:
        if kind == "write" and b and (base is None or len(b) > len(base)):
            base = b
    print("base from write", len(base) if base else None)

hist = Path(r"C:\Users\cgwang5\AppData\Roaming\Cursor\User\History\-765dd673\iZn6.vue")
if base is None and hist.exists():
    base = hist.read_text(encoding="utf-8")
    print("base from history", len(base))

if base is None:
    raise SystemExit("no base")

text = base
applied = 0
failed = 0
for kind, old, new, src in ops:
    if kind != "str":
        if kind == "write" and new:
            text = new
            applied += 1
        continue
    if old is None or new is None:
        failed += 1
        continue
    if old in text:
        text = text.replace(old, new, 1)
        applied += 1
    else:
        failed += 1

out = Path(r"d:\fd\aivl\scratch\App.vue.rebuilt")
out.write_text(text, encoding="utf-8")
print("applied", applied, "failed", failed, "out_len", len(text), "->", out)
# sanity
for needle in ["完成本附件，解锁下一个", "投标须知", "授权委托书", "wbLockReason", "bid_commitment"]:
    print(needle, needle in text)
