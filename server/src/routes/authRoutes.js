import express from 'express';
import { registerUser, loginUser, logoutUser, getCurrentUser } from '../controllers/authController.js';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import { validateRequest } from '../middlewares/validateRequest.js';
import { z } from 'zod';

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { status: 'error', message: 'Too many authentication attempts. Please try again later.' }
});

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters')
  })
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required')
  })
});

router.post('/register', authLimiter, validateRequest(registerSchema), registerUser);
router.post('/login', authLimiter, validateRequest(loginSchema), loginUser);
router.post('/logout', logoutUser);
router.get('/current-user', getCurrentUser);

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { 
  successRedirect: process.env.CLIENT_URL || 'http://localhost:5173', 
  failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`
}));

export default router;