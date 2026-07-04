import pool from '../config/db.js';
import { fetchQuotesBatch } from './yahooService.js';

export const startMarketDataService = () => {
  // Execute immediately once, then every 5 minutes
  const pollMarketData = async () => {
    console.log('[MarketData] Polling live market data for tracked instruments...');
    try {
      const client = await pool.connect();

      try {
        const instrumentsRes = await client.query('SELECT DISTINCT ticker_symbol FROM bigbull.financial_instruments');
        const symbols = instrumentsRes.rows.map(row => row.ticker_symbol);

        if (symbols.length === 0) {
          return;
        }

        let successfulQuotes = 0;
        const chunkSize = 10;
        for (let i = 0; i < symbols.length; i += chunkSize) {
          const chunk = symbols.slice(i, i + chunkSize);
          try {
            const quotesArray = await fetchQuotesBatch(chunk);
            for (const quote of quotesArray) {
              try {
                const symbol = quote.symbol;
                const dailyHigh = quote.regularMarketDayHigh || quote.regularMarketPrice;
                const dailyLow = quote.regularMarketDayLow || quote.regularMarketPrice;
                const currPrice = quote.regularMarketPrice;
                const volume = quote.regularMarketVolume || 0;

                await client.query(`
                  INSERT INTO bigbull.marketdata (ticker_symbol, timestamp, dailyhigh, dailylow, currprice, volume)
                  VALUES ($1, NOW(), $2, $3, $4, $5)
                `, [symbol, dailyHigh, dailyLow, currPrice, volume]);
                successfulQuotes++;
              } catch (err) {
                console.error(`[MarketData] Failed to insert quote for ${quote?.symbol}:`, err.message);
              }
            }
          } catch (err) {
            console.error(`[MarketData] Failed to fetch quotes chunk:`, err.message);
          }
        }

        console.log(`[MarketData] Successfully updated market data for ${successfulQuotes} instruments.`);
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('[MarketData] Failed to poll market data:', err.message);
    }
  };

  pollMarketData();
  setInterval(pollMarketData, 30 * 1000); // 30s for more regular updates
};
