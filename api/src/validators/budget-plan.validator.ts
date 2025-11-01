/**
 * Budget Plan Validation Schemas
 */

import Joi from 'joi';

export const createBudgetPlanSchema = Joi.object({
  name: Joi.string().required().min(3).max(100),
  description: Joi.string().optional().max(500),
  period_type: Joi.string().valid('monthly', 'weekly', 'yearly', 'custom').required(),
  start_date: Joi.date().required(),
  end_date: Joi.date().min(Joi.ref('start_date')).required(),
  budget_items: Joi.array().items(
    Joi.object({
      category_id: Joi.string().uuid().optional(),
      name: Joi.string().required().min(2).max(100),
      allocated_amount: Joi.number().positive().required(),
      alert_threshold: Joi.number().min(0).max(100).optional(),
      is_essential: Joi.boolean().optional(),
      notes: Joi.string().optional().max(300),
    })
  ).min(1).required(),
});

export const updateBudgetPlanSchema = Joi.object({
  name: Joi.string().optional().min(3).max(100),
  description: Joi.string().optional().max(500),
  period_type: Joi.string().valid('monthly', 'weekly', 'yearly', 'custom').optional(),
  start_date: Joi.date().optional(),
  end_date: Joi.date().optional(),
  status: Joi.string().valid('active', 'completed', 'paused', 'archived').optional(),
  budget_items: Joi.array().items(
    Joi.object({
      category_id: Joi.string().uuid().optional(),
      name: Joi.string().required().min(2).max(100),
      allocated_amount: Joi.number().positive().required(),
      alert_threshold: Joi.number().min(0).max(100).optional(),
      is_essential: Joi.boolean().optional(),
      notes: Joi.string().optional().max(300),
    })
  ).optional(),
});