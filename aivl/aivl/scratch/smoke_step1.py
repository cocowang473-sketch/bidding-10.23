import httpx
from pathlib import Path

c = httpx.Client(base_url="http://127.0.0.1:8000", timeout=180)
print("health", c.get("/api/health").json())
proj = c.post("/api/projects", json={"name": "廷杜夫240床-公告STEP1演示", "notes": "demo"}).json()
print("project", proj["id"])
zip_path = Path(r"d:\fd\aivl\scratch\demo_tender.zip")
with zip_path.open("rb") as f:
    up = c.post(
        f"/api/projects/{proj['id']}/upload-zip",
        files={"file": ("demo_tender.zip", f, "application/zip")},
    )
print("upload", up.status_code, up.json().get("file_count"), "notice", up.json().get("notice_file_count"))
an = c.post(f"/api/projects/{proj['id']}/analyze-notice")
print("analyze", an.status_code)
data = an.json()
if an.status_code != 200:
    print(data)
else:
    result = data.get("result") or {}
    fields = [f for f in result.get("fields") or [] if f.get("value")]
    print("filled fields", len(fields))
    for f in fields[:8]:
        print("-", f.get("label"), "=>", str(f.get("value"))[:80])
    print("atomic", len(result.get("atomic_requirements") or []))
    print("source", result.get("source"))
print("smoke done")
