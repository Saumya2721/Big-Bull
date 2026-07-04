import crypto from 'crypto';
import pool from '../config/db.js';
import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

// Get the user's active watchlist symbols
export const getWatchlist = async (req, res) => {
  const userId = req.user.UserId || req.user.userid;
  try {
    const result = await pool.query(`
      SELECT wc.Ticker_Symbol 
      FROM bigbull.Watchlist w
      JOIN bigbull.Watchlist_Contains wc ON w.Watchlist_ID = wc.Watchlist_ID
      WHERE w.UserId = $1
    `, [userId]);
    
    const symbols = result.rows.map(row => row.ticker_symbol || row.Ticker_Symbol);
    return res.json({ symbols });
  } catch (err) {
    console.error('Watchlist fetch error:', err);
    return res.status(500).json({ message: 'Failed to fetch watchlist', error: err.message });
  }
};

// Check if a specific symbol is in the watchlist
export const checkWatchlist = async (req, res) => {
  const { symbol } = req.params;
  const userId = req.user.UserId || req.user.userid;
  try {
    const result = await pool.query(`
      SELECT 1 FROM bigbull.Watchlist w
      JOIN bigbull.Watchlist_Contains wc ON w.Watchlist_ID = wc.Watchlist_ID
      WHERE w.UserId = $1 AND wc.Ticker_Symbol = $2
    `, [userId, symbol]);
    
    return res.json({ isWatchlisted: result.rows.length > 0 });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to check watchlist', error: err.message });
  }
};

// Add a symbol to the user's watchlist
export const addToWatchlist = async (req, res) => {
  const { symbol } = req.body;
  const userId = req.user.UserId || req.user.userid;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Ensure company and instrument exist in DB
    let companyName = symbol + ' Ltd.';
    let sector = 'General';
    try {
      const summary = await yahooFinance.quoteSummary(symbol, { modules: ['price', 'assetProfile'] });
      companyName = summary.price?.longName || summary.price?.shortName || symbol;
      sector = summary.assetProfile?.sector || 'General';
    } catch (err) {
      console.error(`Failed to fetch quoteSummary for ${symbol}`, err.message);
    }

    await client.query(`
      INSERT INTO bigbull.Company (CompanyName, Sector) 
      VALUES ($1, $2) 
      ON CONFLICT (CompanyName) DO UPDATE SET Sector = EXCLUDED.Sector WHERE bigbull.Company.Sector = 'General'
    `, [companyName, sector]);

    await client.query(`
      INSERT INTO bigbull.Financial_Instruments (Ticker_Symbol, Instrument_Type, Exchange, CompanyName)
      VALUES ($1, 'Equity', 'NSE', $2)
      ON CONFLICT (Ticker_Symbol) DO NOTHING
    `, [symbol, companyName]);

    // Check if user already has a Watchlist row
    let watchlistRes = await client.query('SELECT Watchlist_ID FROM bigbull.Watchlist WHERE UserId = $1', [userId]);
    let watchlistId;
    
    if (watchlistRes.rows.length === 0) {
      watchlistId = 'WL_' + crypto.randomBytes(8).toString('hex').toUpperCase();
      await client.query(`
        INSERT INTO bigbull.Watchlist (Watchlist_ID, Watchlist_Name, UserId)
        VALUES ($1, 'My Watchlist', $2)
      `, [watchlistId, userId]);
    } else {
      watchlistId = watchlistRes.rows[0].watchlist_id || watchlistRes.rows[0].Watchlist_ID;
    }

    // Insert into Watchlist_Contains
    await client.query(`
      INSERT INTO bigbull.Watchlist_Contains (Watchlist_ID, Ticker_Symbol)
      VALUES ($1, $2)
      ON CONFLICT (Watchlist_ID, Ticker_Symbol) DO NOTHING
    `, [watchlistId, symbol]);

    await client.query('COMMIT');
    return res.status(200).json({ message: 'Added to watchlist successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Watchlist add error:', err);
    return res.status(500).json({ message: 'Failed to add to watchlist', error: err.message });
  } finally {
    client.release();
  }
};

// Remove a symbol from the user's watchlist
export const removeFromWatchlist = async (req, res) => {
  const { symbol } = req.params;
  const userId = req.user.UserId || req.user.userid;
  
  try {
    await pool.query(`
      DELETE FROM bigbull.Watchlist_Contains wc
      USING bigbull.Watchlist w
      WHERE w.Watchlist_ID = wc.Watchlist_ID 
      AND w.UserId = $1 AND wc.Ticker_Symbol = $2
    `, [userId, symbol]);
    
    return res.status(200).json({ message: 'Removed from watchlist successfully' });
  } catch (err) {
    console.error('Watchlist remove error:', err);
    return res.status(500).json({ message: 'Failed to remove from watchlist', error: err.message });
  }
};
