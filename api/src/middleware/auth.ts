/**
 * Authentication Middleware
 * Validates JWT tokens and attaches user to request
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import prisma from '../config/database';
import logger from '../utils/logger';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
    }
  }
}

/**
 * Authenticate user via JWT token
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'No token provided',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyAccessToken(token);

    // Check if user exists and is active
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, is_active: true },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (!user.is_active) {
      res.status(403).json({
        success: false,
        message: 'Account is inactive',
      });
      return;
    }

    // Attach user to request
    req.user = {
      userId: user.id,
      email: user.email,
    };

    next();
  } catch (error: any) {
    logger.error('Authentication error:', error);
    
    if (error.message === 'Invalid or expired access token') {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyAccessToken(token);
      
      const user = await prisma.users.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, is_active: true },
      });

      if (user && user.is_active) {
        req.user = {
          userId: user.id,
          email: user.email,
        };
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};
