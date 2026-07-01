# 模拟联调实验室：真云 + 模拟北斗 + 中转（读/写双链路预演）
#
# 用法：
#   powershell -ExecutionPolicy Bypass -File scripts/run-simulation-lab.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/run-simulation-lab.ps1 -WriteTest -TaskPoint "中德西北角"
#   powershell -ExecutionPolicy Bypass -File scripts/run-simulation-lab.ps1 -MonitorOnly
#
param(
  [string]$DeviceId = "LU2606000100",
  [string]$ConfigDir = "./config/site",
  [int]$Frequency = 4000,
  [int]$CallbackPort = 19090,
  [switch]$WriteTest,
  [string]$TaskPoint = "",
  [switch]$UseCoordinates,
  [double]$X = 21.64,
  [double]$Y = 86.28,
  [double]$Direction = 82,
  [switch]$MonitorOnly,
  [int]$MonitorRounds = 6,
  [switch]$MockCloudLab
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root
. "$root\scripts\load-dotenv.ps1" -ProjectRoot $root | Out-Null
. "$root\scripts\ps-utils.ps1"

$useMockCloud = $MockCloudLab
$placeholderCreds = Test-DotEnvPlaceholderFile (Join-Path $root ".env")
if (-not $useMockCloud -and $placeholderCreds) {
  Write-Host "WARN: .env uses placeholder credentials -> MockCloudLab mode (config/test, lingu_test2)" -ForegroundColor DarkYellow
  $useMockCloud = $true
}

if ($useMockCloud) {
  $ConfigDir = "./config/test"
  $DeviceId = "lingu_test2"
}

$simDir = Join-Path $root "data-sim"
New-Item -ItemType Directory -Force -Path $simDir | Out-Null

function Stop-Port($port) {
  Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " beidou-bridge Simulation Lab (Mock Beidou + Real Cloud)" -ForegroundColor Cyan
Write-Host " READ:  Vehicle -> Cloud -> Bridge -> Mock Beidou ($CallbackPort)" -ForegroundColor White
Write-Host " WRITE: Mock Beidou -> Bridge -> Cloud -> Vehicle" -ForegroundColor White
Write-Host " Doc:   docs/simulation-lab.md (see repo docs folder)" -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor Cyan

if ($MonitorOnly) {
  $monitorArgs = @{
    DeviceId = $DeviceId
    IntervalSec = 5
    MaxRounds = $MonitorRounds
  }
  if ($useMockCloud) { $monitorArgs.MockCloud = $true }
  & "$root\scripts\sim\read-path-monitor.ps1" @monitorArgs
  exit 0
}

Write-Host "`n[1/6] build..." -ForegroundColor Yellow
npm run build | Out-Null
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "[2/6] stop old ports 8080/$CallbackPort..." -ForegroundColor Yellow
Stop-Port 8080
Stop-Port $CallbackPort
Start-Sleep -Seconds 1

Write-Host "[3/6] start Mock Beidou (Node, port $CallbackPort)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
Set-Location '$root'
`$env:MOCK_BEIDOU_PORT='$CallbackPort'
node scripts/sim/mock-beidou-server.mjs
"@
Start-Sleep -Seconds 2

Write-Host "[4/6] start bridge (CONFIG_DIR=$ConfigDir)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
Set-Location '$root'
`$env:CONFIG_DIR='$ConfigDir'
node dist/main.js
"@
Start-Sleep -Seconds 5

$callbackUrl = "http://127.0.0.1:${CallbackPort}/callback"
Write-Host "[5/6] Mock Beidou -> register ($callbackUrl)..." -ForegroundColor Yellow
$regBody = @{ url = $callbackUrl; frequency = $Frequency } | ConvertTo-Json
$reg = Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:8080/api/v1/beidou/callback/register" `
  -ContentType "application/json" -Body $regBody
Write-Host ($reg | ConvertTo-Json -Depth 5 -Compress)

Write-Host "`n[6/6] wait ${Frequency}ms + monitor read path ($MonitorRounds rounds)..." -ForegroundColor Yellow
Start-Sleep -Seconds ([math]::Ceiling($Frequency / 1000) + 2)

$monitorArgs = @{
  DeviceId = $DeviceId
  IntervalSec = 4
  MaxRounds = $MonitorRounds
}
if ($useMockCloud) { $monitorArgs.MockCloud = $true }
& "$root\scripts\sim\read-path-monitor.ps1" @monitorArgs

if ($WriteTest) {
  Write-Host "`n--- WRITE PATH TEST ---" -ForegroundColor Cyan
  if ($TaskPoint) {
    & "$root\scripts\sim\write-path-test.ps1" -DeviceId $DeviceId -TaskPoint $TaskPoint
  } elseif ($UseCoordinates) {
    & "$root\scripts\sim\write-path-test.ps1" -DeviceId $DeviceId -UseCoordinates -X $X -Y $Y -Direction $Direction
  } else {
    Write-Host "Skip write test (use -WriteTest -TaskPoint 'name' or -UseCoordinates)" -ForegroundColor Yellow
  }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " Lab running. Windows open:" -ForegroundColor Green
Write-Host "   - Mock Beidou ($CallbackPort): should show periodic PUSH" -ForegroundColor Gray
Write-Host "   - Bridge (8080): scheduler logs" -ForegroundColor Gray
Write-Host ""
Write-Host " Manual write test:" -ForegroundColor Yellow
Write-Host '   scripts\sim\write-path-test.ps1 -TaskPoint "station-name"' -ForegroundColor Gray
Write-Host " Monitor only:" -ForegroundColor Yellow
Write-Host "   scripts\run-simulation-lab.ps1 -MonitorOnly" -ForegroundColor Gray
Write-Host ""
Write-Host " After OK -> deploy to site PC -> connect real Beidou" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Green
