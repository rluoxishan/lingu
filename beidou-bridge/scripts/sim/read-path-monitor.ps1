# Read path monitor: Cloud HTTP vs last Mock Beidou push
param(
  [string]$DeviceId = "LU2606000100",
  [int]$IntervalSec = 5,
  [int]$MaxRounds = 0,
  [string]$SimDataDir = "",
  [switch]$SkipCloud,
  [switch]$MockCloud
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
Set-Location $root
. "$root\scripts\load-dotenv.ps1" -ProjectRoot $root | Out-Null
. "$root\scripts\ps-utils.ps1"

if (-not $SimDataDir) { $SimDataDir = Join-Path $root "data-sim" }
$pushLog = Join-Path $SimDataDir "push-log.jsonl"
$statsFile = Join-Path $SimDataDir "mock-beidou-stats.json"

$base = "https://sztu.lingubot.cn/admin-api"
$tenantName = Get-ResolvedCloudTenantName -TenantName ${env:CLOUD_TENANT_NAME}
$user = ${env:CLOUD_USERNAME}
$pass = ${env:CLOUD_PASSWORD}

function Get-MockCloudSnapshot {
  return @{
    workStatus = 1
    battery = 85
    position_xyz = "114.398441,22.702372,0"
    heading = 0
    taskId = "T001"
  }
}

function Get-CloudSnapshot {
  if (Test-PlaceholderCloudCredentials -Username $user -Password $pass) {
    return $null
  }
  $login = Invoke-JsonPostUtf8 -Uri "$base/system/auth/login" -Headers @{ "tenant-id" = "1" } -BodyObject @{
    tenantName = $tenantName
    username   = $user
    password   = $pass
    rememberMe = $true
  }
  $token = $login.data.accessToken
  $detail = Invoke-RestMethod -Uri "$base/device/select_device_detail_by_id?id=$DeviceId" `
    -Headers @{ "tenant-id" = "1"; "Authorization" = "Bearer $token" }
  return $detail.data
}

function Get-LastMockPush {
  if (-not (Test-Path $pushLog)) { return $null }
  $last = Get-Content $pushLog -Tail 1 -ErrorAction SilentlyContinue
  if (-not $last) { return $null }
  try {
    $e = $last | ConvertFrom-Json
    $d = ($e.body | ConvertFrom-Json).data
    return @{ at = $e.at; data = $d }
  } catch {
    return $null
  }
}

Write-Host ""
Write-Host "======== READ PATH: Vehicle -> Cloud -> Mock Beidou ========" -ForegroundColor Cyan
Write-Host "Device: $DeviceId  Interval: ${IntervalSec}s"
Write-Host ""

$round = 0
while ($true) {
  $round++
  if ($MaxRounds -gt 0 -and $round -gt $MaxRounds) { break }

  $ts = Get-Date -Format "HH:mm:ss"
  Write-Host "--- Round $round time $ts ---" -ForegroundColor Yellow

  if ($MockCloud) {
    Write-Host "[Cloud mock (config/test cloud.yaml mock:true)]" -ForegroundColor Green
    $cloud = Get-MockCloudSnapshot
    Write-Host "  workStatus=$($cloud.workStatus) battery=$($cloud.battery) taskId=$($cloud.taskId)"
    Write-Host "  position_xyz=$($cloud.position_xyz) heading=$($cloud.heading)"
  } elseif (-not $SkipCloud) {
    try {
      $cloud = Get-CloudSnapshot
      if ($cloud) {
        Write-Host "[Cloud HTTP]" -ForegroundColor Green
        Write-Host "  workStatus=$($cloud.workStatus) battery=$($cloud.battery) taskId=$($cloud.taskId)"
        Write-Host "  position_xyz=$($cloud.position_xyz) heading=$($cloud.heading)"
      } else {
        Write-Host "[Cloud HTTP] skipped (no valid .env credentials)" -ForegroundColor DarkYellow
      }
    } catch {
      Write-Host "[Cloud HTTP] FAIL: $_" -ForegroundColor Red
      $cloud = $null
    }
  }

  $push = Get-LastMockPush
  if ($push) {
    Write-Host "[Mock Beidou last PUSH]" -ForegroundColor Magenta
    $d = $push.data
    Write-Host "  at=$($push.at) vehicleId=$($d.vehicleId) state=$($d.state) powerLevel=$($d.powerLevel)"
    Write-Host "  x=$($d.x) y=$($d.y) direction=$($d.direction)"

    if ($cloud) {
      $okState = ($cloud.workStatus -eq $d.state)
      $okBat = ($cloud.battery -eq $d.powerLevel)
      if ($okState -and $okBat) {
        Write-Host "[Compare] OK (state and battery match)" -ForegroundColor Green
      } else {
        Write-Host "[Compare] MISMATCH state=$okState battery=$okBat" -ForegroundColor Red
      }
    }
  } else {
    Write-Host "[Mock Beidou] no push yet" -ForegroundColor DarkYellow
  }

  if (Test-Path $statsFile) {
    $s = Get-Content $statsFile -Raw | ConvertFrom-Json
    Write-Host "[Mock stats] pushCount=$($s.pushCount)" -ForegroundColor Gray
  }

  Write-Host ""
  Start-Sleep -Seconds $IntervalSec
}
