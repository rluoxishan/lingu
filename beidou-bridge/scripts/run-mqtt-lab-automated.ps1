# 本机自动化：local MQTT broker + Mock 北斗 + bridge + 模拟车 → 验收 READ 链路
# 用法: powershell -ExecutionPolicy Bypass -File scripts/run-mqtt-lab-automated.ps1
param(
  [int]$Frequency = 4000,
  [int]$CallbackPort = 19090,
  [int]$SimSeconds = 12
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $root
. "$root\scripts\ps-utils.ps1"

$simDir = Join-Path $root "data-sim"
New-Item -ItemType Directory -Force -Path $simDir | Out-Null
$pushLog = Join-Path $simDir "push-log.jsonl"
if (Test-Path $pushLog) { Remove-Item $pushLog -Force }

function Stop-Port($port) {
  Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

function Stop-JobTree($job) {
  if (-not $job) { return }
  Stop-Job $job -ErrorAction SilentlyContinue
  Remove-Job $job -Force -ErrorAction SilentlyContinue
}

$jobs = @()
$failed = $false
$report = [ordered]@{}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " MQTT Lab Automated Check (Mock Beidou + Vehicle Sim)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

try {
  Write-Host "`n[1/8] npm run build" -ForegroundColor Yellow
  npm run build | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "build failed" }
  $report["build"] = "OK"

  Write-Host "[2/8] stop ports 1883/8080/$CallbackPort" -ForegroundColor Yellow
  Stop-Port 1883
  Stop-Port 8080
  Stop-Port $CallbackPort
  Start-Sleep -Seconds 1

  Write-Host "[3/8] start local MQTT broker :1883" -ForegroundColor Yellow
  $jobs += Start-Job -ScriptBlock {
    param($r)
    Set-Location $r
    node scripts/sim/local-mqtt-broker.mjs 2>&1
  } -ArgumentList $root
  Start-Sleep -Seconds 2
  $mqttListen = Get-NetTCPConnection -LocalPort 1883 -State Listen -ErrorAction SilentlyContinue
  if (-not $mqttListen) { throw "local MQTT broker not listening on 1883 (npm install aedes?)" }
  $report["mqtt_broker"] = "OK"

  Write-Host "[4/8] start Mock Beidou :$CallbackPort" -ForegroundColor Yellow
  $jobs += Start-Job -ScriptBlock {
    param($r, $p)
    Set-Location $r
    $env:MOCK_BEIDOU_PORT = "$p"
    node scripts/sim/mock-beidou-server.mjs 2>&1
  } -ArgumentList $root, $CallbackPort
  Start-Sleep -Seconds 2

  Write-Host "[5/8] start bridge (CONFIG_DIR=./config/site, dataSource=mqtt)" -ForegroundColor Yellow
  $jobs += Start-Job -ScriptBlock {
    param($r)
    Set-Location $r
    $env:CONFIG_DIR = "./config/site"
    node dist/main.js 2>&1
  } -ArgumentList $root
  Start-Sleep -Seconds 5

  $health = Invoke-RestMethod -Uri "http://127.0.0.1:8080/health" -TimeoutSec 5
  if ($health.dataSource -ne "mqtt") { throw "health dataSource=$($health.dataSource), expected mqtt" }
  if ($health.mqttConnected -ne $true) { throw "health mqttConnected=$($health.mqttConnected), expected true" }
  $report["health"] = "OK dataSource=mqtt mqttConnected=true"

  Write-Host "[6/8] register Mock Beidou callback" -ForegroundColor Yellow
  $callbackUrl = "http://127.0.0.1:${CallbackPort}/callback"
  $regBody = @{ url = $callbackUrl; frequency = $Frequency } | ConvertTo-Json
  $reg = Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:8080/api/v1/beidou/callback/register" `
    -ContentType "application/json" -Body $regBody -TimeoutSec 10
  if ($reg.code -ne 0) { throw "register failed: $($reg | ConvertTo-Json -Compress)" }
  $report["register"] = "OK vehicleIds=$($reg.data.vehicleIds -join ',')"

  Write-Host "[7/8] run vehicle MQTT simulator ${SimSeconds}s" -ForegroundColor Yellow
  $simProc = Start-Process -FilePath "node" `
    -ArgumentList @("scripts/sim/vehicle-mqtt-simulator.mjs", "--broker", "mqtt://127.0.0.1:1883", "--interval", "800") `
    -WorkingDirectory $root -PassThru -NoNewWindow
  Start-Sleep -Seconds $SimSeconds
  if (-not $simProc.HasExited) {
    Stop-Process -Id $simProc.Id -Force -ErrorAction SilentlyContinue
  }

  Write-Host "[8/8] verify push-log + stats" -ForegroundColor Yellow
  Start-Sleep -Seconds ([math]::Ceiling($Frequency / 1000) + 2)

  $pushLines = 0
  if (Test-Path $pushLog) {
    $pushLines = (Get-Content $pushLog | Measure-Object -Line).Lines
  }
  $statsFile = Join-Path $simDir "mock-beidou-stats.json"
  $pushCount = 0
  if (Test-Path $statsFile) {
    $stats = Get-Content $statsFile -Raw | ConvertFrom-Json
    $pushCount = [int]$stats.pushCount
  }

  if ($pushLines -lt 1 -or $pushCount -lt 1) {
    throw "no Beidou PUSH received (push-log lines=$pushLines, mock pushCount=$pushCount)"
  }

  $lastLine = Get-Content $pushLog -Tail 1 | ConvertFrom-Json
  $lastBody = $lastLine.body | ConvertFrom-Json
  $d = $lastBody.data
  $report["mock_beidou_push"] = "OK lines=$pushLines count=$pushCount"
  $report["last_payload"] = "vehicleId=$($d.vehicleId) state=$($d.state) powerLevel=$($d.powerLevel) x=$($d.x) y=$($d.y)"

  Write-Host ""
  Write-Host "============================================================" -ForegroundColor Green
  Write-Host " PASS: 车端MQTT -> bridge -> Mock北斗 链路正常" -ForegroundColor Green
  Write-Host "============================================================" -ForegroundColor Green
  foreach ($k in $report.Keys) {
    Write-Host ("  {0,-18} {1}" -f $k, $report[$k]) -ForegroundColor Gray
  }
}
catch {
  $failed = $true
  Write-Host ""
  Write-Host " FAIL: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host ""
  Write-Host "--- bridge job log (tail) ---" -ForegroundColor Yellow
  $bridgeJob = $jobs | Select-Object -Last 1
  if ($bridgeJob) {
    Receive-Job $bridgeJob -Keep | Select-Object -Last 30 | ForEach-Object { Write-Host $_ }
  }
}
finally {
  Write-Host "`n[cleanup] stopping background jobs..." -ForegroundColor DarkGray
  foreach ($j in $jobs) { Stop-JobTree $j }
  Stop-Port 1883
  Stop-Port 8080
  Stop-Port $CallbackPort
}

if ($failed) { exit 1 }
exit 0
