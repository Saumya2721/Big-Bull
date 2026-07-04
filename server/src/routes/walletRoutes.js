import express from 'express';
import { getWalletBalance, depositFunds } from '../controllers/walletController.js';
import { requireAuth } from '../middlewares/requireAuth.js';

const router = express.Router();

router.get('/balance', requireAuth, getWalletBalance);
router.post('/deposit', requireAuth, depositFunds);

export default router;