#!/bin/bash

# BudgetMate Setup Script
# This script sets up the development environment

set -e

echo "🦁 BudgetMate Setup Script"
echo "=========================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker is not installed. Docker is optional but recommended."
else
    echo "✅ Docker $(docker --version) detected"
fi

echo ""
echo "📦 Installing dependencies..."
echo ""

# Install backend dependencies
echo "Installing backend dependencies..."
cd api
npm install
echo "✅ Backend dependencies installed"
echo ""

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd ../web
npm install
echo "✅ Frontend dependencies installed"
echo ""

cd ..

# Setup environment files
echo "🔧 Setting up environment files..."

if [ ! -f "api/.env" ]; then
    cp api/.env.example api/.env
    echo "✅ Created api/.env"
else
    echo "⚠️  api/.env already exists, skipping..."
fi

if [ ! -f "web/.env" ]; then
    cp web/.env.example web/.env
    echo "✅ Created web/.env"
else
    echo "⚠️  web/.env already exists, skipping..."
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update api/.env with your database credentials"
echo "2. Run 'docker-compose up -d' to start all services"
echo "   OR"
echo "   - Start PostgreSQL and Redis manually"
echo "   - Run 'cd api && npm run prisma:migrate' to setup database"
echo "   - Run 'cd api && npm run prisma:seed' to seed demo data"
echo "   - Run 'cd api && npm run dev' to start backend"
echo "   - Run 'cd web && npm run dev' to start frontend"
echo ""
echo "📚 Check README.md for more information"
echo ""
echo "Demo credentials:"
echo "  Email: demo@budgetmate.com"
echo "  Password: Demo@123"
echo ""
