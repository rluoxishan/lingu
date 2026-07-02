@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo.
echo ===== 出发前：准备中转机离线 U 盘 =====
echo 详见 docs\中转机离线部署手册-MQTT模式.md
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\prepare-offline-usb.ps1" -BuildZip
pause
