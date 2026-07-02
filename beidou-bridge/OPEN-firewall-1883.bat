@echo off
setlocal
cd /d "%~dp0\.."

echo === 开放 Windows 防火墙 TCP 1883（MQTT，供 5G 模拟电脑连接）===
echo 需要管理员权限。若已开放可忽略报错。
echo.

netsh advfirewall firewall show rule name="beidou-bridge MQTT 1883" >nul 2>&1
if errorlevel 1 (
  netsh advfirewall firewall add rule name="beidou-bridge MQTT 1883" dir=in action=allow protocol=TCP localport=1883
) else (
  echo 规则已存在: beidou-bridge MQTT 1883
)

pause
