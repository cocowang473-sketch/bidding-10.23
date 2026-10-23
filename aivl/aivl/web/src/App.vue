<template>
  <a-config-provider :locale="zhCN">
    <div v-if="authChecking" class="auth-loading">
      <a-spin size="large" tip="正在验证登录…" />
    </div>
    <Login v-else-if="!authed" @success="onLoginSuccess" />
    <a-layout v-else class="layout">
      <a-layout-header class="header">
        <div class="brand">
          <span class="title">AI 投标报价系统</span>
          <a-tag color="blue">分阶段处理</a-tag>
        </div>
        <div class="header-right">
          <span class="user-name">{{ currentUser?.display_name || currentUser?.username }}</span>
          <a-button @click="doLogout">退出</a-button>
          <a-button type="primary" @click="openCreate">新建项目</a-button>
        </div>
      </a-layout-header>

      <a-layout>
        <a-layout-sider width="260" theme="light" class="sider">
          <div class="sider-title">项目列表</div>
          <a-spin :spinning="loadingList">
            <a-menu
              v-if="projects.length"
              mode="inline"
              :selectedKeys="mainView === 'project' && selectedId ? [String(selectedId)] : []"
              @click="onSelectProject"
            >
              <a-menu-item v-for="p in projects" :key="String(p.id)">
                <div class="menu-item">
                  <div class="name">{{ p.name }}</div>
                  <a-tag>{{ stageShort(p.status) }}</a-tag>
                </div>
              </a-menu-item>
            </a-menu>
            <a-empty v-else description="暂无项目" />
          </a-spin>

          <template v-if="isAdmin">
            <div class="sider-title sider-admin">管理</div>
            <a-menu
              mode="inline"
              :selectedKeys="mainView === 'admin-quota' ? ['admin-quota'] : []"
              @click="onSelectAdmin"
            >
              <a-menu-item key="admin-quota">材料单价基础库</a-menu-item>
            </a-menu>
          </template>
        </a-layout-sider>

        <a-layout-content class="content">
          <AdminQuotaPage v-if="mainView === 'admin-quota' && isAdmin" />

          <a-card v-else-if="!selectedId">
            <a-empty description="请选择或新建项目，按阶段完成：上传 → 公告 → 须知 → 报价 …">
              <a-button type="primary" @click="openCreate">新建项目</a-button>
            </a-empty>
          </a-card>

          <template v-else>
            <a-card size="small" class="project-bar">
              <div class="project-bar-inner">
                <div>
                  <div class="project-name">{{ detail?.project?.name }}</div>
                  <div class="project-meta">
                    <span>{{ detail?.project?.zip_name || '未上传 ZIP' }}</span>
                    <a-divider type="vertical" />
                    <a
                      v-if="hasZip"
                      class="meta-link"
                      @click.prevent="goStep(0)"
                    >{{ detail?.documents?.length || 0 }} 个文件 · 查看目录</a>
                    <span v-else>0 个文件</span>
                  </div>
                </div>
                <a-space>
                  <a-button danger @click="removeProject">删除项目</a-button>
                </a-space>
              </div>
            </a-card>

            <a-card class="steps-card">
              <a-steps
                :current="currentStep"
                type="navigation"
                size="small"
                :items="stepItems"
                @change="onStepChange"
              />
            </a-card>

            <!-- 阶段 0：上传 -->
            <a-card v-if="currentStep === 0" title="阶段一 · 上传招标文件包">
              <a-alert
                type="info"
                show-icon
                style="margin-bottom: 16px"
                message="上传完整 ZIP 后可在下方预览包内目录，确认结构无误再进入公告分析。"
              />
              <a-upload-dragger
                v-if="!hasZip"
                :before-upload="beforeUpload"
                :show-upload-list="false"
                accept=".zip"
                :disabled="uploading"
              >
                <p class="ant-upload-drag-icon">📦</p>
                <p class="ant-upload-text">点击或拖拽上传招标文件 ZIP</p>
                <p class="ant-upload-hint">
                  典型结构含：第一部分招标公告、第二部分投标须知、第三部分投标报价…
                </p>
              </a-upload-dragger>
              <a-progress
                v-if="uploadPercent > 0 && uploadPercent < 100"
                :percent="uploadPercent"
                style="margin-top: 12px"
              />
              <template v-if="hasZip">
                <a-result
                  status="success"
                  title="ZIP 已入库"
                  :sub-title="`${detail?.project?.zip_name}（${detail?.documents?.length || 0} 个文件）`"
                >
                  <template #extra>
                    <a-space>
                      <a-upload :before-upload="beforeUpload" :show-upload-list="false" accept=".zip">
                        <a-button :loading="uploading">重新上传</a-button>
                      </a-upload>
                      <a-button type="primary" @click="goStep(1)">进入「招标公告」分析</a-button>
                    </a-space>
                  </template>
                </a-result>

                <a-divider orientation="left">包内文件目录</a-divider>
                <div class="zip-tree-meta muted">
                  共 {{ detail?.documents?.length || 0 }} 个文件
                  <template v-if="detail?.notice_doc?.rel_path">
                    · 已定位公告：{{ detail.notice_doc.rel_path }}
                  </template>
                </div>
                <div class="zip-tree-wrap">
                  <a-tree
                    v-if="zipTreeData.length"
                    :key="detail?.project?.id || 0"
                    show-line
                    :tree-data="zipTreeData"
                    :default-expanded-keys="zipTreeExpandKeys"
                    :selectable="false"
                  >
                    <template #title="node">
                      <span class="zip-tree-node">
                        <a-tag v-if="node.isNotice" color="success">公告</a-tag>
                        <a-tag v-else-if="node.inNoticeSection" color="blue">公告区</a-tag>
                        <a-tag v-else-if="node.isAttachment" color="orange">附件</a-tag>
                        <span class="zip-tree-name">{{ node.title }}</span>
                        <span v-if="node.isLeaf && node.size" class="zip-tree-size">
                          {{ formatBytes(node.size) }}
                        </span>
                      </span>
                    </template>
                  </a-tree>
                  <a-empty v-else description="暂无目录数据，请重新上传 ZIP" />
                </div>
              </template>
            </a-card>

            <!-- 阶段 1：招标公告 -->
            <a-card v-else-if="currentStep === 1" title="阶段二 · 招标公告分析">
              <template #extra>
                <a-space>
                  <a-button @click="goStep(0)">上一步</a-button>
                  <a-button
                    type="primary"
                    :disabled="!hasZip"
                    :loading="analyzing"
                    @click="openFocusAnalyze('notice')"
                  >
                    {{ noticeDone ? '重新分析公告' : '开始分析招标公告' }}
                  </a-button>
                  <a-button
                    type="primary"
                    ghost
                    :disabled="!noticeDone && !hasZip"
                    :loading="noticeDetailLoading"
                    @click="openNoticeDetail"
                  >
                    公告详情数据
                  </a-button>
                  <a-button type="primary" ghost :disabled="!noticeDone" @click="goStep(2)">
                    进入下一阶段
                  </a-button>
                </a-space>
              </template>

              <a-alert
                v-if="!hasZip"
                type="warning"
                show-icon
                message="请先完成「上传招标文件包」"
                style="margin-bottom: 16px"
              />

              <template v-else>
                <a-descriptions bordered size="small" :column="2" style="margin-bottom: 16px">
                  <a-descriptions-item label="定位公告">
                    {{ detail?.notice_doc?.rel_path || '上传后自动定位 1.1 招标通告' }}
                  </a-descriptions-item>
                  <a-descriptions-item label="本阶段状态">
                    <a-tag :color="noticeDone ? 'success' : analysis?.status === 'failed' ? 'error' : 'processing'">
                      {{ noticeDone ? '已完成' : analysis?.status === 'failed' ? '失败' : '待分析' }}
                    </a-tag>
                  </a-descriptions-item>
                </a-descriptions>

                <template v-if="analysis?.status === 'done'">
                  <a-alert type="info" show-icon style="margin-bottom: 12px" :message="sourceSummary" />
                  <a-alert
                    v-if="noticeTemplateDisplay"
                    type="success"
                    show-icon
                    style="margin-bottom: 12px"
                    :message="`分析模板：${noticeTemplateDisplay}`"
                  />
                  <a-alert
                    v-if="analysis?.result?.focus_keywords"
                    type="warning"
                    show-icon
                    style="margin-bottom: 12px"
                    :message="`本轮关注关键词：${analysis.result.focus_keywords}`"
                  />
                  <template v-if="noticeFieldSections.length">
                    <div v-for="sec in noticeFieldSections" :key="sec.title" style="margin-bottom: 12px">
                      <a-divider orientation="left">{{ sec.title }}</a-divider>
                      <a-table
                        size="small"
                        :pagination="false"
                        :columns="fieldColumns"
                        :data-source="sec.rows"
                        row-key="key"
                        :scroll="{ x: true }"
                      />
                    </div>
                  </template>
                  <a-table
                    v-else
                    size="small"
                    :pagination="false"
                    :columns="fieldColumns"
                    :data-source="fields"
                    row-key="key"
                    :scroll="{ x: true }"
                  />
                  <template v-if="(analysis?.result?.focus_hits || []).length">
                    <a-divider orientation="left">关注关键词检索结果</a-divider>
                    <a-table
                      size="small"
                      :pagination="false"
                      row-key="keyword"
                      :columns="focusHitColumns"
                      :data-source="analysis.result.focus_hits"
                    />
                  </template>
                  <a-divider orientation="left">原子要求</a-divider>
                  <a-list size="small" bordered :data-source="atomic">
                    <template #renderItem="{ item }">
                      <a-list-item>
                        <a-list-item-meta
                          :title="item.text"
                          :description="`参数: ${item.param || '—'}｜证据: ${item.evidence || '—'}`"
                        />
                      </a-list-item>
                    </template>
                  </a-list>
                  <a-divider orientation="left">待确认问题</a-divider>
                  <a-list size="small" bordered :data-source="questions">
                    <template #renderItem="{ item }">
                      <a-list-item>{{ item }}</a-list-item>
                    </template>
                  </a-list>
                </template>
                <a-alert
                  v-else-if="analysis?.status === 'failed'"
                  type="error"
                  show-icon
                  :message="analysis.error || '分析失败'"
                />
                <a-empty v-else description="点击右上角「开始分析招标公告」，本阶段仅处理第一部分公告" />
              </template>
            </a-card>

            <!-- 阶段 2：投标须知 -->
            <a-card v-else-if="currentStep === 2" title="阶段三 · 投标须知（附件动态清单）">
              <template #extra>
                <a-space>
                  <a-button @click="goStep(1)">上一步</a-button>
                  <a-button :loading="instLoading" @click="loadInstructions(true)">重新扫描附件</a-button>
                  <a-button type="primary" ghost :disabled="!instCompleted" @click="goStep(3)">
                    进入下一阶段
                  </a-button>
                </a-space>
              </template>

              <a-alert
                v-if="!noticeDone"
                type="warning"
                show-icon
                message="请先完成「招标公告」分析，以便预填项目/招标方等基础数据"
                style="margin-bottom: 16px"
              />

              <a-spin :spinning="instLoading">
                <a-steps
                  size="small"
                  :current="instStep"
                  style="margin-bottom: 16px"
                  :items="(instState?.workflow_steps || []).map((s) => ({ title: s.title, description: s.desc }))"
                  @change="onInstStepChange"
                />

                <a-row :gutter="16">
                  <a-col :span="9">
                    <a-card size="small" title="附件清单（动态识别）">
                      <template #extra>
                        <a-tag>{{ instAttachments.length }} 项</a-tag>
                      </template>
                      <div v-if="instState?.instruction_doc" class="inst-doc">
                        须知正文：{{ instState.instruction_doc.filename }}
                      </div>
                      <a-alert
                        v-if="instBrief?.summary"
                        type="success"
                        show-icon
                        style="margin-bottom: 8px"
                        :message="instBrief.summary"
                      />
                      <a-list size="small" :data-source="instAttachments" bordered>
                        <template #renderItem="{ item }">
                          <a-list-item
                            class="inst-att-item"
                            :class="{
                              active: selectedAttCode === item.code,
                              done: ['done', 'not_required', 'skipped'].includes(item.status),
                            }"
                            @click="selectAttachment(item)"
                          >
                            <a-list-item-meta>
                              <template #title>
                                <a-space>
                                  <a-checkbox
                                    :checked="item.included !== false"
                                    @click.stop
                                    @change="(e) => toggleAttIncluded(item, e.target.checked)"
                                  />
                                  <span>{{ item.code }} {{ item.title }}</span>
                                </a-space>
                              </template>
                              <template #description>
                                <div>{{ item.filename }}</div>
                                <a-tag :color="statusColor(item.status)" style="margin-top: 4px">
                                  {{ item.status_label || item.status }}
                                </a-tag>
                                <a-tag style="margin-top: 4px">{{ item.category_label }}</a-tag>
                              </template>
                            </a-list-item-meta>
                          </a-list-item>
                        </template>
                      </a-list>
                      <a-divider style="margin: 12px 0" />
                      <div class="muted">联动关系</div>
                      <ul class="link-list">
                        <li v-for="(l, i) in instState?.links || []" :key="i">{{ l.label }}</li>
                      </ul>
                    </a-card>
                  </a-col>

                  <a-col :span="15">
                    <!-- ①识别 -->
                    <a-card v-if="instStep === 0" size="small" title="① 识别清单 / 分析投标须知正文">
                      <a-alert
                        type="info"
                        show-icon
                        style="margin-bottom: 12px"
                        message="先分析《2.1 投标须知》，再核对附件清单。附件数量与文件名因招标包而异。"
                      />
                      <a-descriptions bordered size="small" :column="1" style="margin-bottom: 12px">
                        <a-descriptions-item label="须知正文">
                          {{ instState?.instruction_doc?.rel_path || '未定位到 2.1 投标须知' }}
                        </a-descriptions-item>
                        <a-descriptions-item label="已识别附件">
                          {{ instAttachments.length }} 个
                        </a-descriptions-item>
                      </a-descriptions>

                      <a-space style="margin-bottom: 12px">
                        <a-button
                          type="primary"
                          :loading="instBodyAnalyzing"
                          :disabled="!instState?.instruction_doc"
                          @click="openFocusAnalyze('instructions')"
                        >
                          {{ instBrief ? '重新分析投标须知' : '分析投标须知' }}
                        </a-button>
                      </a-space>

                      <template v-if="instBrief">
                        <a-alert
                          type="success"
                          show-icon
                          style="margin-bottom: 12px"
                          :message="instBrief.summary || '已完成须知正文分析'"
                          :description="instBriefSource"
                        />
                        <a-alert
                          v-if="instBrief.focus_keywords"
                          type="warning"
                          show-icon
                          style="margin-bottom: 12px"
                          :message="`本轮关注关键词：${instBrief.focus_keywords}`"
                        />
                        <a-divider orientation="left">关键字段</a-divider>
                        <a-table
                          size="small"
                          :pagination="false"
                          row-key="key"
                          :columns="instBriefFieldColumns"
                          :data-source="instBrief.key_fields || []"
                          :scroll="{ x: true }"
                        />
                        <template v-if="(instBrief.focus_hits || []).length">
                          <a-divider orientation="left">关注关键词检索结果</a-divider>
                          <a-table
                            size="small"
                            :pagination="false"
                            row-key="keyword"
                            :columns="focusHitColumns"
                            :data-source="instBrief.focus_hits"
                          />
                        </template>
                        <a-divider orientation="left">分节要点</a-divider>
                        <a-collapse>
                          <a-collapse-panel
                            v-for="(sec, i) in instBrief.sections || []"
                            :key="i"
                            :header="sec.title"
                          >
                            <ul class="brief-points">
                              <li v-for="(p, j) in sec.points || []" :key="j">{{ p }}</li>
                            </ul>
                          </a-collapse-panel>
                        </a-collapse>
                        <a-row :gutter="12" style="margin-top: 12px">
                          <a-col :span="12">
                            <a-card size="small" title="硬性规则">
                              <ul class="brief-points">
                                <li v-for="(r, i) in instBrief.mandatory_rules || []" :key="i">{{ r }}</li>
                              </ul>
                              <a-empty v-if="!(instBrief.mandatory_rules || []).length" description="无" />
                            </a-card>
                          </a-col>
                          <a-col :span="12">
                            <a-card size="small" title="附件/提交提示">
                              <ul class="brief-points">
                                <li v-for="(r, i) in instBrief.attachment_hints || []" :key="i">{{ r }}</li>
                              </ul>
                              <a-empty v-if="!(instBrief.attachment_hints || []).length" description="无" />
                            </a-card>
                          </a-col>
                        </a-row>
                        <a-card
                          v-if="(instBrief.risks_open_questions || []).length"
                          size="small"
                          title="风险 / 待确认"
                          style="margin-top: 12px"
                        >
                          <ul class="brief-points">
                            <li v-for="(r, i) in instBrief.risks_open_questions || []" :key="i">{{ r }}</li>
                          </ul>
                        </a-card>
                      </template>
                      <a-empty v-else description="点击上方按钮，分析《投标须知》重要内容" />

                      <a-space style="margin-top: 16px">
                        <a-button type="primary" :disabled="!instBrief" @click="saveInstStep(1)">
                          {{ instBrief ? '确认并进入基础数据' : '请先分析投标须知' }}
                        </a-button>
                      </a-space>
                    </a-card>

                    <!-- ②基础数据 -->
                    <a-card v-else-if="instStep === 1" size="small" title="② 统一基础数据">
                      <a-space style="margin-bottom: 12px" wrap>
                        <a-upload
                          :show-upload-list="false"
                          :before-upload="beforeBaseDataImport"
                          accept=".doc,.docx,.pdf,.txt,.md,.csv,.xlsx,.xlsm"
                        >
                          <a-button type="primary" :loading="baseDataImporting">导入文件并分析回填</a-button>
                        </a-upload>
                        <span class="muted">支持 Word/PDF/Excel/TXT，分析后写入下方基础数据字段</span>
                      </a-space>
                      <a-alert
                        v-if="baseDataImportHint"
                        type="warning"
                        show-icon
                        style="margin-bottom: 12px"
                        :message="baseDataImportHint"
                      />

                      <a-form layout="vertical">
                        <a-row :gutter="12">
                          <a-col :span="12">
                            <a-form-item label="项目名称">
                              <a-input v-model:value="baseForm.project_name" />
                            </a-form-item>
                          </a-col>
                          <a-col :span="12">
                            <a-form-item label="招标方">
                              <a-input v-model:value="baseForm.employer" />
                            </a-form-item>
                          </a-col>
                          <a-col :span="12">
                            <a-form-item label="投标人名称" required>
                              <a-input v-model:value="baseForm.bidder_name" placeholder="必填" />
                            </a-form-item>
                          </a-col>
                          <a-col :span="12">
                            <a-form-item label="法定代表人">
                              <a-input v-model:value="baseForm.legal_representative" />
                            </a-form-item>
                          </a-col>
                          <a-col :span="12">
                            <a-form-item label="授权代理人">
                              <a-input v-model:value="baseForm.agent_name" />
                            </a-form-item>
                          </a-col>
                          <a-col :span="12">
                            <a-form-item label="截标时间">
                              <a-input v-model:value="baseForm.bid_deadline" />
                            </a-form-item>
                          </a-col>
                          <a-col :span="12">
                            <a-form-item label="币种">
                              <a-input v-model:value="baseForm.currency" />
                            </a-form-item>
                          </a-col>
                          <a-col :span="12">
                            <a-form-item label="锁定报价总额（驱动附件02）">
                              <a-input
                                v-model:value="baseForm.locked_quote"
                                placeholder="报价锁定后填入，勿手工重复造数"
                              />
                            </a-form-item>
                          </a-col>
                        </a-row>
                      </a-form>
                      <a-space>
                        <a-button @click="saveInstStep(0)">上一步</a-button>
                        <a-button type="primary" @click="persistBaseData().then(() => saveInstStep(2))">
                          保存并进入分级编制
                        </a-button>
                      </a-space>
                    </a-card>

                    <!-- ④编制：附件工作台（可任意顺序，须全部完成） -->
                    <a-card v-else-if="instStep === 2" size="small" title="③ 附件编制（可任意顺序，全部完成后进入校验）">
                      <a-alert
                        type="info"
                        show-icon
                        style="margin-bottom: 12px"
                        :message="`当前办理：${selectedAtt?.code || '—'} ${selectedAtt?.title || ''}｜状态 ${selectedAtt?.status_label || ''}｜纳入进度 ${doneIncludedCount}/${includedCount}。字段可先改，点「完成本附件」或切换其他附件时再统一保存。`"
                      />

                      <template v-if="selectedAtt">
                        <a-descriptions bordered size="small" :column="2" style="margin-bottom: 12px">
                          <a-descriptions-item label="模板文件" :span="2">
                            {{ selectedAtt.rel_path }}
                          </a-descriptions-item>
                          <a-descriptions-item label="类型">
                            {{ selectedAtt.category_label }}
                          </a-descriptions-item>
                          <a-descriptions-item label="依赖">
                            {{ (selectedAtt.depends_on || []).join('、') || '无' }}
                          </a-descriptions-item>
                        </a-descriptions>

                        <a-space
                          v-if="canImportFillAttachment(selectedAtt)"
                          style="margin-bottom: 12px"
                          wrap
                        >
                          <a-upload
                            :show-upload-list="false"
                            :before-upload="beforeAttachmentImport"
                            accept=".doc,.docx,.pdf,.txt,.md,.csv,.xlsx,.xlsm"
                          >
                            <a-button type="primary" :loading="attImporting">导入文件并分析回填字段</a-button>
                          </a-upload>
                          <span class="muted">除组织图(A03)、人员表(A04)外，均可导入资料分析后回填本附件字段</span>
                        </a-space>
                        <a-alert
                          v-if="attImportHint"
                          type="warning"
                          show-icon
                          style="margin-bottom: 12px"
                          :message="attImportHint"
                        />

                        <!-- 附件01：授权委托书 -->
                        <template v-if="selectedAtt.kind === 'power_of_attorney'">
                          <a-divider orientation="left">条件：是否已办理授权备案</a-divider>
                          <a-radio-group
                            v-model:value="condForm.auth_filing"
                            style="margin-bottom: 12px"
                          >
                            <a-radio value="filed">已备案 → 无需提交（保留证明说明）</a-radio>
                            <a-radio value="not_filed">未备案 → 预填模板并导出 Word</a-radio>
                            <a-radio value="unknown">无法确认 → 不得省略</a-radio>
                          </a-radio-group>
                          <a-input
                            v-if="condForm.auth_filing === 'filed'"
                            v-model:value="condForm.auth_proof_note"
                            placeholder="备案证明备注"
                            style="margin-bottom: 12px"
                          />

                          <template v-if="condForm.auth_filing === 'not_filed'">
                            <a-divider orientation="left">主数据（企业 / 法人 / 代理人）</a-divider>
                            <a-row :gutter="8" style="margin-bottom: 8px">
                              <a-col :span="8">
                                <a-input v-model:value="masterForm.enterprise.bidder_name" placeholder="投标人名称" addon-before="企业" />
                              </a-col>
                              <a-col :span="8">
                                <a-input v-model:value="masterForm.legal_rep.legal_rep_name" placeholder="法定代表人" addon-before="法人" />
                              </a-col>
                              <a-col :span="8">
                                <a-input v-model:value="masterForm.agent.agent_name" placeholder="代理人姓名" addon-before="代理人" />
                              </a-col>
                              <a-col :span="8" style="margin-top: 8px">
                                <a-input v-model:value="masterForm.agent.agent_id_no" placeholder="代理人身份证号" />
                              </a-col>
                              <a-col :span="8" style="margin-top: 8px">
                                <a-input v-model:value="masterForm.project.employer_name" placeholder="招标人" />
                              </a-col>
                              <a-col :span="8" style="margin-top: 8px">
                                <a-input v-model:value="masterForm.project.project_name" placeholder="项目名称" />
                              </a-col>
                            </a-row>
                            <a-space style="margin-bottom: 12px">
                              <a-button size="small" :loading="wbSaving" @click="saveMasterAndPrefill">保存主数据并预填表格</a-button>
                              <a-button
                                type="primary"
                                size="small"
                                :loading="wbAnalyzing"
                                @click="analyzeCurrentFields"
                              >
                                分析需填字段
                              </a-button>
                            </a-space>
                            <a-alert
                              v-if="fieldAnalyzeHint"
                              type="warning"
                              show-icon
                              style="margin-bottom: 8px"
                              :message="fieldAnalyzeHint"
                            />
                            <a-table
                              size="small"
                              :pagination="false"
                              row-key="key"
                              :columns="fieldColumnsPoa"
                              :data-source="editableFields"
                              :scroll="{ x: true }"
                            >
                              <template #bodyCell="{ column, record }">
                                <template v-if="column.dataIndex === 'required'">
                                  <a-tag :color="record.required ? 'red' : 'default'">
                                    {{ record.required ? '必填' : '选填' }}
                                  </a-tag>
                                </template>
                                <template v-else-if="column.dataIndex === 'source'">
                                  {{ sourceLabel(record.source) }}
                                </template>
                                <template v-else-if="column.dataIndex === 'value'">
                                  <a-input
                                    v-model:value="record.value"
                                    :placeholder="record.hint || '请填写'"
                                  />
                                </template>
                              </template>
                            </a-table>
                            <a-collapse style="margin-top: 12px" ghost>
                              <a-collapse-panel key="sign" header="签章 / 核对提醒">
                                <ul>
                                  <li v-for="(t, i) in signReminders" :key="i">{{ t }}</li>
                                </ul>
                              </a-collapse-panel>
                            </a-collapse>
                          </template>
                        </template>

                        <!-- 附件02：投标承诺函 -->
                        <template v-else-if="selectedAtt.kind === 'bid_commitment'">
                          <a-alert
                            type="info"
                            show-icon
                            style="margin-bottom: 12px"
                            message="基于原《投标承诺函》模板回填，不另写正文。自动带入项目/公司/签署人/报价；须校验大小写金额，并确认现场考察事实。"
                          />
                          <a-form-item label="现场考察确认（生成/完成前必选）">
                            <a-radio-group v-model:value="condForm.site_visit_confirm">
                              <a-radio value="done">已完成现场考察</a-radio>
                              <a-radio value="desk_assessed">未考察，已通过资料完成风险评估</a-radio>
                              <a-radio value="need_clarify">需修改/澄清承诺表述</a-radio>
                            </a-radio-group>
                          </a-form-item>
                          <a-row :gutter="8" style="margin-bottom: 8px">
                            <a-col :span="8">
                              <a-input v-model:value="masterForm.enterprise.bidder_name" placeholder="公司名称" addon-before="企业" />
                            </a-col>
                            <a-col :span="8">
                              <a-input v-model:value="masterForm.legal_rep.legal_rep_name" placeholder="签署人" addon-before="签署人" />
                            </a-col>
                            <a-col :span="8">
                              <a-input v-model:value="baseForm.locked_quote" placeholder="锁定报价总额" addon-before="报价" />
                            </a-col>
                            <a-col :span="12" style="margin-top: 8px">
                              <a-input v-model:value="masterForm.project.project_name" placeholder="项目名称" />
                            </a-col>
                            <a-col :span="12" style="margin-top: 8px">
                              <a-input v-model:value="masterForm.project.employer_name" placeholder="招标人" />
                            </a-col>
                          </a-row>
                          <a-space style="margin-bottom: 12px">
                            <a-button size="small" :loading="wbSaving" @click="saveMasterQuoteAndPrefill">保存并预填</a-button>
                            <a-button
                              type="primary"
                              size="small"
                              :loading="wbAnalyzing"
                              @click="analyzeCurrentFields"
                            >
                              分析需填字段
                            </a-button>
                          </a-space>
                          <a-alert
                            v-if="fieldAnalyzeHint"
                            type="warning"
                            show-icon
                            style="margin-bottom: 8px"
                            :message="fieldAnalyzeHint"
                          />
                          <a-table
                            size="small"
                            :pagination="false"
                            row-key="key"
                            :columns="fieldColumnsPoa"
                            :data-source="editableFields"
                            :scroll="{ x: true }"
                          >
                            <template #bodyCell="{ column, record }">
                              <template v-if="column.dataIndex === 'required'">
                                <a-tag :color="record.required ? 'red' : 'default'">
                                  {{ record.required ? '必填' : '选填' }}
                                </a-tag>
                              </template>
                              <template v-else-if="column.dataIndex === 'source'">
                                {{ sourceLabel(record.source) }}
                              </template>
                              <template v-else-if="column.dataIndex === 'value'">
                                <a-input
                                  v-model:value="record.value"
                                  :placeholder="record.hint || '请填写'"
                                />
                              </template>
                            </template>
                          </a-table>
                          <a-collapse style="margin-top: 12px" ghost>
                            <a-collapse-panel key="tpl" header="原模板正文预览（导出将在此基础上填入）">
                              <pre class="tpl-preview">{{ selectedAtt.form_data?.template_preview || '请先分析字段' }}</pre>
                            </a-collapse-panel>
                            <a-collapse-panel key="sign" header="签章 / 核对提醒">
                              <ul>
                                <li v-for="(t, i) in signReminders" :key="i">{{ t }}</li>
                              </ul>
                            </a-collapse-panel>
                          </a-collapse>
                        </template>

                        <!-- 附件04：管理人员配备计划及履历 -->
                        <template v-else-if="selectedAtt.kind === 'personnel_plan'">
                          <a-alert
                            type="info"
                            show-icon
                            style="margin-bottom: 12px"
                            message="支持导入个人简介或人员表格（Word/PDF/Excel/TXT），自动识别后回填；也可手工新增、编辑、删除行。完成前请核实医院/阿尔及利亚/属地分包/境外采购经验，并确认关键人员可参加面试。"
                          />
                          <a-space style="margin-bottom: 12px" wrap>
                            <a-upload
                              :show-upload-list="false"
                              :before-upload="beforePersonnelImport"
                              accept=".doc,.docx,.pdf,.txt,.md,.csv,.xlsx,.xlsm"
                            >
                              <a-button type="primary" :loading="personnelImporting">导入资料并识别</a-button>
                            </a-upload>
                            <a-select
                              v-model:value="personnelImportMode"
                              style="width: 140px"
                              :options="[
                                { value: 'merge', label: '合并回填' },
                                { value: 'append', label: '追加行' },
                                { value: 'replace', label: '整表替换' },
                              ]"
                            />
                            <a-button @click="addPersonnelRow">新增一行</a-button>
                            <a-button :loading="wbSaving" @click="() => savePersonnelNow(false)">保存表格</a-button>
                          </a-space>
                          <a-alert
                            v-if="personnelImportHint"
                            type="warning"
                            show-icon
                            style="margin-bottom: 8px"
                            :message="personnelImportHint"
                          />
                          <a-table
                            size="small"
                            :pagination="false"
                            row-key="id"
                            :columns="personnelColumns"
                            :data-source="personnelRows"
                            :scroll="{ x: 1400 }"
                          >
                            <template #bodyCell="{ column, record, index }">
                              <template v-if="column.key === 'seq'">{{ index + 1 }}</template>
                              <template v-else-if="column.key === 'action'">
                                <a-popconfirm title="确认删除该行？" @confirm="removePersonnelRow(record.id)">
                                  <a-button type="link" danger size="small">删除</a-button>
                                </a-popconfirm>
                              </template>
                              <template v-else>
                                <a-input
                                  v-model:value="record[column.key]"
                                  :placeholder="column.title"
                                />
                              </template>
                            </template>
                          </a-table>
                        </template>

                        <!-- 附件03：组织机构图（由附件04人员生成） -->
                        <template v-else-if="selectedAtt.kind === 'org_chart'">
                          <a-alert
                            type="info"
                            show-icon
                            style="margin-bottom: 12px"
                            :message="`根据附件04人员自动生成组织架构。来源：${orgChartSource.personnel_code || 'A04'}（${orgChartSource.people_count || 0} 人已填姓名）${orgChartSource.personnel_status_label ? '｜' + orgChartSource.personnel_status_label : ''}`"
                          />
                          <a-space style="margin-bottom: 12px" wrap>
                            <a-button type="primary" :loading="orgChartGenerating" @click="generateOrgChartNow">
                              从附件04生成组织图
                            </a-button>
                            <a-button :loading="wbSaving" @click="() => saveOrgChartNow(false)">保存调整</a-button>
                          </a-space>
                          <div class="org-chart-preview" v-html="orgChartSvg"></div>
                          <a-divider orientation="left">节点与汇报关系（可改上级）</a-divider>
                          <a-table
                            size="small"
                            :pagination="false"
                            row-key="id"
                            :columns="orgNodeColumns"
                            :data-source="orgChartNodes"
                            :scroll="{ x: 900 }"
                          >
                            <template #bodyCell="{ column, record }">
                              <template v-if="column.key === 'name' || column.key === 'position' || column.key === 'deployable'">
                                <a-input v-model:value="record[column.key]" />
                              </template>
                              <template v-else-if="column.key === 'parent_id'">
                                <a-select
                                  v-model:value="record.parent_id"
                                  allow-clear
                                  style="width: 100%"
                                  placeholder="无（顶层）"
                                  :options="orgParentOptions(record.id)"
                                />
                              </template>
                              <template v-else-if="column.key === 'level'">
                                {{ record.level }}
                              </template>
                            </template>
                          </a-table>
                          <a-divider orientation="left">确认项（完成前须全部确认）</a-divider>
                          <a-space direction="vertical">
                            <a-checkbox v-model:checked="orgConfirm.hierarchy_ok">
                              已确认层级关系正确
                            </a-checkbox>
                            <a-checkbox v-model:checked="orgConfirm.reporting_ok">
                              已确认汇报关系正确
                            </a-checkbox>
                            <a-checkbox v-model:checked="orgConfirm.position_ok">
                              已确认岗位设置合理
                            </a-checkbox>
                            <a-checkbox v-model:checked="orgConfirm.deployable_ok">
                              已确认人员真实可投入
                            </a-checkbox>
                          </a-space>
                        </template>

                        <!-- 附件05–09：计划/协议类统一工作台 -->
                        <template v-else-if="isRemainingPlanKind(selectedAtt.kind)">
                          <a-alert
                            type="info"
                            show-icon
                            style="margin-bottom: 12px"
                            :message="remainingKindHint(selectedAtt.kind)"
                          />
                          <a-space style="margin-bottom: 12px" wrap>
                            <a-button type="primary" :loading="planGenerating" @click="generatePlanNow">
                              按模板/进度生成草稿
                            </a-button>
                            <a-button :loading="wbSaving" @click="() => savePlanNow(false)">保存</a-button>
                            <a-tag v-if="planScheduleRef.code">
                              进度附件 {{ planScheduleRef.code }}：{{ planScheduleRef.status_label || planScheduleRef.status || '—' }}
                            </a-tag>
                          </a-space>

                          <!-- A05 劳动力 -->
                          <template v-if="selectedAtt.kind === 'labor_plan'">
                            <a-divider orientation="left">劳动力计划表</a-divider>
                            <a-space style="margin-bottom: 8px">
                              <a-button size="small" @click="addPlanPhaseRow">新增行</a-button>
                              <a-input v-model:value="planForm.peak_headcount" style="width: 160px" addon-before="峰值" />
                            </a-space>
                            <a-table
                              size="small"
                              :pagination="false"
                              row-key="id"
                              :data-source="planForm.phases || []"
                              :columns="laborPhaseColumns"
                              :scroll="{ x: 900 }"
                            >
                              <template #bodyCell="{ column, record, index }">
                                <template v-if="column.key === 'seq'">{{ index + 1 }}</template>
                                <template v-else-if="column.key === 'action'">
                                  <a-button type="link" danger size="small" @click="removePlanPhaseRow(record.id)">删除</a-button>
                                </template>
                                <template v-else>
                                  <a-input v-model:value="record[column.key]" />
                                </template>
                              </template>
                            </a-table>
                            <a-divider orientation="left">劳动力曲线</a-divider>
                            <div class="org-chart-preview" v-html="planCurveSvg"></div>
                            <a-divider orientation="left">中国工人安排 / 凭证</a-divider>
                            <a-row :gutter="8">
                              <a-col :span="8">
                                <a-input v-model:value="planForm.chinese_source.hq_dispatch.count" addon-before="总部选派人数" />
                              </a-col>
                              <a-col :span="8">
                                <a-input v-model:value="planForm.chinese_source.from_other_projects.count" addon-before="调派人数" />
                              </a-col>
                              <a-col :span="8">
                                <a-input v-model:value="planForm.chinese_source.trained_certified.count" addon-before="已培训人数" />
                              </a-col>
                            </a-row>
                            <a-textarea
                              v-model:value="planForm.credential_notes"
                              style="margin-top: 8px"
                              :rows="2"
                              placeholder="护照/签证/培训凭证说明"
                             
                            />
                            <a-checkbox v-model:checked="planForm.voucher_attached" style="margin-top: 8px">
                              已附对应凭证说明
                            </a-checkbox>
                          </template>

                          <!-- A06 设备 -->
                          <template v-else-if="selectedAtt.kind === 'equipment_plan'">
                            <a-space style="margin-bottom: 8px">
                              <a-button size="small" @click="addEquipRow">新增设备行</a-button>
                            </a-space>
                            <a-table
                              size="small"
                              :pagination="false"
                              row-key="id"
                              :data-source="planForm.equipment_rows || []"
                              :columns="equipColumns"
                              :scroll="{ x: 1200 }"
                            >
                              <template #bodyCell="{ column, record, index }">
                                <template v-if="column.key === 'seq'">{{ index + 1 }}</template>
                                <template v-else-if="column.key === 'action'">
                                  <a-button type="link" danger size="small" @click="removeEquipRow(record.id)">删除</a-button>
                                </template>
                                <template v-else>
                                  <a-input v-model:value="record[column.key]" />
                                </template>
                              </template>
                            </a-table>
                            <a-divider orientation="left">确认项</a-divider>
                            <a-space direction="vertical">
                              <a-checkbox v-model:checked="planForm.confirm_flags.source_explained">来源情况已说明</a-checkbox>
                              <a-checkbox v-model:checked="planForm.confirm_flags.mobilize_aligned_schedule">进场时间与进度对齐</a-checkbox>
                              <a-checkbox v-model:checked="planForm.confirm_flags.voucher_prepared">凭证已准备</a-checkbox>
                              <a-checkbox v-model:checked="planForm.confirm_flags.ready_confirmed">可立即投入使用</a-checkbox>
                            </a-space>
                            <a-textarea v-model:value="planForm.voucher_note" style="margin-top: 8px" :rows="2" placeholder="凭证备注" />
                          </template>

                          <!-- A07 进度 -->
                          <template v-else-if="selectedAtt.kind === 'schedule'">
                            <a-alert type="warning" show-icon style="margin-bottom: 8px" message="系统仅生成 WBS/里程碑草稿；正式计划须在 P6 或 Project 中由进度工程师调整后确认。" />
                            <a-space style="margin-bottom: 8px">
                              <a-button size="small" @click="addMilestoneRow">新增里程碑</a-button>
                              <a-select
                                v-model:value="planForm.p6.export_status"
                                style="width: 160px"
                                :options="[
                                  { value: 'pending', label: '待导出' },
                                  { value: 'draft_ready', label: '草稿可导出' },
                                  { value: 'exported', label: '已导出' },
                                ]"
                              />
                              <a-select
                                v-model:value="planForm.p6.import_status"
                                style="width: 160px"
                                :options="[
                                  { value: 'none', label: '未回传' },
                                  { value: 'imported', label: '已回传' },
                                ]"
                              />
                              <a-input v-model:value="planForm.p6.file_name" style="width: 200px" placeholder="P6/MSP 文件名" />
                            </a-space>
                            <a-table
                              size="small"
                              :pagination="false"
                              row-key="id"
                              :data-source="planForm.wbs_milestones || []"
                              :columns="milestoneColumns"
                              :scroll="{ x: 1000 }"
                            >
                              <template #bodyCell="{ column, record, index }">
                                <template v-if="column.key === 'seq'">{{ index + 1 }}</template>
                                <template v-else-if="column.key === 'action'">
                                  <a-button type="link" danger size="small" @click="removeMilestoneRow(record.id)">删除</a-button>
                                </template>
                                <template v-else>
                                  <a-input v-model:value="record[column.key]" />
                                </template>
                              </template>
                            </a-table>
                            <a-divider orientation="left">覆盖范围与定稿</a-divider>
                            <a-space direction="vertical">
                              <a-checkbox v-model:checked="planForm.scope_covers.detail_design">含深化设计计划</a-checkbox>
                              <a-checkbox v-model:checked="planForm.scope_covers.material_delivery">含材料进场计划</a-checkbox>
                              <a-checkbox v-model:checked="planForm.scope_covers.construction_org">含施工组织计划</a-checkbox>
                              <a-checkbox v-model:checked="planForm.confirmed">进度工程师已调整关键路径/工期并定稿</a-checkbox>
                            </a-space>
                            <a-textarea v-model:value="planForm.engineer_notes" style="margin-top: 8px" :rows="2" placeholder="工程师备注" />
                          </template>

                          <!-- A08 劳务协议 -->
                          <template v-else-if="selectedAtt.kind === 'labor_agreement'">
                            <a-alert
                              v-if="condForm.labor_applicable === false"
                              type="warning"
                              show-icon
                              style="margin-bottom: 8px"
                              message="条件判断为不适用实际用工：完成本附件将标记为无需提交。"
                            />
                            <a-alert type="info" show-icon style="margin-bottom: 8px" message="协议正文锁定，禁止自动改写条款；仅预填甲乙方身份信息，并由法务审查。" />
                            <a-table
                              size="small"
                              :pagination="false"
                              row-key="key"
                              :data-source="planForm.fields || []"
                              :columns="planFieldColumns"
                            >
                              <template #bodyCell="{ column, record }">
                                <template v-if="column.dataIndex === 'value'">
                                  <a-input v-model:value="record.value" />
                                </template>
                              </template>
                            </a-table>
                            <a-divider orientation="left">法务审查</a-divider>
                            <a-space direction="vertical">
                              <a-checkbox :checked="planForm.legal_checklist.use_employer_quota === true" @change="(e) => setLegalCheck('use_employer_quota', e.target.checked)">用工指标办在阿证件</a-checkbox>
                              <a-checkbox :checked="planForm.legal_checklist.non_employer_work === true" @change="(e) => setLegalCheck('non_employer_work', e.target.checked)">非甲方单位用工报备与风险</a-checkbox>
                              <a-checkbox :checked="planForm.legal_checklist.accept_advance_deduct === true" @change="(e) => setLegalCheck('accept_advance_deduct', e.target.checked)">代付费用可从结算款扣除</a-checkbox>
                              <a-checkbox :checked="planForm.legal_checklist.need_liability_boundary === true" @change="(e) => setLegalCheck('need_liability_boundary', e.target.checked)">安全与赔偿责任边界清晰</a-checkbox>
                              <a-checkbox v-model:checked="planForm.legal_checklist.legal_reviewed">法务已审查</a-checkbox>
                            </a-space>
                            <a-input v-model:value="planForm.legal_checklist.legal_reviewer" style="margin-top: 8px; width: 240px" placeholder="审查人" />
                            <a-textarea v-model:value="planForm.legal_checklist.legal_notes" style="margin-top: 8px" :rows="2" placeholder="法务备注" />
                            <a-collapse style="margin-top: 12px">
                              <a-collapse-panel key="body" header="协议正文预览（只读）">
                                <pre class="tpl-preview">{{ planForm.locked_body_preview || '请点生成草稿抽取正文' }}</pre>
                              </a-collapse-panel>
                            </a-collapse>
                          </template>

                          <!-- A09 保密承诺 -->
                          <template v-else-if="selectedAtt.kind === 'confidentiality'">
                            <a-alert type="info" show-icon style="margin-bottom: 8px" message="标准文本锁定；自动带入项目/投标人/日期，确认保密范围、期限及不对供应商泄密。" />
                            <a-table
                              size="small"
                              :pagination="false"
                              row-key="key"
                              :data-source="planForm.fields || []"
                              :columns="planFieldColumns"
                            >
                              <template #bodyCell="{ column, record }">
                                <template v-if="column.dataIndex === 'value'">
                                  <a-input v-model:value="record.value" />
                                </template>
                              </template>
                            </a-table>
                            <a-divider orientation="left">确认项</a-divider>
                            <a-space direction="vertical">
                              <a-checkbox v-model:checked="planForm.scope_confirm">已确认保密范围（专用资料）</a-checkbox>
                              <a-checkbox v-model:checked="planForm.duration_until_acceptance">保密期限至工程竣工验收</a-checkbox>
                              <a-checkbox v-model:checked="planForm.supplier_nda_confirm">特别确认：不向供应商泄露</a-checkbox>
                            </a-space>
                            <a-collapse style="margin-top: 12px">
                              <a-collapse-panel key="body" header="承诺书正文预览（只读）">
                                <pre class="tpl-preview">{{ planForm.locked_body_preview || '请点生成草稿抽取正文' }}</pre>
                              </a-collapse-panel>
                            </a-collapse>
                          </template>

                          <a-textarea
                            v-if="selectedAtt.kind !== 'labor_agreement'"
                            v-model:value="planForm.notes"
                            style="margin-top: 12px"
                            :rows="2"
                            placeholder="备注"
                           
                          />
                        </template>

                        <!-- 其它附件占位 -->
                        <template v-else>
                          <a-result
                            status="info"
                            title="本附件工作台稍后实现"
                            sub-title="可先切换其他附件并行办理；全部纳入附件都完成后才能进入校验。"
                          />
                        </template>

                        <a-space style="margin-top: 16px">
                          <a-button @click="saveInstStep(1)">上一步</a-button>
                          <a-button
                            v-if="canExportCurrentDocx"
                            type="primary"
                            ghost
                            :loading="wbExporting"
                            :disabled="exportDocxDisabled"
                            @click="exportCurrentDocx"
                          >
                            导出填写后的 Word（待盖章）
                          </a-button>
                          <a-button
                            type="primary"
                            :loading="wbSaving"
                            @click="completeCurrentAttachment"
                          >
                            完成本附件
                          </a-button>
                          <a-button
                            :disabled="!allIncludedDone"
                            type="primary"
                            ghost
                            @click="saveInstStep(3)"
                          >
                            全部完成后进入校验
                          </a-button>
                        </a-space>
                      </template>
                      <a-empty v-else description="暂无附件" />
                    </a-card>

                    <!-- ⑤校验 -->
                    <a-card v-else-if="instStep === 3" size="small" title="④ 一致性校验">
                      <a-space style="margin-bottom: 12px">
                        <a-button type="primary" :loading="instSaving" @click="runInstValidate">重新校验</a-button>
                        <a-tag :color="instValidation.passed ? 'success' : 'error'">
                          {{ instValidation.summary || (instValidation.passed ? '全部通过' : '存在未通过项') }}
                        </a-tag>
                      </a-space>
                      <a-table
                        size="small"
                        :pagination="false"
                        row-key="code"
                        :columns="validateColumns"
                        :data-source="instValidation.items || []"
                      >
                        <template #bodyCell="{ column, record }">
                          <template v-if="column.dataIndex === 'passed'">
                            <a-tag :color="record.passed ? 'success' : 'error'">
                              {{ record.passed ? '通过' : '未通过' }}
                            </a-tag>
                          </template>
                        </template>
                      </a-table>
                      <a-space style="margin-top: 16px">
                        <a-button @click="saveInstStep(2)">上一步</a-button>
                        <a-button type="primary" :disabled="!instValidation.passed" @click="saveInstStep(4)">
                          校验通过，进入完成
                        </a-button>
                      </a-space>
                    </a-card>

                    <!-- ⑤完成 -->
                    <a-card v-else size="small" title="⑤ 完成须知阶段">
                      <a-result
                        :status="instCompleted ? 'success' : 'info'"
                        :title="instCompleted ? '投标须知阶段已完成' : '确认完成后可进入投标报价'"
                        :sub-title="
                          instCompleted
                            ? '附件清单与校验结果已保存。Word 套打导出后续开放。'
                            : '将锁定本阶段状态；校验未通过时无法完成。'
                        "
                      >
                        <template #extra>
                          <a-space>
                            <a-button @click="saveInstStep(3)">返回校验</a-button>
                            <a-button
                              type="primary"
                              :loading="instSaving"
                              :disabled="instCompleted"
                              @click="completeInstructions"
                            >
                              {{ instCompleted ? '已完成' : '确认完成本阶段' }}
                            </a-button>
                            <a-button v-if="instCompleted" type="primary" ghost @click="goStep(3)">
                              进入投标报价
                            </a-button>
                          </a-space>
                        </template>
                      </a-result>
                    </a-card>
                  </a-col>
                </a-row>
              </a-spin>
            </a-card>

            <!-- 阶段 3：投标报价 -->
            <a-card v-else-if="currentStep === 3" title="阶段四 · 投标报价">
              <QuoteWorkbench :project-id="selectedId" @back="goStep(2)" />
            </a-card>
          </template>
        </a-layout-content>
      </a-layout>
    </a-layout>

    <a-modal
      v-model:open="createOpen"
      title="新建项目"
      ok-text="创建"
      cancel-text="取消"
      :confirm-loading="creating"
      @ok="submitCreate"
    >
      <a-form layout="vertical">
        <a-form-item label="项目名称" required>
          <a-input v-model:value="form.name" placeholder="例如：廷杜夫240床医院机电分包" />
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model:value="form.notes" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="focusAnalyzeOpen"
      :title="focusAnalyzeTarget === 'instructions' ? '分析投标须知 · 关注关键词' : '分析招标公告'"
      ok-text="开始分析"
      cancel-text="取消"
      :confirm-loading="focusAnalyzeTarget === 'instructions' ? instBodyAnalyzing : analyzing"
      destroy-on-close
      @ok="confirmFocusAnalyze"
    >
      <template v-if="focusAnalyzeTarget === 'notice'">
        <a-alert
          v-if="noticeTemplateLocked"
          type="warning"
          show-icon
          style="margin-bottom: 12px"
          :message="`本项目已锁定模板：${sanitizeTemplateLabel(noticeTemplateLabel || noticeTemplateMode)}（不可切换，新建项目可选其他模板）`"
        />
        <a-form layout="vertical">
          <a-form-item label="分析模板" required>
            <a-radio-group v-model:value="noticeTemplateMode" :disabled="noticeTemplateLocked">
              <a-radio-button value="green_template">基础模板（绿字段重点提取）</a-radio-button>
              <a-radio-button value="llm_general">通用字段提取</a-radio-button>
            </a-radio-group>
            <div class="muted" style="margin-top: 8px">
              {{
                noticeTemplateMode === 'green_template'
                  ? '按解读表绿色字段重点提取项目信息、截标流程、合规、履约保函、保密等。'
                  : '按通用字段清单全面提取公告关键信息。'
              }}
            </div>
          </a-form-item>
          <a-form-item label="关注关键词 / 信息点（可选）">
            <a-textarea
              v-model:value="focusKeywords"
              :rows="4"
              placeholder="上一轮未体现的内容，例如：招标人全称、评标办法、投标保证金…"
            />
          </a-form-item>
        </a-form>
      </template>
      <template v-else>
        <a-alert
          type="info"
          show-icon
          style="margin-bottom: 12px"
          message="可填写希望重点查找的内容（上一轮未体现或缺失的字段）。留空则按标准字段全量分析。"
        />
        <a-form layout="vertical">
          <a-form-item label="关注关键词 / 信息点">
            <a-textarea
              v-model:value="focusKeywords"
              :rows="5"
              placeholder="例如：招标人/业主全称、评标办法、投标保证金、否决项、现场考察安排、递交份数…"
            />
          </a-form-item>
        </a-form>
      </template>
    </a-modal>

    <a-modal
      v-model:open="noticeDetailOpen"
      title="公告详情数据"
      width="1180px"
      :footer="null"
      destroy-on-close
    >
      <a-alert
        type="info"
        show-icon
        style="margin-bottom: 12px"
        :message="noticeDetailMetaText"
      />
      <a-tabs v-if="noticeDetailSheets.length" v-model:activeKey="noticeDetailSheetKey" size="small">
        <a-tab-pane v-for="sh in noticeDetailSheets" :key="sh.name" :tab="sh.name">
          <a-alert
            v-if="sh.title"
            type="info"
            show-icon
            style="margin-bottom: 8px"
            :message="sh.title"
          />
          <a-table
            size="small"
            :pagination="{ pageSize: 50, showSizeChanger: true, pageSizeOptions: ['20', '50', '100'] }"
            :columns="columnsForSheet(sh)"
            :data-source="rowsForSheet(sh)"
            :row-key="(r, i) => r.rowKey || `${sh.name}-${i}`"
            :scroll="{ x: 1600, y: 520 }"
          />
        </a-tab-pane>
      </a-tabs>
      <a-table
        v-else
        size="small"
        :pagination="{ pageSize: 50, showSizeChanger: true }"
        :columns="noticeDetailColumns"
        :data-source="noticeDetailRows"
        row-key="rowKey"
        :scroll="{ x: 1600, y: 520 }"
      />
    </a-modal>
  </a-config-provider>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import { api, getToken, setToken } from './api'
import Login from './Login.vue'
import QuoteWorkbench from './QuoteWorkbench.vue'
import AdminQuotaPage from './AdminQuotaPage.vue'

const authed = ref(false)
const currentUser = ref(null)
const authChecking = ref(true)
const mainView = ref('project') // project | admin-quota
const isAdmin = computed(() => !!currentUser.value?.is_admin)

const projects = ref([])
const loadingList = ref(false)
const selectedId = ref(null)
const detail = ref(null)
const createOpen = ref(false)
const creating = ref(false)
const form = reactive({ name: '', notes: '' })
const uploading = ref(false)
const uploadPercent = ref(0)
const analyzing = ref(false)
const currentStep = ref(0)
const noticeDetailOpen = ref(false)
const noticeDetailLoading = ref(false)
const noticeDetailPayload = ref(null)
/** 当前内存中的公告详情属于哪个项目；换项目必须重新获取一次 */
const noticeDetailForProjectId = ref(null)
const noticeDetailSheetKey = ref('')
const focusAnalyzeOpen = ref(false)
const focusAnalyzeTarget = ref('notice') // notice | instructions
const focusKeywords = ref('')
const noticeTemplateMode = ref('green_template')
const noticeTemplateLocked = ref(false)
const noticeTemplateLabel = ref('')

const instLoading = ref(false)
const instSaving = ref(false)
const instBodyAnalyzing = ref(false)
const instRecord = ref(null)
const selectedAttCode = ref(null)
const wbAnalyzing = ref(false)
const wbSaving = ref(false)
const wbExporting = ref(false)
const fieldAnalyzeHint = ref('')
const editableFields = ref([])
const signReminders = ref([])
const personnelRows = ref([])
const personnelImporting = ref(false)
const personnelImportMode = ref('merge')
const personnelImportHint = ref('')
const baseDataImporting = ref(false)
const baseDataImportHint = ref('')
const attImporting = ref(false)
const attImportHint = ref('')
const orgChartSvg = ref('')
const orgChartNodes = ref([])
const orgChartSource = reactive({
  personnel_code: '',
  people_count: 0,
  personnel_status_label: '',
  project_title: '',
})
const orgConfirm = reactive({
  hierarchy_ok: false,
  reporting_ok: false,
  position_ok: false,
  deployable_ok: false,
})
const orgChartGenerating = ref(false)
const planForm = reactive({
  phases: [],
  curve_points: [],
  peak_headcount: '',
  chinese_source: {
    hq_dispatch: { eligible: null, count: '', note: '' },
    from_other_projects: { passport_done: null, visa_done: null, count: '', note: '' },
    trained_certified: { count: '', note: '' },
  },
  credential_notes: '',
  voucher_attached: false,
  equipment_rows: [],
  confirm_flags: {
    source_explained: false,
    mobilize_aligned_schedule: false,
    voucher_prepared: false,
    ready_confirmed: false,
  },
  voucher_note: '',
  wbs_milestones: [],
  scope_covers: { detail_design: false, material_delivery: false, construction_org: false },
  p6: { export_status: 'pending', import_status: 'none', file_name: '', last_synced_at: null },
  engineer_notes: '',
  confirmed: false,
  fields: [],
  locked_body_preview: '',
  legal_checklist: {
    use_employer_quota: null,
    non_employer_work: null,
    accept_advance_deduct: null,
    need_liability_boundary: null,
    legal_reviewed: false,
    legal_reviewer: '',
    legal_notes: '',
  },
  scope_confirm: false,
  duration_until_acceptance: false,
  supplier_nda_confirm: false,
  notes: '',
  sign_reminder: [],
})
const planCurveSvg = ref('')
const planScheduleRef = reactive({ code: '', status: '', status_label: '' })
const planGenerating = ref(false)
const REMAINING_KINDS = ['labor_plan', 'equipment_plan', 'schedule', 'labor_agreement', 'confidentiality']
const masterForm = reactive({
  enterprise: { bidder_name: '', credit_code: '', address: '', phone: '' },
  legal_rep: { legal_rep_name: '', legal_rep_id_no: '', legal_rep_title: '法定代表人' },
  agent: {
    agent_org_name: '',
    agent_name: '',
    agent_id_no: '',
    agent_gender: '',
    agent_age: '',
    agent_dept: '',
    agent_title: '',
  },
  project: { project_name: '', employer_name: '', scope: '' },
})
const fieldColumnsPoa = [
  { title: '字段', dataIndex: 'label', width: 140 },
  { title: '必填', dataIndex: 'required', width: 70 },
  { title: '来源库', dataIndex: 'source', width: 100 },
  { title: '填写值', dataIndex: 'value', width: 220 },
  { title: '模板依据', dataIndex: 'evidence', width: 180 },
]
const condForm = reactive({
  auth_filing: null,
  auth_proof_note: '',
  labor_applicable: null,
  labor_checks: {
    use_employer_quota: null,
    non_employer_work: null,
    accept_advance_deduct: null,
    need_liability_boundary: null,
  },
  site_visit_confirm: null,
})
const baseForm = reactive({
  project_name: '',
  employer: '',
  main_contractor: '',
  scope: '',
  bid_deadline: '',
  currency: '',
  bidder_name: '',
  legal_representative: '',
  agent_name: '',
  locked_quote: '',
  from_notice: false,
})

const validateColumns = [
  { title: '编号', dataIndex: 'code', width: 100 },
  { title: '检查项', dataIndex: 'name', width: 180 },
  { title: '结果', dataIndex: 'passed', width: 90 },
  { title: '说明', dataIndex: 'detail' },
]

const fieldColumns = [
  { title: '字段', dataIndex: 'label', width: 140 },
  { title: '提取值', dataIndex: 'value' },
  { title: '原文证据', dataIndex: 'evidence' },
  { title: '状态', dataIndex: 'status', width: 90 },
]

const noticeDetailColumns = [
  { title: '需求ID', dataIndex: '需求ID', width: 90 },
  { title: '一级Key', dataIndex: '一级Key', width: 140 },
  { title: '模块', dataIndex: '模块', width: 120 },
  { title: '子模块', dataIndex: '子模块', width: 120 },
  { title: '提取项', dataIndex: '提取项', width: 140 },
  { title: '招标文件关键信息', dataIndex: '招标文件关键信息', width: 240 },
  { title: '关键参数/数量', dataIndex: '关键参数/数量', width: 120 },
  { title: '来源文件', dataIndex: '来源文件', width: 160 },
  { title: '章节/条款', dataIndex: '章节/条款', width: 120 },
  { title: '状态', dataIndex: '状态', width: 90 },
  { title: '后续动作', dataIndex: '后续动作', width: 120 },
]

const hasZip = computed(() => !!detail.value?.project?.zip_name)
const zipTreeData = computed(() => detail.value?.tree || [])
const zipTreeExpandKeys = computed(() => (zipTreeData.value || []).map((n) => n.key).filter(Boolean))
const analysis = computed(() => detail.value?.notice_analysis || null)
const noticeDone = computed(() => analysis.value?.status === 'done')
const fields = computed(() => analysis.value?.result?.fields || [])
const noticeTemplateDisplay = computed(() => {
  const raw = analysis.value?.result?.template_label || analysis.value?.result?.template_mode || ''
  return sanitizeTemplateLabel(raw, analysis.value?.result?.template_mode)
})
const noticeDetailRows = computed(() =>
  ((noticeDetailPayload.value?.rows) || []).map((r, i) => ({
    ...r,
    rowKey: r['需求ID'] || `r-${i}`,
  })),
)
const noticeDetailSheets = computed(() => {
  const sheets = noticeDetailPayload.value?.sheets
  if (Array.isArray(sheets) && sheets.length) return sheets
  const rows = noticeDetailPayload.value?.rows
  if (rows?.length) {
    return [{ name: '01_招标解读总表', rows, headers: noticeDetailPayload.value?.headers }]
  }
  return []
})
const noticeDetailMetaText = computed(() => {
  const p = noticeDetailPayload.value || {}
  const parts = [
    p.source_file ? `来源：${p.source_file}` : '',
    p.source === 'package_xlsx' ? '包内解读表' : p.source === 'supplement_extract' ? '补充文件分析' : '',
    `共 ${p.row_count ?? noticeDetailRows.value.length} 条`,
    p.cached ? '已缓存' : '本次载入',
    p.note || '',
  ]
  return parts.filter(Boolean).join(' · ')
})

function columnsForSheet(sh) {
  const headers = (sh?.headers && sh.headers.length ? sh.headers : null) || [
    '需求ID',
    '一级Key',
    '模块',
    '子模块',
    '提取项',
    '招标文件关键信息',
    '关键参数/数量',
    '来源文件',
    '章节/条款',
    'PDF页码',
    '状态',
    '后续动作',
  ]
  return headers.filter(Boolean).map((h) => ({
    title: h,
    dataIndex: h,
    width: h === '招标文件关键信息' ? 280 : h === '来源文件' ? 180 : h === '需求ID' ? 90 : 120,
    ellipsis: true,
  }))
}

function rowsForSheet(sh) {
  return (sh?.rows || []).map((r, i) => ({
    ...r,
    rowKey: r['需求ID'] || r['编号'] || `${sh.name}-${i}`,
  }))
}
const noticeFieldSections = computed(() => {
  const list = fields.value || []
  if (!(analysis.value?.result?.template_mode === 'green_template')) return []
  const map = new Map()
  for (const f of list) {
    const title = f.section || '其他'
    if (!map.has(title)) map.set(title, [])
    map.get(title).push(f)
  }
  return [...map.entries()].map(([title, rows]) => ({ title, rows }))
})
const atomic = computed(() => analysis.value?.result?.atomic_requirements || [])
const questions = computed(() => analysis.value?.result?.open_questions || [])
const sourceSummary = computed(() => {
  const s = analysis.value?.result?.source
  if (!s) return ''
  const parts = [
    `来源: ${s.path}`,
    `语言: ${s.language}`,
    `提取: ${s.extract_method}`,
    `正文 ${s.text_length} 字`,
  ]
  const n = Number(s.supplement_count || (s.supplement_docs || []).length || 0)
  if (n > 0) {
    const names = (s.supplement_docs || [])
      .map((d) => d.filename || d.rel_path)
      .filter(Boolean)
      .slice(0, 4)
      .join('、')
    parts.push(`补充文件 ${n} 份${names ? `（${names}${n > 4 ? '…' : ''}）` : ''}`)
    if (s.supplement_chars) parts.push(`辅文 ${s.supplement_chars} 字`)
  }
  return parts.join(' · ')
})

const instState = computed(() => instRecord.value?.result || null)
const instStep = computed(() => Number(instState.value?.workflow_step || 0))
const instAttachments = computed(() => instState.value?.attachments || [])
const instCompleted = computed(() => !!instState.value?.completed)
const instValidation = computed(() => instState.value?.validation || { passed: false, items: [] })
const instBrief = computed(() => instState.value?.instruction_brief || null)
const instBriefSource = computed(() => {
  const s = instBrief.value?.source
  if (!s) return ''
  return `来源: ${s.filename || s.rel_path || ''} · 提取: ${s.extract_method || '—'} · 正文 ${s.text_length || 0} 字`
})
const instBriefFieldColumns = [
  { title: '字段', dataIndex: 'label', width: 140 },
  { title: '提取值', dataIndex: 'value', width: 220 },
  { title: '原文证据', dataIndex: 'evidence' },
]
const focusHitColumns = [
  { title: '关键词', dataIndex: 'keyword', width: 140 },
  { title: '提取值', dataIndex: 'value', width: 220 },
  { title: '原文证据', dataIndex: 'evidence' },
  { title: '状态', dataIndex: 'status', width: 90 },
]
const selectedAtt = computed(
  () => instAttachments.value.find((a) => a.code === selectedAttCode.value) || instAttachments.value[0] || null,
)
const includedAttachments = computed(() =>
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
const canExportCurrentDocx = computed(() => {
  const k = selectedAtt.value?.kind
  if (k === 'bid_commitment') return true
  if (k === 'personnel_plan') return true
  if (k === 'org_chart') return true
  if (REMAINING_KINDS.includes(k)) return true
  if (k === 'power_of_attorney' && condForm.auth_filing === 'not_filed') return true
  return false
})
const exportDocxDisabled = computed(() => {
  if (selectedAtt.value?.kind === 'personnel_plan') return !personnelRows.value.length
  if (selectedAtt.value?.kind === 'org_chart') return !orgChartNodes.value.length
  if (REMAINING_KINDS.includes(selectedAtt.value?.kind)) return false
  return !editableFields.value.length
})
const laborPhaseColumns = [
  { title: '序号', key: 'seq', width: 60 },
  { title: '阶段', key: 'phase_name', width: 120 },
  { title: '工种', key: 'trade', width: 100 },
  { title: '级别', key: 'level', width: 80 },
  { title: '人数', key: 'headcount', width: 80 },
  { title: '备注', key: 'notes', width: 160 },
  { title: '操作', key: 'action', width: 80 },
]
const equipColumns = [
  { title: '序号', key: 'seq', width: 60 },
  { title: '名称', key: 'name', width: 120 },
  { title: '规格型号', key: 'spec', width: 110 },
  { title: '年限', key: 'age_years', width: 70 },
  { title: '数量', key: 'qty', width: 70 },
  { title: '所在地', key: 'location', width: 110 },
  { title: '进场时间', key: 'mobilize_date', width: 110 },
  { title: '来源', key: 'source', width: 120 },
  { title: '操作', key: 'action', width: 80 },
]
const milestoneColumns = [
  { title: '序号', key: 'seq', width: 60 },
  { title: '名称', key: 'name', width: 160 },
  { title: '类型', key: 'type', width: 100 },
  { title: '计划开始', key: 'planned_start', width: 110 },
  { title: '计划完成', key: 'planned_finish', width: 110 },
  { title: '备注', key: 'notes', width: 160 },
  { title: '操作', key: 'action', width: 80 },
]
const planFieldColumns = [
  { title: '字段', dataIndex: 'label', width: 140 },
  { title: '填写值', dataIndex: 'value' },
  { title: '来源', dataIndex: 'source', width: 100 },
]
const orgNodeColumns = [
  { title: '岗位', key: 'position', width: 130 },
  { title: '姓名', key: 'name', width: 120 },
  { title: '汇报上级', key: 'parent_id', width: 180 },
  { title: '层级', key: 'level', width: 70 },
  { title: '可投入', key: 'deployable', width: 100 },
]
const personnelColumns = [
  { title: '序号', key: 'seq', width: 60, fixed: 'left' },
  { title: '岗位', key: 'position', width: 120 },
  { title: '人员姓名', key: 'name', width: 110 },
  { title: '出生日期', key: 'birth_date', width: 120 },
  { title: '学历和专业', key: 'education_major', width: 160 },
  { title: '工作年限', key: 'work_years', width: 90 },
  { title: '医院经验', key: 'hospital_exp', width: 90 },
  { title: '阿尔及利亚经验', key: 'algeria_exp', width: 120 },
  { title: '属地分包经验', key: 'local_subcontract_exp', width: 110 },
  { title: '境外采购经验', key: 'overseas_procurement_exp', width: 110 },
  { title: '可参加面试', key: 'interview_ok', width: 100 },
  { title: '操作', key: 'action', width: 80, fixed: 'right' },
]

watch(selectedAtt, (a) => {
  if (a && !selectedAttCode.value) selectedAttCode.value = a.code
  if (a) syncWorkbenchFromAtt(a)
})

const stepItems = computed(() => [
  {
    title: '上传资料',
    description: hasZip.value ? '已完成' : '上传 ZIP',
    status: hasZip.value ? (currentStep.value === 0 ? 'process' : 'finish') : 'process',
  },
  {
    title: '招标公告',
    description: noticeDone.value ? '已完成' : '待分析',
    disabled: !hasZip.value,
    status: !hasZip.value
      ? 'wait'
      : noticeDone.value
        ? currentStep.value === 1
          ? 'process'
          : 'finish'
        : currentStep.value === 1
          ? 'process'
          : 'wait',
  },
  {
    title: '投标须知',
    description: instCompleted.value ? '已完成' : noticeDone.value ? '附件编制' : '需先完成公告',
    disabled: !noticeDone.value,
    status: !noticeDone.value
      ? 'wait'
      : instCompleted.value
        ? currentStep.value === 2
          ? 'process'
          : 'finish'
        : currentStep.value === 2
          ? 'process'
          : 'wait',
  },
  {
    title: '投标报价',
    description: '材料设备清单',
    disabled: !noticeDone.value,
    status: currentStep.value === 3 ? 'process' : 'wait',
  },
])

function stageShort(s) {
  const map = {
    created: '待上传',
    extracting: '解压中…',
    ingested: '待分析公告',
    notice_analyzed: '公告完成',
    analyze_failed: '公告失败',
    instructions_in_progress: '须知进行中',
    instructions_done: '须知完成',
  }
  if (String(s || '').startsWith('ingest_failed')) return '解压失败'
  return map[s] || s || '—'
}

function statusColor(st) {
  const map = {
    pending_decision: 'orange',
    not_required: 'default',
    to_prepare: 'blue',
    drafting: 'processing',
    pending_confirm: 'gold',
    pending_legal: 'purple',
    pending_p6: 'cyan',
    done: 'success',
    conflict: 'error',
  }
  return map[st] || 'default'
}

function genLevelLabel(lv) {
  return (
    {
      auto: '可自动生成',
      semi: '系统生成后人工调整',
      external: '专业软件编制',
      legal: '法务审查后填写',
      none: '只读',
    }[lv] || lv
  )
}

function sanitizeTemplateLabel(raw, mode = '') {
  const m = mode || raw
  if (m === 'llm_general' || /大模型|LLM/i.test(String(raw))) return '通用字段提取'
  if (m === 'green_template' || /绿字段|图片模板|基础模板/.test(String(raw))) {
    return '基础模板（绿字段重点提取）'
  }
  return String(raw || '')
    .replace(/大模型/g, '')
    .replace(/LLM/gi, '')
    .trim()
}

function formatBytes(n) {
  const num = Number(n) || 0
  if (num < 1024) return `${num} B`
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`
  return `${(num / (1024 * 1024)).toFixed(1)} MB`
}

function sourceLabel(s) {
  return (
    {
      enterprise: '企业信息库',
      legal_rep: '法定代表人库',
      agent: '授权代理人',
      project: '项目信息',
      quote: '最终报价',
      manual: '手工填写',
    }[s] ||
    s ||
    '—'
  )
}

async function flushCurrentWorkbench(silent = true) {
  if (!selectedId.value || !selectedAtt.value) return
  const kind = selectedAtt.value.kind
  if (kind === 'power_of_attorney' || kind === 'bid_commitment') {
    await persistConditions()
    if (kind === 'bid_commitment' || condForm.auth_filing === 'not_filed') {
      await saveFieldsNow()
    }
  } else if (kind === 'personnel_plan') {
    await savePersonnelNow(silent)
  } else if (kind === 'org_chart') {
    await saveOrgChartNow(silent)
  } else if (isRemainingPlanKind(kind)) {
    await savePlanNow(silent)
  }
}

async function selectAttachment(item) {
  if (selectedAtt.value && selectedAtt.value.code !== item.code) {
    try {
      await flushCurrentWorkbench(true)
    } catch (e) {
      message.error(e.response?.data?.detail || e.message || '保存当前附件失败')
      return
    }
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
    if (att.kind === 'personnel_plan') {
      personnelRows.value = (fd.people || []).map((p, i) => ({
        id: p.id || `p-${i}-${Date.now()}`,
        seq: p.seq || i + 1,
        position: p.position || '',
        name: p.name || '',
        birth_date: p.birth_date || '',
        education_major: p.education_major || '',
        work_years: p.work_years || '',
        hospital_exp: p.hospital_exp || '',
        algeria_exp: p.algeria_exp || '',
        local_subcontract_exp: p.local_subcontract_exp || '',
        overseas_procurement_exp: p.overseas_procurement_exp || '',
        interview_ok: p.interview_ok || '',
      }))
      const meta = fd.import_meta || {}
      personnelImportHint.value = meta.llm_error
        ? `最近导入：${meta.filename || ''}（${meta.llm_error}）`
        : meta.filename
          ? `最近导入：${meta.filename}，识别 ${meta.parsed_count ?? 0} 人（${meta.mode || 'merge'}）`
          : ''
    }
    if (att.kind === 'org_chart') {
      applyOrgChartPayload({
        attachment: att,
        nodes: fd.nodes || [],
        svg: fd.svg || '',
        confirm: fd.confirm || {},
        source: {},
      })
    }
}

async function loadWorkbench(code) {
  if (!selectedId.value || !code) return
  try {
    const attMeta = instAttachments.value.find((a) => a.code === code)
    if (attMeta?.kind === 'personnel_plan') {
      const { data } = await api.getPersonnelTable(selectedId.value, code)
      if (data.org_master) {
        Object.assign(masterForm.enterprise, data.org_master.enterprise || {})
        Object.assign(masterForm.legal_rep, data.org_master.legal_rep || {})
        Object.assign(masterForm.agent, data.org_master.agent || {})
        Object.assign(masterForm.project, data.org_master.project || {})
      }
      if (data.attachment && instState.value?.attachments) {
        const list = instState.value.attachments
        const idx = list.findIndex((a) => a.code === code)
        if (idx >= 0) list[idx] = data.attachment
        syncWorkbenchFromAtt(data.attachment)
      } else if (data.people) {
        personnelRows.value = data.people
      }
      return
    }
    if (attMeta?.kind === 'org_chart') {
      const { data } = await api.getOrgChart(selectedId.value, code)
      if (data.attachment && instState.value?.attachments) {
        const list = instState.value.attachments
        const idx = list.findIndex((a) => a.code === code)
        if (idx >= 0) list[idx] = data.attachment
      }
      applyOrgChartPayload(data)
      return
    }
    if (REMAINING_KINDS.includes(attMeta?.kind)) {
      const { data } = await api.getPlanWorkbench(selectedId.value, code)
      if (data.attachment && instState.value?.attachments) {
        const list = instState.value.attachments
        const idx = list.findIndex((a) => a.code === code)
        if (idx >= 0) list[idx] = data.attachment
      }
      applyPlanPayload(data)
      return
    }
    const { data } = await api.getAttachmentWorkbench(selectedId.value, code)
    if (data.org_master) {
      Object.assign(masterForm.enterprise, data.org_master.enterprise || {})
      Object.assign(masterForm.legal_rep, data.org_master.legal_rep || {})
      Object.assign(masterForm.agent, data.org_master.agent || {})
      Object.assign(masterForm.project, data.org_master.project || {})
    }
    if (data.attachment && instState.value?.attachments) {
      const list = instState.value.attachments
      const idx = list.findIndex((a) => a.code === code)
      if (idx >= 0) list[idx] = data.attachment
      syncWorkbenchFromAtt(data.attachment)
    }
  } catch (e) {
    message.error(e.response?.data?.detail || e.message)
  }
}

function applyOrgChartPayload(data) {
  orgChartSvg.value = data.svg || data.attachment?.form_data?.svg || ''
  orgChartNodes.value = (data.nodes || data.attachment?.form_data?.nodes || []).map((n) => ({
    ...n,
    parent_id: n.parent_id || undefined,
  }))
  const src = data.source || {}
  Object.assign(orgChartSource, {
    personnel_code: src.personnel_code || '',
    people_count: src.people_count || 0,
    personnel_status_label: src.personnel_status_label || '',
    project_title: src.project_title || '',
  })
  const c = data.confirm || data.attachment?.form_data?.confirm || {}
  orgConfirm.hierarchy_ok = c.hierarchy_ok === true
  orgConfirm.reporting_ok = c.reporting_ok === true
  orgConfirm.position_ok = c.position_ok === true
  orgConfirm.deployable_ok = c.deployable_ok === true
}

function orgParentOptions(selfId) {
  return orgChartNodes.value
    .filter((n) => n.id !== selfId)
    .map((n) => ({ value: n.id, label: `${n.position || ''} ${n.name || ''}`.trim() }))
}

async function generateOrgChartNow() {
  if (!selectedId.value || !selectedAtt.value) return
  orgChartGenerating.value = true
  try {
    const { data } = await api.generateOrgChart(selectedId.value, selectedAtt.value.code)
    await loadInstructions(false)
    applyOrgChartPayload(data)
    message.success(`已生成组织图（${(data.nodes || []).length} 个节点）`)
  } catch (e) {
    message.error(e.response?.data?.detail || e.message)
  } finally {
    orgChartGenerating.value = false
  }
}

async function saveOrgChartNow(silent = true) {
  if (!selectedId.value || !selectedAtt.value) return
  wbSaving.value = true
  try {
    const { data } = await api.saveOrgChart(selectedId.value, selectedAtt.value.code, {
      nodes: orgChartNodes.value.map((n) => ({
        ...n,
        parent_id: n.parent_id || null,
      })),
      confirm: {
        hierarchy_ok: !!orgConfirm.hierarchy_ok,
        reporting_ok: !!orgConfirm.reporting_ok,
        position_ok: !!orgConfirm.position_ok,
        deployable_ok: !!orgConfirm.deployable_ok,
      },
    })
    await loadInstructions(false)
    applyOrgChartPayload(data)
    if (!silent) message.success('组织图已保存')
  } catch (e) {
    message.error(e.response?.data?.detail || e.message)
  } finally {
    wbSaving.value = false
  }
}

function isRemainingPlanKind(kind) {
  return REMAINING_KINDS.includes(kind)
}

function remainingKindHint(kind) {
  return (
    {
      labor_plan: '按进度与工程量测算劳动力，可调峰值/工种，并补充中国工人护照签证与培训凭证。',
      equipment_plan: '按专业与工期推荐设备机具周转材料，确认数量、所在地、调用可行性与进场时间。',
      schedule: '生成 WBS/里程碑草稿后导出 P6/MSP，由进度工程师调整逻辑、工期与关键路径再定稿。',
      labor_agreement: '仅预填身份信息，正文锁定；法务审查适用场景、责任边界、扣款与安全责任。',
      confidentiality: '自动带入项目与投标人；确认保密范围、期限及不对供应商泄密后签章。',
    }[kind] || '按附件模板编制'
  )
}

function applyPlanPayload(data) {
  const fd = data.form_data || data.attachment?.form_data || {}
  Object.keys(planForm).forEach((k) => {
    if (fd[k] !== undefined) planForm[k] = fd[k]
  })
  // nested defaults
  planForm.chinese_source = {
    hq_dispatch: { eligible: null, count: '', note: '', ...(fd.chinese_source?.hq_dispatch || {}) },
    from_other_projects: {
      passport_done: null,
      visa_done: null,
      count: '',
      note: '',
      ...(fd.chinese_source?.from_other_projects || {}),
    },
    trained_certified: { count: '', note: '', ...(fd.chinese_source?.trained_certified || {}) },
  }
  planForm.confirm_flags = {
    source_explained: false,
    mobilize_aligned_schedule: false,
    voucher_prepared: false,
    ready_confirmed: false,
    ...(fd.confirm_flags || {}),
  }
  planForm.scope_covers = {
    detail_design: false,
    material_delivery: false,
    construction_org: false,
    ...(fd.scope_covers || {}),
  }
  planForm.p6 = {
    export_status: 'pending',
    import_status: 'none',
    file_name: '',
    last_synced_at: null,
    ...(fd.p6 || {}),
  }
  planForm.legal_checklist = {
    use_employer_quota: null,
    non_employer_work: null,
    accept_advance_deduct: null,
    need_liability_boundary: null,
    legal_reviewed: false,
    legal_reviewer: '',
    legal_notes: '',
    ...(fd.legal_checklist || {}),
  }
  planForm.phases = fd.phases || []
  planForm.equipment_rows = fd.equipment_rows || []
  planForm.wbs_milestones = fd.wbs_milestones || []
  planForm.fields = fd.fields || []
  planForm.voucher_attached = !!fd.voucher_attached
  planForm.confirmed = !!fd.confirmed
  planForm.scope_confirm = !!fd.scope_confirm
  planForm.duration_until_acceptance = !!fd.duration_until_acceptance
  planForm.supplier_nda_confirm = !!fd.supplier_nda_confirm
  planForm.legal_checklist.legal_reviewed = !!planForm.legal_checklist.legal_reviewed
  planCurveSvg.value = data.curve_svg || ''
  Object.assign(planScheduleRef, {
    code: data.schedule_ref?.code || '',
    status: data.schedule_ref?.status || '',
    status_label: data.schedule_ref?.status_label || '',
  })
}

function snapshotPlanForm() {
  return JSON.parse(JSON.stringify(planForm))
}

async function generatePlanNow() {
  if (!selectedId.value || !selectedAtt.value) return
  planGenerating.value = true
  try {
    const { data } = await api.generatePlanWorkbench(selectedId.value, selectedAtt.value.code)
    await loadInstructions(false)
    applyPlanPayload(data)
    message.success('草稿已生成，请核对后保存')
  } catch (e) {
    message.error(e.response?.data?.detail || e.message)
  } finally {
    planGenerating.value = false
  }
}

async function savePlanNow(silent = true) {
  if (!selectedId.value || !selectedAtt.value) return
  wbSaving.value = true
  try {
    const { data } = await api.savePlanWorkbench(selectedId.value, selectedAtt.value.code, snapshotPlanForm())
    await loadInstructions(false)
    applyPlanPayload(data)
    if (!silent) message.success('已保存')
  } catch (e) {
    message.error(e.response?.data?.detail || e.message)
  } finally {
    wbSaving.value = false
  }
}

function addPlanPhaseRow() {
  planForm.phases.push({
    id: `ph-${Date.now()}`,
    seq: planForm.phases.length + 1,
    phase_name: '',
    trade: '',
    level: '',
    headcount: '',
    notes: '',
  })
}
function removePlanPhaseRow(id) {
  planForm.phases = planForm.phases.filter((r) => r.id !== id)
}
function addEquipRow() {
  planForm.equipment_rows.push({
    id: `eq-${Date.now()}`,
    seq: planForm.equipment_rows.length + 1,
    name: '',
    spec: '',
    age_years: '',
    qty: '',
    location: '',
    mobilize_date: '',
    source: '',
    source_note: '',
    qty_note: '',
    ready_now: null,
  })
}
function removeEquipRow(id) {
  planForm.equipment_rows = planForm.equipment_rows.filter((r) => r.id !== id)
}
function addMilestoneRow() {
  planForm.wbs_milestones.push({
    id: `ms-${Date.now()}`,
    seq: planForm.wbs_milestones.length + 1,
    name: '',
    type: '',
    planned_start: '',
    planned_finish: '',
    notes: '',
  })
}
function removeMilestoneRow(id) {
  planForm.wbs_milestones = planForm.wbs_milestones.filter((r) => r.id !== id)
}
function setLegalCheck(key, checked) {
  planForm.legal_checklist[key] = checked
}

function addPersonnelRow() {
  personnelRows.value.push({
    id: `new-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    seq: personnelRows.value.length + 1,
    position: '',
    name: '',
    birth_date: '',
    education_major: '',
    work_years: '',
    hospital_exp: '',
    algeria_exp: '',
    local_subcontract_exp: '',
    overseas_procurement_exp: '',
    interview_ok: '',
  })
}

function removePersonnelRow(id) {
  personnelRows.value = personnelRows.value.filter((r) => r.id !== id)
}


async function savePersonnelNow(silent = true) {
  if (!selectedId.value || !selectedAtt.value) return
  wbSaving.value = true
  try {
    const { data } = await api.savePersonnelTable(
      selectedId.value,
      selectedAtt.value.code,
      personnelRows.value,
    )
    await loadInstructions(false)
    syncWorkbenchFromAtt(data.attachment || { kind: 'personnel_plan', form_data: { people: data.people } })
    if (!silent) message.success('人员表已保存')
  } catch (e) {
    message.error(e.response?.data?.detail || e.message)
  } finally {
    wbSaving.value = false
  }
}

function beforePersonnelImport(file) {
  importPersonnelNow(file)
  return false
}

async function importPersonnelNow(file) {
  if (!selectedId.value || !selectedAtt.value) return
  personnelImporting.value = true
  try {
    const { data } = await api.importPersonnelFile(
      selectedId.value,
      selectedAtt.value.code,
      file,
      personnelImportMode.value,
    )
    await loadInstructions(false)
    syncWorkbenchFromAtt(data.attachment || { kind: 'personnel_plan', form_data: { people: data.people, import_meta: data.import_meta } })
    const n = data.import_meta?.parsed_count ?? data.parsed_preview?.length ?? 0
    if (data.import_meta?.llm_error && !n) {
      message.warning(data.import_meta.llm_error)
    } else {
      message.success(`已识别 ${n} 人并写入表格`)
    }
  } catch (e) {
    message.error(e.response?.data?.detail || e.message)
  } finally {
    personnelImporting.value = false
  }
}


async function saveMasterAndPrefill() {
  if (!selectedId.value) return
  wbSaving.value = true
  try {
    await api.saveOrgMaster(selectedId.value, {
      enterprise: { ...masterForm.enterprise },
      legal_rep: { ...masterForm.legal_rep },
      agent: { ...masterForm.agent },
      project: { ...masterForm.project },
    })
    const flat = {
      ...masterForm.enterprise,
      ...masterForm.legal_rep,
      ...masterForm.agent,
      ...masterForm.project,
      company_name: masterForm.enterprise.bidder_name,
      signer_name: masterForm.legal_rep.legal_rep_name || masterForm.agent.agent_name,
    }
    editableFields.value = editableFields.value.map((f) => {
      if (f.value) return f
      return { ...f, value: flat[f.key] || f.value || '' }
    })
    await saveFieldsNow()
    message.success('主数据已保存并预填')
  } catch (e) {
    message.error(e.response?.data?.detail || e.message)
  } finally {
    wbSaving.value = false
  }
}

async function saveMasterQuoteAndPrefill() {
  await persistBaseData()
  await saveMasterAndPrefill()
  const q = (baseForm.locked_quote || '').toString()
  const m = q.match(/(\d+(?:[.,]\d+)?)/)
  editableFields.value = editableFields.value.map((f) => {
    let next = { ...f }
    if (m && (f.key === 'amount_lower' || f.key === 'total_price_lower')) {
      next.value = m[1]
    }
    if ((f.key === 'company_name' || f.key === 'bidder_name') && !f.value) {
      next.value = masterForm.enterprise.bidder_name || f.value
    }
    if ((f.key === 'signer_name' || f.key === 'legal_rep_name') && !f.value) {
      next.value = masterForm.legal_rep.legal_rep_name || f.value
    }
    if (f.key === 'project_name' && !f.value) {
      next.value = masterForm.project.project_name || f.value
    }
    if (f.key === 'employer_name' && !f.value) {
      next.value = masterForm.project.employer_name || f.value
    }
    return next
  })
  await saveFieldsNow()
}

async function analyzeCurrentFields() {
  if (!selectedId.value || !selectedAtt.value) return
  wbAnalyzing.value = true
  try {
    const { data } = await api.analyzeAttachmentFields(selectedId.value, selectedAtt.value.code)
    await loadInstructions(false)
    selectedAttCode.value = data.attachment?.code || selectedAtt.value.code
    syncWorkbenchFromAtt(data.attachment)
    if (data.org_master) {
      Object.assign(masterForm.enterprise, data.org_master.enterprise || {})
      Object.assign(masterForm.legal_rep, data.org_master.legal_rep || {})
      Object.assign(masterForm.agent, data.org_master.agent || {})
      Object.assign(masterForm.project, data.org_master.project || {})
    }
    message.success(`已识别 ${(data.attachment?.form_data?.fields || []).length} 个需填字段`)
  } catch (e) {
    message.error(e.response?.data?.detail || e.message)
  } finally {
    wbAnalyzing.value = false
  }
}


async function saveFieldsNow() {
  if (!selectedId.value || !selectedAtt.value) return
  wbSaving.value = true
  try {
    const { data } = await api.saveAttachmentFields(
      selectedId.value,
      selectedAtt.value.code,
      editableFields.value,
    )
    await loadInstructions(false)
    syncWorkbenchFromAtt(data.attachment)
  } catch (e) {
    message.error(e.response?.data?.detail || e.message)
  } finally {
    wbSaving.value = false
  }
}

async function exportCurrentDocx() {
  if (!selectedId.value || !selectedAtt.value) return
  await flushCurrentWorkbench(true)
  wbExporting.value = true
  try {
    const res = await api.exportAttachmentDocx(selectedId.value, selectedAtt.value.code)
    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
    let filename = `${selectedAtt.value.title || '附件'}_已填写待签章.docx`
    const cd = res.headers?.['content-disposition'] || ''
    const m = cd.match(/filename\*=UTF-8''([^;]+)|filename=\"?([^\";]+)\"?/i)
    if (m) filename = decodeURIComponent(m[1] || m[2])
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    message.success('已导出 Word，请打印盖章')
  } catch (e) {
    let msg = e.message
    if (e.response?.data instanceof Blob) {
      try {
        const j = JSON.parse(await e.response.data.text())
        msg = j.detail || msg
      } catch {
        /* ignore */
      }
    } else {
      msg = e.response?.data?.detail || e.message
    }
    message.error(msg)
  } finally {
    wbExporting.value = false
  }
}

async function completeCurrentAttachment() {
  if (!selectedId.value || !selectedAtt.value) return
  await flushCurrentWorkbench(true)
  wbSaving.value = true
  try {
    const { data } = await api.completeAttachment(selectedId.value, selectedAtt.value.code)
    await loadInstructions(false)
    message.success('本附件已完成')
    const remain = (data.attachments_progress || []).filter(
      (a) => a.included !== false && !['done', 'not_required', 'skipped'].includes(a.status),
    )
    if (remain.length) {
      message.info(`还可任意办理其余 ${remain.length} 个附件；全部完成后才能进入校验`)
    } else {
      message.success('全部纳入附件已完成，可进入校验')
    }
  } catch (e) {
    message.error(e.response?.data?.detail || e.message)
  } finally {
    wbSaving.value = false
  }
}

function statusOptionsFor(att) {
  const common = [
    { value: 'to_prepare', label: '待编制' },
    { value: 'drafting', label: '编制中' },
    { value: 'pending_confirm', label: '待人工确认' },
    { value: 'done', label: '已完成' },
    { value: 'conflict', label: '冲突' },
  ]
  if (att.kind === 'power_of_attorney') {
    return [
      { value: 'pending_decision', label: '待判断' },
      { value: 'not_required', label: '无需提交' },
      ...common,
    ]
  }
  if (att.kind === 'labor_agreement') {
    return [
      { value: 'pending_decision', label: '待判断' },
      { value: 'pending_legal', label: '待法务审定' },
      ...common,
    ]
  }
  if (att.kind === 'schedule') {
    return [
      { value: 'pending_p6', label: '待专业软件' },
      ...common,
    ]
  }
  return common
}

function syncFormsFromState() {
  const st = instState.value
  if (!st) return
  const c = st.conditions || {}
  condForm.auth_filing = c.auth_filing ?? null
  condForm.auth_proof_note = c.auth_proof_note || ''
  condForm.labor_applicable = c.labor_applicable ?? null
  condForm.labor_checks = {
    use_employer_quota: null,
    non_employer_work: null,
    accept_advance_deduct: null,
    need_liability_boundary: null,
    ...(c.labor_checks || {}),
  }
  condForm.site_visit_confirm = c.site_visit_confirm ?? null
  const b = st.base_data || {}
  Object.assign(baseForm, {
    project_name: b.project_name || '',
    employer: b.employer || '',
    main_contractor: b.main_contractor || '',
    scope: b.scope || '',
    bid_deadline: b.bid_deadline || '',
    currency: b.currency || '',
    bidder_name: b.bidder_name || '',
    legal_representative: b.legal_representative || '',
    agent_name: b.agent_name || '',
    locked_quote: b.locked_quote ?? '',
    from_notice: !!b.from_notice,
  })
  if (!selectedAttCode.value && st.attachments?.length) {
    selectedAttCode.value = st.attachments[0].code
  }
}

async function analyzeInstructionBody(keywords = '') {
  if (!selectedId.value) return
  instBodyAnalyzing.value = true
  try {
    const { data } = await api.analyzeInstructionBody(selectedId.value, keywords)
    instRecord.value = data
    syncFormsFromState()
    const n = (data.result?.instruction_brief?.key_fields || []).length
    const hits = (data.result?.instruction_brief?.focus_hits || []).length
    message.success(
      hits > 0 ? `投标须知分析完成（${n} 个关键字段，${hits} 条关注命中）` : `投标须知分析完成（${n} 个关键字段）`,
    )
  } catch (e) {
    message.error(e.response?.data?.detail || e.message)
  } finally {
    instBodyAnalyzing.value = false
  }
}

function openFocusAnalyze(target) {
  focusAnalyzeTarget.value = target
  focusKeywords.value = ''
  if (target === 'notice') {
    const nt = detail.value?.notice_template || {}
    const locked = !!(nt.locked || nt.mode)
    noticeTemplateLocked.value = locked
    noticeTemplateMode.value = nt.mode || 'green_template'
    noticeTemplateLabel.value = nt.label || ''
    if (analysis.value?.result?.focus_keywords) {
      focusKeywords.value = analysis.value.result.focus_keywords
    }
  }
  if (target === 'instructions' && instBrief.value?.focus_keywords) {
    focusKeywords.value = instBrief.value.focus_keywords
  }
  focusAnalyzeOpen.value = true
}

async function confirmFocusAnalyze() {
  const kw = (focusKeywords.value || '').trim()
  if (focusAnalyzeTarget.value === 'notice' && !noticeTemplateMode.value) {
    message.warning('请选择分析模板')
    return
  }
  focusAnalyzeOpen.value = false
  if (focusAnalyzeTarget.value === 'instructions') {
    await analyzeInstructionBody(kw)
  } else {
    await runAnalyze(kw, noticeTemplateMode.value)
  }
}

async function loadInstructions(forceScan = false) {
  if (!selectedId.value || !noticeDone.value) return
  instLoading.value = true
  try {
    const { data } = forceScan
      ? await api.scanInstructions(selectedId.value, true)
      : await api.getInstructions(selectedId.value)
    instRecord.value = data
    syncFormsFromState()
    if (forceScan) message.success(`已扫描到 ${(data.result?.attachments || []).length} 个须知附件`)
  } catch (e) {
    message.error(e.response?.data?.detail || e.message)
  } finally {
    instLoading.value = false
  }
}

async function patchInst(payload) {
  if (!selectedId.value) return
  instSaving.value = true
  try {
    const { data } = await api.patchInstructions(selectedId.value, payload)
    instRecord.value = data
    syncFormsFromState()
    return data
  } catch (e) {
    message.error(e.response?.data?.detail || e.message)
    throw e
  } finally {
    instSaving.value = false
  }
}

async function onInstStepChange(n) {
  if (n >= 3 && !allIncludedDone.value) {
    message.warning('请先完成全部纳入的附件，再进入校验')
    return
  }
  await patchInst({ workflow_step: n })
}

async function saveInstStep(n) {
  if (n >= 3 && !allIncludedDone.value) {
    message.warning('请先完成全部纳入的附件，再进入校验')
    return
  }
  await patchInst({ workflow_step: n })
}

async function persistConditions() {
  await patchInst({
    conditions: {
      auth_filing: condForm.auth_filing,
      auth_proof_note: condForm.auth_proof_note,
      labor_applicable: condForm.labor_applicable,
      labor_checks: { ...condForm.labor_checks },
      site_visit_confirm: condForm.site_visit_confirm,
    },
  })
}

function setLaborCheck(key, checked) {
  condForm.labor_checks[key] = checked
  if (!checked) condForm.labor_checks[key] = false
}


function canImportFillAttachment(att) {
  if (!att) return false
  const k = att.kind || ''
  return k !== 'org_chart' && k !== 'personnel_plan'
}

function beforeBaseDataImport(file) {
  importBaseDataNow(file)
  return false
}

async function importBaseDataNow(file) {
  if (!selectedId.value || !file) return
  baseDataImporting.value = true
  baseDataImportHint.value = ''
  try {
    const { data } = await api.importBaseData(selectedId.value, file)
    if (data.instructions) {
      instRecord.value = data.instructions
      syncFormsFromState()
    } else if (data.base_data) {
      Object.assign(baseForm, data.base_data)
    }
    const n = (data.filled_keys || []).length
    baseDataImportHint.value = `已从「${data.filename || file.name}」回填 ${n} 个字段，请核对`
    message.success(baseDataImportHint.value)
  } catch (e) {
    message.error(e.response?.data?.detail || e.message)
  } finally {
    baseDataImporting.value = false
  }
}

function beforeAttachmentImport(file) {
  importAttachmentFillNow(file)
  return false
}

async function importAttachmentFillNow(file) {
  if (!selectedId.value || !selectedAtt.value || !file) return
  if (!canImportFillAttachment(selectedAtt.value)) {
    message.warning('组织图与人员表请使用各自原有导入/生成入口')
    return
  }
  attImporting.value = true
  attImportHint.value = ''
  try {
    const { data } = await api.importAttachmentFill(selectedId.value, selectedAtt.value.code, file)
    await loadInstructions(false)
    if (isRemainingPlanKind(selectedAtt.value.kind)) {
      applyPlanPayload(data)
    } else if (data.attachment) {
      selectedAttCode.value = data.attachment.code || selectedAtt.value.code
      syncWorkbenchFromAtt(data.attachment)
    } else if (data.form_data) {
      syncWorkbenchFromAtt({ ...selectedAtt.value, form_data: data.form_data })
    }
    const meta =
      data.attachment?.form_data?.import_meta ||
      data.form_data?.import_meta ||
      {}
    attImportHint.value = `已从「${meta.filename || file.name}」分析回填，请核对后点「完成本附件」保存`
    message.success(attImportHint.value)
  } catch (e) {
    message.error(e.response?.data?.detail || e.message)
  } finally {
    attImporting.value = false
  }
}

async function persistBaseData() {
  await patchInst({
    base_data: {
      project_name: baseForm.project_name,
      employer: baseForm.employer,
      main_contractor: baseForm.main_contractor,
      scope: baseForm.scope,
      bid_deadline: baseForm.bid_deadline,
      currency: baseForm.currency,
      bidder_name: baseForm.bidder_name,
      legal_representative: baseForm.legal_representative,
      agent_name: baseForm.agent_name,
      locked_quote: baseForm.locked_quote || null,
      from_notice: baseForm.from_notice,
    },
  })
  message.success('基础数据已保存')
}

async function toggleAttIncluded(item, included) {
  await patchInst({ attachment: { code: item.code, included } })
}

async function updateAttStatus(item, status) {
  await patchInst({ attachment: { code: item.code, status } })
}

async function updateAttNotes(item, notes) {
  await patchInst({ attachment: { code: item.code, notes } })
}

async function runInstValidate() {
  await patchInst({ run_validate: true, workflow_step: 3 })
  message.info(instValidation.value.passed ? '校验全部通过' : '存在未通过项，请按说明处理')
}

async function completeInstructions() {
  try {
    await patchInst({ run_validate: true, complete: true })
    message.success('投标须知阶段已完成')
    await loadProjects()
  } catch {
    /* error already toasted */
  }
}

function syncStepFromDetail() {
  if (!detail.value?.project) {
    currentStep.value = 0
    return
  }
  if (!hasZip.value) {
    currentStep.value = 0
  } else if (!noticeDone.value) {
    currentStep.value = 1
  } else {
    // 公告已完成：停在公告结果页，用户可主动进下一阶段
    if (currentStep.value < 1) currentStep.value = 1
  }
}

function goStep(n) {
  if (n >= 1 && !hasZip.value) {
    message.warning('请先上传招标 ZIP 包')
    return
  }
  if (n >= 2 && !noticeDone.value) {
    message.warning('请先完成招标公告分析')
    return
  }
  // 阶段：0上传 1公告 2须知 3报价（合同技术已去掉）
  currentStep.value = Math.max(0, Math.min(Number(n) || 0, 3))
  if (currentStep.value === 2) {
    loadInstructions(false)
  }
}

function onStepChange(n) {
  goStep(n)
}

async function refreshHealth() {
  try {
    const { data } = await api.health()
  } catch {
  }
}

async function loadProjects() {
  loadingList.value = true
  try {
    const { data } = await api.listProjects()
    projects.value = data.items || []
  } finally {
    loadingList.value = false
  }
}

function clearNoticeDetailCache() {
  noticeDetailPayload.value = null
  noticeDetailForProjectId.value = null
  noticeDetailSheetKey.value = ''
}

async function openNoticeDetail() {
  if (!selectedId.value) return
  if (!hasZip.value) {
    message.warning('请先上传招标 ZIP 包')
    return
  }
  const pid = selectedId.value
  const local = noticeDetailPayload.value
  const sameProject = noticeDetailForProjectId.value === pid
  const overview = (local?.sheets || []).find((s) => String(s.name || '').includes('项目概述'))
  const overviewOk =
    overview &&
    (overview.headers || []).includes('类别') &&
    (overview.headers || []).includes('提取项') &&
    (overview.rows || []).length > 0
  // 仅本项目已获取过才直接展示；新项目 / 切换项目必须重新获取一次
  const localOk =
    sameProject &&
    (local?.rows || []).length &&
    (local?.source === 'package_xlsx' || local?.source === 'supplement_extract') &&
    (local?.source !== 'package_xlsx' || overviewOk || !(local?.source_file || '').includes('含项目概述'))
  if (localOk) {
    if (!noticeDetailSheetKey.value && noticeDetailSheets.value.length) {
      noticeDetailSheetKey.value = noticeDetailSheets.value[0].name
    }
    noticeDetailOpen.value = true
    return
  }

  noticeDetailLoading.value = true
  const hide = message.loading('本项目公告详情数据获取中，请稍候…', 0)
  try {
    const { data } = await api.getStructuredExport(pid, false)
    noticeDetailPayload.value = data?.result || null
    noticeDetailForProjectId.value = pid
    const sheets = noticeDetailSheets.value
    noticeDetailSheetKey.value = sheets[0]?.name || ''
    const n = (noticeDetailPayload.value?.rows || []).length
    hide()
    const src = noticeDetailPayload.value?.source
    if (src === 'package_xlsx') {
      message.success(`已载入本项目解读表（${n} 条），本项目内再次打开将直接展示`)
    } else {
      message.success(`本项目公告详情已生成（${n} 条），再次打开将直接展示`)
    }
    noticeDetailOpen.value = true
    if (detail.value?.project?.id === pid) {
      detail.value.structured_export = {
        ready: true,
        row_count: n,
        id: data?.id,
        created_at: data?.created_at,
      }
    }
  } catch (e) {
    hide()
    clearNoticeDetailCache()
    message.error(e.response?.data?.detail || e.message || '获取公告详情失败')
  } finally {
    noticeDetailLoading.value = false
  }
}

async function loadDetail(id) {
  if (noticeDetailForProjectId.value != null && noticeDetailForProjectId.value !== id) {
    clearNoticeDetailCache()
  }
  const { data } = await api.getProject(id)
  detail.value = data
  if (data.instructions_analysis) {
    instRecord.value = data.instructions_analysis
    syncFormsFromState()
  } else {
    instRecord.value = null
  }
  syncStepFromDetail()
}

function openCreate() {
  form.name = ''
  form.notes = ''
  createOpen.value = true
}

async function submitCreate() {
  if (!form.name.trim()) {
    message.warning('请填写项目名称')
    return
  }
  creating.value = true
  try {
    const { data } = await api.createProject({ name: form.name.trim(), notes: form.notes })
    createOpen.value = false
    await loadProjects()
    selectedId.value = data.id
    await loadDetail(data.id)
    currentStep.value = 0
    message.success('项目已创建，请上传 ZIP')
  } catch (e) {
    message.error(e.response?.data?.detail || e.message)
  } finally {
    creating.value = false
  }
}

async function onSelectProject({ key }) {
  mainView.value = 'project'
  selectedId.value = Number(key)
  await loadDetail(selectedId.value)
}

function onSelectAdmin({ key }) {
  if (key === 'admin-quota') {
    mainView.value = 'admin-quota'
  }
}

function beforeUpload(file) {
  doUpload(file)
  return false
}

async function doUpload(file) {
  if (!selectedId.value) return
  uploading.value = true
  uploadPercent.value = 0
  try {
    await api.uploadZip(selectedId.value, file, (evt) => {
      if (evt.total) uploadPercent.value = Math.round((evt.loaded / evt.total) * 100)
    })
    message.loading({ content: '文件已接收，正在解压建目录…', key: 'zip-ingest', duration: 0 })
    // 大包在后台解压：轮询项目状态直到 ingested / failed
    const ok = await waitZipIngested(selectedId.value)
    message.destroy('zip-ingest')
    if (!ok) {
      message.error('解压失败，请查看项目状态或重试上传')
      await loadProjects()
      await loadDetail(selectedId.value)
      return
    }
    message.success('ZIP 已入库，请核对下方目录后进入公告分析')
    clearNoticeDetailCache()
    await loadProjects()
    await loadDetail(selectedId.value)
    currentStep.value = 0
  } catch (e) {
    message.destroy('zip-ingest')
    message.error(e.response?.data?.detail || e.message)
  } finally {
    uploading.value = false
    uploadPercent.value = 0
  }
}

async function waitZipIngested(projectId, maxMs = 600000) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    try {
      const { data } = await api.getProject(projectId)
      const st = data?.project?.status || ''
      if (st === 'ingested') return true
      if (String(st).startsWith('ingest_failed')) return false
    } catch {
      /* ignore transient */
    }
    await new Promise((r) => setTimeout(r, 1500))
  }
  return false
}

async function runAnalyze(keywords = '', templateMode = '') {
  if (!selectedId.value) return
  analyzing.value = true
  try {
    await api.analyzeNotice(selectedId.value, keywords, templateMode)
    message.success(keywords ? '招标公告分析完成（已按关注关键词补检）' : '招标公告分析完成')
    await loadProjects()
    await loadDetail(selectedId.value)
    currentStep.value = 1
  } catch (e) {
    message.error(e.response?.data?.detail || e.message)
    await loadDetail(selectedId.value)
  } finally {
    analyzing.value = false
  }
}

function removeProject() {
  Modal.confirm({
    title: '确认删除该项目？',
    content: '将删除 ZIP 与各阶段分析结果',
    okType: 'danger',
    onOk: async () => {
      await api.deleteProject(selectedId.value)
      selectedId.value = null
      detail.value = null
      clearNoticeDetailCache()
      currentStep.value = 0
      await loadProjects()
      message.success('已删除')
    },
  })
}

watch(selectedId, (id, prev) => {
  if (id !== prev) clearNoticeDetailCache()
  if (!id) currentStep.value = 0
})

async function bootstrapApp() {
  await refreshHealth()
  await loadProjects()
}

async function checkAuth() {
  authChecking.value = true
  try {
    if (!getToken()) {
      authed.value = false
      currentUser.value = null
      return
    }
    const { data } = await api.me()
    currentUser.value = data.user
    authed.value = true
    await bootstrapApp()
  } catch {
    setToken('')
    authed.value = false
    currentUser.value = null
  } finally {
    authChecking.value = false
  }
}

async function onLoginSuccess(user) {
  currentUser.value = user
  authed.value = true
  await bootstrapApp()
}

async function doLogout() {
  try {
    await api.logout()
  } catch {
    /* ignore */
  }
  setToken('')
  authed.value = false
  currentUser.value = null
  mainView.value = 'project'
  projects.value = []
  selectedId.value = null
  detail.value = null
  message.success('已退出登录')
}

function onAuthExpired() {
  if (!authed.value) return
  setToken('')
  authed.value = false
  currentUser.value = null
  mainView.value = 'project'
  message.warning('登录已过期，请重新登录')
}

onMounted(async () => {
  window.addEventListener('auth:expired', onAuthExpired)
  await checkAuth()
})

onUnmounted(() => {
  window.removeEventListener('auth:expired', onAuthExpired)
})
</script>

<style scoped>
.auth-loading {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}
.layout { min-height: 100vh; }
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #001529;
  padding: 0 20px;
}
.brand { display: flex; align-items: center; gap: 12px; }
.title { color: #fff; font-size: 16px; font-weight: 600; }
.header-right { display: flex; align-items: center; gap: 12px; }
.user-name { color: rgba(255, 255, 255, 0.85); font-size: 13px; }
.sider { border-right: 1px solid #f0f0f0; padding-top: 8px; overflow: auto; }
.sider-title { padding: 8px 16px; color: #8c8c8c; font-size: 12px; }
.sider-admin { margin-top: 16px; border-top: 1px solid #f0f0f0; padding-top: 16px; }
.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.menu-item .name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.content { margin: 16px; display: flex; flex-direction: column; gap: 12px; }
.project-bar-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.project-name { font-size: 16px; font-weight: 600; }
.project-meta { color: #8c8c8c; font-size: 13px; margin-top: 4px; }
.steps-card :deep(.ant-card-body) { padding: 12px 16px; }
.inst-doc {
  font-size: 12px;
  color: #595959;
  margin-bottom: 8px;
  word-break: break-all;
}
.inst-att-item {
  cursor: pointer;
}
.inst-att-item.active {
  background: #e6f4ff;
}
.inst-att-item.done {
  border-left: 3px solid #52c41a;
}
.link-list {
  margin: 4px 0 0;
  padding-left: 18px;
  color: #595959;
  font-size: 12px;
}
.tpl-preview {
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 240px;
  overflow: auto;
  margin: 0;
  font-size: 12px;
  color: #434343;
  background: #fafafa;
  padding: 8px;
}
.brief-points {
  margin: 0;
  padding-left: 18px;
  color: #434343;
  font-size: 13px;
}
.muted { color: #8c8c8c; font-size: 12px; }
.meta-link {
  color: #1677ff;
  cursor: pointer;
  font-size: 13px;
}
.meta-link:hover { text-decoration: underline; }
.zip-tree-meta { margin-bottom: 8px; }
.zip-tree-wrap {
  max-height: 480px;
  overflow: auto;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 12px 8px;
  background: #fafafa;
}
.zip-tree-node {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.zip-tree-name { word-break: break-all; }
.zip-tree-size { color: #8c8c8c; font-size: 12px; }
.org-chart-preview {
  border: 1px solid #f0f0f0;
  background: #fafafa;
  padding: 8px;
  overflow: auto;
  margin-bottom: 12px;
  min-height: 140px;
}
.org-chart-preview :deep(svg) {
  display: block;
  max-width: 100%;
  height: auto;
}
</style>
