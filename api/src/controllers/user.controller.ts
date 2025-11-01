/**
 * User Controller
 * Manages user profile and settings
 */

import { Request, Response } from 'express';
import prisma from '../config/database';
import { hashPassword } from '../utils/password';
import logger from '../utils/logger';

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { first_name, last_name, phone, currency, timezone } = req.body;

    const user = await prisma.users.update({
      where: { id: userId },
      data: {
        first_name,
        last_name,
        phone,
        currency,
        timezone,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        first_name: true,
        last_name: true,
        currency: true,
        timezone: true,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user },
    });
  } catch (error: any) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
    });
  }
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { current_password, new_password } = req.body;

    // Get user with password
    const user = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Verify current password
    const bcrypt = require('bcrypt');
    const isValid = await bcrypt.compare(current_password, user.password_hash);

    if (!isValid) {
      res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
      return;
    }

    // Hash new password
    const password_hash = await hashPassword(new_password);

    // Update password
    await prisma.users.update({
      where: { id: userId },
      data: { password_hash },
    });

    // Revoke all refresh tokens for security
    await prisma.refresh_tokens.updateMany({
      where: { user_id: userId },
      data: { revoked: true },
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error: any) {
    logger.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
    });
  }
};

export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    // Delete user (cascade will handle related records)
    await prisma.users.delete({
      where: { id: userId },
    });

    logger.info(`User account deleted: ${userId}`);

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
