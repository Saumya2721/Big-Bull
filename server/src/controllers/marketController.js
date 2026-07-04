import YahooFinance from 'yahoo-finance2';
import { fetchQuotesBatch } from '../services/yahooService.js';
import pool from '../config/db.js';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

export const getHistoricalData = async (req, res) => {
  const { symbol } = req.params;

  try {
    // We fetch the last 30 days of daily candle data
    const queryOptions = { period1: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
    const result = await yahooFinance.chart(symbol, queryOptions);

    if (!result || !result.quotes) {
      return res.json({ candles: [] });
    }

    // Format the data exactly how TradingView (lightweight-charts) wants it
    // Filter out candles with null prices (which can happen on holidays or incomplete data)
    const formattedCandles = result.quotes
      .filter(candle => candle.open !== null && candle.high !== null && candle.low !== null && candle.close !== null)
      .map(candle => ({
        time: candle.date.toISOString().split('T')[0], 
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      }));

    return res.json({ candles: formattedCandles });
  } catch (err) {
    console.error(` Failed to fetch market history for ${symbol}:`, err.message);
    return res.status(500).json({ message: 'Market data engine disconnected.', error: err.message });
  }
};

export const searchSymbols = async (req, res) => {
  const { query } = req.params;
  try {
    const result = await yahooFinance.search(query, { quotesCount: 20, newsCount: 0 });
    return res.json({ quotes: result.quotes });
  } catch (err) {
    return res.status(500).json({ message: 'Search query failed.', error: err.message });
  }
};

export const getLocalSearch = async (req, res) => {
  const { sector } = req.query;
  try {
    if (!sector) return res.json({ quotes: [] });
    
    const query = `
      SELECT fi.ticker_symbol as symbol, c.companyname as shortname, c.sector, 'EQUITY' as "quoteType", 'NSE' as "exchDisp"
      FROM bigbull.financial_instruments fi
      JOIN bigbull.company c ON fi.companyname = c.companyname
      WHERE c.sector = $1
      LIMIT 20;
    `;
    const result = await pool.query(query, [sector]);
    return res.json({ quotes: result.rows });
  } catch (err) {
    return res.status(500).json({ message: 'Local search failed.', error: err.message });
  }
};

export const getQuotes = async (req, res) => {
  const { symbols } = req.query; // expect comma separated list ?symbols=RELIANCE.NS,TCS.NS
  try {
    if (!symbols) return res.json({ quotes: [] });
    const symbolArray = symbols.split(',');
    const quotes = await fetchQuotesBatch(symbolArray);
    return res.json({ quotes });
  } catch (err) {
    return res.status(500).json({ message: 'Live quote fetch failed.', error: err.message });
  }
};