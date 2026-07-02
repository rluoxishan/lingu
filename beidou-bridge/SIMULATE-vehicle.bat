@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] 未找到 Node.js。请安装 Node.js 20+ 或将 beidou-bridge 目录拷到本机。
  exit /b 1
)

if not exist "node_modules\mqtt" (
  echo [ERROR] 未找到 node_modules\mqtt。请在中转机开发包目录执行 npm install，或拷贝完整 zip。
  exit /b 1
)

set "BROKER=%VEHICLE_MQTT_BROKER%"
if "%BROKER%"=="" (
  set /p RELAY_IP=请输入中转机 IP（仅 IP，如 192.168.199.88）: 
  if "!RELAY_IP!"=="" (
    echo [ERROR] 未输入 IP
    exit /b 1
  )
  set "RELAY_IP=!RELAY_IP:mqtt://=!"
  set "RELAY_IP=!RELAY_IP:MQTT://=!"
  if "!RELAY_IP:~-5!"==":1883" set "RELAY_IP=!RELAY_IP:~0,-5!"
  set "BROKER=mqtt://!RELAY_IP!:1883"
) else (
  set "BROKER=%BROKER:mqtt://mqtt://=mqtt://%"
  if not "%BROKER:~0,7%"=="mqtt://" set "BROKER=mqtt://%BROKER%"
)

echo.
echo === 车端 MQTT 模拟（1010001）===
echo Broker: %BROKER%
echo ClientId: LU2605000922
echo 按 Ctrl+C 停止
echo.

node scripts\sim\vehicle-mqtt-simulator.mjs --broker %BROKER% --clientId LU2605000922 --interval 1000
exit /b %ERRORLEVEL%
