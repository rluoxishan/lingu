@echo off
chcp 65001 >nul
setlocal
echo.
echo ===== 复制出发前物料到 U 盘 =====
echo 源目录: release\usb-onsite-20260702
echo.
set /p DRIVE=请输入 U 盘盘符（例如 E，不要加冒号）: 
if "%DRIVE%"=="" (
  echo [失败] 未输入盘符
  pause
  exit /b 1
)
set "TARGET=%DRIVE%:\beidou-bridge-onsite-20260702"
echo.
echo 将复制到: %TARGET%
echo.
pause
xcopy /E /I /Y "%~dp0release\usb-onsite-20260702" "%TARGET%"
if errorlevel 1 (
  echo [失败] 复制失败，请检查 U 盘是否插入、盘符是否正确
  pause
  exit /b 1
)
echo.
echo [完成] 已复制到 %TARGET%
echo 弹出 U 盘即可出发。
pause
