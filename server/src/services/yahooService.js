import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });
import redisClient from '../config/redis.js';

export const fetchLiveQuote = async (symbol) => {
  try {
    const cacheKey = `quote:${symbol}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const quote = await yahooFinance.quote(symbol);
    const data = {
      symbol: symbol,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChangePercent
    };
    
    await redisClient.setEx(cacheKey, 10, JSON.stringify(data));
    return data;
  } catch (error) {
    return null;
  }
};

export const fetchQuotesBatch = async (symbols) => {
  try {
    const missingSymbols = [];
    const quotes = [];
    
    for (const symbol of symbols) {
      const cached = await redisClient.get(`rawQuote:${symbol}`);
      if (cached) {
        quotes.push(JSON.parse(cached));
      } else {
        missingSymbols.push(symbol);
      }
    }

    if (missingSymbols.length > 0) {
      const fetched = await yahooFinance.quote(missingSymbols);
      const fetchedArray = Array.isArray(fetched) ? fetched : [fetched];
      
      for (const q of fetchedArray) {
        await redisClient.setEx(`rawQuote:${q.symbol}`, 10, JSON.stringify(q));
        quotes.push(q);
      }
    }
    
    return quotes;
  } catch (error) {
    // If bulk fetch fails, throw so caller knows
    throw error;
  }
};