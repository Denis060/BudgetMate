/**
 * Report Routes
 */

import { Router } from 'express';
import { getSummary, getTrends, exportData } from '../controllers/report.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/summary', getSummary);
router.get('/trends', getTrends);
router.get('/export', exportData);

export default router;
