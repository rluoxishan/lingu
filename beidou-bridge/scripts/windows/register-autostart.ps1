#Requires -Version 5.1
<#
.SYNOPSIS
  注册 Windows 开机自启动（任务计划程序，无需额外软件）
#>
param(
  [string]$TaskName = "BeidouBridge"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$StartScript = Join-Path $PSScriptRoot "start-bridge.bat"

if (-not (Test-Path (Join-Path $ProjectRoot "dist\main.js"))) {
  Write-Host "[错误] 请先运行 npm run install:windows 或 npm run build" -ForegroundColor Red
  exit 1
}

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Write-Host "需要管理员权限注册开机自启，正在提权..." -ForegroundColor Yellow
  $args = "-ExecutionPolicy Bypass -File `"$PSCommandPath`" -TaskName `"$TaskName`""
  Start-Process powershell.exe -Verb RunAs -ArgumentList $args -Wait
  exit $LASTEXITCODE
}

# 删除旧任务
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

$action = New-ScheduledTaskAction `
  -Execute $StartScript `
  -WorkingDirectory $ProjectRoot

# 系统启动后 30 秒启动（等待网络就绪）
$trigger = New-ScheduledTaskTrigger -AtStartup
$trigger.Delay = "PT30S"

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -RunLevel Highest `
  -User "SYSTEM" `
  -Description "beidou-bridge 云平台与北斗系统中转程序，开机自动启动" | Out-Null

Write-Host "=== 开机自启已注册 ===" -ForegroundColor Green
Write-Host "任务名称: $TaskName"
Write-Host "启动脚本: $StartScript"
Write-Host "工作目录: $ProjectRoot"
Write-Host ""
Write-Host "立即测试启动:"
Write-Host "  Start-ScheduledTask -TaskName $TaskName"
Write-Host "查看状态:"
Write-Host "  Get-ScheduledTask -TaskName $TaskName"
Write-Host "取消自启:"
Write-Host "  npm run autostart:remove"
