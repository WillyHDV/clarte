@echo off
rem Inicia o app em http://localhost:5173 (use o Chrome). Feche esta janela para parar.
cd /d "%~dp0"
start "" "http://localhost:5173"
where py >nul 2>nul && (py servidor.py & goto :eof)
where python >nul 2>nul && (python servidor.py & goto :eof)
if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" ("%LOCALAPPDATA%\Programs\Python\Python312\python.exe" servidor.py & goto :eof)
echo Python nao encontrado.
pause

