@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo.
echo ===== beidou-bridge 现场环境检查 =====
echo.
where node >nul 2>&1 || (
  echo [失败] 未安装 Node.js，请先安装 Node.js 20 LTS
  echo        下载: https://nodejs.org/
  pause
  exit /b 1
)
node -v
if not exist ".env" (
  echo [失败] 缺少 .env 文件
  echo        请复制 .env.example 为 .env 并填写 CLOUD_* 账号密码
  pause
  exit /b 1
)
if not exist "dist\main.js" (
  echo [失败] 缺少 dist\main.js，请运行 INSTALL.bat 或联系我方
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\pre-site-check.ps1"
set ERR=%ERRORLEVEL%
echo.
if %ERR% neq 0 (
  echo [结果] 检查未通过，请按上方提示修复
) else (
  echo [结果] 检查通过，可运行: 现场-启动中转.bat
)
pause
exit /b %ERR%
