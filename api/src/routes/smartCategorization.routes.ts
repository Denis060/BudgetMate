import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  suggestCategory,
  learnFromChoice,
  processFeedback,
  trainFromExisting,
  getLearningStats,
} from '../controllers/smartCategorization.controller';

const router = Router();

// All smart categorization routes require authentication
router.use(authenticate);

// Get category suggestions for a transaction
router.post('/suggest', suggestCategory);

// Learn from user's category choice
router.post('/learn', learnFromChoice);

// Process user feedback on suggestions
router.post('/feedback', processFeedback);

// Train from existing transactions
router.post('/train', trainFromExisting);

// Get learning statistics
router.get('/stats', getLearningStats);

export default router;