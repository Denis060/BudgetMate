/**
 * Budget Routes
 */

import { Router } from 'express';
import {
  getBudgets,
  getBudget,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetPlans,
  getBudgetPlan,
  createBudgetPlan,
  updateBudgetPlan,
  getBudgetAnalysis,
} from '../controllers/budget.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Legacy budget routes (category-based monthly budgets)
router.get('/', getBudgets);
router.get('/:id', getBudget);
router.post('/', createBudget);
router.put('/:id', updateBudget);
router.delete('/:id', deleteBudget);

// Enhanced budget plan routes
router.get('/plans/list', getBudgetPlans);
router.get('/plans/:id', getBudgetPlan);
router.get('/plans/:id/analysis', getBudgetAnalysis);
router.post('/plans', createBudgetPlan);
router.put('/plans/:id', updateBudgetPlan);

export default router;
