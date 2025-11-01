/**
 * Transaction Validation Schemas
 */

import Joi from 'joi';

export const createTransactionSchema = Joi.object({
  account_id: Joi.string().uuid().optional().allow(null),
  category_id: Joi.string().uuid().optional().allow(null),
  amount: Joi.number().positive().required().messages({
    'number.positive': 'Amount must be a positive number',
    'any.required': 'Amount is required',
  }),
  type: Joi.string().valid('income', 'expense').required().messages({
    'any.only': 'Type must be either income or expense',
    'any.required': 'Type is required',
  }),
  description: Joi.string().max(255).optional().allow(''),
  tx_date: Joi.date().optional(),
  mode: Joi.string().valid('cash', 'card', 'transfer', 'mobile_money').default('cash').optional(),
  reference: Joi.string().max(100).optional().allow(''),
  notes: Joi.string().optional().allow(''),
});

export const updateTransactionSchema = Joi.object({
  account_id: Joi.string().uuid().optional().allow(null),
  category_id: Joi.string().uuid().optional().allow(null),
  amount: Joi.number().positive().optional(),
  type: Joi.string().valid('income', 'expense').optional(),
  description: Joi.string().max(255).optional().allow(''),
  tx_date: Joi.date().optional(),
  mode: Joi.string().valid('cash', 'card', 'transfer', 'mobile_money').optional(),
  reference: Joi.string().max(100).optional().allow(''),
  notes: Joi.string().optional().allow(''),
});

export const getTransactionsQuerySchema = Joi.object({
  type: Joi.string().valid('income', 'expense').optional(),
  account_id: Joi.string().uuid().optional(),
  category_id: Joi.string().uuid().optional(),
  start_date: Joi.date().optional(),
  end_date: Joi.date().optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(50).optional(),
  sort: Joi.string().valid('asc', 'desc').default('desc').optional(),
});
