from pathlib import Path

t = Path("web/src/App.vue").read_text(encoding="utf-8")
checks = [
    "saveFieldsDebounced",
    "savePersonnelDebounced",
    '@blur="saveFields',
    "@blur=\"() => savePlanNow",
    "@change=\"() => savePlanNow",
    "@change=\"() => saveOrg",
    "@change=\"persistConditions",
    "flushCurrentWorkbench",
]
for c in checks:
    print(c, "=>", t.count(c))
