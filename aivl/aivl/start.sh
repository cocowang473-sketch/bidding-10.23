#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

export NO_PROXY='*'
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy || true

if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    echo "已生成 .env，请先修改 AUTH_PASSWORD 与 DASHSCOPE_API_KEY"
  else
    echo "缺少 .env / .env.example" >&2
    exit 1
  fi
fi

# 去掉 Windows CRLF，避免 source .env 报 $'\r': command not found
sed -i 's/\r$//' .env start.sh 2>/dev/null || true

if [[ ! -x .venv/bin/python ]]; then
  echo "创建虚拟环境…"
  python3 -m venv .venv
fi

echo "安装依赖…"
.venv/bin/python -m pip install -U pip
.venv/bin/python -m pip install -r requirements.txt

mkdir -p uploads logs

# 把 .env 导出到环境（兼容 PORT/HOST）
set -a
# shellcheck disable=SC1091
source <(sed 's/\r$//' .env)
set +a

echo "启动服务 http://0.0.0.0:${PORT:-8000}"
exec .venv/bin/python run.py
