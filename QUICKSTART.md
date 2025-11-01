# 🚀 BudgetMate Quick Start Guide

Get BudgetMate up and running in minutes!

## Prerequisites

Before you begin, ensure you have:
- ✅ Node.js 18+ installed ([Download](https://nodejs.org/))
- ✅ Docker Desktop installed ([Download](https://www.docker.com/products/docker-desktop/))
- ✅ Git installed

## Option 1: Docker Setup (Recommended) ⚡

The fastest way to get started!

### Step 1: Clone the Repository

```bash
git clone https://github.com/liontek-global/budgetmate.git
cd budgetmate
```

### Step 2: Start All Services

```bash
docker-compose up -d
```

This single command will:
- Start PostgreSQL database
- Start Redis cache
- Build and start the API server
- Build and start the web application
- Configure Nginx reverse proxy

### Step 3: Access the Application

Open your browser and navigate to:
- **Web App**: http://localhost
- **API**: http://localhost/api
- **Health Check**: http://localhost/health

### Step 4: Login with Demo Account

```
Email: demo@budgetmate.com
Password: Demo@123
```

### Useful Docker Commands

```bash
# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build

# View running containers
docker-compose ps

# Access database
docker-compose exec db psql -U budgetmate -d budgetmate
```

---

## Option 2: Local Development Setup 💻

For active development with hot-reload.

### Step 1: Clone and Install

```bash
git clone https://github.com/liontek-global/budgetmate.git
cd budgetmate

# Run setup script
# Windows PowerShell:
.\setup.ps1

# Linux/Mac:
chmod +x setup.sh
./setup.sh
```

### Step 2: Configure Environment

Edit `api/.env`:
```env
DATABASE_URL=postgresql://budgetmate:budgetmate123@localhost:5432/budgetmate
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-here
```

Edit `web/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

### Step 3: Start Database Services

**Option A: Using Docker**
```bash
docker-compose up -d db redis
```

**Option B: Manual Installation**
- Install PostgreSQL 15+ and create a database named `budgetmate`
- Install Redis

### Step 4: Setup Database

```bash
cd api

# Run migrations
npm run prisma:migrate

# Seed demo data
npm run prisma:seed
```

### Step 5: Start Development Servers

**Terminal 1 - Backend:**
```bash
cd api
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd web
npm run dev
```

### Step 6: Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api
- **API Health**: http://localhost:5000/health

---

## 🎯 What's Next?

Now that BudgetMate is running, try these features:

### 1. Explore the Dashboard
- View your financial summary
- Check income vs expenses
- Monitor your savings rate

### 2. Add Transactions
- Click "Add Transaction" on the dashboard
- Record income or expenses
- Categorize your transactions

### 3. Create Budgets
- Navigate to the Budgets page
- Set monthly spending limits
- Track your progress

### 4. Generate Reports
- View spending trends
- Export data as CSV
- Analyze your finances

---

## 🔧 Troubleshooting

### Port Already in Use

If you see "port already in use" errors:

```bash
# Check what's using the port
# Windows:
netstat -ano | findstr :5000

# Linux/Mac:
lsof -i :5000

# Change ports in docker-compose.yml or .env files
```

### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker-compose ps

# View database logs
docker-compose logs db

# Restart database
docker-compose restart db
```

### API Not Responding

```bash
# Check API logs
docker-compose logs api

# Restart API
docker-compose restart api

# Check if migrations ran
docker-compose exec api npm run prisma:migrate
```

### Frontend Build Errors

```bash
cd web

# Clear node_modules and reinstall
rm -rf node_modules
npm install

# Clear build cache
rm -rf dist
npm run build
```

---

## 📚 Additional Resources

- **Full Documentation**: See [README.md](README.md)
- **API Documentation**: http://localhost:5000/api (when running)
- **Contributing**: See [CONTRIBUTING.md](CONTRIBUTING.md)
- **Issues**: [GitHub Issues](https://github.com/liontek-global/budgetmate/issues)

---

## 🆘 Need Help?

- 💬 Open an issue on GitHub
- 📧 Email: support@liontek.global
- 📖 Check the full README.md

---

## 🎉 Success!

You're now ready to track your finances with BudgetMate!

**Demo Credentials:**
- Email: `demo@budgetmate.com`
- Password: `Demo@123`

Happy budgeting! 🦁💰
