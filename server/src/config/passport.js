import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import pool from './db.js';

passport.use(
  new LocalStrategy(
    { usernameField: 'username', passwordField: 'password' }, // username maps to email field from Axios
    async (email, password, done) => {
      try {
        // Query the AppUser table using the connection pool
        const result = await pool.query('SELECT * FROM bigbull.AppUser WHERE Email = $1', [email]);

        if (result.rows.length === 0) {
          return done(null, false, { message: 'This email is not registered.' });
        }

        const user = result.rows[0];

        // Compare incoming password with stored database hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: 'Incorrect credentials profile match.' });
        }

        // Authentication successful, pass user row down the pipe
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || 'your_google_client_id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your_google_client_secret',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const name = profile.displayName;

        // Check if user already exists
        const result = await pool.query('SELECT * FROM bigbull.AppUser WHERE Email = $1', [email]);

        if (result.rows.length > 0) {
          // User exists, return the user
          return done(null, result.rows[0]);
        }

        // Create new user since they don't exist
        const newUserId = 'USER_' + crypto.randomBytes(6).toString('hex').toUpperCase();
        const dummyPassword = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
        
        const insertUserQuery = `
          INSERT INTO bigbull.AppUser (UserId, Name, Email, Password, KycStatus) 
          VALUES ($1, $2, $3, $4, 'Unverified') 
          RETURNING *`;
          
        const newUserResult = await pool.query(insertUserQuery, [newUserId, name, email, dummyPassword]);
        return done(null, newUserResult.rows[0]);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Stores user identifier in session state store
passport.serializeUser((user, done) => {
  done(null, user.UserId || user.userid);
});

// Deserializes session ID back into complete user object row on incoming requests
passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query(
      'SELECT UserId, Name, Email, KycStatus FROM bigbull.AppUser WHERE UserId = $1',
      [id]
    );
    if (result.rows.length === 0) return done(null, false);
    const user = result.rows[0];
    const sanitizedUser = {
      UserId: user.UserId || user.userid,
      Name: user.Name || user.name,
      Email: user.Email || user.email,
      KycStatus: user.KycStatus || user.kycstatus
    };
    done(null, sanitizedUser);
  } catch (err) {
    done(err, null);
  }
});

export default passport;