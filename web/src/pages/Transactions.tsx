import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit2, Trash2, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import SmartCategorySuggestions from '../components/SmartCategorySuggestions';

interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  tx_date: string;
  mode: string;
  reference?: string;
  notes?: string;
  account: {
    id: string;
    name: string;
    type: string;
  };
  category: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
}

interface Account {
  id: string;
  name: string;
  type: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  
  // Advanced filters
  const [filters, setFilters] = useState({
    account_id: '',
    category_id: '',
    start_date: '',
    end_date: '',
    mode: '',
    amount_min: '',
    amount_max: ''
  });

  // Form state
  const [formData, setFormData] = useState({
    amount: '',
    type: 'expense' as 'income' | 'expense',
    description: '',
    account_id: '',
    category_id: '',
    tx_date: new Date().toISOString().split('T')[0],
    mode: 'cash',
    reference: '',
    notes: ''
  });

  useEffect(() => {
    fetchTransactions();
    fetchAccounts();
    fetchCategories();
  }, [currentPage, filterType, searchTerm, filters]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        sort: 'desc'
      });
      
      if (filterType !== 'all') {
        params.append('type', filterType);
      }
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      // Add advanced filters
      if (filters.account_id) {
        params.append('account_id', filters.account_id);
      }
      
      if (filters.category_id) {
        params.append('category_id', filters.category_id);
      }
      
      if (filters.start_date) {
        params.append('start_date', filters.start_date);
      }
      
      if (filters.end_date) {
        params.append('end_date', filters.end_date);
      }

      if (filters.mode) {
        params.append('mode', filters.mode);
      }

      const response = await api.get(`/transactions?${params}`);
      console.log('Transactions response:', response.data);
      
      // Handle the API response structure: { success: true, data: { transactions: [...], pagination: {...} } }
      let transactionsData = response.data?.data?.transactions || [];
      const paginationData = response.data?.data?.pagination || {};
      
      // Client-side filtering for amount range (since API might not support it)
      if (filters.amount_min || filters.amount_max) {
        transactionsData = transactionsData.filter((transaction: Transaction) => {
          const amount = parseFloat(transaction.amount.toString());
          const minAmount = filters.amount_min ? parseFloat(filters.amount_min) : 0;
          const maxAmount = filters.amount_max ? parseFloat(filters.amount_max) : Infinity;
          return amount >= minAmount && amount <= maxAmount;
        });
      }
      
      setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
      setTotalPages(paginationData.totalPages || 1);
    } catch (error) {
      toast.error('Failed to fetch transactions');
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await api.get('/accounts');
      console.log('Accounts response:', response.data);
      // Handle the API response structure: { success: true, data: { accounts: [...] } }
      const accountsData = response.data?.data?.accounts || [];
      setAccounts(Array.isArray(accountsData) ? accountsData : []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setAccounts([]); // Set empty array on error
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      console.log('Categories response:', response.data);
      // Handle the API response structure: { success: true, data: { categories: [...] } }
      const categoriesData = response.data?.data?.categories || [];
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]); // Set empty array on error
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      account_id: '',
      category_id: '',
      start_date: '',
      end_date: '',
      mode: '',
      amount_min: '',
      amount_max: ''
    });
    setFilterType('all');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const hasActiveFilters = () => {
    return filterType !== 'all' || 
           searchTerm !== '' || 
           Object.values(filters).some(value => value !== '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate form data
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }
      
      if (!formData.description.trim()) {
        toast.error('Please enter a description');
        return;
      }
      
      if (!formData.account_id) {
        toast.error('Please select an account');
        return;
      }
      
      if (!formData.category_id) {
        toast.error('Please select a category');
        return;
      }

      const transactionData = {
        ...formData,
        amount: parseFloat(formData.amount),
        // Ensure empty strings are converted to null for optional fields
        reference: formData.reference.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      };

      console.log('Submitting transaction data:', transactionData);

      if (editingTransaction) {
        const response = await api.put(`/transactions/${editingTransaction.id}`, transactionData);
        console.log('Transaction updated:', response.data);
        toast.success('Transaction updated successfully');
      } else {
        const response = await api.post('/transactions', transactionData);
        console.log('Transaction created:', response.data);
        toast.success('Transaction added successfully');
        
        // Learn from this categorization choice for smart suggestions
        try {
          await api.post('/smart-categories/learn', {
            description: formData.description,
            amount: parseFloat(formData.amount),
            chosenCategoryId: formData.category_id,
          });
        } catch (learningError) {
          console.error('Failed to learn from categorization:', learningError);
          // Don't show error to user as this is background learning
        }
        
        // Reset to first page to see the new transaction (sorted by newest first)
        setCurrentPage(1);
      }
      
      resetForm();
      // Refresh the transactions list
      await fetchTransactions();
    } catch (error: any) {
      console.error('Error saving transaction:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to save transaction';
      toast.error(errorMessage);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    
    try {
      await api.delete(`/transactions/${id}`);
      toast.success('Transaction deleted successfully');
      fetchTransactions();
    } catch (error) {
      toast.error('Failed to delete transaction');
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      amount: transaction.amount.toString(),
      type: transaction.type,
      description: transaction.description,
      account_id: transaction.account.id,
      category_id: transaction.category.id,
      tx_date: transaction.tx_date.split('T')[0],
      mode: transaction.mode,
      reference: transaction.reference || '',
      notes: transaction.notes || ''
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      type: 'expense',
      description: '',
      account_id: '',
      category_id: '',
      tx_date: new Date().toISOString().split('T')[0],
      mode: 'cash',
      reference: '',
      notes: ''
    });
    setEditingTransaction(null);
    setShowAddForm(false);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Transaction
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="space-y-4">
          {/* Basic Filters Row */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
            
            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'income' | 'expense')}
              className="input w-auto min-w-[140px]"
            >
              <option value="all">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>

            {/* Advanced Filters Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}
            >
              <Filter className="h-4 w-4" />
              Filters
              {hasActiveFilters() && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 ml-1">
                  {Object.values(filters).filter(v => v !== '').length + 
                   (filterType !== 'all' ? 1 : 0) + 
                   (searchTerm ? 1 : 0)}
                </span>
              )}
            </button>

            {hasActiveFilters() && (
              <button
                onClick={clearFilters}
                className="btn btn-outline text-sm"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="border-t pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Account Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
                  <select
                    value={filters.account_id}
                    onChange={(e) => handleFilterChange('account_id', e.target.value)}
                    className="input w-full"
                  >
                    <option value="">All Accounts</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={filters.category_id}
                    onChange={(e) => handleFilterChange('category_id', e.target.value)}
                    className="input w-full"
                  >
                    <option value="">All Categories</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date From */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                  <input
                    type="date"
                    value={filters.start_date}
                    onChange={(e) => handleFilterChange('start_date', e.target.value)}
                    className="input w-full"
                  />
                </div>

                {/* Date To */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                  <input
                    type="date"
                    value={filters.end_date}
                    onChange={(e) => handleFilterChange('end_date', e.target.value)}
                    className="input w-full"
                  />
                </div>
              </div>

              {/* Additional Filters Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Payment Mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                  <select
                    value={filters.mode}
                    onChange={(e) => handleFilterChange('mode', e.target.value)}
                    className="input w-full"
                  >
                    <option value="">All Modes</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Amount Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Amount</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={filters.amount_min}
                    onChange={(e) => handleFilterChange('amount_min', e.target.value)}
                    className="input w-full"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Amount</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={filters.amount_max}
                    onChange={(e) => handleFilterChange('amount_max', e.target.value)}
                    className="input w-full"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Quick Date Filters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quick Date Filters</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      handleFilterChange('start_date', today);
                      handleFilterChange('end_date', today);
                    }}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date();
                      const yesterday = new Date(today);
                      yesterday.setDate(yesterday.getDate() - 1);
                      const yesterdayStr = yesterday.toISOString().split('T')[0];
                      handleFilterChange('start_date', yesterdayStr);
                      handleFilterChange('end_date', yesterdayStr);
                    }}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Yesterday
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date();
                      const lastWeek = new Date(today);
                      lastWeek.setDate(lastWeek.getDate() - 7);
                      handleFilterChange('start_date', lastWeek.toISOString().split('T')[0]);
                      handleFilterChange('end_date', today.toISOString().split('T')[0]);
                    }}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Last 7 Days
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date();
                      const lastMonth = new Date(today);
                      lastMonth.setDate(lastMonth.getDate() - 30);
                      handleFilterChange('start_date', lastMonth.toISOString().split('T')[0]);
                      handleFilterChange('end_date', today.toISOString().split('T')[0]);
                    }}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Last 30 Days
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date();
                      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                      handleFilterChange('start_date', startOfMonth.toISOString().split('T')[0]);
                      handleFilterChange('end_date', today.toISOString().split('T')[0]);
                    }}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    This Month
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date();
                      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
                      handleFilterChange('start_date', lastMonth.toISOString().split('T')[0]);
                      handleFilterChange('end_date', endOfLastMonth.toISOString().split('T')[0]);
                    }}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Last Month
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transactions List */}
      <div className="card">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No transactions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Description</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Category</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Account</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Amount</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {formatDate(transaction.tx_date)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        {transaction.reference && (
                          <p className="text-sm text-gray-500">Ref: {transaction.reference}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{transaction.category.icon}</span>
                        <span className="text-sm">{transaction.category.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm">{transaction.account.name}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-medium ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatAmount(transaction.amount)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(transaction)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <Edit className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(transaction.id)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded bg-gray-100 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded bg-gray-100 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Transaction Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type */}
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value as 'income' | 'expense'})}
                  className="input"
                  required
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="input"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="input"
                  required
                />
              </div>

              {/* Account */}
              <div>
                <label className="block text-sm font-medium mb-1">Account</label>
                <select
                  value={formData.account_id}
                  onChange={(e) => setFormData({...formData, account_id: e.target.value})}
                  className="input"
                  required
                >
                  <option value="">Select Account</option>
                  {Array.isArray(accounts) && accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                  className="input"
                  required
                >
                  <option value="">Select Category</option>
                  {Array.isArray(categories) && categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>
                
                {/* Smart Category Suggestions */}
                {formData.description && formData.amount && (
                  <SmartCategorySuggestions
                    description={formData.description}
                    amount={parseFloat(formData.amount) || 0}
                    selectedCategoryId={formData.category_id}
                    onCategorySelect={(categoryId) => {
                      setFormData({...formData, category_id: categoryId});
                      // Learn from this choice when form is submitted
                    }}
                    onFeedback={(categoryId, isPositive) => {
                      // Feedback is handled by the component itself
                    }}
                  />
                )}
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input
                  type="date"
                  value={formData.tx_date}
                  onChange={(e) => setFormData({...formData, tx_date: e.target.value})}
                  className="input"
                  required
                />
              </div>

              {/* Mode */}
              <div>
                <label className="block text-sm font-medium mb-1">Payment Mode</label>
                <select
                  value={formData.mode}
                  onChange={(e) => setFormData({...formData, mode: e.target.value})}
                  className="input"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="transfer">Bank Transfer</option>
                  <option value="mobile_money">Mobile Money</option>
                </select>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-sm font-medium mb-1">Reference (Optional)</label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData({...formData, reference: e.target.value})}
                  className="input"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="input"
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                >
                  {editingTransaction ? 'Update' : 'Add'} Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
