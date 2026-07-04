import pool from '../config/db.js';

// --- PER-USER ENDPOINTS ---

export const getNetWorth = async (req, res) => {
  try {
    const userId = req.user.UserId || req.user.userid;
    const query = `
      SELECT u.name, (ta.avlbalance + COALESCE(SUM(ph.current_quantity_held * md.currprice), 0)) as total_net_worth
      FROM bigbull.appuser u 
      JOIN bigbull.tradingaccount ta ON u.userid = ta.userid 
      LEFT JOIN bigbull.demataccount da ON u.userid = da.userid 
      LEFT JOIN bigbull.portfolio_holds ph ON da.demataccid = ph.demataccid 
      LEFT JOIN (
        SELECT DISTINCT ON (ticker_symbol) ticker_symbol, currprice 
        FROM bigbull.marketdata 
        ORDER BY ticker_symbol, timestamp DESC
      ) md ON ph.ticker_symbol = md.ticker_symbol 
      WHERE u.userid = $1 
      GROUP BY u.name, ta.avlbalance
    `;
    const result = await pool.query(query, [userId]);
    res.json(result.rows[0] || { total_net_worth: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getPortfolioBreakdown = async (req, res) => {
  try {
    const userId = req.user.UserId || req.user.userid;
    const query = `
      SELECT fi.ticker_symbol, c.companyname, ph.current_quantity_held 
      FROM bigbull.portfolio_holds ph 
      JOIN bigbull.demataccount da ON ph.demataccid = da.demataccid
      JOIN bigbull.financial_instruments fi ON ph.ticker_symbol = fi.ticker_symbol 
      JOIN bigbull.company c ON fi.companyname = c.companyname 
      WHERE da.userid = $1 AND ph.current_quantity_held > 0
    `;
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getSectorConcentration = async (req, res) => {
  try {
    const userId = req.user.UserId || req.user.userid;
    const query = `
      SELECT c.sector, COUNT(fi.ticker_symbol) as stock_count 
      FROM bigbull.portfolio_holds ph 
      JOIN bigbull.demataccount da ON ph.demataccid = da.demataccid
      JOIN bigbull.financial_instruments fi ON ph.ticker_symbol = fi.ticker_symbol 
      JOIN bigbull.company c ON fi.companyname = c.companyname 
      WHERE da.userid = $1 AND ph.current_quantity_held > 0
      GROUP BY c.sector
    `;
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getHighValueCheck = async (req, res) => {
  try {
    const userId = req.user.UserId || req.user.userid;
    const query = `
      SELECT SUM(ph.current_quantity_held) as total_shares 
      FROM bigbull.portfolio_holds ph
      JOIN bigbull.demataccount da ON ph.demataccid = da.demataccid
      WHERE da.userid = $1 
      HAVING SUM(ph.current_quantity_held) > 50
    `;
    const result = await pool.query(query, [userId]);
    res.json({ isHighValue: result.rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getDiversificationCheck = async (req, res) => {
  try {
    const userId = req.user.UserId || req.user.userid;
    const query = `
      SELECT COUNT(DISTINCT c.sector) as sector_count 
      FROM bigbull.portfolio_holds ph 
      JOIN bigbull.demataccount da ON ph.demataccid = da.demataccid
      JOIN bigbull.financial_instruments fi ON ph.ticker_symbol = fi.ticker_symbol 
      JOIN bigbull.company c ON fi.companyname = c.companyname 
      WHERE da.userid = $1 AND ph.current_quantity_held > 0
    `;
    const result = await pool.query(query, [userId]);
    const count = parseInt(result.rows[0]?.sector_count) || 0;
    res.json({ isDiversified: count >= 3, count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getMarginEstimate = async (req, res) => {
  try {
    const userId = req.user.UserId || req.user.userid;
    const query = `
      SELECT u.userid, u.name, SUM(ph.current_quantity_held * md.currprice) * 0.20 AS calculated_margin 
      FROM bigbull.appuser u 
      JOIN bigbull.demataccount da ON u.userid = da.userid 
      JOIN bigbull.portfolio_holds ph ON da.demataccid = ph.demataccid 
      JOIN ( 
        SELECT DISTINCT ON (ticker_symbol) ticker_symbol, currprice 
        FROM bigbull.marketdata 
        ORDER BY ticker_symbol, timestamp DESC 
      ) md ON ph.ticker_symbol = md.ticker_symbol 
      WHERE u.userid = $1 
      GROUP BY u.userid, u.name
    `;
    const result = await pool.query(query, [userId]);
    res.json(result.rows[0] || { calculated_margin: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- ADMIN ENDPOINTS ---

export const getInactiveInvestors = async (req, res) => {
  try {
    const query = `
      SELECT u.name 
      FROM bigbull.appuser u 
      JOIN bigbull.demataccount da ON u.userid = da.userid 
      LEFT JOIN bigbull.portfolio_holds ph ON da.demataccid = ph.demataccid 
      WHERE ph.ticker_symbol IS NULL
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getSectorCapitalDistribution = async (req, res) => {
  try {
    const query = `
      SELECT c.sector, SUM(ph.current_quantity_held) as total_quantity 
      FROM bigbull.portfolio_holds ph 
      JOIN bigbull.financial_instruments fi ON ph.ticker_symbol = fi.ticker_symbol 
      JOIN bigbull.company c ON fi.companyname = c.companyname 
      GROUP BY c.sector
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getVerifiedContactDirectory = async (req, res) => {
  try {
    const query = `
      SELECT u.name, u.email, ta.avlbalance 
      FROM bigbull.appuser u 
      JOIN bigbull.tradingaccount ta ON u.userid = ta.userid 
      WHERE u.kycstatus = 'Verified'
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getDepositorySplit = async (req, res) => {
  try {
    const query = `
      SELECT linkeddepository, COUNT(*) 
      FROM bigbull.demataccount 
      GROUP BY linkeddepository
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getKycComplianceRisk = async (req, res) => {
  try {
    const query = `
      SELECT u.name, ta.avlbalance 
      FROM bigbull.appuser u 
      JOIN bigbull.tradingaccount ta ON u.userid = ta.userid 
      WHERE u.kycstatus != 'Verified' AND ta.avlbalance > 0
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getConsolidatedAccountIds = async (req, res) => {
  try {
    const query = `
      SELECT u.userid, ta.tradingaccid, da.demataccid 
      FROM bigbull.appuser u 
      LEFT JOIN bigbull.tradingaccount ta ON u.userid = ta.userid 
      LEFT JOIN bigbull.demataccount da ON u.userid = da.userid
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
