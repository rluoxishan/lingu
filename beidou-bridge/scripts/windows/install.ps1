#Requires -Version 5.1
<#
.SYNOPSIS
  客户电脑首次安装：检查 Node.js、安装依赖、编译、创建 .env
#>
param(
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $ProjectRoot

Write-Host "=== beidou-bridge 安装 ===" -ForegroundColor Cyan
Write-Host "目录: $ProjectRoot"

# Node.js
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Host "[错误] 未安装 Node.js。请安装 Node.js 20 LTS: https://nodejs.org/" -ForegroundColor Red
  Write-Host "安装后重新打开 PowerShell 再运行本脚本。"
  exit 1
}

$nodeVersion = node -v
Write-Host "Node.js: $nodeVersion"

$major = [int]($nodeVersion -replace '^v(\d+)\..*', '$1')
if ($major -lt 20) {
  Write-Host "[警告] 建议使用 Node.js 20 或更高版本" -ForegroundColor Yellow
}

# 依赖
Write-Host "`n安装依赖 (npm ci)..."
npm ci
if ($LASTEXITCODE -ne 0) {
  Write-Host "npm ci 失败，尝试 npm install..."
  npm install
  if ($LASTEXITCODE -ne 0) { exit 1 }
}

# .env
$envFile = Join-Path $ProjectRoot ".env"
$envExample = Join-Path $ProjectRoot ".env.example"
if (-not (Test-Path $envFile) -and (Test-Path $envExample)) {
  Copy-Item $envExample $envFile
  Write-Host "`n已创建 .env，请编辑填写云平台账号密码。" -ForegroundColor Yellow
} elseif (Test-Path $envFile) {
  Write-Host "`.env 已存在，跳过创建。"
}

# 编译
if (-not $SkipBuild) {
  Write-Host "`n编译 TypeScript..."
  npm run build
  if ($LASTEXITCODE -ne 0) { exit 1 }
}

# data 目录
$dataDir = Join-Path $ProjectRoot "data"
if (-not (Test-Path $dataDir)) {
  New-Item -ItemType Directory -Path $dataDir | Out-Null
}

Write-Host "`n=== 安装完成 ===" -ForegroundColor Green
Write-Host "下一步:"
Write-Host "  1. 编辑 .env 填写 CLOUD_USERNAME / CLOUD_PASSWORD"
Write-Host "  2. 编辑 config\vehicles.yaml 填写车辆"
Write-Host "  3. 测试启动: scripts\windows\start-bridge.bat"
Write-Host "  4. 注册开机自启: npm run autostart:install"
