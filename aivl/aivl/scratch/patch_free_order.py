# -*- coding: utf-8 -*-
from pathlib import Path

p = Path(r"d:\fd\aivl\web\src\App.vue")
text = p.read_text(encoding="utf-8")

replacements = [
    (
        """                            :class="{
                              active: selectedAttCode === item.code,
                              locked: isAttLocked(item),
                              done: ['done', 'not_required', 'skipped'].includes(item.status),
                            }"
                            @click="selectAttachment(item)" """,
        """                            :class="{
                              active: selectedAttCode === item.code,
                              done: ['done', 'not_required', 'skipped'].includes(item.status),
                            }"
                            @click="selectAttachment(item)" """,
    ),
    (
        """                    <!-- ④编制：逐个附件工作台 -->
                    <a-card v-else-if="instStep === 3" size="small" title="④ 逐个附件编制（完成一个才能做下一个）">
                      <a-alert
                        v-if="wbLockReason"
                        type="warning"
                        show-icon
                        style="margin-bottom: 12px"
                        :message="wbLockReason"
                      />
                      <a-alert
                        type="info"
                        show-icon
                        style="margin-bottom: 12px"
                        :message="`当前办理：${selectedAtt?.code || '—'} ${selectedAtt?.title || ''}｜状态 ${selectedAtt?.status_label || ''}`"
                      />
""",
        """                    <!-- ④编制：附件工作台（可任意顺序，须全部完成） -->
                    <a-card v-else-if="instStep === 3" size="small" title="④ 附件编制（可任意顺序，全部完成后进入校验）">
                      <a-alert
                        type="info"
                        show-icon
                        style="margin-bottom: 12px"
                        :message="`当前办理：${selectedAtt?.code || '—'} ${selectedAtt?.title || ''}｜状态 ${selectedAtt?.status_label || ''}｜纳入进度 ${doneIncludedCount}/${includedCount}`"
                      />
""",
    ),
    (
        """                            sub-title="请先按顺序完成当前附件。已开放：附件01授权委托书、附件02投标承诺函。"
""",
        """                            sub-title="可先切换其他附件并行办理；全部纳入附件都完成后才能进入校验。"
""",
    ),
    (
        """                            :disabled="!!wbLockReason || !editableFields.length"
""",
        """                            :disabled="!editableFields.length"
""",
    ),
    (
        """                          <a-button
                            type="primary"
                            :loading="wbSaving"
                            :disabled="!!wbLockReason"
                            @click="completeCurrentAttachment"
                          >
                            完成本附件，解锁下一个
                          </a-button>
""",
        """                          <a-button
                            type="primary"
                            :loading="wbSaving"
                            @click="completeCurrentAttachment"
                          >
                            完成本附件
                          </a-button>
""",
    ),
]

# remove remaining :disabled="!!wbLockReason" lines (and trailing comma variants)
text2 = text
for old, new in replacements:
    if old not in text2:
        print("MISSING block:\n", old[:120].replace("\n", "\\n"))
    else:
        text2 = text2.replace(old, new, 1)
        print("OK replaced one block")

# strip remaining lock disables
import re
text2, n1 = re.subn(r'\n\s*:disabled="!!wbLockReason"', "", text2)
text2, n2 = re.subn(r'\s*:disabled="!!wbLockReason"', "", text2)
print("stripped disabled attrs", n1, n2)

# JS: remove wbLockReason / currentWorkCode / isAttLocked; update helpers
old_js = """const wbLockReason = ref('')
"""
if old_js in text2:
    text2 = text2.replace(old_js, "", 1)
    print("removed wbLockReason ref")

old_computed = """const allIncludedDone = computed(() => {
  const list = instAttachments.value.filter((a) => a.included !== false)
  return list.length > 0 && list.every((a) => ['done', 'not_required', 'skipped'].includes(a.status))
})
const currentWorkCode = computed(() => {
  const list = instAttachments.value.filter((a) => a.included !== false)
  const hit = list.find((a) => !['done', 'not_required', 'skipped'].includes(a.status))
  return hit?.code || null
})
"""
new_computed = """const includedAttachments = computed(() =>
  instAttachments.value.filter((a) => a.included !== false),
)
const includedCount = computed(() => includedAttachments.value.length)
const doneIncludedCount = computed(
  () =>
    includedAttachments.value.filter((a) =>
      ['done', 'not_required', 'skipped'].includes(a.status),
    ).length,
)
const allIncludedDone = computed(
  () => includedCount.value > 0 && doneIncludedCount.value >= includedCount.value,
)
"""
if old_computed in text2:
    text2 = text2.replace(old_computed, new_computed, 1)
    print("replaced computed")
else:
    print("MISSING computed block")

old_select = """function isAttLocked(item) {
  if (!currentWorkCode.value) return false
  if (['done', 'not_required', 'skipped'].includes(item.status)) return false
  return item.code !== currentWorkCode.value
}

function selectAttachment(item) {
  if (isAttLocked(item)) {
    message.warning(`请先完成当前附件 ${currentWorkCode.value}`)
    return
  }
  selectedAttCode.value = item.code
  loadWorkbench(item.code)
}

function syncWorkbenchFromAtt(att) {
  if (!att) return
  const fd = att.form_data || {}
  editableFields.value = (fd.fields || []).map((f) => ({ ...f, value: f.value ?? '' }))
  signReminders.value = fd.sign_reminder || []
  fieldAnalyzeHint.value = fd.llm_error || ''
  wbLockReason.value =
    currentWorkCode.value &&
    att.code !== currentWorkCode.value &&
    !['done', 'not_required', 'skipped'].includes(att.status)
      ? `请先完成 ${currentWorkCode.value}`
      : ''
}
"""
new_select = """function selectAttachment(item) {
  selectedAttCode.value = item.code
  loadWorkbench(item.code)
}

function syncWorkbenchFromAtt(att) {
  if (!att) return
  const fd = att.form_data || {}
  editableFields.value = (fd.fields || []).map((f) => ({ ...f, value: f.value ?? '' }))
  signReminders.value = fd.sign_reminder || []
  fieldAnalyzeHint.value = fd.llm_error || ''
}
"""
if old_select in text2:
    text2 = text2.replace(old_select, new_select, 1)
    print("replaced select/sync")
else:
    print("MISSING select/sync")

old_load = """    wbLockReason.value = data.locked ? data.lock_reason || '请按顺序完成附件' : ''
"""
if old_load in text2:
    text2 = text2.replace(old_load, "", 1)
    print("removed load lock")
else:
    print("MISSING load lock")

old_complete = """    message.success('本附件已完成')
    const next = (data.attachments_progress || []).find(
      (a) => a.included !== false && !['done', 'not_required', 'skipped'].includes(a.status),
    )
    if (next) {
      selectedAttCode.value = next.code
      await loadWorkbench(next.code)
      message.info(`请继续处理 ${next.code} ${next.title}`)
    } else {
      message.success('全部纳入附件已完成，可进入校验')
    }
"""
new_complete = """    message.success('本附件已完成')
    const remain = (data.attachments_progress || []).filter(
      (a) => a.included !== false && !['done', 'not_required', 'skipped'].includes(a.status),
    )
    if (remain.length) {
      message.info(`还可任意办理其余 ${remain.length} 个附件；全部完成后才能进入校验`)
    } else {
      message.success('全部纳入附件已完成，可进入校验')
    }
"""
if old_complete in text2:
    text2 = text2.replace(old_complete, new_complete, 1)
    print("replaced complete")
else:
    print("MISSING complete")

old_sync_forms = """  if (!selectedAttCode.value && st.attachments?.length) {
    selectedAttCode.value = st.attachments[0].code
  }
  // 编制阶段默认定位到当前待办附件
  const work = (st.attachments || []).find(
    (a) => a.included !== false && !['done', 'not_required', 'skipped'].includes(a.status),
  )
  if (work && Number(st.workflow_step || 0) >= 3) {
    selectedAttCode.value = work.code
    syncWorkbenchFromAtt(work)
  }
"""
new_sync_forms = """  if (!selectedAttCode.value && st.attachments?.length) {
    selectedAttCode.value = st.attachments[0].code
  }
"""
if old_sync_forms in text2:
    text2 = text2.replace(old_sync_forms, new_sync_forms, 1)
    print("replaced syncForms")
else:
    print("MISSING syncForms")

# CSS locked optional keep or remove
old_css = """.inst-att-item.locked {
  opacity: 0.55;
  cursor: not-allowed;
}
"""
if old_css in text2:
    text2 = text2.replace(old_css, "", 1)
    print("removed locked css")

# leftover references
for needle in ["wbLockReason", "isAttLocked", "currentWorkCode", "解锁下一个", "完成一个才能"]:
    print("remain", needle, text2.count(needle))

p.write_text(text2, encoding="utf-8", newline="\n")
print("written", len(text2))
