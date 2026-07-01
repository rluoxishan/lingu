# 打包现场部署包（给北斗提供的中转机 / 孟泽现场安装）
# 用法: powershell -ExecutionPolicy Bypass -File scripts/package-site-release.ps1
param(
  [string]$OutDir = ""
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $root

Write-Host "=== build ===" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { exit 1 }

$stamp = Get-Date -Format "yyyyMMdd"
$releaseName = "beidou-bridge-site-$stamp"
if (-not $OutDir) { $OutDir = Join-Path $root "release\$releaseName" }
else { $OutDir = Join-Path (Resolve-Path $OutDir).Path $releaseName }

if (Test-Path $OutDir) { Remove-Item $OutDir -Recurse -Force }
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

function Copy-Rel($rel) {
  $src = Join-Path $root $rel
  if (-not (Test-Path $src)) {
    Write-Warning "skip missing: $rel"
    return
  }
  $dest = Join-Path $OutDir $rel
  $parent = Split-Path $dest -Parent
  New-Item -ItemType Directory -Force -Path $parent | Out-Null
  Copy-Item $src $dest -Recurse -Force
}

Write-Host "=== copy files ===" -ForegroundColor Cyan

# runtime
Copy-Rel "dist"
Copy-Rel "config/site"
Copy-Rel "package.json"
Copy-Rel "package-lock.json"
Copy-Rel ".env.example"

# scripts
@(
  "scripts/site-start.bat",
  "scripts/load-dotenv.ps1",
  "scripts/ps-utils.ps1",
  "scripts/pre-site-check.ps1",
  "scripts/query-admin-device.ps1",
  "scripts/run-pre-site-b1.ps1",
  "scripts/run-simulation-lab.ps1",
  "scripts/sim/mock-beidou-server.mjs",
  "scripts/sim/read-path-monitor.ps1",
  "scripts/sim/write-path-test.ps1",
  "scripts/windows/install.ps1",
  "scripts/windows/start-bridge.bat",
  "scripts/windows/register-autostart.ps1",
  "scripts/windows/unregister-autostart.ps1"
) | ForEach-Object { Copy-Rel $_ }

Copy-Rel "AGENTS.md"
$ruleSrc = Join-Path $root ".cursor\rules\mengze-onsite-lab.mdc"
if (Test-Path $ruleSrc) {
  $ruleDest = Join-Path $OutDir ".cursor\rules"
  New-Item -ItemType Directory -Force -Path $ruleDest | Out-Null
  Copy-Item -LiteralPath $ruleSrc -Destination (Join-Path $ruleDest "mengze-onsite-lab.mdc") -Force
}

# all markdown docs for onsite
$docsSrc = Join-Path $root "docs"
$docsDest = Join-Path $OutDir "docs"
New-Item -ItemType Directory -Force -Path $docsDest | Out-Null
Get-ChildItem -LiteralPath $docsSrc -Filter "*.md" -File | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $docsDest $_.Name) -Force
}

# quick start at package root
@'
beidou-bridge 现场部署包
======================

1. 安装 Node.js 20+ https://nodejs.org/
2. 复制 .env.example 为 .env，填写 CLOUD_* 账号
3. 双击或在 PowerShell 运行: scripts\site-start.bat
4. 验证: Invoke-RestMethod http://127.0.0.1:8080/health

Cursor AI: open folder in Cursor, open docs\孟泽-AI联调助手.md, say:
  我是孟泽，要进行联调测试，请按 docs/孟泽-AI联调助手.md 带我做完。

详细说明见 docs\给孟泽-现场部署包说明.md

注意: 中转机由北斗方提供；.env 含密码勿外泄。
'@ | Set-Content (Join-Path $OutDir "README-DEPLOY.txt") -Encoding UTF8

# onsite one-click install (needs network for npm ci if dist incomplete)
@'
@echo off
setlocal
cd /d "%~dp0"
echo === beidou-bridge onsite install ===
where node >nul 2>&1 || (
  echo [ERROR] Install Node.js 20+ first: https://nodejs.org/
  exit /b 1
)
if not exist ".env" if exist ".env.example" copy .env.example .env
if not exist "dist\main.js" (
  echo building...
  call npm ci
  call npm run build
)
echo.
echo Edit .env then run: scripts\site-start.bat
pause
'@ | Set-Content (Join-Path $OutDir "INSTALL.bat") -Encoding ASCII

$zipPath = "$OutDir.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path $OutDir -DestinationPath $zipPath -Force

Write-Host ""
Write-Host "=== done ===" -ForegroundColor Green
Write-Host "Folder: $OutDir"
Write-Host "Zip:    $zipPath"
Write-Host "Give 孟泽: zip + .env (separate, not in zip) + docs/给孟泽-现场部署包说明.md"
