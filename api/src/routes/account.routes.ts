/**
 * Account Routes
 */

import { Router } from 'express';
import {
  getAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
} from '../controllers/account.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createAccountSchema, updateAccountSchema } from '../validators/account.validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getAccounts);
router.get('/:id', getAccount);
router.post('/', validate(createAccountSchema), createAccount);
router.put('/:id', validate(updateAccountSchema), updateAccount);
router.delete('/:id', deleteAccount);

export default router;
