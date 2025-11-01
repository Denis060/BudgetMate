import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

interface CategorySuggestion {
  categoryId: string;
  categoryName: string;
  confidence: number;
  reason: string;
}

interface CategoryLearningData {
  description: string;
  amount: number;
  merchant?: string;
  existingCategoryId?: string;
}

export class SmartCategorizationService {
  // Normalize transaction description for comparison
  private normalizeDescription(description: string): string {
    return description
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Extract merchant name from description using common patterns
  private extractMerchant(description: string): string | null {
    const normalized = this.normalizeDescription(description);
    
    // Common merchant patterns
    const patterns = [
      // Card transactions: "POS MERCHANT NAME"
      /^pos\s+(.+)/,
      // ATM: Skip these
      /^atm/,
      // Transfer patterns: Extract recipient
      /transfer\s+to\s+(.+)/,
      /payment\s+to\s+(.+)/,
      // Direct merchant names (first 2-3 words)
      /^([a-z\s]{2,30}?)(?:\s+\d|\s+payment|\s+purchase|$)/,
    ];

    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Fallback: take first few words
    const words = normalized.split(' ').slice(0, 3);
    return words.join(' ');
  }

  // Determine amount range for learning
  private getAmountRange(amount: number): string {
    if (amount < 50) return 'small';
    if (amount < 500) return 'medium';
    return 'large';
  }

  // Create hash for description-based learning
  private createDescriptionHash(description: string): string {
    const normalized = this.normalizeDescription(description);
    return crypto.createHash('md5').update(normalized).digest('hex');
  }

  // Get category suggestions based on learned patterns
  async suggestCategory(
    userId: string, 
    data: CategoryLearningData
  ): Promise<CategorySuggestion[]> {
    const { description, amount } = data;
    const normalizedDesc = this.normalizeDescription(description);
    const descHash = this.createDescriptionHash(description);
    const merchant = this.extractMerchant(description);
    const amountRange = this.getAmountRange(amount);

    const suggestions: CategorySuggestion[] = [];

    // 1. Exact description match
    const exactMatch = await prisma.category_learning.findFirst({
      where: {
        user_id: userId,
        description_hash: descHash,
        feedback_score: { gte: 0 }, // Only positive or neutral feedback
      },
      include: { category: true },
      orderBy: [
        { confidence: 'desc' },
        { times_used: 'desc' },
        { last_used: 'desc' },
      ],
    });

    if (exactMatch) {
      suggestions.push({
        categoryId: exactMatch.category_id,
        categoryName: exactMatch.category.name,
        confidence: Math.min(95, Number(exactMatch.confidence) + exactMatch.times_used * 2),
        reason: 'Exact description match',
      });
    }

    // 2. Merchant-based matching
    if (merchant) {
      const merchantMatches = await prisma.category_learning.findMany({
        where: {
          user_id: userId,
          merchant: merchant,
          feedback_score: { gte: 0 },
          description_hash: { not: descHash }, // Exclude exact match
        },
        include: { category: true },
        orderBy: [
          { confidence: 'desc' },
          { times_used: 'desc' },
        ],
        take: 3,
      });

      merchantMatches.forEach(match => {
        const existingSuggestion = suggestions.find(s => s.categoryId === match.category_id);
        if (!existingSuggestion) {
          suggestions.push({
            categoryId: match.category_id,
            categoryName: match.category.name,
            confidence: Math.min(85, Number(match.confidence) - 5 + match.times_used),
            reason: `Similar merchant: ${merchant}`,
          });
        }
      });
    }

    // 3. Keyword-based matching
    const keywords = normalizedDesc.split(' ').filter(word => word.length > 3);
    if (keywords.length > 0) {
      // Get categories with similar keywords from user's transactions
      const keywordMatches = await prisma.transactions.findMany({
        where: {
          user_id: userId,
          category_id: { not: null },
          description: {
            contains: keywords[0], // Simple keyword matching
          },
        },
        include: { category: true },
        distinct: ['category_id'],
        take: 5,
      });

      // Count frequency of categories for these keywords
      const categoryFreq: Record<string, { count: number; category: any }> = {};
      keywordMatches.forEach(transaction => {
        if (transaction.category_id && transaction.category) {
          if (!categoryFreq[transaction.category_id]) {
            categoryFreq[transaction.category_id] = {
              count: 0,
              category: transaction.category,
            };
          }
          categoryFreq[transaction.category_id].count++;
        }
      });

      Object.entries(categoryFreq).forEach(([categoryId, data]) => {
        const existingSuggestion = suggestions.find(s => s.categoryId === categoryId);
        if (!existingSuggestion && data.count >= 2) {
          suggestions.push({
            categoryId,
            categoryName: data.category.name,
            confidence: Math.min(70, 40 + data.count * 10),
            reason: `Similar transactions (${data.count} found)`,
          });
        }
      });
    }

    // 4. Amount-based patterns
    const amountMatches = await prisma.category_learning.findMany({
      where: {
        user_id: userId,
        amount_range: amountRange,
        feedback_score: { gte: 0 },
      },
      include: { category: true },
      orderBy: [
        { times_used: 'desc' },
        { confidence: 'desc' },
      ],
      take: 3,
    });

    amountMatches.forEach(match => {
      const existingSuggestion = suggestions.find(s => s.categoryId === match.category_id);
      if (!existingSuggestion) {
        suggestions.push({
          categoryId: match.category_id,
          categoryName: match.category.name,
          confidence: Math.min(60, Number(match.confidence) - 15),
          reason: `Similar amount range (${amountRange})`,
        });
      }
    });

    // Sort by confidence and return top 3
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
  }

  // Learn from user's categorization choice
  async learnFromUserChoice(
    userId: string,
    data: CategoryLearningData & { chosenCategoryId: string }
  ): Promise<void> {
    const { description, amount, chosenCategoryId } = data;
    const descHash = this.createDescriptionHash(description);
    const merchant = this.extractMerchant(description);
    const amountRange = this.getAmountRange(amount);

    // Check if we already have learning data for this description
    const existing = await prisma.category_learning.findFirst({
      where: {
        user_id: userId,
        description_hash: descHash,
      },
    });

    if (existing) {
      // Update existing learning data
      const newConfidence = existing.category_id === chosenCategoryId
        ? Math.min(99, Number(existing.confidence) + 5) // Boost confidence
        : Math.max(10, Number(existing.confidence) - 10); // Reduce confidence

      await prisma.category_learning.update({
        where: { id: existing.id },
        data: {
          category_id: chosenCategoryId,
          confidence: newConfidence,
          times_used: existing.times_used + 1,
          last_used: new Date(),
          merchant,
          amount_range: amountRange,
        },
      });
    } else {
      // Create new learning entry
      await prisma.category_learning.create({
        data: {
          user_id: userId,
          description_hash: descHash,
          category_id: chosenCategoryId,
          merchant,
          amount_range: amountRange,
          confidence: 75, // Starting confidence
          times_used: 1,
        },
      });
    }
  }

  // Process user feedback (thumbs up/down on suggestions)
  async processFeedback(
    userId: string,
    descriptionHash: string,
    categoryId: string,
    isPositive: boolean
  ): Promise<void> {
    const feedbackScore = isPositive ? 1 : -1;
    
    await prisma.category_learning.updateMany({
      where: {
        user_id: userId,
        description_hash: descriptionHash,
        category_id: categoryId,
      },
      data: {
        feedback_score: feedbackScore,
        confidence: isPositive 
          ? { increment: 5 }
          : { decrement: 10 },
      },
    });
  }

  // Bulk train from existing user transactions
  async trainFromExistingTransactions(userId: string): Promise<number> {
    const transactions = await prisma.transactions.findMany({
      where: {
        user_id: userId,
        category_id: { not: null },
        description: { not: null },
      },
      include: { category: true },
      orderBy: { tx_date: 'desc' },
      take: 1000, // Process last 1000 transactions
    });

    let trainedCount = 0;

    for (const transaction of transactions) {
      if (transaction.description && transaction.category_id) {
        try {
          await this.learnFromUserChoice(userId, {
            description: transaction.description,
            amount: Number(transaction.amount),
            chosenCategoryId: transaction.category_id,
          });
          trainedCount++;
        } catch (error) {
          console.error('Training error for transaction:', transaction.id, error);
        }
      }
    }

    return trainedCount;
  }

  // Get learning statistics for user
  async getUserLearningStats(userId: string): Promise<{
    totalPatterns: number;
    averageConfidence: number;
    topCategories: Array<{ categoryName: string; patternCount: number }>;
  }> {
    const patterns = await prisma.category_learning.findMany({
      where: { user_id: userId },
      include: { category: true },
    });

    const totalPatterns = patterns.length;
    const averageConfidence = patterns.length > 0 
      ? patterns.reduce((sum, p) => sum + Number(p.confidence), 0) / patterns.length 
      : 0;

    // Count patterns by category
    const categoryCount: Record<string, { name: string; count: number }> = {};
    patterns.forEach(pattern => {
      const categoryId = pattern.category_id;
      if (!categoryCount[categoryId]) {
        categoryCount[categoryId] = {
          name: pattern.category.name,
          count: 0,
        };
      }
      categoryCount[categoryId].count++;
    });

    const topCategories = Object.values(categoryCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(cat => ({
        categoryName: cat.name,
        patternCount: cat.count,
      }));

    return {
      totalPatterns,
      averageConfidence: Math.round(averageConfidence),
      topCategories,
    };
  }
}

export const smartCategorizationService = new SmartCategorizationService();