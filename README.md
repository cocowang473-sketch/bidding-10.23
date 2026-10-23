<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/a89e0039-62d6-4856-93d2-1f6c89ca33aa

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## 招标文件智能解读(接 aivl 后端)

左侧栏顶部的"招标文件智能解读 → 招标公告智能解读 / 投标须知工作台"两个入口依赖同仓库下的 `aivl/aivl/` FastAPI 后端。前端在启动时会通过 Vite 代理 `/aivl/*` 转发到 `http://127.0.0.1:8000/api/*`,并以默认账号 `admin / Aivl@2026!Bid#9x` 静默登录,token 存入 localStorage。

**首次启动后端(Windows):**

```bash
cd aivl/aivl
pip install -r requirements.txt
# 编辑 .env,填入有效的 DASHSCOPE_API_KEY=sk-xxx(阿里云灵积模型)
python run.py          # 监听 127.0.0.1:8000
```

验证后端:浏览器访问 `http://127.0.0.1:8000/api/health`,应返回 `{ok: true, llm_configured: true, ...}`。

**使用流程:**

1. 侧栏点击"招标公告智能解读" → 弹出 ZIP 导入模态框
2. 拖入机电分包招标文件 ZIP(含"1.1 招标通告.doc"、"2.1 投标须知.doc"、"附件 01-09")
3. 完成导入后点"开始分析",后端 LLM 抽取结构化字段
4. 点"一键回填标书变量"将公告字段写入全案变量库
5. 切到"投标须知工作台",点"分析须知正文"生成摘要;逐项编制 9 份附件
6. 全部完成后点"完成须知编制并写入全局参数",强制规则(固定总价/币种/外汇)会被摘要到计价参数中
7. 顶部"报价汇总导出"将出现"3. 招标公告解读摘要"与"4. 投标须知与附件清单"两个新 tab

**自定义后端地址:**

启动前端时设置环境变量 `AIVL_BACKEND`:

```bash
AIVL_BACKEND=http://your-host:8000 npm run dev
```

**后端未启动的降级表现:** 两个新视图顶部会显示黄色提示 banner,其他功能(清单组价/变量编辑/询价)仍可正常使用。
