import { useState, useEffect } from 'react';
import { Plus, Star, Edit, Trash2, Eye, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  icon: string;
  color: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Checking Account' },
  { value: 'savings', label: 'Savings Account' },
  { value: 'cash', label: 'Cash' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'investment', label: 'Investment' },
];

const ACCOUNT_ICONS = [
  '💳', '🏦', '💰', '💵', '�', '📱', '💎', '🏪', '💼', '🎯'
];

const ACCOUNT_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', 
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'
];

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'checking',
    balance: '',
    currency: 'SLL',
    icon: '💳',
    color: '#3B82F6',
    is_default: false
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/accounts');
      console.log('Accounts response:', response.data);
      
      const accountsData = response.data?.data?.accounts || [];
      console.log('Processed accounts data:', accountsData);
      
      // Debug each account balance
      accountsData.forEach((account: any, index: number) => {
        console.log(`Account ${index}: ${account.name}, Balance: ${account.balance}, Type: ${typeof account.balance}`);
      });
      
      setAccounts(Array.isArray(accountsData) ? accountsData : []);
    } catch (error) {
      toast.error('Failed to fetch accounts');
      console.error('Error fetching accounts:', error);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate form data
      if (!formData.name.trim()) {
        toast.error('Please enter an account name');
        return;
      }
      
      if (formData.balance && parseFloat(formData.balance) < 0) {
        toast.error('Balance cannot be negative');
        return;
      }

      const submitData = {
        ...formData,
        balance: formData.balance ? parseFloat(formData.balance) : 0
      };

      if (editingAccount) {
        // Update existing account
        await api.put(`/accounts/${editingAccount.id}`, submitData);
        toast.success('Account updated successfully!');
      } else {
        // Create new account
        await api.post('/accounts', submitData);
        toast.success('Account created successfully!');
      }
      
      setShowAddForm(false);
      setEditingAccount(null);
      resetForm();
      await fetchAccounts();
    } catch (error: any) {
      console.error('Error saving account:', error);
      toast.error(error.response?.data?.message || 'Failed to save account');
    }
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      type: account.type,
      balance: account.balance.toString(),
      currency: account.currency,
      icon: account.icon,
      color: account.color,
      is_default: account.is_default
    });
    setShowAddForm(true);
  };

  const handleDelete = async (account: Account) => {
    if (!confirm(`Are you sure you want to delete the account "${account.name}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await api.delete(`/accounts/${account.id}`);
      toast.success('Account deleted successfully!');
      await fetchAccounts();
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error(error.response?.data?.message || 'Failed to delete account');
    }
  };

  const handleSetDefault = async (account: Account) => {
    try {
      await api.put(`/accounts/${account.id}`, {
        ...account,
        is_default: true
      });
      toast.success(`${account.name} set as default account!`);
      await fetchAccounts();
    } catch (error: any) {
      console.error('Error setting default account:', error);
      toast.error(error.response?.data?.message || 'Failed to set default account');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'checking',
      balance: '',
      currency: 'SLL',
      icon: '💳',
      color: '#3B82F6',
      is_default: false
    });
  };

  const formatCurrency = (amount: number, currency: string = 'SLL') => {
    return new Intl.NumberFormat('en-SL', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getAccountTypeLabel = (type: string) => {
    const accountType = ACCOUNT_TYPES.find(t => t.value === type);
    return accountType ? accountType.label : type;
  };

  const calculateTotalBalance = () => {
    const total = accounts.reduce((total, account) => {
      // Ensure balance is treated as a number
      const balance = parseFloat(account.balance) || 0;
      console.log(`Account: ${account.name}, Balance: ${balance}, Original: ${account.balance}, Type: ${typeof account.balance}`);
      return total + balance;
    }, 0);
    console.log(`Total calculated: ${total}`);
    return total;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Accounts</h1>
          <p className="text-gray-600 mt-1">Manage your financial accounts</p>
        </div>
        <button
          onClick={() => {
            setEditingAccount(null);
            resetForm();
            setShowAddForm(true);
          }}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Account
        </button>
      </div>

      {/* Total Balance Card */}
      <div className="card bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm">Total Balance</p>
            <p className="text-3xl font-bold">{formatCurrency(calculateTotalBalance())}</p>
            <p className="text-blue-100 text-sm mt-1">Across {accounts.length} accounts</p>
          </div>
          <div className="text-6xl opacity-20">
            💰
          </div>
        </div>
      </div>

      {/* Accounts Grid */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading accounts...</p>
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-12">
          <Wallet className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Accounts Yet</h3>
          <p className="text-gray-600 mb-4">Add your first account to start tracking your finances.</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn btn-primary"
          >
            Add Your First Account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((account) => (
            <div 
              key={account.id} 
              className="card hover:shadow-lg transition-shadow relative"
              style={{ borderLeft: `4px solid ${account.color}` }}
            >
              {/* Default Badge */}
              {account.is_default && (
                <div className="absolute top-3 right-3">
                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    Default
                  </span>
                </div>
              )}

              <div className="flex items-start gap-3 mb-4">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl select-none relative account-icon emoji-only"
                  style={{ 
                    backgroundColor: account.color,
                    fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif',
                    lineHeight: '1',
                    textAlign: 'center' as const,
                    overflow: 'hidden',
                    fontSize: '24px',
                    textIndent: '0',
                    letterSpacing: '0',
                    wordSpacing: '0'
                  }}
                  role="img"
                  aria-label=""
                  title=""
                >
                  <span 
                    className="emoji-only"
                    style={{ 
                      position: 'relative',
                      zIndex: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      height: '100%',
                      textIndent: '0',
                      letterSpacing: '0',
                      wordSpacing: '0'
                    }}
                  >
                    {account.icon}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {account.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>{getAccountTypeLabel(account.type)}</span>
                  </div>
                </div>
              </div>

              {/* Balance */}
              <div className="mb-4">
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(account.balance, account.currency)}
                </p>
                <p className="text-sm text-gray-500">
                  Current Balance
                </p>
              </div>

              {/* Account Details */}
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex justify-between">
                  <span>Currency:</span>
                  <span className="font-medium">{account.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span>Created:</span>
                  <span>{new Date(account.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                {!account.is_default && (
                  <button
                    onClick={() => handleSetDefault(account)}
                    className="btn btn-outline text-yellow-600 hover:bg-yellow-50 flex items-center justify-center gap-2"
                    title="Set as default account"
                  >
                    <Star className="h-4 w-4" />
                    Set Default
                  </button>
                )}
                <button
                  onClick={() => handleEdit(account)}
                  className="btn btn-outline flex-1 flex items-center justify-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(account)}
                  className="btn btn-outline text-red-600 hover:bg-red-50 p-2"
                  disabled={account.is_default}
                  title={account.is_default ? "Cannot delete default account" : "Delete account"}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Account Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-screen overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">
                  {editingAccount ? 'Edit Account' : 'Add New Account'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingAccount(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Account Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="input w-full"
                  placeholder="e.g., Main Checking, Cash Wallet"
                  required
                />
              </div>

              {/* Account Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="input w-full"
                >
                  {ACCOUNT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Initial Balance */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editingAccount ? 'Current Balance' : 'Initial Balance'}
                </label>
                <input
                  type="number"
                  value={formData.balance}
                  onChange={(e) => setFormData(prev => ({ ...prev, balance: e.target.value }))}
                  className="input w-full"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Currency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  className="input w-full"
                >
                  <option value="SLL">SLL - Sierra Leone Leone</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="NGN">NGN - Nigerian Naira</option>
                </select>
              </div>

              {/* Icon Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Icon
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {ACCOUNT_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, icon }))}
                      className={`p-3 text-xl rounded-lg border-2 transition-colors select-none ${
                        formData.icon === icon 
                          ? 'border-primary-500 bg-primary-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      style={{ 
                        fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif',
                        lineHeight: '1',
                        textAlign: 'center' as const
                      }}
                      role="img"
                      aria-label={`Select ${icon} icon`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Color
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {ACCOUNT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        formData.color === color 
                          ? 'border-gray-400 scale-110' 
                          : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Default Account */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={formData.is_default}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="is_default" className="text-sm text-gray-700">
                    Set as default account
                  </label>
                </div>
                <p className="text-xs text-gray-500">
                  The default account will be preselected for transactions and used for quick actions.
                </p>
              </div>

              {/* Form Actions */}
              <div className="flex gap-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingAccount(null);
                    resetForm();
                  }}
                  className="btn btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                >
                  {editingAccount ? 'Update Account' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}