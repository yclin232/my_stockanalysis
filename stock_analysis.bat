@echo off
title StockMatrix 股票分析系統

echo ========================================================
echo   StockMatrix 股票分析系統 - 啟動中...
echo ========================================================
echo.

cd /d "%~dp0"

REM 檢查 Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [錯誤] 找不到 Python 環境！
    echo 請先安裝 Python 3.9 以上版本，並勾選 Add Python to PATH。
    pause
    exit /b 1
)

REM 啟動虛擬環境 (若存在)
if exist ".venv\Scripts\activate.bat" (
    call ".venv\Scripts\activate.bat"
)

echo.
echo ========================================================
echo   服務啟動中，系統將自動開啟 Google Chrome 瀏覽器！
echo   網址: http://127.0.0.1:5050
echo   若要關閉系統，請直接關閉此視窗。
echo ========================================================
echo.

python app.py
pause
