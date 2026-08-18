========================================================================
 StockMatrix 智能股票產業分析與評價系統 - 跨電腦安裝與執行說明
========================================================================

【安裝步驟 (在另一台 Windows 電腦)】：

1. 解壓縮檔案：
   將 Stock_Analysis_App.zip 解壓縮至您希望存放的資料夾 (例如 C:\Stock_Analysis)。

2. 確認 Python 環境：
   電腦需安裝 Python 3.9 或以上版本。
   安裝 Python 時，請務必勾選「Add Python to PATH」選項。
   (Python 官方下載: https://www.python.org/downloads/)

3. 一鍵啟動與使用：
   雙擊執行資料夾內的「stock_analysis.bat」即可！
   - bat 檔會自動建立獨立的 Python 虛擬環境 (.venv)。
   - 自動安裝必要依賴套件 (Flask, yfinance, ta, pandas, requests)。
   - 自動開啟預設瀏覽器並載入系統主頁 (http://127.0.0.1:5050)。

========================================================================
【主要檔案結構】：
 - stock_analysis.bat     : 一鍵雙擊啟動檔 (捷徑)
 - app.py                 : 後端核心應用程式 (Flask 伺服器)
 - requirements.txt       : Python 依賴套件清單
 - templates/index.html   : 系統前端 HTML 網頁介面
 - static/                : 樣式 (CSS) 與邏輯腳本 (JavaScript)
 - test_app.py            : 自動化單元測試套件
========================================================================
