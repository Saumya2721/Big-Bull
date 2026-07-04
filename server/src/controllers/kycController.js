import crypto from 'crypto';
import pool from '../config/db.js';

export const processKycVerification = async (req, res) => {
  const { phoneNumber, address, panNumber, bankAccountNo, ifscCode, bankName } = req.body;
  const userId = req.user.UserId || req.user.userid;
  // Obtain a dedicated client from the pool to handle our isolation block
  const client = await pool.connect();

  try {
    // 1. Initiate Database Transaction Block
    await client.query('BEGIN');

    // 2. Update user profile identity fields and flip status to Verified
    const updateUserQuery = `
      UPDATE bigbull.AppUser 
      SET phoneNumber = $1, address = $2, pannumber = $3, kycstatus = 'Verified'
      WHERE userid = $4
      RETURNING userid, name, email, kycstatus;
    `;
    const userResult = await client.query(updateUserQuery, [phoneNumber, address, panNumber, userId]);

    if (userResult.rows.length === 0) {
      throw new Error('Target user profile record row not found.');
    }

    // 3. Insert and connect their LinkedBankAccount record row
    const insertBankQuery = `
      INSERT INTO bigbull.LinkedBankAccount (bankaccountno, ifsc_code, bankname, isprimary, userid)
      VALUES ($1, $2, $3, true, $4);
    `;
    await client.query(insertBankQuery, [bankAccountNo, ifscCode, bankName, userId]);

    // 4. Provision their unique DematAccount row
    const dematAccId = 'DEMAT_' + crypto.randomBytes(6).toString('hex').toUpperCase();
    const insertDematQuery = `
      INSERT INTO bigbull.DematAccount (demataccid, linkeddepository, userid)
      VALUES ($1, 'CDSL', $2);
    `;
    await client.query(insertDematQuery, [dematAccId, userId]);

    // 5. Provision their active TradingAccount row with a free ₹50,000 dummy balance
    const tradingAccId = 'TRADE_' + crypto.randomBytes(6).toString('hex').toUpperCase();
    const insertTradingQuery = `
      INSERT INTO bigbull.TradingAccount (tradingaccid, avlbalance, userid)
      VALUES ($1, 50000.00, $2);
    `;
    await client.query(insertTradingQuery, [tradingAccId, userId]);

    // 6. If all queries executed flawlessly, commit changes permanently to disk
    await client.query('COMMIT');

    return res.status(200).json({
      message: 'Onboarding pipeline complete. Ledgers successfully allocated.',
      user: {
        UserId: userResult.rows[0].userid || userResult.rows[0].UserId,
        Name: userResult.rows[0].name,
        Email: userResult.rows[0].email,
        KycStatus: userResult.rows[0].kycstatus || userResult.rows[0].KycStatus
      }
    });

  } catch (err) {
    // If an integrity error or validation drop occurs, revert everything back safely
    await client.query('ROLLBACK');
    console.error('❌ KYC transaction aborted. Ledgers rolled back safely:', err);
    return res.status(500).json({ 
      message: 'Onboarding pipeline failed. Row transactions dropped clean.', 
      error: err.message 
    });
  } finally {
    // Release connection back to our global resource pool
    client.release();
  }
};