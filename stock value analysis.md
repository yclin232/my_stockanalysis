# 個別股票評價技能規範 (Individual Stock Valuation Skill)

## 1. 技能概述 (Overview)
本技能規範定義如何採用多重內在價值評估模型（歷史本益比河流圖、歷史本淨比區間、DCF 現金流量折現法、股利折現模型）對個別股票進行客觀定價，計算合理價、昂貴價、便宜價，並據此推算安全邊際 (Margin of Safety)。

## 2. 評價模型與計算方法 (Valuation Models & Methodologies)

### 2.1 歷史本益比區間估值 (PE Ratio Band / Multiples Valuation)
- **適用對象**：獲利穩定、EPS 為正數之企業。
- **計算步驟**：
  1. 收集過去 3~5 年歷史 P/E 數據，計算平均 P/E (Mean P/E) 以及標準差 (Std Dev)。
  2. 設定五個估值區間：
     - **便宜價 (Undervalued)**：歷史 Low P/E（或 Mean - 1 Std Dev） × 近 4 季近四季 EPS (TTM EPS) 或 預估 EPS (Forward EPS)
     - **合理價偏低 (Fair Low)**：歷史 Mid-Low P/E × EPS
     - **合理價 (Fair Value)**：歷史 Mean P/E × EPS
     - **合理價偏高 (Fair High)**：歷史 Mid-High P/E × EPS
     - **昂貴價 (Overvalued)**：歷史 High P/E（或 Mean + 1 Std Dev） × EPS

### 2.2 歷史本淨比區間估值 (PB Ratio Band Valuation)
- **適用對象**：景氣循環股、金融股、資產密集型或獲利波動大之企業。
- **計算步驟**：
  1. 取得每股淨值 (BPS, Book Value Per Share)。
  2. 設定歷史 P/B 區間：
     - **便宜價**：歷史 Low P/B × BPS
     - **合理價**：歷史 Mean P/B × BPS
     - **昂貴價**：歷史 High P/B × BPS

### 2.3 現金流量折現法 (Discounted Cash Flow, DCF Valuation)
- **適用對象**：自由現金流 (FCF) 為正且可預測之成長型或成熟型企業。
- **計算公式**：
  $$ \text{Intrinsic Value} = \sum_{t=1}^{n} \frac{\text{FCF}_0 \times (1 + g)^t}{(1 + r)^t} + \frac{\text{Terminal Value}}{(1 + r)^n} $$
  - $\text{FCF}_0$：當前每股自由現金流
  - $g$：前 5 年預估現金流成長率 (Short-term Growth Rate)
  - $r$：折現率 / 加權平均資本成本 (WACC / Discount Rate，通常設定 8% ~ 12%)
  - $g_{terminal}$：永續成長率 (Terminal Growth Rate，通常設定 2% ~ 3%)
  - $\text{Terminal Value} = \frac{\text{FCF}_n \times (1 + g_{terminal})}{r - g_{terminal}}$

### 2.4 股利折現模型 (Dividend Discount Model, DDM) & 殖利率評價
- **適用對象**：成熟期高配息企業、公用事業、金融股。
- **高殖利率法計算**：
  - **便宜價**：預估近 1 年每股股利 / 7%
  - **合理價**：預估近 1 年每股股利 / 5%
  - **昂貴價**：預估近 1 年每股股利 / 3.5%

### 2.5 綜合合理價與安全邊際 (Margin of Safety, MoS)
- **加權綜合內在價值 (Composite Fair Value)**：
  根据企業特性加權計算綜合合理價 $V_{fair}$。
- **安全邊際 (Margin of Safety)**：
  $$ \text{Margin of Safety (\%)} = \frac{V_{fair} - P_{current}}{V_{fair}} \times 100\% $$
- **評價狀態判斷**：
  - $\text{MoS} \ge +20\%$：極具吸引力（便宜買點）
  - $0\% \le \text{MoS} < +20\%$：合理位階
  - $-15\% < \text{MoS} < 0\%$：微幅高估
  - $\text{MoS} \le -15\%$：昂貴位階（注意風險）