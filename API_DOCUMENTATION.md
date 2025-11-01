# 📚 BudgetMate API Documentation

Base URL: `http://localhost:5000/api`

## Authentication

All endpoints except `/auth/signup`, `/auth/login`, and `/auth/refresh` require authentication.

Include the JWT token in the Authorization header:
```
Authorization: Bearer <access_token>
```

---

## 🔐 Authentication Endpoints

### POST /auth/signup
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+23276123456",
  "currency": "SLL",
  "timezone": "Africa/Freetown"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "currency": "SLL",
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

### POST /auth/login
Login to existing account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { /* user object */ },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

### POST /auth/refresh
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "refresh_token"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "new_jwt_token"
  }
}
```

### POST /auth/logout
Logout and revoke refresh token.

**Request Body:**
```json
{
  "refreshToken": "refresh_token"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET /auth/me
Get current user profile. (Requires authentication)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "phone": "+23276123456",
      "first_name": "John",
      "last_name": "Doe",
      "currency": "SLL",
      "timezone": "Africa/Freetown",
      "created_at": "2024-01-01T00:00:00.000Z",
      "last_login": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

---

## 💰 Account Endpoints

### GET /accounts
List all accounts for the authenticated user.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accounts": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "name": "Cash Wallet",
        "type": "cash",
        "balance": "500000.00",
        "currency": "SLL",
        "icon": "wallet",
        "color": "#10B981",
        "is_default": true,
        "created_at": "2024-01-01T00:00:00.000Z",
        "updated_at": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

### GET /accounts/:id
Get single account details.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "account": { /* account object */ }
  }
}
```

### POST /accounts
Create a new account.

**Request Body:**
```json
{
  "name": "GTBank Savings",
  "type": "bank",
  "balance": 1000000,
  "currency": "SLL",
  "icon": "credit-card",
  "color": "#3B82F6",
  "is_default": false
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "account": { /* account object */ }
  }
}
```

### PUT /accounts/:id
Update an account.

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Name",
  "balance": 2000000,
  "is_default": true
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Account updated successfully",
  "data": {
    "account": { /* updated account */ }
  }
}
```

### DELETE /accounts/:id
Delete an account.

**Response (200):**
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

---

## 📁 Category Endpoints

### GET /categories
List all categories. Optional query parameter: `type` (income/expense)

**Query Parameters:**
- `type` (optional): Filter by "income" or "expense"

**Response (200):**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "name": "Salary",
        "type": "income",
        "icon": "briefcase",
        "color": "#10B981",
        "is_default": true,
        "created_at": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

### POST /categories
Create a new category.

**Request Body:**
```json
{
  "name": "Freelance Work",
  "type": "income",
  "icon": "code",
  "color": "#8B5CF6"
}
```

### PUT /categories/:id
Update a category.

### DELETE /categories/:id
Delete a category.

---

## 💸 Transaction Endpoints

### GET /transactions
List transactions with optional filters and pagination.

**Query Parameters:**
- `type`: "income" or "expense"
- `account_id`: Filter by account
- `category_id`: Filter by category
- `start_date`: ISO date string
- `end_date`: ISO date string
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50, max: 100)
- `sort`: "asc" or "desc" (default: "desc")

**Response (200):**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "account_id": "uuid",
        "category_id": "uuid",
        "amount": "50000.00",
        "type": "expense",
        "description": "Lunch at restaurant",
        "tx_date": "2024-01-15T00:00:00.000Z",
        "mode": "cash",
        "reference": null,
        "notes": null,
        "created_at": "2024-01-15T00:00:00.000Z",
        "account": {
          "id": "uuid",
          "name": "Cash Wallet",
          "type": "cash"
        },
        "category": {
          "id": "uuid",
          "name": "Food & Dining",
          "icon": "coffee",
          "color": "#EF4444"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 100,
      "totalPages": 2
    }
  }
}
```

### GET /transactions/:id
Get single transaction details.

### POST /transactions
Create a new transaction.

**Request Body:**
```json
{
  "account_id": "uuid",
  "category_id": "uuid",
  "amount": 50000,
  "type": "expense",
  "description": "Grocery shopping",
  "tx_date": "2024-01-15",
  "mode": "card",
  "reference": "TXN123456",
  "notes": "Weekly groceries"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Transaction created successfully",
  "data": {
    "transaction": { /* transaction object */ }
  }
}
```

### PUT /transactions/:id
Update a transaction.

### DELETE /transactions/:id
Delete a transaction.

---

## 🎯 Budget Endpoints

### GET /budgets
List budgets with optional filters.

**Query Parameters:**
- `month`: Month number (1-12)
- `year`: Year (e.g., 2024)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "budgets": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "category_id": "uuid",
        "limit_amount": "500000.00",
        "period_month": 1,
        "period_year": 2024,
        "alert_threshold": "80.00",
        "status": "active",
        "created_at": "2024-01-01T00:00:00.000Z",
        "category": {
          "id": "uuid",
          "name": "Food & Dining",
          "icon": "coffee",
          "color": "#EF4444"
        },
        "spent": 250000,
        "remaining": 250000,
        "percentage": 50
      }
    ]
  }
}
```

### GET /budgets/:id
Get budget with spending progress.

### POST /budgets
Create a new budget.

**Request Body:**
```json
{
  "category_id": "uuid",
  "limit_amount": 500000,
  "period_month": 1,
  "period_year": 2024,
  "alert_threshold": 80
}
```

### PUT /budgets/:id
Update a budget.

### DELETE /budgets/:id
Delete a budget.

---

## 📊 Report Endpoints

### GET /reports/summary
Get monthly financial summary.

**Query Parameters:**
- `month`: Month number (default: current month)
- `year`: Year (default: current year)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "period": {
        "month": 1,
        "year": 2024
      },
      "income": {
        "total": 3000000,
        "count": 5
      },
      "expense": {
        "total": 1500000,
        "count": 25
      },
      "balance": 1500000,
      "savingsRate": "50.00"
    },
    "categoryBreakdown": [
      {
        "category_id": "uuid",
        "category_name": "Food & Dining",
        "icon": "coffee",
        "color": "#EF4444",
        "type": "expense",
        "total": 250000,
        "count": 10
      }
    ]
  }
}
```

### GET /reports/trends
Get spending trends over multiple months.

**Query Parameters:**
- `months`: Number of months (default: 6)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "trends": [
      {
        "month": 1,
        "year": 2024,
        "income": 3000000,
        "expense": 1500000,
        "balance": 1500000
      }
    ]
  }
}
```

### GET /reports/export
Export transactions as CSV or JSON.

**Query Parameters:**
- `format`: "csv" or "json" (default: "csv")
- `start_date`: ISO date string
- `end_date`: ISO date string

**Response (200):**
- CSV file download or JSON data

---

## 👤 User Endpoints

### PUT /users/profile
Update user profile.

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+23276123456",
  "currency": "NGN",
  "timezone": "Africa/Lagos"
}
```

### PUT /users/password
Change password.

**Request Body:**
```json
{
  "current_password": "OldPass123!",
  "new_password": "NewPass123!"
}
```

### DELETE /users/account
Delete user account (irreversible).

---

## ⚠️ Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error message here",
  "errors": [ /* optional validation errors */ ]
}
```

**Common Status Codes:**
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/expired token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error

---

## 🔒 Rate Limiting

- General API: 100 requests per 15 minutes
- Auth endpoints: 5 requests per 15 minutes

When rate limited, you'll receive a `429` status code.

---

## 💡 Best Practices

1. **Always handle token refresh**: Implement automatic token refresh on 401 errors
2. **Use pagination**: Don't fetch all records at once
3. **Filter data**: Use query parameters to reduce payload size
4. **Cache responses**: Cache GET requests when appropriate
5. **Handle errors gracefully**: Always check the `success` field
6. **Validate input**: Validate data on client-side before sending

---

## 🧪 Testing with cURL

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@budgetmate.com","password":"Demo@123"}'

# Get transactions (with auth)
curl -X GET http://localhost:5000/api/transactions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

For more information, see the [README.md](README.md) or [QUICKSTART.md](QUICKSTART.md).
