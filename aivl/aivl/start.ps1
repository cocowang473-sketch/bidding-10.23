param(
  [int]$Port = 0
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$env:NO_PROXY = '*'
Remove-Item Env:HTTP_PROXY, Env:HTTPS_PROXY, Env:http_proxy, Env:https_proxy -ErrorAction SilentlyContinue

if (-not (Test-Path (Join-Path $Root '.env'))) {
  if (Test-Path (Join-Path $Root '.env.example')) {
    Copy-Item (Join-Path $Root '.env.example') (Join-Path $Root '.env')
    Write-Host '已生成 .env，请先修改 AUTH_PASSWORD 与 DASHSCOPE_API_KEY 后再用。'
  } else {
    throw '缺少 .env / .env.example'
  }
}

$VenvPy = Join-Path $Root '.venv\Scripts\python.exe'
if (-not (Test-Path $VenvPy)) {
  Write-Host '创建虚拟环境…'
  py -3 -m venv .venv
  if (-not (Test-Path $VenvPy)) {
    python -m venv .venv
  }
}

Write-Host '安装依赖…'
& $VenvPy -m pip install -U pip
& $VenvPy -m pip install -r requirements.txt

New-Item -ItemType Directory -Force (Join-Path $Root 'uploads') | Out-Null
New-Item -ItemType Directory -Force (Join-Path $Root 'logs') | Out-Null

if ($Port -gt 0) { $env:PORT = "$Port" }

$listenPort = if ($env:PORT) { $env:PORT } else { '8000' }
Write-Host "启动服务 http://0.0.0.0:$listenPort"
& $VenvPy run.py
