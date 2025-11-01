/**
 * Authentication Controller
 * Handles user signup, login, token refresh, and logout
 */

import { Request, Response } from 'express';
import prisma from '../config/database';
import { hashPassword, verifyPassword } from '../utils/password';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getTokenExpiry,
} from '../utils/jwt';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

/**
 * User Signup
 */
export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, phone, password, first_name, last_name, currency, timezone } = req.body;

    // Check if user already exists
    const existingUser = await prisma.users.findFirst({
      where: {
        OR: [
          { email },
          ...(phone ? [{ phone }] : []),
        ],
      },
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: 'User with this email or phone already exists',
      });
      return;
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Create user
    const user = await prisma.users.create({
      data: {
        email,
        phone,
        password_hash,
        first_name,
        last_name,
        currency: currency || 'SLL',
        timezone: timezone || 'Africa/Freetown',
      },
      select: {
        id: true,
        email: true,
        phone: true,
        first_name: true,
        last_name: true,
        currency: true,
        created_at: true,
      },
    });

    // Create default categories for the user
    await createDefaultCategories(user.id);

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);

    // Store refresh token in database
    await prisma.refresh_tokens.create({
      data: {
        user_id: user.id,
        token: refreshToken,
        expires_at: getTokenExpiry(process.env.JWT_REFRESH_EXPIRY || '7d'),
      },
    });

    logger.info(`New user registered: ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        accessToken,
        refreshToken,
      },
    });
  } catch (error: any) {
    logger.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register user',
    });
  }
};

/**
 * User Login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.users.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    // Check if account is active
    if (!user.is_active) {
      res.status(403).json({
        success: false,
        message: 'Account is inactive',
      });
      return;
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);

    // Store refresh token
    await prisma.refresh_tokens.create({
      data: {
        user_id: user.id,
        token: refreshToken,
        expires_at: getTokenExpiry(process.env.JWT_REFRESH_EXPIRY || '7d'),
      },
    });

    // Update last login
    await prisma.users.update({
      where: { id: user.id },
      data: { last_login: new Date() },
    });

    logger.info(`User logged in: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          first_name: user.first_name,
          last_name: user.last_name,
          currency: user.currency,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error: any) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to login',
    });
  }
};

/**
 * Refresh Access Token
 */
export const refreshAccessToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Check if token exists in database and is not revoked
    const storedToken = await prisma.refresh_tokens.findUnique({
      where: { token: refreshToken },
    });

    if (!storedToken || storedToken.revoked) {
      res.status(401).json({
        success: false,
        message: 'Invalid or revoked refresh token',
      });
      return;
    }

    // Check if token is expired
    if (new Date() > storedToken.expires_at) {
      res.status(401).json({
        success: false,
        message: 'Refresh token expired',
      });
      return;
    }

    // Generate new access token
    const accessToken = generateAccessToken(decoded.userId, decoded.email);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken,
      },
    });
  } catch (error: any) {
    logger.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Failed to refresh token',
    });
  }
};

/**
 * Logout
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    // Revoke refresh token
    await prisma.refresh_tokens.updateMany({
      where: { token: refreshToken },
      data: { revoked: true },
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to logout',
    });
  }
};

/**
 * Get Current User Profile
 */
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        first_name: true,
        last_name: true,
        currency: true,
        timezone: true,
        created_at: true,
        last_login: true,
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error: any) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
    });
  }
};

/**
 * Helper: Create default categories for new users
 */
const createDefaultCategories = async (userId: string): Promise<void> => {
  const defaultCategories = [
    // Income categories
    { name: 'Salary', type: 'income', icon: 'briefcase', color: '#10B981' },
    { name: 'Business', type: 'income', icon: 'trending-up', color: '#3B82F6' },
    { name: 'Freelance', type: 'income', icon: 'code', color: '#8B5CF6' },
    { name: 'Investment', type: 'income', icon: 'dollar-sign', color: '#F59E0B' },
    { name: 'Other Income', type: 'income', icon: 'plus-circle', color: '#6B7280' },
    
    // Expense categories
    { name: 'Food & Dining', type: 'expense', icon: 'coffee', color: '#EF4444' },
    { name: 'Transport', type: 'expense', icon: 'truck', color: '#F97316' },
    { name: 'Shopping', type: 'expense', icon: 'shopping-bag', color: '#EC4899' },
    { name: 'Bills & Utilities', type: 'expense', icon: 'file-text', color: '#14B8A6' },
    { name: 'Entertainment', type: 'expense', icon: 'film', color: '#A855F7' },
    { name: 'Health', type: 'expense', icon: 'heart', color: '#EF4444' },
    { name: 'Education', type: 'expense', icon: 'book', color: '#3B82F6' },
    { name: 'Other Expense', type: 'expense', icon: 'minus-circle', color: '#6B7280' },
  ];

  await prisma.categories.createMany({
    data: defaultCategories.map((cat) => ({
      user_id: userId,
      ...cat,
      is_default: true,
    })),
  });
};
