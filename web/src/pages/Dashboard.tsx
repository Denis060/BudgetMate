import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, Target, Plus } from 'lucide-react';
import { reportAPI, transactionAPI } from '../lib/api';
import { formatCurrency, formatDate, getCurrentPeriod } from '../lib/utils';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { month, year } = getCurrentPeriod();
      
      const [summaryRes, transactionsRes] = await Promise.all([
        reportAPI.getSummary({ month, year }),
        transactionAPI.getAll({ limit: 5, sort: 'desc' }),
      ]);

      setSummary(summaryRes.data.data.summary);
      setRecentTransactions(transactionsRes.data.data.transactions);
    } catch (error: any) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.first_name || 'User'}! 👋
        </h1>
        <p className="text-gray-600 mt-1">Here's your financial overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Income Card */}
        <div className="stat-card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-medium text-green-700 bg-green-200 px-2 py-1 rounded-full">
              +{summary?.income.count || 0}
            </span>
          </div>
          <p className="text-sm text-green-700 font-medium mb-1">Total Income</p>
          <p className="text-2xl font-bold text-green-900">
            {formatCurrency(summary?.income.total || 0, user?.currency)}
          </p>
        </div>

        {/* Expense Card */}
        <div className="stat-card bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-medium text-red-700 bg-red-200 px-2 py-1 rounded-full">
              {summary?.expense.count || 0}
            </span>
          </div>
          <p className="text-sm text-red-700 font-medium mb-1">Total Expenses</p>
          <p className="text-2xl font-bold text-red-900">
            {formatCurrency(summary?.expense.total || 0, user?.currency)}
          </p>
        </div>

        {/* Balance Card */}
        <div className="stat-card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-sm text-blue-700 font-medium mb-1">Balance</p>
          <p className="text-2xl font-bold text-blue-900">
            {formatCurrency(summary?.balance || 0, user?.currency)}
          </p>
        </div>

        {/* Savings Rate Card */}
        <div className="stat-card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-sm text-purple-700 font-medium mb-1">Savings Rate</p>
          <p className="text-2xl font-bold text-purple-900">
            {summary?.savingsRate || 0}%
          </p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Recent Transactions</h2>
          <button className="btn btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Transaction
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No transactions yet</p>
            <p className="text-sm text-gray-400 mt-1">Start by adding your first transaction</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      tx.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                    }`}
                  >
                    {tx.type === 'income' ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {tx.category?.name || 'Uncategorized'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {tx.description || formatDate(tx.tx_date)}
                    </p>
                  </div>
                </div>
                <p
                  className={`text-lg font-bold ${
                    tx.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {tx.type === 'income' ? '+' : '-'}
                  {formatCurrency(Number(tx.amount), user?.currency)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
