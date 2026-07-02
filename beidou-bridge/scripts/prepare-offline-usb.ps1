# 出发前：检查离线 U 盘物料 + 生成部署 zip
# 用法: powershell -ExecutionPolicy Bypass -File scripts/prepare-offline-usb.ps1
#       powershell -ExecutionPolicy Bypass -File scripts/prepare-offline-usb.ps1 -BuildZip
param(
  [switch]$BuildZip,
  [string]$UsbRoot = ""
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $root

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " 中转机离线 U 盘准备清单（MQTT 模式 · 无外网）" -ForegroundColor Cyan
Write-Host " 详细步骤: docs/中转机离线部署手册-MQTT模式.md" -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor Cyan

if ($BuildZip) {
  Write-Host "`n[build] npm run package:site ..." -ForegroundColor Yellow
  npm run package:site
  if ($LASTEXITCODE -ne 0) { exit 1 }
}

$releaseDir = Join-Path $root "release"
$latestZip = Get-ChildItem -Path $releaseDir -Filter "beidou-bridge-site-*.zip" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

$required = @(
  @{
    Name = "beidou-bridge 部署 zip"
    Path = if ($latestZip) { $latestZip.FullName } else { Join-Path $releaseDir "beidou-bridge-site-YYYYMMDD.zip" }
    Hint = "npm run package:site"
  }
  @{
    Name = "Node.js 20 LTS Windows x64 .msi"
    Path = $null
    Hint = "https://nodejs.org/ -> 拷到 U 盘根目录"
  }
  @{
    Name = "Mosquitto Windows installer .exe"
    Path = $null
    Hint = "https://mosquitto.org/download/ -> 拷到 U 盘"
  }
)

$optional = @(
  "docs/中转机离线部署手册-MQTT模式.md",
  "docs/MQTT联调实验室-双机测试.md",
  "docs/给北斗方-接口一页纸.txt",
  "docs/现场安装与真北斗联调教程.md",
  "config/site/mosquitto-onsite.conf.example"
)

Write-Host "`n--- 必带（U 盘）---" -ForegroundColor Yellow
foreach ($item in $required) {
  $ok = $item.Path -and (Test-Path -LiteralPath $item.Path)
  $mark = if ($ok) { "[OK]  " } else { "[缺]  " }
  $color = if ($ok) { "Green" } else { "Red" }
  Write-Host "$mark $($item.Name)" -ForegroundColor $color
  if ($item.Path) { Write-Host "       $($item.Path)" -ForegroundColor Gray }
  if (-not $ok) { Write-Host "       -> $($item.Hint)" -ForegroundColor DarkYellow }
}

Write-Host "`n--- 建议一并拷贝（仓库 docs/）---" -ForegroundColor Yellow
foreach ($rel in $optional) {
  $p = Join-Path $root $rel
  if (Test-Path -LiteralPath $p) {
    Write-Host "[OK]   $rel" -ForegroundColor Green
  } else {
    Write-Host "[缺]   $rel" -ForegroundColor DarkYellow
  }
}

Write-Host "`n--- 中转机不需要 ---" -ForegroundColor Gray
Write-Host "  .env / CLOUD_* 云账号（dataSource=mqtt）"
Write-Host "  外网 / sztu.lingubot.cn"
Write-Host "  在中转机执行 npm install"

Write-Host "`n--- 中转机到场顺序 ---" -ForegroundColor Cyan
Write-Host "  1. 装 Node.js 20"
Write-Host "  2. 装 Mosquitto + listener 1883 0.0.0.0"
Write-Host "  3. 解压 zip -> D:\beidou-bridge"
Write-Host "  4. OPEN-firewall-1883.bat + OPEN-firewall-8080.bat"
Write-Host "  5. CHECK-env.bat"
Write-Host "  6. RUN-mqtt-lab-relay.bat（Mock 自测）或 START-bridge.bat（接北斗）"
Write-Host "  7. 5G 电脑 SIMULATE-vehicle.bat"

if ($UsbRoot -and (Test-Path -LiteralPath $UsbRoot)) {
  Write-Host "`n--- 复制到 U 盘: $UsbRoot ---" -ForegroundColor Yellow
  if ($latestZip) {
    Copy-Item -LiteralPath $latestZip.FullName -Destination $UsbRoot -Force
    Write-Host "copied $($latestZip.Name)" -ForegroundColor Green
  }
  $usbDocs = Join-Path $UsbRoot "beidou-bridge-docs"
  New-Item -ItemType Directory -Force -Path $usbDocs | Out-Null
  foreach ($rel in $optional) {
    $src = Join-Path $root $rel
    if (Test-Path -LiteralPath $src) {
      Copy-Item -LiteralPath $src -Destination (Join-Path $usbDocs (Split-Path $rel -Leaf)) -Force
    }
  }
  Write-Host "docs copied to $usbDocs" -ForegroundColor Green
  Write-Host "请手动拷贝 Node.msi 与 Mosquitto.exe 到 U 盘" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
