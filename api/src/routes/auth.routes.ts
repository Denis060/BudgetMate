/**
 * Authentication Routes
 */

import { Router } from 'express';
import {
  signup,
  login,
  refreshAccessToken,
  logout,
  getProfile,
} from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import {
  signupSchema,
  loginSchema,
  refreshTokenSchema,
} from '../validators/auth.validator';

const router = Router();

// Public routes with rate limiting
router.post('/signup', authLimiter, validate(signupSchema), signup);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', validate(refreshTokenSchema), refreshAccessToken);
router.post('/logout', logout);

// Protected routes
router.get('/me', authenticate, getProfile);

export default router;
