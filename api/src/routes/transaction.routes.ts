/**
 * Transaction Routes
 */

import { Router } from 'express';
import {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '../controllers/transaction.controller';
import { authenticate } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validate';
import {
  createTransactionSchema,
  updateTransactionSchema,
  getTransactionsQuerySchema,
} from '../validators/transaction.validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', validateQuery(getTransactionsQuerySchema), getTransactions);
router.get('/:id', getTransaction);
router.post('/', validate(createTransactionSchema), createTransaction);
router.put('/:id', validate(updateTransactionSchema), updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;
