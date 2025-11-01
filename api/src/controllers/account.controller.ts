/**
 * Account Controller
 * Manages financial accounts (cash, bank, mobile money)
 */

import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../utils/logger';

/**
 * Get all accounts for the authenticated user
 */
export const getAccounts = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    const accounts = await prisma.accounts.findMany({
      where: { user_id: userId },
      orderBy: [
        { is_default: 'desc' },
        { created_at: 'desc' },
      ],
    });

    res.status(200).json({
      success: true,
      data: { accounts },
    });
  } catch (error: any) {
    logger.error('Get accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch accounts',
    });
  }
};

/**
 * Get single account by ID
 */
export const getAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const account = await prisma.accounts.findFirst({
      where: {
        id,
        user_id: userId,
      },
    });

    if (!account) {
      res.status(404).json({
        success: false,
        message: 'Account not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { account },
    });
  } catch (error: any) {
    logger.error('Get account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch account',
    });
  }
};

/**
 * Create new account
 */
export const createAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { name, type, balance, currency, icon, color, is_default } = req.body;

    // If this is set as default, unset other defaults
    if (is_default) {
      await prisma.accounts.updateMany({
        where: { user_id: userId },
        data: { is_default: false },
      });
    }

    const account = await prisma.accounts.create({
      data: {
        user_id: userId!,
        name,
        type,
        balance: balance || 0,
        currency: currency || 'SLL',
        icon,
        color,
        is_default: is_default || false,
      },
    });

    logger.info(`Account created: ${account.name} by user ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: { account },
    });
  } catch (error: any) {
    logger.error('Create account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create account',
    });
  }
};

/**
 * Update account
 */
export const updateAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { name, type, balance, currency, icon, color, is_default } = req.body;

    // Check if account exists and belongs to user
    const existingAccount = await prisma.accounts.findFirst({
      where: {
        id,
        user_id: userId,
      },
    });

    if (!existingAccount) {
      res.status(404).json({
        success: false,
        message: 'Account not found',
      });
      return;
    }

    // If setting as default, unset other defaults
    if (is_default) {
      await prisma.accounts.updateMany({
        where: {
          user_id: userId,
          id: { not: id },
        },
        data: { is_default: false },
      });
    }

    const account = await prisma.accounts.update({
      where: { id },
      data: {
        name,
        type,
        balance,
        currency,
        icon,
        color,
        is_default,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Account updated successfully',
      data: { account },
    });
  } catch (error: any) {
    logger.error('Update account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update account',
    });
  }
};

/**
 * Delete account
 */
export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    // Check if account exists and belongs to user
    const account = await prisma.accounts.findFirst({
      where: {
        id,
        user_id: userId,
      },
    });

    if (!account) {
      res.status(404).json({
        success: false,
        message: 'Account not found',
      });
      return;
    }

    // Delete account (transactions will be set to null due to onDelete: SetNull)
    await prisma.accounts.delete({
      where: { id },
    });

    logger.info(`Account deleted: ${id} by user ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error: any) {
    logger.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account',
    });
  }
};
