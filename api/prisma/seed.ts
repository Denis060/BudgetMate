/**
 * Database Seed Script
 * Creates sample data for development and testing
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create demo user
  const passwordHash = await bcrypt.hash('Demo@123', 10);
  
  const demoUser = await prisma.users.upsert({
    where: { email: 'demo@budgetmate.com' },
    update: {},
    create: {
      email: 'demo@budgetmate.com',
      password_hash: passwordHash,
      first_name: 'Demo',
      last_name: 'User',
      currency: 'SLL',
      timezone: 'Africa/Freetown',
    },
  });

  console.log('✅ Demo user created:', demoUser.email);

  // Create default categories
  const categories = [
    // Income
    { name: 'Salary', type: 'income', icon: 'briefcase', color: '#10B981' },
    { name: 'Business', type: 'income', icon: 'trending-up', color: '#3B82F6' },
    { name: 'Freelance', type: 'income', icon: 'code', color: '#8B5CF6' },
    { name: 'Investment', type: 'income', icon: 'dollar-sign', color: '#F59E0B' },
    { name: 'Other Income', type: 'income', icon: 'plus-circle', color: '#6B7280' },
    
    // Expenses
    { name: 'Food & Dining', type: 'expense', icon: 'coffee', color: '#EF4444' },
    { name: 'Transport', type: 'expense', icon: 'truck', color: '#F97316' },
    { name: 'Shopping', type: 'expense', icon: 'shopping-bag', color: '#EC4899' },
    { name: 'Bills & Utilities', type: 'expense', icon: 'file-text', color: '#14B8A6' },
    { name: 'Entertainment', type: 'expense', icon: 'film', color: '#A855F7' },
    { name: 'Health', type: 'expense', icon: 'heart', color: '#EF4444' },
    { name: 'Education', type: 'expense', icon: 'book', color: '#3B82F6' },
    { name: 'Other Expense', type: 'expense', icon: 'minus-circle', color: '#6B7280' },
  ];

  for (const cat of categories) {
    const existing = await prisma.categories.findFirst({
      where: {
        user_id: demoUser.id,
        name: cat.name,
      },
    });

    if (!existing) {
      await prisma.categories.create({
        data: {
          user_id: demoUser.id,
          ...cat,
          is_default: true,
        },
      });
    }
  }

  console.log('✅ Categories created');

  // Create sample accounts
  const cashAccount = await prisma.accounts.create({
    data: {
      user_id: demoUser.id,
      name: 'Cash Wallet',
      type: 'cash',
      balance: 500000,
      currency: 'SLL',
      icon: 'wallet',
      color: '#10B981',
      is_default: true,
    },
  });

  const bankAccount = await prisma.accounts.create({
    data: {
      user_id: demoUser.id,
      name: 'GTBank Savings',
      type: 'bank',
      balance: 2500000,
      currency: 'SLL',
      icon: 'credit-card',
      color: '#3B82F6',
    },
  });

  const mobileAccount = await prisma.accounts.create({
    data: {
      user_id: demoUser.id,
      name: 'Orange Money',
      type: 'mobile_money',
      balance: 150000,
      currency: 'SLL',
      icon: 'smartphone',
      color: '#F97316',
    },
  });

  console.log('✅ Accounts created');

  // Get categories for transactions
  const salaryCategory = await prisma.categories.findFirst({
    where: { user_id: demoUser.id, name: 'Salary' },
  });

  const foodCategory = await prisma.categories.findFirst({
    where: { user_id: demoUser.id, name: 'Food & Dining' },
  });

  const transportCategory = await prisma.categories.findFirst({
    where: { user_id: demoUser.id, name: 'Transport' },
  });

  // Create sample transactions
  const now = new Date();
  
  // Income transactions
  await prisma.transactions.create({
    data: {
      user_id: demoUser.id,
      account_id: bankAccount.id,
      category_id: salaryCategory?.id,
      amount: 3000000,
      type: 'income',
      description: 'Monthly salary',
      tx_date: new Date(now.getFullYear(), now.getMonth(), 1),
      mode: 'transfer',
    },
  });

  // Expense transactions
  await prisma.transactions.create({
    data: {
      user_id: demoUser.id,
      account_id: cashAccount.id,
      category_id: foodCategory?.id,
      amount: 50000,
      type: 'expense',
      description: 'Lunch at restaurant',
      tx_date: new Date(now.getFullYear(), now.getMonth(), 5),
      mode: 'cash',
    },
  });

  await prisma.transactions.create({
    data: {
      user_id: demoUser.id,
      account_id: mobileAccount.id,
      category_id: transportCategory?.id,
      amount: 25000,
      type: 'expense',
      description: 'Taxi fare',
      tx_date: new Date(now.getFullYear(), now.getMonth(), 7),
      mode: 'mobile_money',
    },
  });

  console.log('✅ Transactions created');

  // Create sample budget
  if (foodCategory) {
    await prisma.budgets.create({
      data: {
        user_id: demoUser.id,
        category_id: foodCategory.id,
        limit_amount: 500000,
        period_month: now.getMonth() + 1,
        period_year: now.getFullYear(),
        alert_threshold: 80,
      },
    });
  }

  console.log('✅ Budget created');
  console.log('🎉 Database seeded successfully!');
  console.log('\n📧 Demo credentials:');
  console.log('   Email: demo@budgetmate.com');
  console.log('   Password: Demo@123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
