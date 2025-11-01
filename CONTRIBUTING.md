# Contributing to BudgetMate

Thank you for your interest in contributing to BudgetMate! We welcome contributions from the community.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/budgetmate.git`
3. Create a feature branch: `git checkout -b feature/amazing-feature`
4. Make your changes
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## Development Setup

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+ (for local development)
- Git

### Local Development

1. Install dependencies:
```bash
# Backend
cd api && npm install

# Frontend
cd web && npm install
```

2. Set up environment variables:
```bash
# Backend
cp api/.env.example api/.env

# Frontend
cp web/.env.example web/.env
```

3. Run database migrations:
```bash
cd api
npm run prisma:migrate
npm run prisma:seed
```

4. Start development servers:
```bash
# Backend (Terminal 1)
cd api && npm run dev

# Frontend (Terminal 2)
cd web && npm run dev
```

## Code Style

- We use ESLint and Prettier for code formatting
- Run `npm run lint` before committing
- Follow the existing code style
- Write meaningful commit messages

## Pull Request Guidelines

- Keep PRs focused on a single feature or bug fix
- Update documentation if needed
- Add tests for new features
- Ensure all tests pass
- Update the CHANGELOG.md

## Reporting Issues

- Use the GitHub issue tracker
- Provide a clear description
- Include steps to reproduce
- Add screenshots if applicable

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Help others learn and grow

## Questions?

Feel free to open an issue or reach out to the maintainers.

Thank you for contributing! 🦁
