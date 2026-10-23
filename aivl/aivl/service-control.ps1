param(
  [switch]$Stop,
  [switch]$NoBrowser,
  [string]$Python
)

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Py = if ($Python) { $Python } else { Join-Path $Root '.venv\Scripts\python.exe' }
$WebDir = Join-Path $Root 'web'
$LogDir = Join-Path $Root 'logs'
New-Item -ItemType Directory -Force $LogDir | Out-Null

function Get-PidOnPort([int]$port) {
  @(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | ForEach-Object { $_.OwningProcess } | Sort-Object -Unique)
}

if ($Stop) {
  foreach ($p in 8000, 5173) {
    foreach ($id in Get-PidOnPort $p) { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue }
  }
  Write-Host 'stopped'
  exit 0
}

$env:NO_PROXY = '*'
Remove-Item Env:HTTP_PROXY,Env:HTTPS_PROXY,Env:http_proxy,Env:https_proxy -ErrorAction SilentlyContinue

if (-not (Get-PidOnPort 8000)) {
  Start-Process -FilePath $Py -ArgumentList 'run.py' -WorkingDirectory $Root `
    -RedirectStandardOutput (Join-Path $LogDir 'server.log') `
    -RedirectStandardError (Join-Path $LogDir 'server.err') -WindowStyle Hidden
}

if (-not (Get-PidOnPort 5173)) {
  Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'npm run dev' -WorkingDirectory $WebDir `
    -RedirectStandardOutput (Join-Path $LogDir 'vite.log') `
    -RedirectStandardError (Join-Path $LogDir 'vite.err') -WindowStyle Hidden
}

for ($i = 0; $i -lt 40; $i++) {
  if ((Get-PidOnPort 8000) -and (Get-PidOnPort 5173)) { break }
  Start-Sleep -Milliseconds 500
}

Write-Host 'backend :8000  frontend :5173'
if (-not $NoBrowser) { Start-Process 'http://localhost:5173' }
