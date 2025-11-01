/**
 * Report Controller
 * Generates financial reports and analytics
 */

import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../utils/logger';

export const getSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { month, year } = req.query;

    const currentDate = new Date();
    const filterMonth = month ? parseInt(month as string) : currentDate.getMonth() + 1;
    const filterYear = year ? parseInt(year as string) : currentDate.getFullYear();

    const startDate = new Date(filterYear, filterMonth - 1, 1);
    const endDate = new Date(filterYear, filterMonth, 1);

    // Get income and expense totals
    const [income, expense] = await Promise.all([
      prisma.transactions.aggregate({
        where: {
          user_id: userId,
          type: 'income',
          tx_date: {
            gte: startDate,
            lt: endDate,
          },
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.transactions.aggregate({
        where: {
          user_id: userId,
          type: 'expense',
          tx_date: {
            gte: startDate,
            lt: endDate,
          },
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const totalIncome = Number(income._sum.amount || 0);
    const totalExpense = Number(expense._sum.amount || 0);
    const balance = totalIncome - totalExpense;

    // Get category breakdown
    const categoryBreakdown = await prisma.transactions.groupBy({
      by: ['category_id', 'type'],
      where: {
        user_id: userId,
        tx_date: {
          gte: startDate,
          lt: endDate,
        },
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    // Enrich with category details
    const enrichedBreakdown = await Promise.all(
      categoryBreakdown.map(async (item) => {
        const category = item.category_id
          ? await prisma.categories.findUnique({
              where: { id: item.category_id },
              select: { name: true, icon: true, color: true },
            })
          : null;

        return {
          category_id: item.category_id,
          category_name: category?.name || 'Uncategorized',
          icon: category?.icon,
          color: category?.color,
          type: item.type,
          total: Number(item._sum.amount || 0),
          count: item._count,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        summary: {
          period: {
            month: filterMonth,
            year: filterYear,
          },
          income: {
            total: totalIncome,
            count: income._count,
          },
          expense: {
            total: totalExpense,
            count: expense._count,
          },
          balance,
          savingsRate: totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(2) : 0,
        },
        categoryBreakdown: enrichedBreakdown,
      },
    });
  } catch (error: any) {
    logger.error('Get summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate summary',
    });
  }
};

export const getTrends = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { months = '6' } = req.query;

    const monthsCount = parseInt(months as string);
    const trends = [];

    for (let i = monthsCount - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);

      const [income, expense] = await Promise.all([
        prisma.transactions.aggregate({
          where: {
            user_id: userId,
            type: 'income',
            tx_date: {
              gte: startDate,
              lt: endDate,
            },
          },
          _sum: { amount: true },
        }),
        prisma.transactions.aggregate({
          where: {
            user_id: userId,
            type: 'expense',
            tx_date: {
              gte: startDate,
              lt: endDate,
            },
          },
          _sum: { amount: true },
        }),
      ]);

      trends.push({
        month,
        year,
        income: Number(income._sum.amount || 0),
        expense: Number(expense._sum.amount || 0),
        balance: Number(income._sum.amount || 0) - Number(expense._sum.amount || 0),
      });
    }

    res.status(200).json({
      success: true,
      data: { trends },
    });
  } catch (error: any) {
    logger.error('Get trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate trends',
    });
  }
};

export const exportData = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { format = 'csv', start_date, end_date } = req.query;

    const where: any = {
      user_id: userId,
      ...(start_date || end_date ? {
        tx_date: {
          ...(start_date && { gte: new Date(start_date as string) }),
          ...(end_date && { lte: new Date(end_date as string) }),
        },
      } : {}),
    };

    const transactions = await prisma.transactions.findMany({
      where,
      include: {
        account: {
          select: { name: true },
        },
        category: {
          select: { name: true },
        },
      },
      orderBy: { tx_date: 'desc' },
    });

    if (format === 'csv') {
      // Generate CSV
      const csvHeader = 'Date,Type,Category,Account,Amount,Description,Mode,Reference\n';
      const csvRows = transactions.map((tx) => {
        return [
          tx.tx_date.toISOString().split('T')[0],
          tx.type,
          tx.category?.name || 'Uncategorized',
          tx.account?.name || 'N/A',
          tx.amount.toString(),
          `"${tx.description || ''}"`,
          tx.mode,
          tx.reference || '',
        ].join(',');
      }).join('\n');

      const csv = csvHeader + csvRows;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
      res.status(200).send(csv);
    } else {
      // Return JSON
      res.status(200).json({
        success: true,
        data: { transactions },
      });
    }
  } catch (error: any) {
    logger.error('Export data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export data',
    });
  }
};
