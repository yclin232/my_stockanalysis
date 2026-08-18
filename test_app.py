import unittest
import json
import os
from app import app, BASE_DIR

class StockAppTestCase(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_index_page(self):
        """Test index page returns HTML 200"""
        response = self.app.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'StockMatrix', response.data)

    def test_stock_api(self):
        """Test stock ticker data API for TW and US stocks"""
        # Taiwan Stock
        res1 = self.app.get('/api/stock/2330.TW')
        self.assertEqual(res1.status_code, 200)
        data1 = json.loads(res1.data)
        self.assertEqual(data1['status'], 'success')
        self.assertEqual(data1['data']['ticker'], '2330.TW')
        self.assertGreater(data1['data']['price'], 0)
        self.assertIn('sma5', data1['data'])
        self.assertIn('bias5', data1['data'])
        self.assertIn('kd_k', data1['data'])
        self.assertIn('kd_d', data1['data'])
        self.assertIn('macd_dif', data1['data'])
        self.assertIn('macd_dea', data1['data'])
        self.assertIn('macd_hist', data1['data'])
        # Financial indicator assertions for TSMC (2330.TW)
        self.assertGreater(data1['data']['eps'], 50.0) # Real EPS > 50 TWD
        self.assertGreater(data1['data']['gross_margin'], 50.0) # TSMC Gross Margin > 50%
        self.assertGreater(data1['data']['operating_margin'], 40.0) # TSMC Op Margin > 40%
        self.assertGreater(data1['data']['bps'], 150.0) # TSMC BPS > 150 TWD

        # US Stock
        res2 = self.app.get('/api/stock/NVDA')
        self.assertEqual(res2.status_code, 200)
        data2 = json.loads(res2.data)
        self.assertEqual(data2['status'], 'success')
        self.assertEqual(data2['data']['ticker'], 'NVDA')
        self.assertIn('sma5', data2['data'])
        self.assertIn('bias5', data2['data'])
        self.assertIn('kd_k', data2['data'])
        self.assertIn('kd_d', data2['data'])
        self.assertIn('macd_dif', data2['data'])
        # Financial indicator assertions for NVDA
        self.assertGreater(data2['data']['gross_margin'], 60.0) # NVDA Gross Margin > 60%
        self.assertGreater(data2['data']['revenue_growth'], 30.0) # NVDA YoY Growth > 30%

    def test_kd_macd_indicators(self):
        """Test KD and MACD indicators signals in strategy API"""
        payload = {
            "stock": {
                "ticker": "2330.TW",
                "price": 100.0,
                "revenue_growth": 20.0,
                "gross_margin": 50.0,
                "roe": 25.0,
                "fcf_per_share": 10.0,
                "pe_ratio": 20.0,
                "dividend_yield": 2.0,
                "moat": "Wide",
                "kd_k": 85.0,
                "kd_d": 82.0,
                "macd_dif": 5.0,
                "macd_dea": 3.0,
                "macd_hist": 2.0
            }
        }
        res = self.app.post('/api/strategy/analyze', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)['data']
        signals = data['tech_signals']

        has_kd_signal = any("KD" in s for s in signals)
        has_macd_signal = any("MACD" in s for s in signals)
        self.assertTrue(has_kd_signal, "tech_signals should contain KD indicator signal")
        self.assertTrue(has_macd_signal, "tech_signals should contain MACD indicator signal")

    def test_chinese_name_and_partial_search(self):
        """Test searching stocks by full/partial Chinese company names"""
        # Exact Chinese Name
        res1 = self.app.get('/api/stock/台積電')
        self.assertEqual(res1.status_code, 200)
        data1 = json.loads(res1.data)
        self.assertEqual(data1['status'], 'success')
        self.assertEqual(data1['data']['ticker'], '2330.TW')

        # Partial Chinese Name
        res2 = self.app.get('/api/stock/聯發')
        self.assertEqual(res2.status_code, 200)
        data2 = json.loads(res2.data)
        self.assertEqual(data2['status'], 'success')
        self.assertEqual(data2['data']['ticker'], '2454.TW')

        # Chinese Alias for US stock
        res3 = self.app.get('/api/stock/輝達')
        self.assertEqual(res3.status_code, 200)
        data3 = json.loads(res3.data)
        self.assertEqual(data3['status'], 'success')
        self.assertEqual(data3['data']['ticker'], 'NVDA')

        # Formatted parenthesized queries e.g. "廣達 (2382.TW)" or "台積電 (2330.TW)"
        res4 = self.app.get('/api/stock/廣達 (2382.TW)')
        self.assertEqual(res4.status_code, 200)
        data4 = json.loads(res4.data)
        self.assertEqual(data4['status'], 'success')
        self.assertEqual(data4['data']['ticker'], '2382.TW')

        res5 = self.app.get('/api/stock/台積電 (2330.TW)')
        self.assertEqual(res5.status_code, 200)
        data5 = json.loads(res5.data)
        self.assertEqual(data5['status'], 'success')
        self.assertEqual(data5['data']['ticker'], '2330.TW')

        # Live Autocomplete search API
        res_search = self.app.get('/api/stock/search?q=長榮')
        self.assertEqual(res_search.status_code, 200)
        search_data = json.loads(res_search.data)
        self.assertEqual(search_data['status'], 'success')
        self.assertGreater(len(search_data['results']), 0)

    def test_invalid_stock_returns_error(self):
        """Test invalid/unknown stock ticker or name returns 404 error without dummy data"""
        res = self.app.get('/api/stock/INVALID_STOCK_99999')
        self.assertEqual(res.status_code, 404)
        data = json.loads(res.data)
        self.assertEqual(data['status'], 'error')
        self.assertIn('message', data)
        self.assertIn('找不到', data['message'])

    def test_bias5_calculation(self):
        """Test 5-day BIAS (5日乖離率) calculation and technical signal generation"""
        payload = {
            "stock": {
                "ticker": "2330.TW",
                "price": 100.0,
                "sma5": 95.0,
                "bias5": 5.26,
                "revenue_growth": 20.0,
                "gross_margin": 50.0,
                "roe": 25.0,
                "fcf_per_share": 10.0,
                "pe_ratio": 20.0,
                "dividend_yield": 2.0,
                "moat": "Wide"
            }
        }
        res = self.app.post('/api/strategy/analyze',
                            data=json.dumps(payload),
                            content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)['data']
        signals = data['tech_signals']
        
        # Verify 5-day BIAS signal exists in tech_signals list
        has_bias_signal = any("5日乖離率" in s for s in signals)
        self.assertTrue(has_bias_signal, "tech_signals should contain 5-day BIAS signal")

    def test_industry_api(self):
        """Test industry data API"""
        response = self.app.get('/api/industry/semiconductor')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'success')
        self.assertIn('five_forces', data['data'])
        self.assertIn('pestel', data['data'])

    def test_telecom_industry_classification(self):
        """Test Telecom stock (Chunghwa Telecom 2412.TW) maps to telecom_services industry"""
        res = self.app.get('/api/stock/2412.TW')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data['status'], 'success')
        self.assertEqual(data['data']['industry'], 'telecom_services')

        res_ind = self.app.get('/api/industry/telecom_services')
        self.assertEqual(res_ind.status_code, 200)
        ind_data = json.loads(res_ind.data)
        self.assertEqual(ind_data['status'], 'success')
        self.assertIn('通訊網路業', ind_data['data']['name'])

    def test_strategy_api(self):
        """Test stock strategy analysis API"""
        payload = {
            "stock": {
                "ticker": "2330.TW",
                "price": 965.0,
                "revenue_growth": 28.5,
                "gross_margin": 54.3,
                "roe": 29.8,
                "fcf_per_share": 35.2,
                "pe_ratio": 24.5,
                "dividend_yield": 1.66,
                "moat": "Wide",
                "sma5": 955.0,
                "bias5": 1.05,
                "sma20": 950.0,
                "sma200": 820.0,
                "rsi": 58.4
            }
        }
        response = self.app.post('/api/strategy/analyze', 
                                 data=json.dumps(payload),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'success')
        self.assertIn('rec_strategy', data['data'])
        self.assertIn('swot', data['data'])

    def test_valuation_api(self):
        """Test stock valuation calculation API"""
        payload = {
            "stock": {
                "price": 965.0,
                "eps": 39.4,
                "bps": 141.9,
                "fcf_per_share": 35.2,
                "pe_ratio": 24.5,
                "pb_ratio": 6.8,
                "revenue_growth": 28.5
            },
            "growth_rate": 0.12,
            "discount_rate": 0.09,
            "terminal_growth": 0.025
        }
        response = self.app.post('/api/valuation/calculate',
                                 data=json.dumps(payload),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'success')
        val = data['data']
        self.assertIn('weighted_fair_value', val)
        self.assertIn('margin_of_safety', val)
        self.assertIn('dcf', val)
        self.assertLess(val['pe_band']['cheap'], val['pe_band']['fair'])
        self.assertLess(val['pe_band']['fair'], val['pe_band']['expensive'])

        # Test Low PE Stock (e.g. PE = 8.0)
        payload_low_pe = {
            "stock": {
                "price": 36.0, "eps": 5.2, "bps": 22.0, "fcf_per_share": 4.0,
                "pe_ratio": 8.0, "pb_ratio": 1.2, "revenue_growth": 10.0
            }
        }
        res_low = self.app.post('/api/valuation/calculate', data=json.dumps(payload_low_pe), content_type='application/json')
        val_low = json.loads(res_low.data)['data']
        self.assertLess(val_low['pe_band']['cheap'], val_low['pe_band']['fair'])
        self.assertLess(val_low['pe_band']['fair'], val_low['pe_band']['expensive'])

    def test_skills_api(self):
        """Test reading skills and updating skill API"""
        res_get = self.app.get('/api/skills')
        self.assertEqual(res_get.status_code, 200)
        skills = json.loads(res_get.data)['skills']
        self.assertIn('industry', skills)
        self.assertIn('strategy', skills)
        self.assertIn('valuation', skills)

    def test_skill_file_contents(self):
        """Verify markdown skill files exist and contain content"""
        files = ["industries analysis skill.md", "stock analysis.md", "stock value analysis.md"]
        for f in files:
            path = os.path.join(BASE_DIR, f)
            self.assertTrue(os.path.exists(path))
            self.assertGreater(os.path.getsize(path), 100)

if __name__ == '__main__':
    unittest.main()
