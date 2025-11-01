import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart,
  Download,
  Calendar,
  BarChart3,
  Activity,
  Target
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import toast from 'react-hot-toast';
import api from '../lib/api';

interface SummaryData {
  period: {
    month: number;
    year: number;
  };
  income: {
    total: number;
    count: number;
  };
  expense: {
    total: number;
    count: number;
  };
  balance: number;
  savingsRate: string;
}

interface CategoryBreakdown {
  category_id: string | null;
  category_name: string;
  icon: string | null;
  color: string | null;
  type: 'income' | 'expense';
  total: number;
  count: number;
}

interface TrendData {
  month: number;
  year: number;
  income: number;
  expense: number;
  balance: number;
}

export default function Reports() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(10); // Default to October instead of current month
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-SL', {
      style: 'currency',
      currency: 'SLL',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const fetchSummary = async () => {
    try {
      const response = await api.get(`/reports/summary?month=${selectedMonth}&year=${selectedYear}`);
      if (response.data.success) {
        setSummary(response.data.data.summary);
        setCategoryBreakdown(response.data.data.categoryBreakdown);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
      toast.error('Failed to load summary data');
    }
  };

  const fetchTrends = async () => {
    try {
      const response = await api.get('/reports/trends?months=6');
      if (response.data.success) {
        const trendsData = response.data.data.trends.map((trend: TrendData) => ({
          ...trend,
          monthName: `${monthNames[trend.month - 1]} ${trend.year}`,
        }));
        setTrends(trendsData);
      }
    } catch (error) {
      console.error('Error fetching trends:', error);
      toast.error('Failed to load trends data');
    }
  };

  const handleExport = async (format: 'csv' | 'json' = 'csv') => {
    setIsExporting(true);
    try {
      const response = await api.get(`/reports/export?format=${format}`, {
        responseType: format === 'csv' ? 'blob' : 'json',
      });

      if (format === 'csv') {
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `transactions_${selectedMonth}_${selectedYear}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success('Data exported successfully');
      } else {
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { 
          type: 'application/json' 
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `transactions_${selectedMonth}_${selectedYear}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success('Data exported successfully');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchSummary(), fetchTrends()]);
      setIsLoading(false);
    };
    loadData();
  }, [selectedMonth, selectedYear]);

  // Prepare chart data
  const expenseCategories = categoryBreakdown
    .filter(cat => cat.type === 'expense')
    .sort((a, b) => b.total - a.total);

  const incomeCategories = categoryBreakdown
    .filter(cat => cat.type === 'income')
    .sort((a, b) => b.total - a.total);

  // Colors for pie chart
  const pieColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16'];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Financial Reports</h1>
        
        {/* Period Selector */}
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              {monthNames.map((month, index) => (
                <option key={index} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
            
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* Export Button */}
          <button
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <>
          {/* Show message if no data for selected period */}
          {summary.income.total === 0 && summary.expense.total === 0 && (
            <div className="card p-6 text-center">
              <p className="text-gray-500 text-lg">
                📊 No transaction data found for {monthNames[selectedMonth - 1]} {selectedYear}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Try selecting a different month or add some transactions to see your financial reports.
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Income
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(summary.income.total)}
                    </dd>
                    <dd className="text-sm text-gray-500">
                      {summary.income.count} transactions
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingDown className="h-8 w-8 text-red-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Expenses
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(summary.expense.total)}
                    </dd>
                    <dd className="text-sm text-gray-500">
                      {summary.expense.count} transactions
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DollarSign className={`h-8 w-8 ${summary.balance >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Net Balance
                    </dt>
                    <dd className={`text-lg font-medium ${summary.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(summary.balance)}
                    </dd>
                    <dd className="text-sm text-gray-500">
                      {summary.balance >= 0 ? 'Surplus' : 'Deficit'}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Target className="h-8 w-8 text-blue-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Savings Rate
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {summary.savingsRate}%
                    </dd>
                    <dd className="text-sm text-gray-500">
                      Of total income
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Trends Chart */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          Income vs Expense Trends (Last 6 Months)
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="monthName" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), '']}
                labelStyle={{ color: '#374151' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="income" 
                stroke="#10B981" 
                strokeWidth={3}
                name="Income"
              />
              <Line 
                type="monotone" 
                dataKey="expense" 
                stroke="#EF4444" 
                strokeWidth={3}
                name="Expenses"
              />
              <Line 
                type="monotone" 
                dataKey="balance" 
                stroke="#3B82F6" 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Net Balance"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Categories */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <PieChart className="h-5 w-5 mr-2" />
            Expense by Category
          </h3>
          {expenseCategories.length > 0 ? (
            <>
              <div className="h-64 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={expenseCategories}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="total"
                      nameKey="category_name"
                    >
                      {expenseCategories.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {expenseCategories.slice(0, 5).map((category, index) => (
                  <div key={category.category_id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: pieColors[index % pieColors.length] }}
                      />
                      <span className="text-sm text-gray-600">{category.category_name}</span>
                    </div>
                    <span className="text-sm font-medium">{formatCurrency(category.total)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-gray-500 text-center py-8">No expense data for this period</p>
          )}
        </div>

        {/* Income Categories */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Income by Category
          </h3>
          {incomeCategories.length > 0 ? (
            <>
              <div className="h-64 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={incomeCategories}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category_name" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="total" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <p className="text-gray-500 text-center py-8">No income data for this period</p>
          )}
        </div>
      </div>
    </div>
  );
}
