@echo off
setlocal
cd /d "%~dp0\.."

echo === MQTT 联调 - 中转机侧（Mock 北斗 + bridge）===
echo 详见 docs\MQTT联调实验室-双机测试.md
echo.

powershell -ExecutionPolicy Bypass -File scripts\run-mqtt-lab-relay.ps1
pause
