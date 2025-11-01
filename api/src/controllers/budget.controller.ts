/**
 * Budget Controller
 * Manages monthly budgets by category
 */

import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../utils/logger';
import { Prisma } from '@prisma/client';

export const getBudgets = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { month, year } = req.query;

    const currentDate = new Date();
    const filterMonth = month ? parseInt(month as string) : currentDate.getMonth() + 1;
    const filterYear = year ? parseInt(year as string) : currentDate.getFullYear();

    const budgets = await prisma.budgets.findMany({
      where: {
        user_id: userId,
        period_month: filterMonth,
        period_year: filterYear,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
      },
    });

    // Calculate spent amount for each budget
    const budgetsWithProgress = await Promise.all(
      budgets.map(async (budget) => {
        const dateRange = {
          gte: new Date(filterYear, filterMonth - 1, 1),
          lt: new Date(filterYear, filterMonth, 1),
        };

        // Get total spent amount
        const spent = await prisma.transactions.aggregate({
          where: {
            user_id: userId,
            category_id: budget.category_id,
            type: 'expense',
            tx_date: dateRange,
          },
          _sum: {
            amount: true,
          },
        });

        // Get account breakdown
        const accountBreakdown = await prisma.transactions.groupBy({
          by: ['account_id'],
          where: {
            user_id: userId,
            category_id: budget.category_id,
            type: 'expense',
            tx_date: dateRange,
            account_id: { not: null }, // Only include transactions with accounts
          },
          _sum: {
            amount: true,
          },
        });

        // Get account details for the breakdown
        const accountBreakdownWithDetails = await Promise.all(
          accountBreakdown.map(async (breakdown) => {
            const account = await prisma.accounts.findUnique({
              where: { id: breakdown.account_id! },
              select: {
                id: true,
                name: true,
                type: true,
                icon: true,
                color: true,
              },
            });

            return {
              account,
              amount: Number(breakdown._sum.amount || 0),
            };
          })
        );

        const spentAmount = Number(spent._sum.amount || 0);
        const limitAmount = Number(budget.limit_amount);
        const percentage = limitAmount > 0 ? (spentAmount / limitAmount) * 100 : 0;

        return {
          ...budget,
          spent: spentAmount,
          remaining: limitAmount - spentAmount,
          percentage: Math.round(percentage * 100) / 100,
          accountBreakdown: accountBreakdownWithDetails,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: { budgets: budgetsWithProgress },
    });
  } catch (error: any) {
    logger.error('Get budgets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch budgets',
    });
  }
};

export const getBudget = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const budget = await prisma.budgets.findFirst({
      where: {
        id,
        user_id: userId,
      },
      include: {
        category: true,
      },
    });

    if (!budget) {
      res.status(404).json({
        success: false,
        message: 'Budget not found',
      });
      return;
    }

    // Calculate spent amount
    const spent = await prisma.transactions.aggregate({
      where: {
        user_id: userId,
        category_id: budget.category_id,
        type: 'expense',
        tx_date: {
          gte: new Date(budget.period_year, budget.period_month - 1, 1),
          lt: new Date(budget.period_year, budget.period_month, 1),
        },
      },
      _sum: {
        amount: true,
      },
    });

    const spentAmount = Number(spent._sum.amount || 0);
    const limitAmount = Number(budget.limit_amount);

    res.status(200).json({
      success: true,
      data: {
        budget: {
          ...budget,
          spent: spentAmount,
          remaining: limitAmount - spentAmount,
          percentage: (spentAmount / limitAmount) * 100,
        },
      },
    });
  } catch (error: any) {
    logger.error('Get budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch budget',
    });
  }
};

export const createBudget = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { category_id, limit_amount, period_month, period_year, alert_threshold } = req.body;

    const budget = await prisma.budgets.create({
      data: {
        user_id: userId!,
        category_id,
        limit_amount,
        period_month,
        period_year,
        alert_threshold,
      },
      include: {
        category: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Budget created successfully',
      data: { budget },
    });
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        res.status(409).json({
          success: false,
          message: 'Budget already exists for this category and period',
        });
        return;
      }
    }

    logger.error('Create budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create budget',
    });
  }
};

export const updateBudget = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const budget = await prisma.budgets.updateMany({
      where: {
        id,
        user_id: userId,
      },
      data: req.body,
    });

    if (budget.count === 0) {
      res.status(404).json({
        success: false,
        message: 'Budget not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Budget updated successfully',
    });
  } catch (error: any) {
    logger.error('Update budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update budget',
    });
  }
};

export const deleteBudget = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const budget = await prisma.budgets.deleteMany({
      where: {
        id,
        user_id: userId,
      },
    });

    if (budget.count === 0) {
      res.status(404).json({
        success: false,
        message: 'Budget not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Budget deleted successfully',
    });
  } catch (error: any) {
    logger.error('Delete budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete budget',
    });
  }
};

// ===== ENHANCED BUDGET PLAN MANAGEMENT =====

/**
 * Get all budget plans for a user
 */
export const getBudgetPlans = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { status, period_type } = req.query;

    const where: Prisma.budget_plansWhereInput = {
      user_id: userId,
      ...(status && { status: status as string }),
      ...(period_type && { period_type: period_type as string }),
    };

    const budgetPlans = await prisma.budget_plans.findMany({
      where,
      include: {
        budget_items: {
          include: {
            category: {
              select: { id: true, name: true, icon: true, color: true },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // Enhance budget plans with spending calculations and account breakdown
    const budgetPlansWithBreakdown = await Promise.all(
      budgetPlans.map(async (plan) => {
        const enhancedItems = await Promise.all(
          plan.budget_items.map(async (item) => {
            if (!item.category_id) return {
              ...item,
              spent_amount: 0,
              accountBreakdown: [],
            };

            // Calculate spent amount for this budget item
            const spentAmount = await prisma.transactions.aggregate({
              where: {
                user_id: userId,
                category_id: item.category_id,
                type: 'expense',
                tx_date: {
                  gte: new Date(plan.start_date),
                  lt: new Date(plan.end_date),
                },
                ...(item.account_filter && { account_id: item.account_filter }),
              },
              _sum: {
                amount: true,
              },
            });

            const spent = parseFloat(spentAmount._sum.amount?.toString() || '0');

            // Get account breakdown for this budget item's category
            const accountBreakdown = await prisma.transactions.groupBy({
              by: ['account_id'],
              where: {
                user_id: userId,
                category_id: item.category_id,
                type: 'expense',
                tx_date: {
                  gte: new Date(plan.start_date),
                  lt: new Date(plan.end_date),
                },
                account_id: { not: null },
                ...(item.account_filter && { account_id: item.account_filter }),
              },
              _sum: {
                amount: true,
              },
            });

            // Get account details for the breakdown
            const accountBreakdownWithDetails = await Promise.all(
              accountBreakdown.map(async (breakdown) => {
                const account = await prisma.accounts.findUnique({
                  where: { id: breakdown.account_id! },
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    icon: true,
                    color: true,
                  },
                });

                return {
                  account,
                  amount: Number(breakdown._sum.amount || 0),
                };
              })
            );

            return {
              ...item,
              spent_amount: spent,
              accountBreakdown: accountBreakdownWithDetails,
            };
          })
        );

        // Calculate total spent for the entire budget plan
        const totalSpent = enhancedItems.reduce((sum, item) => sum + (item.spent_amount || 0), 0);
        const totalAllocated = parseFloat(plan.total_allocated.toString());
        const overallPercentage = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

        return {
          ...plan,
          budget_items: enhancedItems,
          total_spent: totalSpent,
          percentage_used: overallPercentage,
          remaining_amount: totalAllocated - totalSpent,
          is_over_budget: totalSpent > totalAllocated,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: { budget_plans: budgetPlansWithBreakdown },
    });
  } catch (error: any) {
    logger.error('Get budget plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch budget plans',
    });
  }
};

/**
 * Get single budget plan
 */
export const getBudgetPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const budgetPlan = await prisma.budget_plans.findFirst({
      where: {
        id,
        user_id: userId,
      },
      include: {
        budget_items: {
          include: {
            category: {
              select: { id: true, name: true, icon: true, color: true },
            },
          },
        },
      },
    });

    if (!budgetPlan) {
      res.status(404).json({
        success: false,
        message: 'Budget plan not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { budget_plan: budgetPlan },
    });
  } catch (error: any) {
    logger.error('Get budget plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch budget plan',
    });
  }
};

/**
 * Create new budget plan
 */
export const createBudgetPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const {
      name,
      description,
      period_type,
      start_date,
      end_date,
      budget_items,
    } = req.body;

    // Calculate total allocated amount
    const total_allocated = budget_items.reduce(
      (sum: number, item: any) => sum + parseFloat(item.allocated_amount),
      0
    );

    const result = await prisma.$transaction(async (tx) => {
      // Create budget plan
      const budgetPlan = await tx.budget_plans.create({
        data: {
          user_id: userId!,
          name,
          description,
          period_type,
          start_date: new Date(start_date),
          end_date: new Date(end_date),
          total_allocated,
        },
      });

      // Create budget items
      if (budget_items && budget_items.length > 0) {
        await tx.budget_items.createMany({
          data: budget_items.map((item: any) => ({
            budget_plan_id: budgetPlan.id,
            category_id: item.category_id || null,
            name: item.name,
            allocated_amount: parseFloat(item.allocated_amount),
            alert_threshold: item.alert_threshold ? parseFloat(item.alert_threshold) : null,
            is_essential: item.is_essential || false,
            notes: item.notes || null,
          })),
        });
      }

      return budgetPlan;
    });

    logger.info(`Budget plan created: ${result.id} by user ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Budget plan created successfully',
      data: { budget_plan: result },
    });
  } catch (error: any) {
    logger.error('Create budget plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create budget plan',
    });
  }
};

/**
 * Get budget analysis and spending progress
 */
export const getBudgetAnalysis = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const budgetPlan = await prisma.budget_plans.findFirst({
      where: { id, user_id: userId },
      include: {
        budget_items: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!budgetPlan) {
      res.status(404).json({
        success: false,
        message: 'Budget plan not found',
      });
      return;
    }

    // Calculate spent amounts for each budget item
    const analysisPromises = budgetPlan.budget_items.map(async (item) => {
      const spentAmount = await prisma.transactions.aggregate({
        where: {
          user_id: userId,
          category_id: item.category_id,
          type: 'expense',
          tx_date: {
            gte: budgetPlan.start_date,
            lte: budgetPlan.end_date,
          },
        },
        _sum: {
          amount: true,
        },
      });

      const spent = parseFloat(spentAmount._sum.amount?.toString() || '0');
      const allocated = parseFloat(item.allocated_amount.toString());
      const percentage = allocated > 0 ? (spent / allocated) * 100 : 0;

      return {
        ...item,
        spent_amount: spent,
        percentage_used: percentage,
        remaining_amount: allocated - spent,
        is_over_budget: spent > allocated,
        is_near_limit: item.alert_threshold && percentage >= parseFloat(item.alert_threshold.toString()),
      };
    });

    const analysis = await Promise.all(analysisPromises);

    // Calculate overall budget statistics
    const totalAllocated = parseFloat(budgetPlan.total_allocated.toString());
    const totalSpent = analysis.reduce((sum, item) => sum + item.spent_amount, 0);
    const overallPercentage = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        budget_plan: {
          ...budgetPlan,
          total_spent: totalSpent,
          percentage_used: overallPercentage,
          remaining_amount: totalAllocated - totalSpent,
          is_over_budget: totalSpent > totalAllocated,
        },
        budget_items: analysis,
        summary: {
          total_allocated: totalAllocated,
          total_spent: totalSpent,
          remaining_amount: totalAllocated - totalSpent,
          percentage_used: overallPercentage,
          items_over_budget: analysis.filter(item => item.is_over_budget).length,
          items_near_limit: analysis.filter(item => item.is_near_limit).length,
        },
      },
    });
  } catch (error: any) {
    logger.error('Get budget analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch budget analysis',
    });
  }
};

/**
 * Update budget plan
 */
export const updateBudgetPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { name, description, period_type, start_date, end_date, budget_items } = req.body;

    // Check if budget plan exists and belongs to user
    const existingPlan = await prisma.budget_plans.findFirst({
      where: {
        id,
        user_id: userId,
      },
    });

    if (!existingPlan) {
      res.status(404).json({
        success: false,
        message: 'Budget plan not found',
      });
      return;
    }

    // Calculate total allocated amount
    const totalAllocated = budget_items.reduce((sum: number, item: any) => {
      return sum + parseFloat(item.allocated_amount || 0);
    }, 0);

    // Update budget plan
    const updatedPlan = await prisma.budget_plans.update({
      where: { id },
      data: {
        name,
        description,
        period_type,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
        total_allocated: totalAllocated,
      },
    });

    // Delete existing budget items
    await prisma.budget_items.deleteMany({
      where: { budget_plan_id: id },
    });

    // Create new budget items
    const budgetItemsData = budget_items.map((item: any) => ({
      budget_plan_id: id,
      category_id: item.category_id || null,
      name: item.name,
      allocated_amount: parseFloat(item.allocated_amount),
      alert_threshold: item.alert_threshold ? parseFloat(item.alert_threshold) : null,
      is_essential: item.is_essential || false,
      notes: item.notes || null,
    }));

    await prisma.budget_items.createMany({
      data: budgetItemsData,
    });

    res.status(200).json({
      success: true,
      message: 'Budget plan updated successfully',
      data: { budget_plan: updatedPlan },
    });
  } catch (error: any) {
    logger.error('Update budget plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update budget plan',
    });
  }
};
