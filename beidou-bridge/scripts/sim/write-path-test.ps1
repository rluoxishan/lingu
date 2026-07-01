# 写链路测试：模拟北斗 -> 中转 navigation -> 云平台 -> (车端)
# 用法：
#   站名: ... -TaskPoint "中德西北角"
#   坐标: ... -X 21.64 -Y 86.28 -Direction 82
param(
  [string]$BridgeUrl = "http://127.0.0.1:8080",
  [string]$DeviceId = "LU2606000100",
  [string]$TaskPoint = "",
  [double]$X = 0,
  [double]$Y = 0,
  [double]$Direction = 0,
  [switch]$UseCoordinates
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
$SimDataDir = Join-Path $root "data-sim"
New-Item -ItemType Directory -Force -Path $SimDataDir | Out-Null

Write-Host ""
Write-Host "======== WRITE PATH: Mock Beidou -> Bridge -> Cloud -> Vehicle ========" -ForegroundColor Cyan

if ($TaskPoint) {
  $navBody = @{ vehicleId = $DeviceId; taskPoint = $TaskPoint } | ConvertTo-Json
  Write-Host "Mode: taskPoint (station name) = $TaskPoint"
} elseif ($UseCoordinates) {
  $navBody = @{
    vehicleId = $DeviceId
    x = $X; y = $Y; z = 0; direction = $Direction; floor = 1
  } | ConvertTo-Json
  Write-Host "Mode: coordinates x=$X y=$Y direction=$Direction"
} else {
  Write-Error "Provide -TaskPoint 'name' or -UseCoordinates -X ... -Y ... -Direction ..."
}

Write-Host "POST $BridgeUrl/api/v1/beidou/navigation"
Write-Host "Body: $navBody"

try {
  $resp = Invoke-RestMethod -Method POST -Uri "$BridgeUrl/api/v1/beidou/navigation" `
    -ContentType "application/json" -Body $navBody
  Write-Host ""
  Write-Host "[Bridge response]" -ForegroundColor Green
  $resp | ConvertTo-Json -Depth 5
  @{ at = (Get-Date -Format "o"); request = ($navBody | ConvertFrom-Json); response = $resp } |
    ConvertTo-Json -Depth 6 |
    Set-Content (Join-Path $SimDataDir "last-navigation.json") -Encoding UTF8
  Write-Host ""
  Write-Host "Saved: data-sim/last-navigation.json" -ForegroundColor Gray
  Write-Host "Next: check cloud workStatus/taskId (read-path-monitor) or vehicle movement on site." -ForegroundColor Yellow
} catch {
  Write-Host "[Bridge FAILED]" -ForegroundColor Red
  if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
  else { Write-Host $_ }
  exit 1
}
