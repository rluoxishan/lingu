@echo off
chcp 65001 >nul
echo ===== 开放防火墙 8080（需管理员）=====
net session >nul 2>&1 || (echo 请右键以管理员身份运行 & pause & exit /b 1)
powershell -NoProfile -Command "New-NetFirewallRule -DisplayName 'Beidou Bridge 8080' -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow -ErrorAction SilentlyContinue"
echo [完成]
pause
