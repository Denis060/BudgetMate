/**
 * BudgetMate API Server
 * LionTek Global - Open Source Finance Tracker
 */

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';

// Load environment variables
dotenv.config();

// Import configurations and middleware
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import logger from './utils/logger';
import { connectRedis } from './config/redis';

// Import routes
import authRoutes from './routes/auth.routes';
import accountRoutes from './routes/account.routes';
import categoryRoutes from './routes/category.routes';
import transactionRoutes from './routes/transaction.routes';
import budgetRoutes from './routes/budget.routes';
import reportRoutes from './routes/report.routes';
import userRoutes from './routes/user.routes';
import importRoutes from './routes/import.routes';
import smartCategorizationRoutes from './routes/smartCategorization.routes';

// Initialize Express app
const app: Application = express();
const PORT = process.env.PORT || 5000;
const API_PREFIX = process.env.API_PREFIX || '/api';

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) }
  }));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// API Routes
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/accounts`, accountRoutes);
app.use(`${API_PREFIX}/categories`, categoryRoutes);
app.use(`${API_PREFIX}/transactions`, transactionRoutes);
app.use(`${API_PREFIX}/budgets`, budgetRoutes);
app.use(`${API_PREFIX}/reports`, reportRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/import`, importRoutes);
app.use(`${API_PREFIX}/smart-categories`, smartCategorizationRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Create HTTP server
const server = createServer(app);

// Graceful shutdown handler
const gracefulShutdown = async () => {
  logger.info('Received shutdown signal, closing server gracefully...');
  
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const startServer = async () => {
  try {
    // Connect to Redis (optional)
    await connectRedis();
    if (process.env.REDIS_URL) {
      logger.info('Redis connected successfully');
    }

    // Start listening
    server.listen(PORT, () => {
      logger.info(`🦁 BudgetMate API Server running on port ${PORT}`);
      logger.info(`📍 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🌐 API Base URL: http://localhost:${PORT}${API_PREFIX}`);
      logger.info(`🏥 Health Check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;
