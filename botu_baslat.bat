@echo off
setlocal

cd /d "%~dp0"

if exist bot.pid (
  for /f %%p in (bot.pid) do (
    tasklist /FI "PID eq %%p" 2>NUL | find "%%p" >NUL
    if not errorlevel 1 (
      echo Bot zaten calisiyor. PID: %%p
      exit /b 0
    )
  )
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$root = (Resolve-Path '.').Path; " ^
  "$proc = Start-Process -FilePath 'node' -ArgumentList 'src/index.js' -WorkingDirectory $root -WindowStyle Hidden -PassThru; " ^
  "$proc.Id | Set-Content -Encoding ASCII -Path (Join-Path $root 'bot.pid'); " ^
  "Write-Host ('Bot baslatildi. PID: ' + $proc.Id)"

endlocal
