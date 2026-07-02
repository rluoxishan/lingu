@echo off
chcp 936 >nul 2>&1
setlocal
cd /d "%~dp0"
title beidou-bridge
echo.
echo ===== START beidou-bridge (MQTT site mode) =====
echo config: config\site   port: 8080
echo need: Mosquitto on 1883
echo stop: close window or Ctrl+C
echo.

where node >nul 2>&1 || (

  echo [失败] 未安装 Node.js 20+

  pause

  exit /b 1

)

if not exist "dist\main.js" (

  echo [失败] 缺少 dist\main.js

  pause

  exit /b 1

)

findstr /C:"dataSource: mqtt" "config\site\server.yaml" >nul 2>&1

if errorlevel 1 (

  if not exist ".env" (

    echo [失败] cloud 模式缺少 .env

    pause

    exit /b 1

  )

) else (
  echo [OK] MQTT mode, no .env needed
)
set CONFIG_DIR=./config/site
echo [site] listen http://0.0.0.0:8080
echo [site] health:   http://127.0.0.1:8080/health
echo [site] register: http://192.168.199.88:8080/api/v1/beidou/callback/register
echo.

node dist\main.js

pause

