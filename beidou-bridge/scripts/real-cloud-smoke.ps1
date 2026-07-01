# Real cloud smoke: requires .env (CLOUD_*) and bridge already running
param(
  [string]$BridgeUrl = "http://127.0.0.1:8080",
  [string]$CallbackUrl = "http://127.0.0.1:19090/callback",
  [int]$Frequency = 4000,
  [int]$WaitPushSec = 12
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

if (-not (Test-Path ".env")) {
  Write-Error "Missing .env: copy .env.example to .env and set CLOUD_TENANT_NAME / CLOUD_USERNAME / CLOUD_PASSWORD"
}

Write-Host "1) health"
$h = Invoke-RestMethod -Uri "$BridgeUrl/health"
$h | ConvertTo-Json -Compress

$body = @{
  url = $CallbackUrl
  frequency = $Frequency
} | ConvertTo-Json

Write-Host "2) register"
$reg = Invoke-RestMethod -Method POST -Uri "$BridgeUrl/api/v1/beidou/callback/register" `
  -ContentType "application/json" -Body $body
$reg | ConvertTo-Json -Depth 6

Write-Host "3) wait ${WaitPushSec}s for push ticks..."
Start-Sleep -Seconds $WaitPushSec

Write-Host "Done. Check Mock Beidou terminal for POST payloads."
