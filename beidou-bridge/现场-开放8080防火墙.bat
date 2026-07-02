@echo off
chcp 65001 >nul
echo.
echo ===== 开放 Windows 防火墙 8080（需管理员）=====
net session >nul 2>&1
if errorlevel 1 (
  echo [提示] 请右键本文件 -^> 以管理员身份运行
  pause
  exit /b 1
)
powershell -NoProfile -Command "New-NetFirewallRule -DisplayName 'Beidou Bridge 8080' -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow -ErrorAction SilentlyContinue"
echo [完成] 已添加规则 Beidou Bridge 8080
pause
