# BudgetMate Setup Script for Windows
# This script sets up the development environment

Write-Host "🦁 BudgetMate Setup Script" -ForegroundColor Green
Write-Host "==========================" -ForegroundColor Green
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js $nodeVersion detected" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js 18+ first." -ForegroundColor Red
    exit 1
}

# Check if Docker is installed
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker $dockerVersion detected" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Docker is not installed. Docker is optional but recommended." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
Write-Host ""

# Install backend dependencies
Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
Set-Location api
npm install
Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
Write-Host ""

# Install frontend dependencies
Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
Set-Location ..\web
npm install
Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
Write-Host ""

Set-Location ..

# Setup environment files
Write-Host "🔧 Setting up environment files..." -ForegroundColor Cyan

if (-not (Test-Path "api\.env")) {
    Copy-Item "api\.env.example" "api\.env"
    Write-Host "✅ Created api\.env" -ForegroundColor Green
} else {
    Write-Host "⚠️  api\.env already exists, skipping..." -ForegroundColor Yellow
}

if (-not (Test-Path "web\.env")) {
    Copy-Item "web\.env.example" "web\.env"
    Write-Host "✅ Created web\.env" -ForegroundColor Green
} else {
    Write-Host "⚠️  web\.env already exists, skipping..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Update api\.env with your database credentials"
Write-Host "2. Run 'docker-compose up -d' to start all services"
Write-Host "   OR"
Write-Host "   - Start PostgreSQL and Redis manually"
Write-Host "   - Run 'cd api; npm run prisma:migrate' to setup database"
Write-Host "   - Run 'cd api; npm run prisma:seed' to seed demo data"
Write-Host "   - Run 'cd api; npm run dev' to start backend"
Write-Host "   - Run 'cd web; npm run dev' to start frontend"
Write-Host ""
Write-Host "📚 Check README.md for more information" -ForegroundColor Cyan
Write-Host ""
Write-Host "Demo credentials:" -ForegroundColor Yellow
Write-Host "  Email: demo@budgetmate.com"
Write-Host "  Password: Demo@123"
Write-Host ""
