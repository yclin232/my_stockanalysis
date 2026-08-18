# StockMatrix 智能股票產業分析與評價系統 📈

[![Python Version](https://img.shields.io/badge/python-3.9%2B-blue.svg)](https://www.python.org/)
[![Framework](https://img.shields.io/badge/framework-Flask-green.svg)](https://flask.palletsprojects.com/)
[![License](https://img.shields.io/badge/license-MIT-brightgreen.svg)](LICENSE)

**StockMatrix** 是一套功能強大、介面現代化的智能股票產業分析與企業評價 Web 系統。支援台股（TW）與美股（US）即時數據檢索、技術指標分析、多重內在價值估算（DCF 模型、葛拉漢數字、本益比/本淨比河流圖）以及護城河評價與產業個股比較。

---

## 🌟 核心功能特色

- 📊 **即時行情與技術分析**：自動同步 `yfinance` 市場數據，提供 KD (随机指标)、MACD、RSI、移動平均線 (SMA5/20/50/200) 及乖離率。
- 💰 **多重估值與內在價值模型**：
  - **DCF (現金流折現模型)**：精準預測企業內在價值與安全邊際。
  - **葛拉漢數字 (Graham Number)**：經典價值投資安全價值下限計算。
  - **PE / PB 評價位階**：自動評估目前股價處於合理、偏高或便宜區間。
- 🏰 **企業護城河與產業評級**：針對科技、半導體、AI 晶片等產業提供護城河優勢分析（寬/窄護城河及切換成本評估）。
- ⚖️ **多股多維度比較工具**：提供跨企業財務數據、成長率、毛利率與 ROE 的一鍵比較面板。
- 🛡️ **離線備援機制**：即使網路連線失敗或 API 限流，系統內建預設熱門個股（如台積電 2330.TW、NVIDIA NVDA、Apple AAPL 等）備援資料庫。

---

## 📁 專案檔案結構

```text
Stock-Analysis/
├── app.py                 # Flask 後端伺服器核心邏輯與 API 路由
├── requirements.txt       # Python 依賴套件清單 (含 Flask, yfinance, pandas, gunicorn)
├── Procfile               # 雲端部署 (Render / Heroku / Railway) 設定檔
├── wsgi.py                # WSGI 伺服器進入點
├── stock_analysis.bat     # Windows 一鍵雙擊啟動腳本
├── test_app.py            # 自動化單元測試套件
├── templates/
│   └── index.html         # 系統前端 Web 介面 (HTML5)
└── static/
    ├── css/style.css      # 現代化深色 UI 樣式庫
    └── js/main.js         # 前端動態交互與 API 資料串接腳本
```

---

## 🚀 本地快速啟動指南

### 方法 A：Windows 一鍵啟動（推薦）
雙擊資料夾內的 **`stock_analysis.bat`** 即可！
- 自動建立獨立虛擬環境 `.venv`
- 自動安裝必要依賴套件
- 自動啟動 Web 服務並開啟預設瀏覽器（`http://127.0.0.1:5050`）

### 方法 B：手動指令啟動

1. **複製專案庫：**
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
   cd YOUR_REPOSITORY
   ```

2. **建立並啟用虛擬環境：**
   ```bash
   python -m venv .venv
   # Windows
   .venv\Scripts\activate
   # macOS / Linux
   source .venv/bin/activate
   ```

3. **安裝依賴套件：**
   ```bash
   pip install -r requirements.txt
   ```

4. **啟動 Web 伺服器：**
   ```bash
   python app.py
   ```
   瀏覽器開啟 `http://127.0.0.1:5050` 即可使用。

---

## 🌐 雲端一鍵部署指南

本專案已完全適配免費雲端託管平台：

### 部署至 Render.com (推薦)
1. 將本專案 Push 至您的 GitHub 帳號。
2. 登入 [Render.com](https://render.com/)，點擊 **New +** -> **Web Service**。
3. 連接您的 GitHub 儲存庫。
4. 設定參數：
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
5. 點擊 **Create Web Service**，數分鐘內即可獲得免費的線上股票分析網站 URL！

---

## 🧪 單元測試

執行內建測試套件驗證 API 與分析邏輯：
```bash
python test_app.py
```

---

## 📄 授權條款

本專案採用 MIT 授權條款。詳見 [LICENSE](LICENSE) 檔案。
