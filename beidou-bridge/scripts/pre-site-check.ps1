#Requires -Version 5.1
param(
  [switch]$Install,
  [switch]$Smoke,
  [string]$DeviceId = "LU2606000100"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$script:pass = 0
$script:fail = 0
$script:warn = 0

function Step-Ok([string]$Name) {
  $script:pass++
  Write-Host "[OK]   $Name" -ForegroundColor Green
}

function Step-Fail([string]$Name, [string]$Detail) {
  $script:fail++
  Write-Host "[FAIL] $Name" -ForegroundColor Red
  if ($Detail) { Write-Host "       $Detail" -ForegroundColor Red }
}

function Step-Warn([string]$Name, [string]$Detail) {
  $script:warn++
  Write-Host "[WARN] $Name" -ForegroundColor Yellow
  if ($Detail) { Write-Host "       $Detail" -ForegroundColor Yellow }
}

Write-Host ""
Write-Host "========== beidou-bridge pre-site check (B1) ==========" -ForegroundColor Cyan
Write-Host "Project: $root"
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Step-Fail "Node.js installed" "Install Node.js 20+ from https://nodejs.org/"
} else {
  $ver = node -v
  $major = [int]($ver -replace '^v(\d+)\..*', '$1')
  if ($major -lt 20) {
    Step-Warn "Node.js >= 20" "Current: $ver"
  } else {
    Step-Ok "Node.js $ver"
  }
}

if ($Install) {
  Write-Host ""
  Write-Host "--- npm install ---" -ForegroundColor Cyan
  npm ci
  if ($LASTEXITCODE -ne 0) {
    npm install
    if ($LASTEXITCODE -ne 0) { Step-Fail "npm install"; exit 1 }
  }
  Step-Ok "npm dependencies"
}

if (-not (Test-Path "dist\main.js")) {
  if ($Install) {
    npm run build
    if ($LASTEXITCODE -ne 0) { Step-Fail "npm run build"; exit 1 }
    Step-Ok "TypeScript build"
  } else {
    Step-Fail "dist/main.js exists" "Run: npm run build  or  pre-site-check.ps1 -Install"
  }
} else {
  Step-Ok "dist/main.js exists"
}

$envFile = Join-Path $root ".env"
$envExample = Join-Path $root ".env.example"
$cloudUser = $null
$cloudPass = $null
$dataSource = "cloud"
$serverYaml = Join-Path $root "config\site\server.yaml"
if (Test-Path $serverYaml) {
  $serverRaw = Get-Content $serverYaml -Raw
  if ($serverRaw -match "dataSource:\s*mqtt") { $dataSource = "mqtt" }
}

if ($dataSource -eq "mqtt") {
  Step-Ok "dataSource=mqtt (no cloud .env required)"
} elseif (-not (Test-Path $envFile)) {
  if (Test-Path $envExample) {
    Copy-Item $envExample $envFile
    Step-Warn ".env created" "Edit CLOUD_* then re-run"
  } else {
    Step-Fail ".env exists"
  }
} else {
  . "$root\scripts\load-dotenv.ps1" -ProjectRoot $root | Out-Null
  $cloudUser = ${env:CLOUD_USERNAME}
  $cloudPass = ${env:CLOUD_PASSWORD}
  if (-not $cloudUser -or -not $cloudPass -or $cloudPass -eq "your-password") {
    Step-Fail ".env cloud credentials" "Set CLOUD_USERNAME and CLOUD_PASSWORD"
  } else {
    Step-Ok ".env cloud credentials"
  }
}

$siteFiles = @("config\site\server.yaml", "config\site\vehicles.yaml")
if ($dataSource -eq "mqtt") {
  $siteFiles += "config\site\mqtt.yaml"
} else {
  $siteFiles += "config\site\cloud.yaml"
}
$siteOk = $true
foreach ($f in $siteFiles) {
  if (-not (Test-Path $f)) {
    $siteOk = $false
    Step-Fail "missing $f"
  }
}
if ($siteOk) {
  Step-Ok "config/site ready"
  $vehYaml = Get-Content "config\site\vehicles.yaml" -Raw
  if ($vehYaml -notmatch "enabled:\s*true") {
    Step-Warn "vehicles.yaml enabled flag" "Check config/site/vehicles.yaml"
  } elseif ($vehYaml -notmatch [regex]::Escape($DeviceId)) {
    Step-Warn "vehicles.yaml device id" "Add $DeviceId if needed"
  } else {
    Step-Ok "vehicles.yaml includes $DeviceId"
  }
}

$dataSite = Join-Path $root "data-site"
if (-not (Test-Path $dataSite)) {
  New-Item -ItemType Directory -Path $dataSite | Out-Null
}
Step-Ok "data-site directory"

Write-Host ""
if ($dataSource -eq "mqtt") {
  Write-Host "--- mqtt check ---" -ForegroundColor Cyan
  $mqttListen = Get-NetTCPConnection -LocalPort 1883 -State Listen -ErrorAction SilentlyContinue
  if ($mqttListen) {
    Step-Ok "MQTT broker listening on 1883"
  } else {
    Step-Warn "MQTT broker on 1883" "Install/start Mosquitto or EMQX before bridge"
  }
  if (Test-Path "node_modules\mqtt") {
    Step-Ok "mqtt npm module (for SIMULATE-vehicle.bat)"
  } else {
    Step-Warn "node_modules/mqtt" "Run npm ci for vehicle simulator on 5G PC"
  }
} else {
  Write-Host "--- cloud field check ---" -ForegroundColor Cyan
  if ((Test-Path $envFile) -and $cloudUser -and $cloudPass -and $cloudPass -ne "your-password") {
    try {
      & "$root\scripts\query-admin-device.ps1" -DeviceId $DeviceId
      Step-Ok "admin query $DeviceId"
    } catch {
      Step-Fail "admin query" $_.Exception.Message
    }
  } else {
    Step-Warn "skip cloud query" "Fill .env first"
  }
}

Write-Host ""
Write-Host "--- on-site only (cannot pre-configure) ---" -ForegroundColor Cyan
Write-Host "  [ ] MQTT broker 1883 + firewall (mqtt mode)"
Write-Host "  [ ] 5G PC runs SIMULATE-vehicle.bat -> relay IP"
Write-Host "  [ ] Bridge machine IP + firewall port 8080"
Write-Host "  [ ] Beidou callback URL for register body"
Write-Host "  [ ] Network: Beidou <-> bridge"
Write-Host "  [ ] Vehicle: IDK commercial edition + valid position_xyz"
Write-Host "  [ ] Beidou register + push code 1000"

Write-Host ""
Write-Host "--- on-site start ---" -ForegroundColor Cyan
Write-Host "  scripts\site-start.bat"
Write-Host "  scripts\run-mqtt-lab-relay.ps1  (mqtt mock lab)"
Write-Host "  SIMULATE-vehicle.bat            (on 5G PC)"

Write-Host ""
Write-Host "========== summary: OK=$($script:pass) WARN=$($script:warn) FAIL=$($script:fail) ==========" -ForegroundColor Cyan

if ($Smoke -and $script:fail -eq 0) {
  Write-Host ""
  Write-Host "Starting B1 mock smoke..." -ForegroundColor Cyan
  & "$root\scripts\run-pre-site-b1.ps1"
}

if ($script:fail -gt 0) { exit 1 }
exit 0
