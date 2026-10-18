@echo off
setlocal
title Aviation Rights - Vue and Firebase
set "AVIATION_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%AVIATION_NODE%" goto run
set "AVIATION_NODE=node.exe"
where node.exe >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 or later is required. Install Node.js, then run this file again.
  echo Download: https://nodejs.org/en/download
  set "AVIATION_EXIT=1"
  goto finish
)
:run
"%AVIATION_NODE%" "%~dp0scripts\start-local.mjs" %*
set "AVIATION_EXIT=%ERRORLEVEL%"
:finish
for %%A in (%*) do if /I "%%~A"=="--check" goto done
for %%A in (%*) do if /I "%%~A"=="--no-pause" goto done
echo.
echo You can close this window when you have finished reading the messages.
pause
:done
exit /b %AVIATION_EXIT%
