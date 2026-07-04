import express from 'express';
import { getHistoricalData, searchSymbols, getQuotes, getLocalSearch } from '../controllers/marketController.js';
import { requireAuth } from '../middlewares/requireAuth.js';

const router = express.Router();

// Require a valid session to view institutional charts
router.get('/history/:symbol', requireAuth, getHistoricalData);
router.get('/search/:query', requireAuth, searchSymbols);
router.get('/local-search', requireAuth, getLocalSearch);
router.get('/quotes', requireAuth, getQuotes);

export default router;