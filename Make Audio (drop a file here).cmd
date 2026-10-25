@echo off
rem Drag a .md or .txt file onto this file to turn it into audio tracks (saved in the Audio folder).
if "%~1"=="" (
  echo Drag a .md or .txt file onto this icon to turn it into audio tracks.
  echo The tracks are saved in the "Audio" folder and sync to your phone through OneDrive.
  echo.
  pause
  exit /b
)
python -c "import edge_tts" >nul 2>&1
if errorlevel 1 (
  echo For the most natural voices, Petal Reader uses the free "edge-tts" add-on for Python.
  echo Without it, the built-in Windows voices are used instead.
  choice /c YN /m "Install edge-tts now (needs internet)"
  if not errorlevel 2 python -m pip install --disable-pip-version-check edge-tts
  echo.
)
python "%~dp0tools\make_audio.py" %*
echo.
pause
