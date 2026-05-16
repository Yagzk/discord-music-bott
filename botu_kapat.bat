@echo off
setlocal

cd /d "%~dp0"

if not exist bot.pid (
  echo bot.pid bulunamadi. Bot zaten kapali olabilir.
  exit /b 0
)

for /f %%p in (bot.pid) do (
  tasklist /FI "PID eq %%p" 2>NUL | find "%%p" >NUL
  if errorlevel 1 (
    echo Bot process bulunamadi. PID dosyasi temizleniyor.
    del bot.pid >NUL 2>NUL
    exit /b 0
  )

  taskkill /PID %%p /T /F >NUL
  if errorlevel 1 (
    echo Bot kapatilamadi. PID: %%p
    exit /b 1
  )

  del bot.pid >NUL 2>NUL
  echo Bot kapatildi. PID: %%p
)

endlocal
