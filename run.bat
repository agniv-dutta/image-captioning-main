@echo off
setlocal

rem TensorFlow 2.16 draws its predict() progress bar with U+2501, which the
rem default Windows cp1252 console cannot encode. Without UTF-8 mode the
rem resulting UnicodeEncodeError propagates out of /predict and returns HTTP 500.

set "PYTHONUTF8=1"
set "PYTHONIOENCODING=utf-8"

set "ROOT=%~dp0"
set "PY=%ROOT%.venv\Scripts\python.exe"

if not exist "%PY%" (
  echo [error] Virtualenv not found: "%PY%"
  echo [error] Create it with:  py -3.11 -m venv .venv
  echo [error] Then install:    .venv\Scripts\python.exe -m pip install -r "python model\requirements.txt"
  exit /b 1
)

cd /d "%ROOT%python model"
"%PY%" app.py