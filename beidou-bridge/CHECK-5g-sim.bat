@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo.
echo ===== 5G 模拟电脑环境检查（车端 MQTT 模拟）=====
echo 本机只模拟车端发 1010001，不跑中转、不装 Mosquitto
echo.

set ERR=0

where node >nul 2>&1
if errorlevel 1 (
  echo [失败] 未安装 Node.js
  echo        请先安装 U 盘里的 node-v20 或 node-v24 *.msi
  set ERR=1
) else (
  for /f "delims=" %%v in ('node -v') do echo [OK]   Node.js %%v
)

if not exist "node_modules\mqtt\package.json" (
  echo [失败] 缺少 node_modules\mqtt
  echo        请从 U 盘完整复制 beidou-bridge-site-20260702 文件夹
  set ERR=1
) else (
  echo [OK]   node_modules\mqtt
)

if not exist "scripts\sim\vehicle-mqtt-simulator.mjs" (
  echo [失败] 缺少 vehicle-mqtt-simulator.mjs
  set ERR=1
) else (
  echo [OK]   scripts\sim\vehicle-mqtt-simulator.mjs
)

if not exist "SIMULATE-vehicle.bat" (
  echo [失败] 缺少 SIMULATE-vehicle.bat
  set ERR=1
) else (
  echo [OK]   SIMULATE-vehicle.bat
)

echo.
echo --- 可选：预设中转机 IP（装好后可写入）---
echo   set VEHICLE_MQTT_BROKER=mqtt://中转机IP:1883
echo.
echo --- 中转机 Mosquitto 就绪后运行 ---
echo   SIMULATE-vehicle.bat
echo   或: node scripts\sim\vehicle-mqtt-simulator.mjs --broker mqtt://中转机IP:1883
echo.
if %ERR% neq 0 (
  echo [结果] 检查未通过
) else (
  echo [结果] 5G 电脑部署就绪，等中转机 1883 通后即可 SIMULATE-vehicle.bat
)
pause
exit /b %ERR%
