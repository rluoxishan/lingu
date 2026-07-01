# B1 pre-site smoke: admin + config/site + LU2606000100 + Mock Beidou (19090)
# Usage: powershell -ExecutionPolicy Bypass -File scripts/run-pre-site-b1.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

. "$root\scripts\load-dotenv.ps1" -ProjectRoot $root | Out-Null
. "$root\scripts\ps-utils.ps1"

if (Test-PlaceholderCloudCredentials -Username ${env:CLOUD_USERNAME} -Password ${env:CLOUD_PASSWORD}) {
  Write-Error "Configure .env: CLOUD_USERNAME / CLOUD_PASSWORD"
}

$mockPort = 19090
Write-Host "=== B1 smoke: site config + Mock Beidou ($mockPort) ===" -ForegroundColor Cyan

npm run build | Out-Null
if ($LASTEXITCODE -ne 0) { exit 1 }

function Stop-Port($port) {
  Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

Stop-Port 8080
Stop-Port $mockPort
Start-Sleep -Seconds 1

Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
Set-Location '$root'
`$env:MOCK_BEIDOU_PORT='$mockPort'
node scripts/sim/mock-beidou-server.mjs
"@
Start-Sleep -Seconds 2

$env:CONFIG_DIR = "./config/site"
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
Set-Location '$root'
`$env:CONFIG_DIR='./config/site'
node dist/main.js
"@
Start-Sleep -Seconds 5

$body = "{`"url`":`"http://127.0.0.1:${mockPort}/callback`",`"frequency`":4000}"
try {
  $reg = Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:8080/api/v1/beidou/callback/register" `
    -ContentType "application/json" -Body $body
  Write-Host "register:" ($reg | ConvertTo-Json -Depth 6 -Compress)
} catch {
  Write-Error "register failed: $_"
}

Start-Sleep -Seconds 12
Write-Host "health:" (Invoke-RestMethod http://127.0.0.1:8080/health | ConvertTo-Json -Compress)
Write-Host ""
Write-Host "Done. Mock window should show POST every ~4s with data.vehicleId and alertList; response code:1000." -ForegroundColor Green
