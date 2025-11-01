import React, { useState, useEffect } from 'react';
import { Brain, ThumbsUp, ThumbsDown, Sparkles, Target } from 'lucide-react';
import api from '../lib/api';

interface CategorySuggestion {
  categoryId: string;
  categoryName: string;
  confidence: number;
  reason: string;
}

interface SmartCategorySuggestionsProps {
  description: string;
  amount: number;
  selectedCategoryId?: string;
  onCategorySelect: (categoryId: string) => void;
  onFeedback?: (categoryId: string, isPositive: boolean) => void;
}

export default function SmartCategorySuggestions({
  description,
  amount,
  selectedCategoryId,
  onCategorySelect,
  onFeedback,
}: SmartCategorySuggestionsProps) {
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLearningData, setHasLearningData] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (description && amount > 0) {
      getSuggestions();
    }
  }, [description, amount]);

  const getSuggestions = async () => {
    if (!description.trim() || amount <= 0) return;

    setLoading(true);
    try {
      const response = await api.post('/smart-categories/suggest', {
        description,
        amount,
      });

      setSuggestions(response.data.suggestions || []);
      setHasLearningData(response.data.hasLearningData);
      setShowSuggestions(response.data.suggestions?.length > 0);
    } catch (error) {
      console.error('Failed to get category suggestions:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (categoryId: string, isPositive: boolean) => {
    try {
      // Create a simple hash for the description (client-side)
      const descriptionHash = btoa(description.toLowerCase()).slice(0, 16);
      
      await api.post('/smart-categories/feedback', {
        descriptionHash,
        categoryId,
        isPositive,
      });

      if (onFeedback) {
        onFeedback(categoryId, isPositive);
      }

      // Refresh suggestions after feedback
      getSuggestions();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-100';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-blue-600 bg-blue-100';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 80) return <Target className="w-4 h-4" />;
    if (confidence >= 60) return <Sparkles className="w-4 h-4" />;
    return <Brain className="w-4 h-4" />;
  };

  if (!description || amount <= 0) return null;

  return (
    <div className="mt-4">
      {/* Smart Suggestions Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          <span className="text-sm font-medium text-gray-700">
            Smart Category Suggestions
          </span>
          {loading && (
            <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          )}
        </div>
        
        {suggestions.length > 0 && (
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="text-xs text-purple-600 hover:text-purple-800"
          >
            {showSuggestions ? 'Hide' : 'Show'} ({suggestions.length})
          </button>
        )}
      </div>

      {/* No Learning Data Message */}
      {!hasLearningData && !loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
          <div className="flex items-start gap-2">
            <Brain className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800 font-medium">
                Learning Mode Active
              </p>
              <p className="text-xs text-blue-600 mt-1">
                I'm learning your categorization patterns. The more transactions you categorize, 
                the better my suggestions will become!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions List */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="space-y-2 mb-3">
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.categoryId}-${index}`}
              className={`border rounded-lg p-3 cursor-pointer transition-all ${
                selectedCategoryId === suggestion.categoryId
                  ? 'border-purple-300 bg-purple-50'
                  : 'border-gray-200 hover:border-purple-200 hover:bg-purple-25'
              }`}
              onClick={() => onCategorySelect(suggestion.categoryId)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">
                      {suggestion.categoryName}
                    </span>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                      {getConfidenceIcon(suggestion.confidence)}
                      {suggestion.confidence}%
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">
                    {suggestion.reason}
                  </p>
                </div>

                {/* Feedback Buttons */}
                <div className="flex items-center gap-1 ml-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFeedback(suggestion.categoryId, true);
                    }}
                    className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                    title="Good suggestion"
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFeedback(suggestion.categoryId, false);
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Poor suggestion"
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Training Prompt */}
      {!hasLearningData && !loading && (
        <div className="text-center">
          <button
            onClick={async () => {
              try {
                await api.post('/smart-categories/train');
                getSuggestions(); // Refresh after training
              } catch (error) {
                console.error('Training failed:', error);
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Train from My Existing Transactions
          </button>
          <p className="text-xs text-gray-500 mt-2">
            This will analyze your past transactions to improve category suggestions
          </p>
        </div>
      )}
    </div>
  );
}