@echo off
setlocal
cd /d "%~dp0"
set "QUIZ_ROOT=%~dp0"
set "QUIZ_PYTHON=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if exist "%QUIZ_PYTHON%" goto bundled
where py >nul 2>nul
if not errorlevel 1 goto pylauncher
where python >nul 2>nul
if not errorlevel 1 goto pythonlauncher
start "" "%~dp0index.html"
exit /b
:bundled
powershell -NoProfile -Command "Start-Process -FilePath $env:QUIZ_PYTHON -ArgumentList @('start_quiz.py') -WorkingDirectory $env:QUIZ_ROOT -WindowStyle Hidden"
exit /b
:pylauncher
powershell -NoProfile -Command "Start-Process -FilePath 'py' -ArgumentList @('-3','start_quiz.py') -WorkingDirectory $env:QUIZ_ROOT -WindowStyle Hidden"
exit /b
:pythonlauncher
powershell -NoProfile -Command "Start-Process -FilePath 'python' -ArgumentList @('start_quiz.py') -WorkingDirectory $env:QUIZ_ROOT -WindowStyle Hidden"
exit /b
