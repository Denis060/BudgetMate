/**
 * Account Validation Schemas
 */

import Joi from 'joi';

export const createAccountSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Account name must be at least 2 characters',
    'string.max': 'Account name must not exceed 100 characters',
    'any.required': 'Account name is required',
  }),
  type: Joi.string().valid('cash', 'bank', 'mobile_money', 'credit_card').required().messages({
    'any.only': 'Account type must be one of: cash, bank, mobile_money, credit_card',
    'any.required': 'Account type is required',
  }),
  balance: Joi.number().default(0).optional(),
  currency: Joi.string().length(3).default('SLL').optional(),
  icon: Joi.string().optional(),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional().messages({
    'string.pattern.base': 'Color must be a valid hex color code',
  }),
  is_default: Joi.boolean().default(false).optional(),
});

export const updateAccountSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  type: Joi.string().valid('cash', 'bank', 'mobile_money', 'credit_card').optional(),
  balance: Joi.number().optional(),
  currency: Joi.string().length(3).optional(),
  icon: Joi.string().optional(),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
  is_default: Joi.boolean().optional(),
});
