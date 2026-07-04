import express from 'express';
import { executeOrder, getUserHoldings, cancelOrder, getOrderHistory } from '../controllers/tradeController.js';
import { requireAuth } from '../middlewares/requireAuth.js';

const router = express.Router();

router.post('/order', requireAuth, executeOrder);
router.get('/holdings', requireAuth, getUserHoldings);
router.delete('/order/:orderId', requireAuth, cancelOrder);
router.get('/orders', requireAuth, getOrderHistory);

export default router;