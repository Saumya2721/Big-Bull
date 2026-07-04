import express from 'express';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireAdmin } from '../middlewares/requireAdmin.js';
import {
  getNetWorth,
  getPortfolioBreakdown,
  getSectorConcentration,
  getHighValueCheck,
  getDiversificationCheck,
  getMarginEstimate,
  getInactiveInvestors,
  getSectorCapitalDistribution,
  getVerifiedContactDirectory,
  getDepositorySplit,
  getKycComplianceRisk,
  getConsolidatedAccountIds
} from '../controllers/analyticsController.js';

const router = express.Router();

// Per-User Endpoints
router.get('/net-worth', requireAuth, getNetWorth);
router.get('/portfolio-breakdown', requireAuth, getPortfolioBreakdown);
router.get('/sector-concentration', requireAuth, getSectorConcentration);
router.get('/high-value-check', requireAuth, getHighValueCheck);
router.get('/diversification-check', requireAuth, getDiversificationCheck);
router.get('/margin-estimate', requireAuth, getMarginEstimate);

// Admin Endpoints
router.get('/admin/inactive-investors', requireAuth, requireAdmin, getInactiveInvestors);
router.get('/admin/sector-capital', requireAuth, requireAdmin, getSectorCapitalDistribution);
router.get('/admin/contact-directory', requireAuth, requireAdmin, getVerifiedContactDirectory);
router.get('/admin/depository-split', requireAuth, requireAdmin, getDepositorySplit);
router.get('/admin/kyc-risk', requireAuth, requireAdmin, getKycComplianceRisk);
router.get('/admin/account-ids', requireAuth, requireAdmin, getConsolidatedAccountIds);

export default router;
