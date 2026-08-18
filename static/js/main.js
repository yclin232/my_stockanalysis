// ==========================================================================
// StockMatrix Client-Side JavaScript Logic
// ==========================================================================

let currentStock = null;
let currentIndustry = null;
let currentSkillKey = "industry";
let skillsCache = {};

// Chart instances
let dashChartInstance = null;
let fiveForcesChartInstance = null;
let valChartInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    if (typeof ChartDataLabels !== "undefined") {
        Chart.register(ChartDataLabels);
    }
    initTabs();
    initSearch();
    loadStockData("2330.TW");
    loadSkillsData();
});

// Tab Navigation Logic
function initTabs() {
    const tabBtns = document.querySelectorAll(".tab-btn");
    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            tabBtns.forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
            
            btn.classList.add("active");
            const tabId = btn.getAttribute("data-tab");
            const targetPane = document.getElementById(tabId);
            if (targetPane) {
                targetPane.classList.add("active");
            }
        });
    });
}

// Search Error Banner Helpers
function showSearchError(msg) {
    const banner = document.getElementById("searchErrorBanner");
    const msgElem = document.getElementById("errorMessageText");
    if (banner && msgElem) {
        msgElem.innerText = msg;
        banner.style.display = "flex";
    } else {
        alert(msg);
    }
}

function hideSearchError() {
    const banner = document.getElementById("searchErrorBanner");
    if (banner) {
        banner.style.display = "none";
    }
}

// Search Logic
function initSearch() {
    const searchBtn = document.getElementById("searchBtn");
    const tickerInput = document.getElementById("tickerInput");
    
    if (searchBtn) {
        searchBtn.addEventListener("click", () => {
            const symbol = tickerInput.value.trim();
            if (symbol) {
                loadStockData(symbol);
            }
        });
    }
    
    if (tickerInput) {
        tickerInput.addEventListener("keyup", (e) => {
            if (e.key === "Enter") {
                searchBtn.click();
            }
        });

        let searchDebounceTimer = null;
        tickerInput.addEventListener("input", (e) => {
            clearTimeout(searchDebounceTimer);
            const val = e.target.value.trim();
            if (val.length >= 1) {
                searchDebounceTimer = setTimeout(() => {
                    fetch(`/api/stock/search?q=${encodeURIComponent(val)}`)
                        .then(res => res.json())
                        .then(data => {
                            if (data.status === "success" && data.results) {
                                const datalist = document.getElementById("stockDatalist");
                                if (datalist) {
                                    datalist.innerHTML = data.results.map(r => `<option value="${r.name}">${r.label}</option>`).join("");
                                }
                            }
                        }).catch(err => console.error("Search suggest error:", err));
                }, 250);
            }
        });
    }
}

function quickSearch(ticker) {
    document.getElementById("tickerInput").value = ticker;
    loadStockData(ticker);
}

// Fetch and Populate Stock Data
async function loadStockData(ticker) {
    hideSearchError();
    resetValuationUI();
    try {
        const response = await fetch(`/api/stock/${encodeURIComponent(ticker)}`);
        const result = await response.json();
        
        if (response.ok && result.status === "success" && result.data) {
            currentStock = result.data;
            document.getElementById("tickerInput").value = formatStockDisplayName(currentStock);
            updateStockSummaryUI(currentStock);
            updateDashboardUI(currentStock);
            
            // Sync industry
            if (currentStock.industry) {
                const indSelect = document.getElementById("industrySelect");
                if (indSelect) indSelect.value = currentStock.industry;
            }
            await loadIndustryData();
            
            // Run Strategy & Valuation calculations
            analyzeStrategy(currentStock);
            recalculateValuation();
        } else {
            showSearchError(result.message || `找不到「${ticker}」對應的股票資料，請確認輸入名稱或代碼！`);
        }
    } catch (err) {
        console.error("Failed to load stock data:", err);
        showSearchError(`查詢「${ticker}」時發生網路錯誤，請稍後再試。`);
    }
}

function formatStockDisplayName(stock) {
    if (!stock || !stock.name) return stock ? stock.ticker : "";
    const cleanTicker = stock.ticker;
    const baseCode = cleanTicker.replace(".TW", "").replace(".TWO", "");
    if (stock.name.includes(cleanTicker) || stock.name.includes(baseCode)) {
        if (stock.name.includes(`(${cleanTicker})`)) return stock.name;
        return `${stock.name} (${cleanTicker})`;
    }
    return `${stock.name} (${cleanTicker})`;
}

// Update Header Summary Bar
function updateStockSummaryUI(stock) {
    document.getElementById("stockName").innerText = formatStockDisplayName(stock);
    document.getElementById("stockIndustryBadge").innerText = stock.industry_name || "綜合科技";
    
    document.getElementById("stockPrice").innerHTML = `$${stock.price.toFixed(1)} <small class="currency">${stock.currency}</small>`;
    
    const changeElem = document.getElementById("stockChange");
    if (stock.change_percent >= 0) {
        changeElem.innerText = `+${stock.change_percent}%`;
        changeElem.className = "value trend-up";
    } else {
        changeElem.innerText = `${stock.change_percent}%`;
        changeElem.className = "value trend-down";
    }
    
    document.getElementById("stockPE").innerText = (stock.pe_ratio !== null && stock.pe_ratio !== undefined) ? `${stock.pe_ratio} 倍` : "None";
    document.getElementById("stockPB").innerText = (stock.pb_ratio !== null && stock.pb_ratio !== undefined) ? `${stock.pb_ratio} 倍` : "None";
    document.getElementById("stockYield").innerText = (stock.dividend_yield !== null && stock.dividend_yield !== undefined) ? `${stock.dividend_yield}%` : "None";
    document.getElementById("stockROE").innerText = (stock.roe !== null && stock.roe !== undefined) ? `${stock.roe}%` : "None";
    
    const bias5 = stock.bias5 !== undefined ? stock.bias5 : (stock.sma5 ? ((stock.price - stock.sma5) / stock.sma5) * 100 : 0);
    const biasElem = document.getElementById("stockBias5");
    if (biasElem) {
        const formattedBias = bias5 >= 0 ? `+${bias5.toFixed(2)}%` : `${bias5.toFixed(2)}%`;
        biasElem.innerText = formattedBias;
        biasElem.className = bias5 >= 0 ? "value trend-up" : "value trend-down";
    }
}

// Update Dashboard Tab
function updateDashboardUI(stock) {
    const currSymbol = stock.currency === 'TWD' ? 'NT$' : '$';
    document.getElementById("dashCap").innerText = stock.market_cap || "None";
    
    document.getElementById("dashEPS").innerText = (stock.eps !== null && stock.eps !== undefined && !isNaN(stock.eps)) ? `${currSymbol}${stock.eps.toFixed(2)}` : "None";
    document.getElementById("dashBPS").innerText = (stock.bps !== null && stock.bps !== undefined && !isNaN(stock.bps)) ? `${currSymbol}${stock.bps.toFixed(2)}` : "None";
    
    const revElem = document.getElementById("dashRevGrowth");
    if (stock.revenue_growth !== null && stock.revenue_growth !== undefined && !isNaN(stock.revenue_growth) && stock.revenue_growth !== 0) {
        revElem.innerText = `${stock.revenue_growth >= 0 ? '+' : ''}${stock.revenue_growth.toFixed(1)}%`;
        revElem.className = stock.revenue_growth >= 0 ? "trend-up" : "trend-down";
    } else {
        revElem.innerText = "None";
        revElem.className = "trend-neutral";
    }
    
    document.getElementById("dashGrossMargin").innerText = (stock.gross_margin !== null && stock.gross_margin !== undefined && !isNaN(stock.gross_margin) && stock.gross_margin !== 0) ? `${stock.gross_margin.toFixed(1)}%` : "None";
    document.getElementById("dashOpMargin").innerText = (stock.operating_margin !== null && stock.operating_margin !== undefined && !isNaN(stock.operating_margin) && stock.operating_margin !== 0) ? `${stock.operating_margin.toFixed(1)}%` : "None";
    document.getElementById("dashFCF").innerText = (stock.fcf_per_share !== null && stock.fcf_per_share !== undefined && !isNaN(stock.fcf_per_share)) ? `${currSymbol}${stock.fcf_per_share.toFixed(2)}` : "None";
    
    document.getElementById("moatRating").innerText = `${stock.moat || "None"} Moat`;
    document.getElementById("moatDesc").innerText = stock.moat_desc || "無詳細護城河資料";
    
    // 52-week position
    const low52Val = (stock.low_52w !== null && stock.low_52w !== undefined && !isNaN(stock.low_52w)) ? parseFloat(stock.low_52w).toFixed(2) : "None";
    const high52Val = (stock.high_52w !== null && stock.high_52w !== undefined && !isNaN(stock.high_52w)) ? parseFloat(stock.high_52w).toFixed(2) : "None";
    document.getElementById("low52w").innerText = low52Val !== "None" ? `$${low52Val}` : "None";
    document.getElementById("high52w").innerText = high52Val !== "None" ? `$${high52Val}` : "None";
    const rangePct = (stock.low_52w && stock.high_52w && stock.high_52w > stock.low_52w) ? Math.min(100, Math.max(0, ((stock.price - stock.low_52w) / (stock.high_52w - stock.low_52w)) * 100)) : 50;
    document.getElementById("rangePin").style.left = `${rangePct}%`;
    
    document.getElementById("sma5").innerText = `$${stock.sma5 ? stock.sma5.toFixed(2) : stock.price.toFixed(2)}`;
    
    const bias5 = stock.bias5 !== undefined ? stock.bias5 : (stock.sma5 ? ((stock.price - stock.sma5) / stock.sma5) * 100 : 0);
    const biasValElem = document.getElementById("bias5Val");
    if (biasValElem) {
        const formattedBias = bias5 >= 0 ? `+${bias5.toFixed(2)}%` : `${bias5.toFixed(2)}%`;
        biasValElem.innerText = formattedBias;
        biasValElem.className = bias5 >= 0 ? "trend-up" : "trend-down";
    }

    document.getElementById("sma20").innerText = `$${stock.sma20 ? stock.sma20.toFixed(2) : stock.price.toFixed(2)}`;
    document.getElementById("sma60").innerText = `$${stock.sma60 ? stock.sma60.toFixed(2) : stock.price.toFixed(2)}`;
    document.getElementById("sma120").innerText = `$${stock.sma120 ? stock.sma120.toFixed(2) : stock.price.toFixed(2)}`;
    document.getElementById("rsiVal").innerText = stock.rsi ? stock.rsi.toFixed(1) : "50.0";

    const kdElem = document.getElementById("kdVal");
    if (kdElem) {
        const kVal = stock.kd_k !== undefined ? stock.kd_k.toFixed(1) : "65.0";
        const dVal = stock.kd_d !== undefined ? stock.kd_d.toFixed(1) : "60.0";
        kdElem.innerText = `K: ${kVal} / D: ${dVal}`;
    }

    const macdElem = document.getElementById("macdVal");
    if (macdElem) {
        const dif = stock.macd_dif !== undefined ? stock.macd_dif.toFixed(2) : "0.00";
        const dea = stock.macd_dea !== undefined ? stock.macd_dea.toFixed(2) : "0.00";
        const osc = stock.macd_hist !== undefined ? (stock.macd_hist >= 0 ? `+${stock.macd_hist.toFixed(2)}` : stock.macd_hist.toFixed(2)) : "0.00";
        macdElem.innerText = `DIF:${dif} DEA:${dea} OSC:${osc}`;
    }

    renderDashboardChart(stock);
}

// Render Dashboard Chart
function renderDashboardChart(stock) {
    const ctx = document.getElementById("dashboardChart").getContext("2d");
    if (dashChartInstance) {
        dashChartInstance.destroy();
    }

    dashChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["毛利率 %", "營業利益率 %", "ROE %", "營收成長率 %", "股利殖利率 %"],
            datasets: [{
                label: `${stock.ticker} 核心能力與財務比率 (%)`,
                data: [stock.gross_margin, stock.operating_margin, stock.roe, stock.revenue_growth, stock.dividend_yield],
                backgroundColor: [
                    "rgba(0, 242, 254, 0.7)",
                    "rgba(59, 130, 246, 0.7)",
                    "rgba(16, 185, 129, 0.7)",
                    "rgba(139, 92, 246, 0.7)",
                    "rgba(245, 158, 11, 0.7)"
                ],
                borderColor: [
                    "#00f2fe", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b"
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { top: 25 }
            },
            plugins: {
                legend: { labels: { color: "#94a3b8" } },
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    color: '#00f2fe',
                    font: { weight: 'bold', size: 13 },
                    formatter: function(value) {
                        return (value !== null && value !== undefined) ? value + '%' : '';
                    }
                }
            },
            scales: {
                x: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(255, 255, 255, 0.05)" } },
                y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(255, 255, 255, 0.05)" } }
            }
        }
    });
}

// Load Industry Analysis Data
async function loadIndustryData() {
    const indId = document.getElementById("industrySelect").value;
    try {
        const response = await fetch(`/api/industry/${indId}`);
        const result = await response.json();
        
        if (result.status === "success" && result.data) {
            currentIndustry = result.data;
            updateIndustryUI(currentIndustry);
        }
    } catch (err) {
        console.error("Failed to load industry data:", err);
    }
}

function updateIndustryUI(ind) {
    document.getElementById("indLifecycle").innerText = ind.lifecycle;
    document.getElementById("indCAGR").innerText = ind.cagr;
    document.getElementById("indTAM").innerText = ind.tam;
    
    // Drivers & Risks
    const drvList = document.getElementById("indDrivers");
    drvList.innerHTML = ind.growth_drivers.map(d => `<li>${d}</li>`).join("");
    
    const rskList = document.getElementById("indRisks");
    rskList.innerHTML = ind.key_risks.map(r => `<li>${r}</li>`).join("");
    
    // Supply Chain
    document.getElementById("chainUpstream").innerHTML = ind.supply_chain.upstream.map(item => `<li>${item}</li>`).join("");
    document.getElementById("chainMidstream").innerHTML = ind.supply_chain.midstream.map(item => `<li>${item}</li>`).join("");
    document.getElementById("chainDownstream").innerHTML = ind.supply_chain.downstream.map(item => `<li>${item}</li>`).join("");
    
    // PESTEL
    const pestelContainer = document.getElementById("pestelGrid");
    pestelContainer.innerHTML = `
        <div class="pestel-item"><strong>Political (政治)</strong><p>${ind.pestel.political}</p></div>
        <div class="pestel-item"><strong>Economic (經濟)</strong><p>${ind.pestel.economic}</p></div>
        <div class="pestel-item"><strong>Social (社會)</strong><p>${ind.pestel.social}</p></div>
        <div class="pestel-item"><strong>Technological (技術)</strong><p>${ind.pestel.technological}</p></div>
        <div class="pestel-item"><strong>Environmental (環境)</strong><p>${ind.pestel.environmental}</p></div>
        <div class="pestel-item"><strong>Legal (法律)</strong><p>${ind.pestel.legal}</p></div>
    `;

    renderFiveForcesChart(ind.five_forces);
}

// Render Porter's 5 Forces Radar Chart
function renderFiveForcesChart(forces) {
    const ctx = document.getElementById("fiveForcesChart").getContext("2d");
    if (fiveForcesChartInstance) {
        fiveForcesChartInstance.destroy();
    }

    fiveForcesChartInstance = new Chart(ctx, {
        type: "radar",
        data: {
            labels: ["供應商議價力", "買方議價力", "潛在進入者威脅", "替代品威脅", "同業競爭強度"],
            datasets: [{
                label: "波特五力威脅強度 (1-5)",
                data: [
                    forces.supplier_power.score,
                    forces.buyer_power.score,
                    forces.threat_new_entrants.score,
                    forces.threat_substitutes.score,
                    forces.competitive_rivalry.score
                ],
                backgroundColor: "rgba(0, 242, 254, 0.25)",
                borderColor: "#00f2fe",
                pointBackgroundColor: "#8b5cf6"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: "rgba(255,255,255,0.1)" },
                    grid: { color: "rgba(255,255,255,0.1)" },
                    pointLabels: { color: "#94a3b8", font: { size: 11 } },
                    ticks: { display: false, min: 0, max: 5 }
                }
            },
            plugins: {
                legend: { labels: { color: "#94a3b8" } },
                datalabels: {
                    color: '#ffffff',
                    font: { weight: 'bold', size: 12 },
                    formatter: function(value) {
                        return value + ' 分';
                    }
                }
            }
        }
    });
}

// Strategy Analysis
async function analyzeStrategy(stock) {
    try {
        const response = await fetch("/api/strategy/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stock: stock })
        });
        const result = await response.json();
        if (result.status === "success" && result.data) {
            const data = result.data;
            document.getElementById("strategyVerdictTitle").innerText = data.rec_strategy;
            document.getElementById("strategyVerdictDesc").innerText = data.strategy_desc;
            
            document.getElementById("techSignalsList").innerHTML = data.tech_signals.map(s => `<li>${s}</li>`).join("");
            document.getElementById("financialScoreVal").innerText = `${data.financial_score} 分`;
            document.getElementById("financialScoreFill").style.width = `${data.financial_score}%`;
            
            // Fill SWOT
            document.getElementById("swotS").innerHTML = data.swot.strengths.map(i => `<li>${i}</li>`).join("");
            document.getElementById("swotW").innerHTML = data.swot.weaknesses.map(i => `<li>${i}</li>`).join("");
            document.getElementById("swotO").innerHTML = data.swot.opportunities.map(i => `<li>${i}</li>`).join("");
            document.getElementById("swotT").innerHTML = data.swot.threats.map(i => `<li>${i}</li>`).join("");
            
            // Sync Report Tab
            document.getElementById("repStrategyTitle").innerText = data.rec_strategy;
            document.getElementById("repStrategyDesc").innerText = data.strategy_desc;
        }
    } catch (err) {
        console.error("Strategy analysis error:", err);
    }
}

// Valuation Recalculation
async function recalculateValuation() {
    if (!currentStock) return;
    
    const growth = parseFloat(document.getElementById("growthSlider").value) / 100.0;
    const discount = parseFloat(document.getElementById("discountSlider").value) / 100.0;
    const terminal = parseFloat(document.getElementById("terminalSlider").value) / 100.0;
    
    document.getElementById("valGrowthLabel").innerText = `${(growth * 100).toFixed(1)}%`;
    document.getElementById("valDiscountLabel").innerText = `${(discount * 100).toFixed(1)}%`;
    document.getElementById("valTerminalLabel").innerText = `${(terminal * 100).toFixed(1)}%`;

    try {
        const response = await fetch("/api/valuation/calculate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                stock: currentStock,
                growth_rate: growth,
                discount_rate: discount,
                terminal_growth: terminal
            })
        });
        const result = await response.json();
        if (result.status === "success" && result.data) {
            updateValuationUI(result.data);
            updateReportUI(currentStock, result.data);
        }
    } catch (err) {
        console.error("Valuation calculation error:", err);
    }
}

function resetValuationUI() {
    const valCurrPrice = document.getElementById("valCurrPrice");
    if (valCurrPrice) valCurrPrice.innerText = "...";
    const valFairPrice = document.getElementById("valFairPrice");
    if (valFairPrice) valFairPrice.innerText = "...";
    const mosValue = document.getElementById("mosValue");
    if (mosValue) mosValue.innerText = "---";
}

function updateValuationUI(val) {
    const badge = document.getElementById("valStatusBadge");
    badge.innerText = val.valuation_status;
    badge.className = `badge-status badge-${val.badge_color}`;
    
    const mosElem = document.getElementById("mosValue");
    mosElem.innerText = `${val.margin_of_safety >= 0 ? '+' : ''}${val.margin_of_safety}%`;
    mosElem.className = val.margin_of_safety >= 0 ? "mos-val trend-up" : "mos-val trend-down";
    
    document.getElementById("valCurrPrice").innerText = `$${val.current_price.toFixed(1)}`;
    document.getElementById("valFairPrice").innerText = `$${val.weighted_fair_value.toFixed(1)}`;

    // Table rows
    document.getElementById("dcfCheap").innerText = `$${(val.dcf.fair_value * 0.75).toFixed(1)}`;
    document.getElementById("dcfFair").innerText = `$${val.dcf.fair_value.toFixed(1)}`;
    document.getElementById("dcfExpensive").innerText = `$${(val.dcf.fair_value * 1.3).toFixed(1)}`;

    document.getElementById("peCheap").innerText = `$${val.pe_band.cheap.toFixed(1)}`;
    document.getElementById("peFair").innerText = `$${val.pe_band.fair.toFixed(1)}`;
    document.getElementById("peExpensive").innerText = `$${val.pe_band.expensive.toFixed(1)}`;

    document.getElementById("pbCheap").innerText = `$${val.pb_band.cheap.toFixed(1)}`;
    document.getElementById("pbFair").innerText = `$${val.pb_band.fair.toFixed(1)}`;
    document.getElementById("pbExpensive").innerText = `$${val.pb_band.expensive.toFixed(1)}`;

    document.getElementById("ddmCheap").innerText = `$${val.ddm.cheap.toFixed(1)}`;
    document.getElementById("ddmFair").innerText = `$${val.ddm.fair.toFixed(1)}`;
    document.getElementById("ddmExpensive").innerText = `$${val.ddm.expensive.toFixed(1)}`;

    renderValuationBarChart(val);
}

// Render Valuation Bar Chart
function renderValuationBarChart(val) {
    const ctx = document.getElementById("valuationBarChart").getContext("2d");
    if (valChartInstance) {
        valChartInstance.destroy();
    }

    valChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["DCF 模型", "PE 河流區間", "PB 比率區間", "DDM 股利模型", "當前市價"],
            datasets: [
                {
                    label: "便宜價 (Undervalued)",
                    data: [val.dcf.fair_value * 0.75, val.pe_band.cheap, val.pb_band.cheap, val.ddm.cheap, 0],
                    backgroundColor: "rgba(16, 185, 129, 0.6)"
                },
                {
                    label: "合理內在價值 (Fair Value)",
                    data: [val.dcf.fair_value, val.pe_band.fair, val.pb_band.fair, val.ddm.fair, val.current_price],
                    backgroundColor: "rgba(0, 242, 254, 0.8)"
                },
                {
                    label: "昂貴價 (Overvalued)",
                    data: [val.dcf.fair_value * 1.3, val.pe_band.expensive, val.pb_band.expensive, val.ddm.expensive, 0],
                    backgroundColor: "rgba(239, 68, 68, 0.6)"
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { top: 25 }
            },
            scales: {
                x: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(255,255,255,0.05)" } },
                y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(255,255,255,0.05)" } }
            },
            plugins: {
                legend: { labels: { color: "#94a3b8" } },
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    color: '#ffffff',
                    font: { weight: 'bold', size: 11 },
                    formatter: function(value) {
                        return value > 0 ? '$' + Math.round(value) : '';
                    }
                }
            }
        }
    });
}

// Populate Printable Report Tab
function updateReportUI(stock, val) {
    document.getElementById("repCompanyTitle").innerText = `${formatStockDisplayName(stock)} 綜合分析研究報告`;
    document.getElementById("repDate").innerText = new Date().toISOString().slice(0, 10);
    document.getElementById("repVerdictBadge").innerText = val.valuation_status;
    
    document.getElementById("repPrice").innerText = `$${stock.price.toFixed(1)} ${stock.currency}`;
    document.getElementById("repCap").innerText = stock.market_cap;
    document.getElementById("repPEPB").innerText = `${stock.pe_ratio} 倍 / ${stock.pb_ratio} 倍`;
    document.getElementById("repROEMargin").innerText = `${stock.roe}% / ${stock.gross_margin}%`;
    document.getElementById("repEPSFCF").innerText = `$${stock.eps.toFixed(2)} / $${stock.fcf_per_share.toFixed(2)}`;
    
    const repSMA5BIAS = document.getElementById("repSMA5BIAS");
    if (repSMA5BIAS && stock.sma5) {
        const bias5 = stock.bias5 !== undefined ? stock.bias5 : ((stock.price - stock.sma5) / stock.sma5) * 100;
        const formattedBias = bias5 >= 0 ? `+${bias5.toFixed(2)}%` : `${bias5.toFixed(2)}%`;
        repSMA5BIAS.innerText = `$${stock.sma5.toFixed(2)} / ${formattedBias}`;
    }

    const repKDMACD = document.getElementById("repKDMACD");
    if (repKDMACD) {
        const k = stock.kd_k !== undefined ? stock.kd_k.toFixed(1) : "65.0";
        const d = stock.kd_d !== undefined ? stock.kd_d.toFixed(1) : "60.0";
        const dif = stock.macd_dif !== undefined ? stock.macd_dif.toFixed(2) : "0.00";
        const osc = stock.macd_hist !== undefined ? (stock.macd_hist >= 0 ? `+${stock.macd_hist.toFixed(2)}` : stock.macd_hist.toFixed(2)) : "0.00";
        repKDMACD.innerText = `K:${k} D:${d} / DIF:${dif} OSC:${osc}`;
    }

    document.getElementById("repMoat").innerText = `${stock.moat} (${stock.moat_desc})`;

    if (currentIndustry) {
        document.getElementById("repIndustryName").innerText = currentIndustry.name;
        document.getElementById("repLifecycle").innerText = currentIndustry.lifecycle;
        
        const repTrendElem = document.getElementById("repIndustryTrend");
        if (repTrendElem) {
            const driversStr = (currentIndustry.growth_drivers && currentIndustry.growth_drivers.length > 0)
                ? currentIndustry.growth_drivers.join("；")
                : "產業轉型升級與自動化營運推進";
            const cagrStr = currentIndustry.cagr ? `，預期年複合成長率 (CAGR) 為 ${currentIndustry.cagr}` : "";
            repTrendElem.innerText = `${driversStr}${cagrStr}。`;
        }
    }

    document.getElementById("repDcfC").innerText = `$${(val.dcf.fair_value * 0.75).toFixed(1)}`;
    document.getElementById("repDcfF").innerText = `$${val.dcf.fair_value.toFixed(1)}`;
    document.getElementById("repDcfE").innerText = `$${(val.dcf.fair_value * 1.3).toFixed(1)}`;

    document.getElementById("repPeC").innerText = `$${val.pe_band.cheap.toFixed(1)}`;
    document.getElementById("repPeF").innerText = `$${val.pe_band.fair.toFixed(1)}`;
    document.getElementById("repPeE").innerText = `$${val.pe_band.expensive.toFixed(1)}`;

    document.getElementById("repPbC").innerText = `$${val.pb_band.cheap.toFixed(1)}`;
    document.getElementById("repPbF").innerText = `$${val.pb_band.fair.toFixed(1)}`;
    document.getElementById("repPbE").innerText = `$${val.pb_band.expensive.toFixed(1)}`;

    document.getElementById("repFairPrice").innerText = `$${val.weighted_fair_value.toFixed(1)}`;
    document.getElementById("repMOS").innerText = `${val.margin_of_safety >= 0 ? '+' : ''}${val.margin_of_safety}%`;
    document.getElementById("repValStatus").innerText = val.valuation_status;
}

// Print / Save to PDF
function printReport() {
    // Switch to report tab first
    const reportTabBtn = document.querySelector('[data-tab="tab-report"]');
    if (reportTabBtn) {
        reportTabBtn.click();
    }
    setTimeout(() => {
        window.print();
    }, 300);
}

// Skills Editor Logic
async function loadSkillsData() {
    try {
        const response = await fetch("/api/skills");
        const result = await response.json();
        if (result.status === "success" && result.skills) {
            skillsCache = result.skills;
            switchSkill(currentSkillKey);
        }
    } catch (err) {
        console.error("Failed to load skills:", err);
    }
}

function switchSkill(key) {
    currentSkillKey = key;
    document.querySelectorAll(".skill-nav-btn").forEach(btn => btn.classList.remove("active"));
    
    const titles = {
        "industry": "industries analysis skill.md",
        "strategy": "stock analysis.md",
        "valuation": "stock value analysis.md"
    };
    
    document.getElementById("currentSkillTitle").innerText = titles[key] || key;
    document.getElementById("skillContentTextarea").value = skillsCache[key] || "";
    
    // Highlight sidebar active button
    const activeBtn = Array.from(document.querySelectorAll(".skill-nav-btn")).find(b => b.getAttribute("onclick").includes(key));
    if (activeBtn) activeBtn.classList.add("active");
}

async function saveCurrentSkill() {
    const content = document.getElementById("skillContentTextarea").value;
    try {
        const response = await fetch("/api/skills/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: currentSkillKey, content: content })
        });
        const result = await response.json();
        if (result.status === "success") {
            skillsCache[currentSkillKey] = content;
            alert(`成功更新技能規範: ${currentSkillKey}`);
        }
    } catch (err) {
        alert("儲存技能規範失敗！");
    }
}
