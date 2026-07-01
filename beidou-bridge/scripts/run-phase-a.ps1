# A 阶段联调：tpapi + hasun-test + Mock 北斗
# 用法：$env:CLOUD_PASSWORD='...'; powershell -ExecutionPolicy Bypass -File scripts/run-phase-a.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

if (-not $env:CLOUD_TPAPI_ID) { $env:CLOUD_TPAPI_ID = "szjsdx" }
if (-not $env:CLOUD_USERNAME) { $env:CLOUD_USERNAME = "szjsdx" }
if (-not $env:CLOUD_PASSWORD) {
  Write-Error "Set CLOUD_PASSWORD in env or .env"
}

npm run build | Out-Null

function Stop-Port($port) {
  Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

Stop-Port 8080
Stop-Port 9090
Start-Sleep -Seconds 1

Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "$root\scripts\mock-beidou-receiver.ps1"
Start-Sleep -Seconds 2

$env:CONFIG_DIR = "./config/tpapi"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root'; `$env:CONFIG_DIR='./config/tpapi'; `$env:CLOUD_TPAPI_ID='$env:CLOUD_TPAPI_ID'; `$env:CLOUD_USERNAME='$env:CLOUD_USERNAME'; `$env:CLOUD_PASSWORD='$env:CLOUD_PASSWORD'; node dist/main.js"
Start-Sleep -Seconds 5

$body = '{"url":"http://127.0.0.1:9090/callback","frequency":4000}'
$reg = Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:8080/api/v1/beidou/callback/register" -ContentType "application/json" -Body $body
Write-Host "register:" ($reg | ConvertTo-Json -Depth 6 -Compress)
Start-Sleep -Seconds 10
Write-Host "health:" (Invoke-RestMethod http://127.0.0.1:8080/health | ConvertTo-Json -Compress)
Write-Host "Done. Check Mock Beidou window for POST payloads."
