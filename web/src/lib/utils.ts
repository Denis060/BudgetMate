/**
 * Utility Functions
 */

import { format, parseISO } from 'date-fns';
import clsx, { ClassValue } from 'clsx';

/**
 * Merge class names
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: string = 'SLL'): string {
  const currencySymbols: Record<string, string> = {
    SLL: 'Le',
    NGN: '₦',
    KES: 'KSh',
    GHS: '₵',
    USD: '$',
    EUR: '€',
    GBP: '£',
  };

  const symbol = currencySymbols[currency] || currency;
  
  return `${symbol} ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format date
 */
export function formatDate(date: string | Date, formatStr: string = 'MMM dd, yyyy'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr);
}

/**
 * Get initials from name
 */
export function getInitials(firstName?: string, lastName?: string): string {
  if (!firstName && !lastName) return 'U';
  
  const first = firstName?.charAt(0) || '';
  const last = lastName?.charAt(0) || '';
  
  return (first + last).toUpperCase();
}

/**
 * Truncate text
 */
export function truncate(text: string, length: number = 50): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

/**
 * Get color for transaction type
 */
export function getTransactionColor(type: 'income' | 'expense'): string {
  return type === 'income' ? 'text-green-600' : 'text-red-600';
}

/**
 * Get background color for transaction type
 */
export function getTransactionBgColor(type: 'income' | 'expense'): string {
  return type === 'income' ? 'bg-green-50' : 'bg-red-50';
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100 * 100) / 100;
}

/**
 * Get budget status color
 */
export function getBudgetStatusColor(percentage: number): string {
  if (percentage >= 100) return 'text-red-600';
  if (percentage >= 80) return 'text-orange-600';
  if (percentage >= 60) return 'text-yellow-600';
  return 'text-green-600';
}

/**
 * Get budget progress color
 */
export function getBudgetProgressColor(percentage: number): string {
  if (percentage >= 100) return 'bg-red-600';
  if (percentage >= 80) return 'bg-orange-600';
  if (percentage >= 60) return 'bg-yellow-600';
  return 'bg-green-600';
}

/**
 * Validate email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get month name
 */
export function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || '';
}

/**
 * Get current month and year
 */
export function getCurrentPeriod(): { month: number; year: number } {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}
