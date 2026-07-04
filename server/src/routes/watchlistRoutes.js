import express from 'express';
import { getWatchlist, addToWatchlist, removeFromWatchlist, checkWatchlist } from '../controllers/watchlistController.js';
import { requireAuth } from '../middlewares/requireAuth.js';

const router = express.Router();

router.get('/', requireAuth, getWatchlist);
router.get('/check/:symbol', requireAuth, checkWatchlist);
router.post('/add', requireAuth, addToWatchlist);
router.delete('/remove/:symbol', requireAuth, removeFromWatchlist);

export default router;
