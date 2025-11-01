import { useState, useEffect } from 'react';
import { Plus, Target, TrendingUp, AlertTriangle, Calendar, DollarSign, Edit, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

interface BudgetPlan {
  id: string;
  name: string;
  description?: string;
  period_type: string;
  start_date: string;
  end_date: string;
  total_allocated: number;
  total_spent: number;
  status: string;
  created_at: string;
  budget_items: BudgetItem[];
}

interface BudgetItem {
  id: string;
  name: string;
  allocated_amount: number;
  spent_amount?: number;
  percentage_used?: number;
  is_essential: boolean;
  account_filter?: string; // Optional: filter spending to specific account
  category?: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
  accountBreakdown?: {
    account: {
      id: string;
      name: string;
      type: string;
      icon: string;
      color: string;
    } | null;
    amount: number;
  }[];
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface Account {
  id: string;
  name: string;
  type: string;
  icon: string;
  color: string;
}

export default function Budgets() {
  const [budgetPlans, setBudgetPlans] = useState<BudgetPlan[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<BudgetPlan | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<BudgetPlan | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    period_type: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    budget_items: [
      {
        category_id: '',
        name: '',
        allocated_amount: '',
        alert_threshold: '80',
        is_essential: false,
        notes: '',
        account_filter: ''
      }
    ]
  });

  useEffect(() => {
    fetchBudgetPlans();
    fetchCategories();
    fetchAccounts();
  }, []);

  const fetchBudgetPlans = async () => {
    try {
      setLoading(true);
      const response = await api.get('/budgets/plans/list');
      console.log('Budget plans response:', response.data);
      
      const budgetPlansData = response.data?.data?.budget_plans || [];
      setBudgetPlans(Array.isArray(budgetPlansData) ? budgetPlansData : []);
    } catch (error) {
      toast.error('Failed to fetch budget plans');
      console.error('Error fetching budget plans:', error);
      setBudgetPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      const categoriesData = response.data?.data?.categories || [];
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await api.get('/accounts');
      const accountsData = response.data?.data?.accounts || [];
      setAccounts(Array.isArray(accountsData) ? accountsData : []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setAccounts([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate form data
      if (!formData.name.trim()) {
        toast.error('Please enter a budget name');
        return;
      }
      
      if (!formData.start_date || !formData.end_date) {
        toast.error('Please select start and end dates');
        return;
      }
      
      if (formData.budget_items.length === 0) {
        toast.error('Please add at least one budget item');
        return;
      }
      
      // Validate budget items
      for (const item of formData.budget_items) {
        if (!item.name.trim()) {
          toast.error('Please enter a name for all budget items');
          return;
        }
        if (!item.allocated_amount || parseFloat(item.allocated_amount) <= 0) {
          toast.error('Please enter a valid amount for all budget items');
          return;
        }
      }

      const submitData = {
        ...formData,
        budget_items: formData.budget_items.map(item => ({
          ...item,
          allocated_amount: parseFloat(item.allocated_amount),
          alert_threshold: item.alert_threshold ? parseFloat(item.alert_threshold) : null,
          category_id: item.category_id || null,
          account_filter: item.account_filter || null
        }))
      };

      if (editingPlan) {
        await api.put(`/budgets/plans/${editingPlan.id}`, submitData);
        toast.success('Budget plan updated successfully!');
      } else {
        await api.post('/budgets/plans', submitData);
        toast.success('Budget plan created successfully!');
      }
      
      setShowCreateForm(false);
      resetForm();
      await fetchBudgetPlans();
    } catch (error: any) {
      console.error('Error creating budget plan:', error);
      toast.error(error.response?.data?.message || 'Failed to create budget plan');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      period_type: 'monthly',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      budget_items: [
        {
          category_id: '',
          name: '',
          allocated_amount: '',
          alert_threshold: '80',
          is_essential: false,
          notes: '',
          account_filter: ''
        }
      ]
    });
    setEditingPlan(null);
  };

  const handleEdit = (plan: BudgetPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      period_type: plan.period_type,
      start_date: new Date(plan.start_date).toISOString().split('T')[0],
      end_date: new Date(plan.end_date).toISOString().split('T')[0],
      budget_items: plan.budget_items.map(item => ({
        category_id: item.category?.id || '',
        name: item.name,
        allocated_amount: item.allocated_amount.toString(),
        alert_threshold: '80', // Default if not stored
        is_essential: item.is_essential,
        notes: '',
        account_filter: item.account_filter || ''
      }))
    });
    setShowCreateForm(true);
  };

  const addBudgetItem = () => {
    setFormData(prev => ({
      ...prev,
      budget_items: [...prev.budget_items, {
        category_id: '',
        name: '',
        allocated_amount: '',
        alert_threshold: '80',
        is_essential: false,
        notes: '',
        account_filter: ''
      }]
    }));
  };

  const removeBudgetItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      budget_items: prev.budget_items.filter((_, i) => i !== index)
    }));
  };

  const updateBudgetItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      budget_items: prev.budget_items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-SL', {
      style: 'currency',
      currency: 'SLL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPeriod = (period_type: string, start_date: string, end_date: string) => {
    const start = new Date(start_date).toLocaleDateString();
    const end = new Date(end_date).toLocaleDateString();
    return `${period_type.charAt(0).toUpperCase() + period_type.slice(1)} (${start} - ${end})`;
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      paused: 'bg-yellow-100 text-yellow-800',
      archived: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const calculateProgress = (plan: BudgetPlan) => {
    const percentage = plan.total_allocated > 0 ? (plan.total_spent / plan.total_allocated) * 100 : 0;
    return Math.min(percentage, 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Budget Plans</h1>
          <p className="text-gray-600 mt-1">Create and manage your budget plans</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Budget Plan
        </button>
      </div>

      {/* Budget Plans Grid */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading budget plans...</p>
        </div>
      ) : budgetPlans.length === 0 ? (
        <div className="text-center py-12">
          <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Budget Plans Yet</h3>
          <p className="text-gray-600 mb-4">Create your first budget plan to start tracking your spending goals.</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn btn-primary"
          >
            Create Your First Budget Plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgetPlans.map((plan) => {
            const progress = calculateProgress(plan);
            const isOverBudget = plan.total_spent > plan.total_allocated;
            
            return (
              <div key={plan.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{plan.name}</h3>
                    {plan.description && (
                      <p className="text-sm text-gray-600 mb-2">{plan.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      {formatPeriod(plan.period_type, plan.start_date, plan.end_date)}
                    </div>
                  </div>
                  {getStatusBadge(plan.status)}
                </div>

                {/* Budget Progress */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span className={isOverBudget ? 'text-red-600' : 'text-gray-900'}>
                      {formatCurrency(plan.total_spent)} / {formatCurrency(plan.total_allocated)}
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        isOverBudget ? 'bg-red-500' : progress > 80 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{progress.toFixed(1)}% used</span>
                    {isOverBudget && (
                      <span className="text-red-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Over budget
                      </span>
                    )}
                  </div>
                </div>

                {/* Budget Items Summary */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Categories: {plan.budget_items?.length || 0}</span>
                    <span>Remaining: {formatCurrency(plan.total_allocated - plan.total_spent)}</span>
                  </div>
                  
                  {/* Account Breakdown Preview */}
                  {plan.budget_items && plan.budget_items.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 mb-2">Spending by Account:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {(() => {
                          // Aggregate spending across all budget items by account
                          const accountTotals = new Map();
                          
                          plan.budget_items.forEach(item => {
                            if (item.accountBreakdown) {
                              item.accountBreakdown.forEach(breakdown => {
                                if (breakdown.account && breakdown.amount > 0) {
                                  const accountId = breakdown.account.id;
                                  const currentTotal = accountTotals.get(accountId) || { 
                                    account: breakdown.account, 
                                    amount: 0 
                                  };
                                  currentTotal.amount += breakdown.amount;
                                  accountTotals.set(accountId, currentTotal);
                                }
                              });
                            }
                          });
                          
                          const accountBreakdowns = Array.from(accountTotals.values()).slice(0, 4);
                          
                          if (accountBreakdowns.length === 0) {
                            return (
                              <div className="col-span-2 text-xs text-gray-400 italic">
                                No spending recorded yet
                              </div>
                            );
                          }
                          
                          return accountBreakdowns.map(breakdown => (
                            <div key={breakdown.account.id} className="flex items-center gap-2 text-xs">
                              <div 
                                className="w-3 h-3 rounded-full flex items-center justify-center text-[8px]"
                                style={{ backgroundColor: breakdown.account.color }}
                              >
                                {breakdown.account.icon}
                              </div>
                              <span className="truncate flex-1">{breakdown.account.name}</span>
                              <span className="font-medium">{formatCurrency(breakdown.amount)}</span>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => {
                      setSelectedPlan(plan);
                      setShowAnalysis(true);
                    }}
                    className="btn btn-outline flex-1 flex items-center justify-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </button>
                  <button 
                    onClick={() => handleEdit(plan)}
                    className="btn btn-outline p-2"
                    title="Edit budget plan"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Budget Plan Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">
                  {editingPlan ? 'Edit Budget Plan' : 'Create Budget Plan'}
                </h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Budget Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="input w-full"
                    placeholder="e.g., Monthly Family Budget"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Period Type
                  </label>
                  <select
                    value={formData.period_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, period_type: e.target.value }))}
                    className="input w-full"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="yearly">Yearly</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="input w-full"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    className="input w-full"
                    min={formData.start_date}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="input w-full"
                  rows={2}
                  placeholder="Optional description for this budget plan"
                />
              </div>

              {/* Budget Items */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Budget Items</h3>
                  <button
                    type="button"
                    onClick={addBudgetItem}
                    className="btn btn-outline btn-sm flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Item
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.budget_items.map((item, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Budget Item {index + 1}</h4>
                        {formData.budget_items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeBudgetItem(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Category
                          </label>
                          <select
                            value={item.category_id}
                            onChange={(e) => updateBudgetItem(index, 'category_id', e.target.value)}
                            className="input w-full"
                          >
                            <option value="">Select Category</option>
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.icon} {category.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Account Filter (Optional)
                          </label>
                          <select
                            value={item.account_filter || ''}
                            onChange={(e) => updateBudgetItem(index, 'account_filter', e.target.value)}
                            className="input w-full"
                          >
                            <option value="">All Accounts</option>
                            {accounts.map((account) => (
                              <option key={account.id} value={account.id}>
                                {account.icon} {account.name} ({account.type.replace('_', ' ')})
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            Leave empty to track spending from all accounts, or select specific account
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Item Name *
                          </label>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateBudgetItem(index, 'name', e.target.value)}
                            className="input w-full"
                            placeholder="e.g., Groceries, Rent"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Allocated Amount *
                          </label>
                          <input
                            type="number"
                            value={item.allocated_amount}
                            onChange={(e) => updateBudgetItem(index, 'allocated_amount', e.target.value)}
                            className="input w-full"
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Alert Threshold (%)
                          </label>
                          <input
                            type="number"
                            value={item.alert_threshold}
                            onChange={(e) => updateBudgetItem(index, 'alert_threshold', e.target.value)}
                            className="input w-full"
                            placeholder="80"
                            min="0"
                            max="100"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={item.is_essential}
                            onChange={(e) => updateBudgetItem(index, 'is_essential', e.target.checked)}
                            className="rounded"
                          />
                          <span className="text-sm">Essential expense</span>
                        </label>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notes
                        </label>
                        <input
                          type="text"
                          value={item.notes}
                          onChange={(e) => updateBudgetItem(index, 'notes', e.target.value)}
                          className="input w-full"
                          placeholder="Optional notes"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="btn btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                >
                  {editingPlan ? 'Update Budget Plan' : 'Create Budget Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Budget Plan Analysis Modal */}
      {showAnalysis && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedPlan.name}</h2>
                  <p className="text-gray-600">{selectedPlan.description}</p>
                </div>
                <button
                  onClick={() => {
                    setShowAnalysis(false);
                    setSelectedPlan(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-600">Total Allocated</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">{formatCurrency(selectedPlan.total_allocated)}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-600">Total Spent</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900">{formatCurrency(selectedPlan.total_spent)}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-600">Remaining</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-900">
                    {formatCurrency(selectedPlan.total_allocated - selectedPlan.total_spent)}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span>Overall Progress</span>
                  <span>
                    {selectedPlan.total_allocated > 0 
                      ? ((selectedPlan.total_spent / selectedPlan.total_allocated) * 100).toFixed(1)
                      : 0}% used
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className={`h-4 rounded-full transition-all ${
                      (selectedPlan.total_spent / selectedPlan.total_allocated) > 1 
                        ? 'bg-red-500' 
                        : (selectedPlan.total_spent / selectedPlan.total_allocated) > 0.8 
                        ? 'bg-yellow-500' 
                        : 'bg-green-500'
                    }`}
                    style={{ 
                      width: `${Math.min((selectedPlan.total_spent / selectedPlan.total_allocated) * 100, 100)}%` 
                    }}
                  ></div>
                </div>
              </div>

              {/* Account Breakdown Summary */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Spending by Account</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(() => {
                    // Aggregate spending across all budget items by account
                    const accountTotals = new Map();
                    
                    selectedPlan.budget_items.forEach(item => {
                      if (item.accountBreakdown) {
                        item.accountBreakdown.forEach(breakdown => {
                          if (breakdown.account) {
                            const accountId = breakdown.account.id;
                            const currentTotal = accountTotals.get(accountId) || { 
                              account: breakdown.account, 
                              amount: 0 
                            };
                            currentTotal.amount += breakdown.amount;
                            accountTotals.set(accountId, currentTotal);
                          }
                        });
                      }
                    });
                    
                    return Array.from(accountTotals.values()).map(breakdown => (
                      <div key={breakdown.account.id} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center gap-3 mb-2">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                            style={{ backgroundColor: breakdown.account.color }}
                          >
                            {breakdown.account.icon}
                          </div>
                          <div>
                            <h4 className="font-medium">{breakdown.account.name}</h4>
                            <p className="text-sm text-gray-500 capitalize">{breakdown.account.type.replace('_', ' ')}</p>
                          </div>
                        </div>
                        <p className="text-xl font-bold">{formatCurrency(breakdown.amount)}</p>
                        <p className="text-sm text-gray-500">
                          {selectedPlan.total_spent > 0 
                            ? ((breakdown.amount / selectedPlan.total_spent) * 100).toFixed(1)
                            : 0}% of total spending
                        </p>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Budget Items Detail */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Budget Categories</h3>
                <div className="space-y-4">
                  {selectedPlan.budget_items.map((item) => {
                    const progress = item.allocated_amount > 0 ? (item.spent_amount || 0) / item.allocated_amount * 100 : 0;
                    const isOverBudget = (item.spent_amount || 0) > item.allocated_amount;
                    
                    return (
                      <div key={item.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            {item.category && (
                              <div 
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                                style={{ backgroundColor: item.category.color }}
                              >
                                {item.category.icon}
                              </div>
                            )}
                            <div>
                              <h4 className="font-medium">{item.name}</h4>
                              {item.category && (
                                <p className="text-sm text-gray-500">{item.category.name}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {formatCurrency(item.spent_amount || 0)} / {formatCurrency(item.allocated_amount)}
                            </p>
                            <p className={`text-sm ${isOverBudget ? 'text-red-600' : 'text-gray-500'}`}>
                              {progress.toFixed(1)}% used
                            </p>
                          </div>
                        </div>
                        
                        {/* Progress bar for this item */}
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              isOverBudget ? 'bg-red-500' : progress > 80 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          ></div>
                        </div>

                        {/* Account breakdown for this category */}
                        {item.accountBreakdown && item.accountBreakdown.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-500 mb-2">Account breakdown:</p>
                            <div className="grid grid-cols-2 gap-2">
                              {item.accountBreakdown.map((breakdown, index) => (
                                breakdown.account && (
                                  <div key={index} className="flex items-center gap-2 text-sm">
                                    <div 
                                      className="w-4 h-4 rounded-full flex items-center justify-center text-[10px]"
                                      style={{ backgroundColor: breakdown.account.color }}
                                    >
                                      {breakdown.account.icon}
                                    </div>
                                    <span className="truncate">{breakdown.account.name}</span>
                                    <span className="font-medium ml-auto">{formatCurrency(breakdown.amount)}</span>
                                  </div>
                                )
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowAnalysis(false);
                    setSelectedPlan(null);
                  }}
                  className="btn btn-primary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
