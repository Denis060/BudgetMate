/**
 * Category Controller
 * Manages transaction categories
 */

import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../utils/logger';

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { type } = req.query;

    const categories = await prisma.categories.findMany({
      where: {
        user_id: userId,
        ...(type && { type: type as string }),
      },
      orderBy: [
        { is_default: 'desc' },
        { name: 'asc' },
      ],
    });

    res.status(200).json({
      success: true,
      data: { categories },
    });
  } catch (error: any) {
    logger.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
    });
  }
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { name, type, icon, color } = req.body;

    const category = await prisma.categories.create({
      data: {
        user_id: userId!,
        name,
        type,
        icon,
        color,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category },
    });
  } catch (error: any) {
    logger.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create category',
    });
  }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const category = await prisma.categories.updateMany({
      where: {
        id,
        user_id: userId,
      },
      data: req.body,
    });

    if (category.count === 0) {
      res.status(404).json({
        success: false,
        message: 'Category not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
    });
  } catch (error: any) {
    logger.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category',
    });
  }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const category = await prisma.categories.deleteMany({
      where: {
        id,
        user_id: userId,
      },
    });

    if (category.count === 0) {
      res.status(404).json({
        success: false,
        message: 'Category not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error: any) {
    logger.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category',
    });
  }
};
