@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ===== 查询云平台 LU2606000100 =====
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\query-admin-device.ps1"
pause
