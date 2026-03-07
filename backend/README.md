# CoverAI Backend — NestJS InsurTech Platform

A production-ready NestJS backend for the CoverAI InsurTech platform, designed for the Nigerian market with pan-African scalability.

---

## 🏗️ Architecture

```
src/
├── auth/                    # JWT authentication, refresh tokens, password reset
├── users/                   # User profile management
├── sme/                     # SME business profiles
├── insurance-providers/     # Provider onboarding & API integration
├── insurance-products/      # Product catalog
├── policies/                # Policy purchase & lifecycle management
├── payments/                # Paystack payment integration
├── claims/                  # Claims submission & processing
├── commissions/             # Commission tracking & reporting
├── chat/                    # OpenAI-powered AI assistant (ARIA)
├── notifications/           # Email (Nodemailer) + SMS notifications
├── partners/                # Embedded Insurance API (partner API keys)
├── admin/                   # Back-office admin endpoints
├── files/                   # S3-compatible file upload service
├── common/                  # Decorators, guards, filters, interceptors
└── config/                  # Environment configuration
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+

### 1. Clone & Install

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Start Services (Docker)

```bash
docker-compose up -d postgres redis
```

### 4. Run Database Schema

```bash
psql -U postgres -d coverai_db -f src/database/schema.sql
```

### 5. Start Development Server

```bash
npm run start:dev
```

API: `http://localhost:3000/api/v1`  
Swagger: `http://localhost:3000/api/docs`

---

## 🔑 Authentication

All protected endpoints require a Bearer JWT token:

```
Authorization: Bearer <access_token>
```

Partner API endpoints use API key header:

```
x-api-key: ck_your_partner_api_key
```

---

## 📡 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register user |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/logout` | Logout |
| POST | `/api/v1/auth/refresh-token` | Refresh JWT |
| POST | `/api/v1/auth/forgot-password` | Request reset link |
| POST | `/api/v1/auth/reset-password` | Reset with token |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users/profile` | Get profile |
| PATCH | `/api/v1/users/profile` | Update profile |
| POST | `/api/v1/users/change-password` | Change password |

### Policies
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/policies/purchase` | Purchase policy |
| GET | `/api/v1/policies` | My policies |
| GET | `/api/v1/policies/:id` | Policy details |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/payments/create` | Initialize Paystack payment |
| POST | `/api/v1/payments/webhook` | Paystack webhook |
| GET | `/api/v1/payments/verify/:ref` | Verify payment |
| GET | `/api/v1/payments/history` | Payment history |

### Claims
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/claims` | Submit claim |
| GET | `/api/v1/claims` | My claims |
| GET | `/api/v1/claims/:id` | Claim details |

### AI Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/chat` | Chat with ARIA (public) |
| GET | `/api/v1/chat/history` | Chat history |

### Admin (Admin role only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/users` | All users |
| GET | `/api/v1/admin/claims` | All claims |
| POST | `/api/v1/admin/claims/:id/approve` | Approve/reject claim |
| GET | `/api/v1/admin/analytics/dashboard` | KPI dashboard |
| GET | `/api/v1/admin/analytics/revenue` | Revenue report |

### Partner API
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/partner/create-policy` | Create policy for user |
| GET | `/api/v1/partner/policies/:userId` | Get user policies |
| POST | `/api/v1/partner/claims` | Submit claim for user |

---

## 💳 Payment Flow

```
Frontend → POST /payments/create
         ← { authorizationUrl, reference }

Frontend → Redirect to Paystack authorizationUrl

Paystack → POST /payments/webhook (charge.success)
         → Policy activated automatically
         → User notified via email
```

---

## 🤖 AI Assistant (ARIA)

The chat endpoint uses GPT-4 with a Nigerian insurance-specific system prompt.

**Session continuity**: Pass `sessionId` to maintain conversation history.

```json
POST /api/v1/chat
{
  "message": "What insurance does a Lagos restaurant need?",
  "sessionId": "optional-session-uuid"
}
```

---

## 👤 User Roles

| Role | Access |
|------|--------|
| `consumer` | Policies, claims, payments, chat |
| `sme_owner` | All consumer + SME profile |
| `insurance_partner` | Provider-specific management |
| `admin` | Full platform access |

---

## 🏭 Production Deployment

```bash
# Build
npm run build

# Docker
docker-compose up -d

# Environment variables required in production:
# - All DB_* variables
# - JWT_SECRET (min 32 chars, cryptographically random)
# - JWT_REFRESH_SECRET
# - PAYSTACK_SECRET_KEY
# - OPENAI_API_KEY
# - AWS_* credentials
```

---

## 🔒 Security Features

- ✅ bcrypt password hashing (12 salt rounds)
- ✅ JWT access tokens (15 min expiry)
- ✅ Refresh token rotation with hash storage
- ✅ Role-based access control (RBAC)
- ✅ Helmet.js HTTP security headers
- ✅ Rate limiting (throttler)
- ✅ Input validation (class-validator)
- ✅ Paystack webhook signature verification
- ✅ Partner API key authentication
- ✅ CORS configuration

---

## 🌍 Scaling to Africa

The platform is built to expand beyond Nigeria:
- Currency field on payments (default `NGN`, supports `GHS`, `KES`, `ZAR`, etc.)
- Provider `api_base_url` per country
- User `phone` supports international format
- All amounts in base currency (no hardcoded ₦ in backend)
