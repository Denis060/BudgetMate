/**
 * Transaction Controller
 * Manages income and expense transactions
 */

import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../utils/logger';
import { Prisma } from '@prisma/client';

/**
 * Get all transactions with filters
 */
export const getTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const {
      type,
      account_id,
      category_id,
      start_date,
      end_date,
      page = '1',
      limit = '50',
      sort = 'desc',
    } = req.query;

    // Build filter conditions
    const where: Prisma.transactionsWhereInput = {
      user_id: userId,
      ...(type && { type: type as string }),
      ...(account_id && { account_id: account_id as string }),
      ...(category_id && { category_id: category_id as string }),
      ...(start_date || end_date ? {
        tx_date: {
          ...(start_date && { gte: new Date(start_date as string) }),
          ...(end_date && { lte: new Date(end_date as string) }),
        },
      } : {}),
    };

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Get transactions
    const [transactions, total] = await Promise.all([
      prisma.transactions.findMany({
        where,
        include: {
          account: {
            select: { id: true, name: true, type: true },
          },
          category: {
            select: { id: true, name: true, icon: true, color: true },
          },
        },
        orderBy: { tx_date: sort as 'asc' | 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.transactions.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    logger.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
    });
  }
};

/**
 * Get single transaction
 */
export const getTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const transaction = await prisma.transactions.findFirst({
      where: {
        id,
        user_id: userId,
      },
      include: {
        account: true,
        category: true,
      },
    });

    if (!transaction) {
      res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { transaction },
    });
  } catch (error: any) {
    logger.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction',
    });
  }
};

/**
 * Create new transaction
 */
export const createTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const {
      account_id,
      category_id,
      amount,
      type,
      description,
      tx_date,
      mode,
      reference,
      notes,
    } = req.body;

    // Start a transaction to update account balance atomically
    const result = await prisma.$transaction(async (tx) => {
      // Create transaction
      const transaction = await tx.transactions.create({
        data: {
          user_id: userId!,
          account_id,
          category_id,
          amount,
          type,
          description,
          tx_date: tx_date ? new Date(tx_date) : new Date(),
          mode: mode || 'cash',
          reference,
          notes,
        },
        include: {
          account: true,
          category: true,
        },
      });

      // Update account balance if account is specified
      if (account_id) {
        const account = await tx.accounts.findUnique({
          where: { id: account_id },
        });

        if (account) {
          const balanceChange = type === 'income' 
            ? Number(amount) 
            : -Number(amount);

          await tx.accounts.update({
            where: { id: account_id },
            data: {
              balance: {
                increment: balanceChange,
              },
            },
          });
        }
      }

      return transaction;
    });

    logger.info(`Transaction created: ${result.id} by user ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: { transaction: result },
    });
  } catch (error: any) {
    logger.error('Create transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create transaction',
    });
  }
};

/**
 * Update transaction
 */
export const updateTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const {
      account_id,
      category_id,
      amount,
      type,
      description,
      tx_date,
      mode,
      reference,
      notes,
    } = req.body;

    // Get existing transaction
    const existingTransaction = await prisma.transactions.findFirst({
      where: {
        id,
        user_id: userId,
      },
    });

    if (!existingTransaction) {
      res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
      return;
    }

    // Update transaction and adjust account balances
    const result = await prisma.$transaction(async (tx) => {
      // Revert old balance change
      if (existingTransaction.account_id) {
        const oldBalanceChange = existingTransaction.type === 'income'
          ? -Number(existingTransaction.amount)
          : Number(existingTransaction.amount);

        await tx.accounts.update({
          where: { id: existingTransaction.account_id },
          data: {
            balance: {
              increment: oldBalanceChange,
            },
          },
        });
      }

      // Update transaction
      const transaction = await tx.transactions.update({
        where: { id },
        data: {
          account_id,
          category_id,
          amount,
          type,
          description,
          tx_date: tx_date ? new Date(tx_date) : undefined,
          mode,
          reference,
          notes,
        },
        include: {
          account: true,
          category: true,
        },
      });

      // Apply new balance change
      if (account_id) {
        const newBalanceChange = type === 'income'
          ? Number(amount)
          : -Number(amount);

        await tx.accounts.update({
          where: { id: account_id },
          data: {
            balance: {
              increment: newBalanceChange,
            },
          },
        });
      }

      return transaction;
    });

    res.status(200).json({
      success: true,
      message: 'Transaction updated successfully',
      data: { transaction: result },
    });
  } catch (error: any) {
    logger.error('Update transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update transaction',
    });
  }
};

/**
 * Delete transaction
 */
export const deleteTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    // Get transaction
    const transaction = await prisma.transactions.findFirst({
      where: {
        id,
        user_id: userId,
      },
    });

    if (!transaction) {
      res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
      return;
    }

    // Delete and adjust account balance
    await prisma.$transaction(async (tx) => {
      // Revert balance change
      if (transaction.account_id) {
        const balanceChange = transaction.type === 'income'
          ? -Number(transaction.amount)
          : Number(transaction.amount);

        await tx.accounts.update({
          where: { id: transaction.account_id },
          data: {
            balance: {
              increment: balanceChange,
            },
          },
        });
      }

      // Delete transaction
      await tx.transactions.delete({
        where: { id },
      });
    });

    logger.info(`Transaction deleted: ${id} by user ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully',
    });
  } catch (error: any) {
    logger.error('Delete transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete transaction',
    });
  }
};
