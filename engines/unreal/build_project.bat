@echo off
setlocal
rem Builds the CernyRad editor target and writes the full output to build_log.txt (next to this file).
rem Put this file next to CernyRad.uproject and double-click it.

set "UE=C:\Program Files\Epic Games\UE_5.4"
if not exist "%UE%\Engine\Build\BatchFiles\Build.bat" (
  echo Unreal 5.4 was not found in "%UE%".
  set /p UE=Enter the path to the UE_5.4 folder ^(without quotes^) and press Enter: 
)
if not exist "%UE%\Engine\Build\BatchFiles\Build.bat" (
  echo Build.bat was not found. Check the path.
  pause
  exit /b 1
)
if not exist "%~dp0CernyRad.uproject" (
  echo CernyRad.uproject was not found next to this file.
  echo Move build_project.bat into the folder that contains CernyRad.uproject.
  pause
  exit /b 1
)

echo Building the project, please wait a few minutes...
call "%UE%\Engine\Build\BatchFiles\Build.bat" CernyRadEditor Win64 Development -Project="%~dp0CernyRad.uproject" -WaitMutex > "%~dp0build_log.txt" 2>&1
set RESULT=%ERRORLEVEL%

echo.
if "%RESULT%"=="0" (
  echo DONE: the build succeeded. Open CernyRad.uproject in Unreal.
) else (
  echo BUILD FAILED ^(code %RESULT%^). The output is in build_log.txt next to this file.
  echo Search it for the word "error".
)
echo.
pause
