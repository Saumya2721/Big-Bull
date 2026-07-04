import crypto from 'crypto';
import pool from '../config/db.js';

/**
 * Retreives active account balance mapping parameters
 */
export const getWalletBalance = async (req, res) => {
  const userId = req.user.UserId || req.user.userid;

  try {
    const result = await pool.query(
      'SELECT tradingaccid, avlbalance FROM bigbull.TradingAccount WHERE userid = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ avlBalance: '0.00' });
    }

    // Return exact matching variable layout expected by Dashboard.jsx
    return res.json({
      tradingAccId: result.rows[0].tradingaccid,
      avlBalance: parseFloat(result.rows[0].avlbalance).toFixed(2)
    });
  } catch (err) {
    return res.status(500).json({ message: 'Internal balancer query dropped.', error: err.message });
  }
};

/**
 * Simulates clearing transactions moving fake cash from LinkedBankAccount to TradingAccount
 */
export const depositFunds = async (req, res) => {
  const { amount } = req.body;
  const userId = req.user.UserId || req.user.userid;

  if (!amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ message: 'Invalid deposit target criteria parameters.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch user's primary trading ledger row lock to safeguard currency computations
    let ledgerCheck = await client.query(
      'SELECT tradingaccid, avlbalance FROM bigbull.TradingAccount WHERE userid = $1 FOR UPDATE',
      [userId]
    );

    let tradingAccId;
    if (ledgerCheck.rows.length === 0) {
      // Auto-provision for testing purposes
      tradingAccId = 'TRADE_' + crypto.randomBytes(6).toString('hex').toUpperCase();
      await client.query(`
        INSERT INTO bigbull.TradingAccount (tradingaccid, avlbalance, userid)
        VALUES ($1, 0, $2);
      `, [tradingAccId, userId]);
      
      const dematAccId = 'DEMAT_' + crypto.randomBytes(6).toString('hex').toUpperCase();
      await client.query(`
        INSERT INTO bigbull.DematAccount (demataccid, linkeddepository, userid)
        VALUES ($1, 'CDSL', $2) ON CONFLICT DO NOTHING;
      `, [dematAccId, userId]);
    } else {
      tradingAccId = ledgerCheck.rows[0].tradingaccid;
    }

    // 2. Query primary financial account credentials linked during KYC onboarding
    const bankCheck = await client.query(
      'SELECT bankaccountno FROM bigbull.LinkedBankAccount WHERE userid = $1 AND isprimary = true',
      [userId]
    );

    const bankAccountNo = bankCheck.rows.length > 0 ? bankCheck.rows[0].bankaccountno : null;

    // 3. Inject new credit additions directly to the Available Balance column
    const updateLedgerQuery = `
      UPDATE bigbull.TradingAccount 
      SET avlbalance = avlbalance + $1 
      WHERE tradingaccid = $2 
      RETURNING avlbalance;
    `;
    const updatedLedger = await client.query(updateLedgerQuery, [amount, tradingAccId]);

    // 4. Generate unique ID matching Financial_Transaction primary constraints
    const transactionId = 'TXN_' + crypto.randomBytes(8).toString('hex').toUpperCase();

    const insertTxnQuery = `
      INSERT INTO bigbull.Financial_Transaction (transaction_id, transaction_type, amount, payment_method, status, tradingaccid, bankaccountno)
      VALUES ($1, 'DEPOSIT', $2, 'NET_BANKING', 'SUCCESS', $3, $4);
    `;
    await client.query(insertTxnQuery, [transactionId, amount, tradingAccId, bankAccountNo]);

    await client.query('COMMIT');

    return res.json({
      message: 'Deposit cleared successfully.',
      newBalance: parseFloat(updatedLedger.rows[0].avlbalance).toFixed(2)
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Cash deposition routine crashed. State reverted safely:', err);
    return res.status(500).json({ message: 'Deposit pipeline failed to pass clearing constraints.', error: err.message });
  } finally {
    client.release();
  }
};