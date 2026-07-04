import bcrypt from 'bcrypt';
import crypto from 'crypto';
import passport from 'passport';
import pool from '../config/db.js';

export const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if user already exists
    const checkUser = await pool.query('SELECT * FROM bigbull.AppUser WHERE email = $1', [email]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ message: 'A profile with this email already exists.' });
    }

    // Hash the password with a high-fidelity 10-round salt cycle
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate a unique VARCHAR(50) primary key token matching your DDL specification
    const userId = 'USR_' + crypto.randomBytes(8).toString('hex');

    // Insert user into AppUser table with initial 'Unverified' KYC flag status
    const result = await pool.query(
      `INSERT INTO bigbull.AppUser (userid, name, email, password, kycstatus) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [userId, name, email, hashedPassword, 'Unverified']
    );

    const newUser = result.rows[0];

    // Log the user in directly via session allocation right after successful signup
    req.login(newUser, (err) => {
      if (err) return res.status(500).json({ message: 'Session allocation failed.' });
      return res.status(201).json({ message: 'Account established.', user: newUser });
    });

  } catch (err) {
    return res.status(500).json({ message: 'Registration engine dropped row transaction.', error: err.message });
  }
};

export const loginUser = (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return res.status(500).json({ message: 'Internal processing cluster breach.' });
    if (!user) return res.status(401).json({ message: info.message || 'Verification rejected.' });

    req.login(user, (err) => {
      if (err) return res.status(500).json({ message: 'Session persistence binding failure.' });
      
      // Sanitized user object row safe for React memory states
      const sanitizedUser = {
        UserId: user.UserId || user.userid,
        Name: user.Name || user.name,
        Email: user.Email || user.email,
        KycStatus: user.KycStatus || user.kycstatus
      };
      return res.json({ message: 'Clearing gate passed.', user: sanitizedUser });
    });
  })(req, res, next);
};

export const logoutUser = (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ message: 'Session demolition intercept crash.' });
    res.clearCookie('connect.sid'); // Erase express session tracker token inside visitor's browser
    return res.json({ message: 'Session dismantled. Connection safe.' });
  });
};

export const getCurrentUser = (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Session validation window context empty.' });
  }
  return res.json({ user: req.user });
};