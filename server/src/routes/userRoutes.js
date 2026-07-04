import express from 'express';
import pool from '../config/db.js';
import { requireAuth } from '../middlewares/requireAuth.js';

const router = express.Router();

router.get('/profile', requireAuth, async (req, res) => {
  const userId = req.user.UserId || req.user.userid;

  try {
    // Fetch user details along with their associated ledger IDs
    const query = `
      SELECT u.UserId, u.Name, u.Email, u.KycStatus, 
             t.TradingAccId, d.DematAccId 
      FROM bigbull.AppUser u
      LEFT JOIN bigbull.TradingAccount t ON u.UserId = t.UserId
      LEFT JOIN bigbull.DematAccount d ON u.UserId = d.UserId
      WHERE u.UserId = $1;
    `;

    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Profile metadata not found.' });
    }

    res.json({ profile: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving profile.', error: err.message });
  }
});

export default router;