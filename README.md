# 🦁 BudgetMate v1.0 by LionTek Global

**Open-source personal and SME finance tracker for Africa's digital transformation**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)

## 🌟 Overview

BudgetMate is a mobile-first Progressive Web App (PWA) that helps individuals and small businesses track income, expenses, budgets, and generate financial reports. Built with modern technologies and designed for African markets with offline-first capabilities.

## ✨ Features

- 🔐 **Secure Authentication** - JWT-based auth with refresh tokens
- 💰 **Multi-Account Management** - Track cash, bank, and mobile money accounts
- 📊 **Transaction Tracking** - Add, edit, and categorize income & expenses
- 🎯 **Budget Management** - Set monthly limits and track progress
- 📈 **Reports & Analytics** - Visual charts and CSV/PDF exports
- 📱 **PWA Support** - Install on mobile, works offline
- 🌍 **Multi-Currency** - Support for African currencies (SLL, NGN, KES, etc.)

## 🏗️ Architecture

```
liontek-budgetmate/
├── api/              # Backend (Node.js + Express + Prisma)
├── web/              # Frontend (React + Vite + TailwindCSS)
├── nginx/            # Reverse proxy configuration
├── .github/          # CI/CD workflows
├── docker-compose.yml
└── README.md
```

## 🚀 Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js + TypeScript
- **Database**: PostgreSQL 15
- **ORM**: Prisma
- **Cache**: Redis
- **Auth**: JWT + bcrypt

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **State**: React Context API
- **HTTP Client**: Axios
- **PWA**: Workbox

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Web Server**: Nginx
- **CI/CD**: GitHub Actions

## 📋 Prerequisites

- Node.js 18+ and npm
- Docker & Docker Compose (for containerized setup)
- PostgreSQL 15+ (for local development)
- Git

## 🛠️ Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/liontek-global/budgetmate.git
cd liontek-budgetmate
```

### 2. Backend Setup

```bash
cd api
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

The API will run on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd web
npm install
cp .env.example .env
# Edit .env to point to your API
npm run dev
```

The web app will run on `http://localhost:5173`

## 🐳 Docker Setup (Recommended)

Run the entire stack with one command:

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379
- API on port 5000
- Web on port 5173
- Nginx on port 80

Access the app at `http://localhost`

### Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build

# Run database migrations
docker-compose exec api npm run prisma:migrate

# Access database
docker-compose exec db psql -U budgetmate -d budgetmate
```

## 📚 API Documentation

### Authentication Endpoints

```
POST   /api/auth/signup      - Create new account
POST   /api/auth/login       - Login and get tokens
POST   /api/auth/refresh     - Refresh access token
POST   /api/auth/logout      - Logout (invalidate refresh token)
GET    /api/auth/me          - Get current user profile
```

### Account Endpoints

```
GET    /api/accounts         - List all accounts
POST   /api/accounts         - Create new account
GET    /api/accounts/:id     - Get account details
PUT    /api/accounts/:id     - Update account
DELETE /api/accounts/:id     - Delete account
```

### Transaction Endpoints

```
GET    /api/transactions     - List transactions (with filters)
POST   /api/transactions     - Create transaction
GET    /api/transactions/:id - Get transaction details
PUT    /api/transactions/:id - Update transaction
DELETE /api/transactions/:id - Delete transaction
```

### Budget Endpoints

```
GET    /api/budgets          - List budgets
POST   /api/budgets          - Create budget
GET    /api/budgets/:id      - Get budget with progress
PUT    /api/budgets/:id      - Update budget
DELETE /api/budgets/:id      - Delete budget
```

### Report Endpoints

```
GET    /api/reports/summary  - Monthly income vs expense
GET    /api/reports/export   - Export CSV/PDF
GET    /api/reports/trends   - Spending trends by category
```

## 🗄️ Database Schema

See [api/prisma/schema.prisma](api/prisma/schema.prisma) for the complete schema.

Key models:
- `users` - User accounts
- `accounts` - Financial accounts (cash, bank, mobile money)
- `categories` - Transaction categories
- `transactions` - Income and expense records
- `budgets` - Monthly budget limits

## 🔒 Security Features

- Password hashing with bcrypt (10 rounds)
- JWT access tokens (15min expiry)
- JWT refresh tokens (7 days expiry)
- CORS protection
- Helmet.js security headers
- Input validation with Joi/Zod
- SQL injection protection via Prisma
- Rate limiting on auth endpoints

## 🌐 Environment Variables

### Backend (.env)

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/budgetmate
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key
CORS_ORIGIN=http://localhost:5173
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=BudgetMate
```

## 🧪 Testing

```bash
# Backend tests
cd api
npm test
npm run test:coverage

# Frontend tests
cd web
npm test
npm run test:e2e
```

## 📦 Deployment

### VPS Deployment (Ubuntu/Debian)

1. Install Docker and Docker Compose
2. Clone repository
3. Configure production environment variables
4. Run `docker-compose -f docker-compose.prod.yml up -d`
5. Set up SSL with Let's Encrypt

Detailed deployment guide: [DEPLOYMENT.md](DEPLOYMENT.md)

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built with ❤️ by LionTek Global for Africa's digital transformation.

## 📞 Support

- Documentation: [docs.liontek.global](https://docs.liontek.global)
- Issues: [GitHub Issues](https://github.com/liontek-global/budgetmate/issues)
- Email: support@liontek.global

## 🗺️ Roadmap

- [ ] Multi-tenant support
- [ ] Mobile apps (React Native)
- [ ] Recurring transactions
- [ ] Bill reminders
- [ ] Integration with African payment providers
- [ ] Advanced analytics with ML insights
- [ ] Multi-language support (English, French, Portuguese)

---

**Made in Sierra Leone 🇸🇱 | For Africa 🌍**
