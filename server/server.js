import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import session from 'express-session';
import passport from 'passport';
import cors from 'cors';
import dotenv from 'dotenv';

// Config and Service Adaptors
import pool from './src/config/db.js';
import './src/config/passport.js'; // Registers local credential strategy bindings
import redisClient from './src/config/redis.js';    // Instantiates memory tier cache cluster link
import { initializeSockets } from './src/services/socketService.js'; // Abstracted real-time engine
import { startMarketDataService } from './src/services/marketDataService.js';
import { RedisStore } from 'connect-redis';
import { errorHandler } from './src/middlewares/errorHandler.js';

// Route Handlers
import authRoutes from './src/routes/authRoutes.js';
import kycRoutes from './src/routes/kycRoutes.js';
import walletRoutes from './src/routes/walletRoutes.js';
import marketRoutes from './src/routes/marketRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import tradeRoutes from './src/routes/tradeRoutes.js';
import watchlistRoutes from './src/routes/watchlistRoutes.js';
import analyticsRoutes from './src/routes/analyticsRoutes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io with strict cross-origin tracking rules
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173", // Points directly to Vite frontend canvas
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Express App Global Settings
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true // Crucial for accepting session cookies back from Axios client
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Setup Middleware Configuration
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Set to true if running over production HTTPS channels
    httpOnly: true, // Safeguards cookies from cross-site scripting vulnerabilities
    maxAge: 24 * 60 * 60 * 1000 // Valid for 24 Hours
  }
}));

// Initialize Authentication Processing Gateways
app.use(passport.initialize());
app.use(passport.session());

// Mount Modular Router Hub Groupings
app.use('/api/auth', authRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/user', userRoutes); // Exposes deep structural account profile metadata
app.use('/api/trade', tradeRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/analytics', analyticsRoutes);

// Fire up the Abstracted Real-Time WebSocket Streaming Engine
initializeSockets(io);
startMarketDataService();

// App Health Endpoint (Lazy database pool wake-up)
app.get('/api/health', async (req, res) => {
  try {
    const dbCheck = await pool.query('SELECT NOW()');
    res.json({ status: "active", database: "connected", timestamp: dbCheck.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: "degraded", error: err.message });
  }
});

app.use(errorHandler);

// Launch Server Listening Loops
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(` BigBull Server processing clearing rows on port ${PORT}`);
});