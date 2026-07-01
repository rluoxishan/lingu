#Requires -Version 5.1
param(
  [string]$DeviceId = "LU2606000100",
  [string]$BaseUrl = "https://sztu.lingubot.cn/admin-api",
  [string]$TenantId = "1"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root
. "$root\scripts\load-dotenv.ps1" -ProjectRoot $root | Out-Null
. "$root\scripts\ps-utils.ps1"

$tenantName = Get-ResolvedCloudTenantName -TenantName ${env:CLOUD_TENANT_NAME}
$user = ${env:CLOUD_USERNAME}
$pass = ${env:CLOUD_PASSWORD}

if (Test-PlaceholderCloudCredentials -Username $user -Password $pass) {
  Write-Error "Configure .env: CLOUD_TENANT_NAME / CLOUD_USERNAME / CLOUD_PASSWORD"
}

Write-Host "=== admin query: $DeviceId ===" -ForegroundColor Cyan
Write-Host "baseUrl: $BaseUrl"

$login = Invoke-JsonPostUtf8 -Uri "$BaseUrl/system/auth/login" -Headers @{ "tenant-id" = $TenantId } -BodyObject @{
  tenantName = $tenantName
  username   = $user
  password   = $pass
  rememberMe = $true
}

if (-not $login.data.accessToken) {
  Write-Error ("Login failed: " + ($login | ConvertTo-Json -Compress))
}

$token = $login.data.accessToken
$headers = @{ "tenant-id" = $TenantId; "Authorization" = "Bearer $token" }

Write-Host ""
Write-Host "--- select_device_detail_by_id ---" -ForegroundColor Yellow
$detail = Invoke-RestMethod -Uri "$BaseUrl/device/select_device_detail_by_id?id=$DeviceId" -Headers $headers
$detail.data | Select-Object workStatus, battery, position_xyz, position, heading, taskId, taskName | Format-List

Write-Host "--- select_all_device ---" -ForegroundColor Yellow
$batch = Invoke-RestMethod -Method POST -Uri "$BaseUrl/device/select_all_device" `
  -Headers ($headers + @{ "Content-Type" = "application/json" }) -Body "{}"
$batchItem = $batch.data | Where-Object { $_.id -eq $DeviceId } | Select-Object -First 1
if ($batchItem) {
  $batchItem | Select-Object id, online, workStatus, battery, position_xyz, position, heading, taskId | Format-List
} else {
  Write-Host "Device $DeviceId not found in batch response" -ForegroundColor Yellow
}

function Show-Field([string]$Name, $Value, [scriptblock]$Ok) {
  $flag = if (& $Ok $Value) { "OK" } else { "CHECK" }
  $color = if ($flag -eq "OK") { "Green" } else { "Yellow" }
  Write-Host ("  {0,-16} {1,-8} {2}" -f $Name, $flag, $Value) -ForegroundColor $color
}

Write-Host ""
Write-Host "=== field summary (for Beidou push) ===" -ForegroundColor Cyan
$d = $detail.data
Show-Field "workStatus" $d.workStatus { param($v) $null -ne $v }
Show-Field "battery" $d.battery { param($v) $null -ne $v -and $v -ge 0 -and $v -le 100 }
Show-Field "position_xyz" $d.position_xyz {
  param($v)
  if (-not $v) { return $false }
  $p = $v -split ","
  if ($p.Count -lt 2) { return $false }
  try { [double]$p[0] -ne 0 -or [double]$p[1] -ne 0 } catch { return $false }
}
Show-Field "heading" $d.heading { param($v) $null -ne $v -and [double]$v -ne 0 }

Write-Host ""
Write-Host "Note: if position_xyz/heading are 0, ask vehicle team for commercial edition + localization." -ForegroundColor Gray
