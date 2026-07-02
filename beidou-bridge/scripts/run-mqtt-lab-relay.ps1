# MQTT 双机联调：中转机侧（Mock 北斗 + bridge + register）
#
# 前提：中转机已安装并启动 EMQX/Mosquitto（1883 监听 0.0.0.0）
#
# 用法：
#   powershell -ExecutionPolicy Bypass -File scripts/run-mqtt-lab-relay.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/run-mqtt-lab-relay.ps1 -CallbackPort 19090 -Frequency 4000
#
param(
  [string]$ConfigDir = "./config/site",
  [int]$Frequency = 4000,
  [int]$CallbackPort = 19090,
  [int]$MonitorRounds = 8,
  [switch]$SkipRegister
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root
. "$root\scripts\ps-utils.ps1"

$simDir = Join-Path $root "data-sim"
New-Item -ItemType Directory -Force -Path $simDir | Out-Null

function Stop-Port($port) {
  Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " MQTT Lab - RELAY side (Mock Beidou + bridge)" -ForegroundColor Cyan
Write-Host " Vehicle sim runs on 5G PC -> see SIMULATE-vehicle.bat" -ForegroundColor White
Write-Host " Doc: docs/MQTT联调实验室-双机测试.md" -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor Cyan

# 检查 1883
$mqttListen = Get-NetTCPConnection -LocalPort 1883 -State Listen -ErrorAction SilentlyContinue
if (-not $mqttListen) {
  Write-Host ""
  Write-Host "[WARN] 本机 1883 未监听。请先安装并启动 EMQX 或 Mosquitto。" -ForegroundColor Red
  Write-Host "       Mosquitto: 监听地址设为 0.0.0.0，允许 5G 电脑连接。" -ForegroundColor Yellow
  Write-Host ""
  $cont = Read-Host "仍继续启动 bridge? (y/N)"
  if ($cont -ne "y" -and $cont -ne "Y") { exit 1 }
}

Write-Host "`n[1/5] build..." -ForegroundColor Yellow
npm run build | Out-Null
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "[2/5] stop old ports 8080/$CallbackPort..." -ForegroundColor Yellow
Stop-Port 8080
Stop-Port $CallbackPort
Start-Sleep -Seconds 1

Write-Host "[3/5] start Mock Beidou (port $CallbackPort)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
Set-Location '$root'
`$env:MOCK_BEIDOU_PORT='$CallbackPort'
node scripts/sim/mock-beidou-server.mjs
"@
Start-Sleep -Seconds 2

Write-Host "[4/5] start bridge (CONFIG_DIR=$ConfigDir, dataSource=mqtt)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
Set-Location '$root'
`$env:CONFIG_DIR='$ConfigDir'
node dist/main.js
"@
Start-Sleep -Seconds 5

$health = Invoke-RestMethod -Uri "http://127.0.0.1:8080/health" -ErrorAction SilentlyContinue
Write-Host "health: $($health | ConvertTo-Json -Compress)"

if (-not $SkipRegister) {
  $callbackUrl = "http://127.0.0.1:${CallbackPort}/callback"
  Write-Host "[5/5] Mock Beidou -> register ($callbackUrl)..." -ForegroundColor Yellow
  $regBody = @{ url = $callbackUrl; frequency = $Frequency } | ConvertTo-Json
  $reg = Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:8080/api/v1/beidou/callback/register" `
    -ContentType "application/json" -Body $regBody
  Write-Host ($reg | ConvertTo-Json -Depth 5 -Compress)
} else {
  Write-Host "[5/5] skip register (-SkipRegister)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " 中转机侧已就绪。下一步在 5G 模拟电脑上运行：" -ForegroundColor Green
Write-Host "   SIMULATE-vehicle.bat  （输入本机 IP）" -ForegroundColor Yellow
Write-Host ""
Write-Host " 验收：Mock Beidou 窗口应周期性出现 PUSH，code=1000" -ForegroundColor Cyan
Write-Host " 日志：data-sim/push-log.jsonl" -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor Green

Write-Host "`n等待 ${MonitorRounds} 轮推送（每 4s 检查 push-log）..." -ForegroundColor Yellow
$pushLog = Join-Path $simDir "push-log.jsonl"
$before = 0
if (Test-Path $pushLog) { $before = (Get-Content $pushLog | Measure-Object -Line).Lines }

for ($i = 1; $i -le $MonitorRounds; $i++) {
  Start-Sleep -Seconds 4
  $after = 0
  if (Test-Path $pushLog) { $after = (Get-Content $pushLog | Measure-Object -Line).Lines }
  $delta = $after - $before
  Write-Host "  round $i/$MonitorRounds  push-log lines +$delta (total $after)" -ForegroundColor $(if ($delta -gt 0) { "Green" } else { "DarkYellow" })
  if ($delta -gt 0) { $before = $after }
}

if ($after -gt 0) {
  Write-Host "`nOK: 已收到北斗回调推送。双机链路 READ 路径正常。" -ForegroundColor Green
} else {
  Write-Host "`nWARN: push-log 仍为空。请确认 5G 电脑已运行 SIMULATE-vehicle.bat 且 mqttConnected=true" -ForegroundColor Red
}
