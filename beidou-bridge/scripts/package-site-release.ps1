# 打包现场部署包（给北斗提供的中转机 / 孟泽现场安装）
# 用法: powershell -ExecutionPolicy Bypass -File scripts/package-site-release.ps1
param(
  [string]$OutDir = ""
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $root

Write-Host "=== build ===" -ForegroundColor Cyan
if (-not (Test-Path "node_modules\typescript")) {
  Write-Host "dev deps missing, running npm ci..." -ForegroundColor Yellow
  npm ci
  if ($LASTEXITCODE -ne 0) { exit 1 }
}
npm run build
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "=== npm ci (production, for offline zip) ===" -ForegroundColor Cyan
npm ci --omit=dev
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
Copy-Rel "node_modules"
Copy-Rel "config/site"
# mosquitto example lives under config/site
Copy-Rel "package.json"
Copy-Rel "package-lock.json"
Copy-Rel ".env.example"

# onsite one-click bats (ASCII names for zip compatibility)
@(
  "CHECK-env.bat",
  "START-bridge.bat",
  "QUERY-vehicle.bat",
  "OPEN-firewall-8080.bat",
  "OPEN-firewall-1883.bat",
  "SIMULATE-vehicle.bat",
  "RUN-mqtt-lab-relay.bat",
  "PREPARE-offline-usb.bat",
  "现场-检查环境.bat",
  "现场-启动中转.bat",
  "现场-查云车辆.bat",
  "现场-开放8080防火墙.bat"
) | ForEach-Object {
  $src = Join-Path $root $_
  if (Test-Path -LiteralPath $src) {
    Copy-Item -LiteralPath $src -Destination (Join-Path $OutDir $_) -Force
    Write-Host "  copied $_"
  }
}

# scripts
@(
  "scripts/site-start.bat",
  "scripts/load-dotenv.ps1",
  "scripts/ps-utils.ps1",
  "scripts/pre-site-check.ps1",
  "scripts/query-admin-device.ps1",
  "scripts/run-pre-site-b1.ps1",
  "scripts/run-simulation-lab.ps1",
  "scripts/run-mqtt-lab-relay.ps1",
  "scripts/prepare-offline-usb.ps1",
  "scripts/sim/mock-beidou-server.mjs",
  "scripts/sim/vehicle-mqtt-simulator.mjs",
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
Get-ChildItem -LiteralPath $docsSrc -File | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $docsDest $_.Name) -Force
}
# onsite checklist docx
$checklistDocx = Join-Path $root "docs\到场确认清单.docx"
if (Test-Path -LiteralPath $checklistDocx) {
  Copy-Item -LiteralPath $checklistDocx -Destination (Join-Path $docsDest "到场确认清单.docx") -Force
}

# quick start at package root
@'
beidou-bridge 现场部署包（MQTT 模式 · 中转机无外网）
==================================================

【中转机到场 6 步 — 无需外网、无需 .env】
1. 装 Node.js 20+（U 盘 node-v20.*.msi）
2. 装 Mosquitto，mosquitto.conf 末尾加 listener 1883 0.0.0.0 / allow_anonymous true
3. 解压本 zip 到 D:\beidou-bridge
4. 管理员运行 OPEN-firewall-1883.bat 与 OPEN-firewall-8080.bat
5. 双击 CHECK-env.bat（FAIL=0 再继续）
6. 双击 START-bridge.bat（接北斗）或 RUN-mqtt-lab-relay.bat（Mock 自测）

详细逐步说明（必读）:
  docs\中转机离线部署手册-MQTT模式.md

5G 模拟电脑（测完整链路）:
  SIMULATE-vehicle.bat  输入中转机 IP

register 地址（给北斗）:
  POST http://<本机IP>:8080/api/v1/beidou/callback/register
  Body: {"url":"<北斗回调URL>","frequency":4000}

health:
  GET http://<本机IP>:8080/health
  期望: "dataSource":"mqtt","mqttConnected":true

MQTT: 车/5G电脑 -> 中转机:1883  topic dev/pub/LU2606000100
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
Write-Host "Give onsite USB: zip + Node.msi + Mosquitto.exe + docs/中转机离线部署手册-MQTT模式.md"
