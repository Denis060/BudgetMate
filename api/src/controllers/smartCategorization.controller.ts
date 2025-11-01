import { Request, Response } from 'express';
import { smartCategorizationService } from '../services/smartCategorization.service';
import { z } from 'zod';

// Request validation schemas
const suggestCategorySchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  merchant: z.string().optional(),
});

const feedbackSchema = z.object({
  descriptionHash: z.string(),
  categoryId: z.string(),
  isPositive: z.boolean(),
});

const learnFromChoiceSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  chosenCategoryId: z.string(),
});

// Get category suggestions for a transaction
export const suggestCategory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const data = suggestCategorySchema.parse(req.body);

    const suggestions = await smartCategorizationService.suggestCategory(userId, data);

    res.json({
      suggestions,
      hasLearningData: suggestions.length > 0,
      confidence: suggestions.length > 0 ? suggestions[0].confidence : 0,
    });
  } catch (error) {
    console.error('Category suggestion error:', error);
    res.status(500).json({ error: 'Failed to get category suggestions' });
  }
};

// Learn from user's category choice
export const learnFromChoice = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const data = learnFromChoiceSchema.parse(req.body);

    await smartCategorizationService.learnFromUserChoice(userId, data);

    res.json({ message: 'Learning data updated successfully' });
  } catch (error) {
    console.error('Learning error:', error);
    res.status(500).json({ error: 'Failed to update learning data' });
  }
};

// Process user feedback on suggestions
export const processFeedback = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const data = feedbackSchema.parse(req.body);

    await smartCategorizationService.processFeedback(
      userId,
      data.descriptionHash,
      data.categoryId,
      data.isPositive
    );

    res.json({ message: 'Feedback processed successfully' });
  } catch (error) {
    console.error('Feedback processing error:', error);
    res.status(500).json({ error: 'Failed to process feedback' });
  }
};

// Train the model from existing transactions
export const trainFromExisting = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const trainedCount = await smartCategorizationService.trainFromExistingTransactions(userId);

    res.json({
      message: 'Training completed successfully',
      trainedTransactions: trainedCount,
    });
  } catch (error) {
    console.error('Training error:', error);
    res.status(500).json({ error: 'Failed to train from existing transactions' });
  }
};

// Get learning statistics
export const getLearningStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const stats = await smartCategorizationService.getUserLearningStats(userId);

    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get learning statistics' });
  }
};