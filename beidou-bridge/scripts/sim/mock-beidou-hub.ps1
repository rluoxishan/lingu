# Mock 北斗：收推送(9090) + 主动调中转 register/navigation
# 单独启动：powershell -File scripts/sim/mock-beidou-hub.ps1
param(
  [int]$CallbackPort = 9090,
  [string]$BridgeUrl = "http://127.0.0.1:8080",
  [string]$SimDataDir = ""
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
if (-not $SimDataDir) { $SimDataDir = Join-Path $root "data-sim" }
New-Item -ItemType Directory -Force -Path $SimDataDir | Out-Null

$statsFile = Join-Path $SimDataDir "mock-beidou-stats.json"
$pushLog = Join-Path $SimDataDir "push-log.jsonl"

function Write-Stats($patch) {
  $stats = @{ pushCount = 0; lastPushAt = $null }
  if (Test-Path $statsFile) {
    $existing = Get-Content $statsFile -Raw | ConvertFrom-Json
    $stats.pushCount = $existing.pushCount
    $stats.lastPushAt = $existing.lastPushAt
  }
  foreach ($k in $patch.Keys) { $stats[$k] = $patch[$k] }
  $stats | ConvertTo-Json | Set-Content $statsFile -Encoding UTF8
}

$prefix = "http://127.0.0.1:${CallbackPort}/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Mock Beidou Hub" -ForegroundColor Cyan
Write-Host " Callback: ${prefix}callback" -ForegroundColor Gray
Write-Host " Bridge:   $BridgeUrl" -ForegroundColor Gray
Write-Host " Stats:    $statsFile" -ForegroundColor Gray
Write-Host " Push log: $pushLog" -ForegroundColor Gray
Write-Host " Ctrl+C to stop" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

$pushCount = 0
while ($listener.IsListening) {
  $context = $listener.GetContext()
  $request = $context.Request
  $response = $context.Response
  $body = ""
  if ($request.HasEntityBody) {
    $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
    $body = $reader.ReadToEnd()
    $reader.Close()
  }

  $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $tsMs = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  $pushCount++

  Write-Host ""
  Write-Host "[$ts] PUSH #$pushCount $($request.HttpMethod) $($request.Url.PathAndQuery)" -ForegroundColor Green
  if ($body) {
    try {
      $parsed = $body | ConvertFrom-Json
      $vid = $parsed.data.vehicleId
      $st = $parsed.data.state
      $bat = $parsed.data.powerLevel
      Write-Host "  vehicleId=$vid state=$st battery=$bat x=$($parsed.data.x) y=$($parsed.data.y)" -ForegroundColor White
    } catch { Write-Host $body }
  }

  $logEntry = @{ at = $ts; atMs = $tsMs; body = $body } | ConvertTo-Json -Compress
  Add-Content -Path $pushLog -Value $logEntry -Encoding UTF8

  Write-Stats @{ pushCount = $pushCount; lastPushAt = $tsMs }

  $respBody = "{`"code`":1000,`"msg`":`"success`",`"timestamp`":$tsMs}"
  $buffer = [System.Text.Encoding]::UTF8.GetBytes($respBody)
  $response.ContentLength64 = $buffer.Length
  $response.ContentType = "application/json"
  $response.OutputStream.Write($buffer, 0, $buffer.Length)
  $response.Close()
}
