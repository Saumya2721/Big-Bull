import express from 'express';
import { processKycVerification } from '../controllers/kycController.js';
import { requireAuth } from '../middlewares/requireAuth.js';

const router = express.Router();

// Intercept submission requests with auth check rules
router.post('/verify', requireAuth, processKycVerification);

export default router;