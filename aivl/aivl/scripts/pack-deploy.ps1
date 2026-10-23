param(
  [string]$OutDir = "",
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root

$stamp = Get-Date -Format "yyyyMMdd-HHmm"
$ReleaseRoot = if ($OutDir) { $OutDir } else { Join-Path $Root "release" }
$PkgName = "aivl-deploy-$stamp"
$PkgDir = Join-Path $ReleaseRoot $PkgName
$ZipPath = Join-Path $ReleaseRoot "$PkgName.zip"

Write-Host "Root: $Root"
Write-Host "Package: $PkgDir"

if (-not $SkipBuild) {
  Write-Host "Building frontend..."
  Push-Location (Join-Path $Root "web")
  if (-not (Test-Path "node_modules")) {
    npm install
  }
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }
  Pop-Location
}

if (-not (Test-Path (Join-Path $Root "static\index.html"))) {
  throw "Frontend build missing: static/index.html"
}

if (Test-Path $PkgDir) { Remove-Item -Recurse -Force $PkgDir }
New-Item -ItemType Directory -Force $PkgDir | Out-Null
New-Item -ItemType Directory -Force $ReleaseRoot | Out-Null

$copyItems = @(
  "app",
  "static",
  "templates",
  "requirements.txt",
  "run.py",
  "start.ps1",
  "start.sh",
  ".env.example",
  "DEPLOY.md",
  "README.md"
)

foreach ($item in $copyItems) {
  $src = Join-Path $Root $item
  if (-not (Test-Path $src)) {
    Write-Warning "Skip missing: $item"
    continue
  }
  $dest = Join-Path $PkgDir $item
  if (Test-Path $src -PathType Container) {
    Copy-Item -Recurse -Force $src $dest
  } else {
    Copy-Item -Force $src $dest
  }
}

Get-ChildItem -Path $PkgDir -Recurse -Directory -Filter "__pycache__" -ErrorAction SilentlyContinue |
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path $PkgDir -Recurse -Filter "*.pyc" -ErrorAction SilentlyContinue |
  Remove-Item -Force -ErrorAction SilentlyContinue

New-Item -ItemType Directory -Force (Join-Path $PkgDir "uploads") | Out-Null
New-Item -ItemType Directory -Force (Join-Path $PkgDir "logs") | Out-Null

$readmeLines = @(
  "1. Copy .env.example to .env and fill secrets.",
  "2. Windows: run start.ps1",
  "3. Linux: chmod +x start.sh && ./start.sh",
  "4. Open http://SERVER_IP:8000"
)
[System.IO.File]::WriteAllLines((Join-Path $PkgDir "PLEASE_READ.txt"), $readmeLines)

if (Test-Path $ZipPath) { Remove-Item -Force $ZipPath }
Compress-Archive -Path $PkgDir -DestinationPath $ZipPath -Force

Write-Host ""
Write-Host "Done."
Write-Host "  Dir: $PkgDir"
Write-Host "  Zip: $ZipPath"
