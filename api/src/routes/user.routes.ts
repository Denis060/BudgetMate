/**
 * User Routes
 */

import { Router } from 'express';
import { updateProfile, changePassword, deleteAccount } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.put('/profile', updateProfile);
router.put('/password', changePassword);
router.delete('/account', deleteAccount);

export default router;
