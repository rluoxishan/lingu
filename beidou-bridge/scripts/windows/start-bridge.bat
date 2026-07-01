@echo off
setlocal
cd /d "%~dp0\..\.."

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] 未找到 Node.js，请先安装 Node.js 20 或更高版本: https://nodejs.org/
  exit /b 1
)

if not exist "dist\main.js" (
  echo [ERROR] 未找到 dist\main.js，请先运行: npm run build
  exit /b 1
)

node dist\main.js
exit /b %ERRORLEVEL%
