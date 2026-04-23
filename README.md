# 🏢 WSO2 APIM — Multi-Tenant API Marketplace

<div align="center">

![WSO2](https://img.shields.io/badge/WSO2_APIM-4.6.0-FF6B00?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyUzYuNDggMjIgMTIgMjIgMjIgMTcuNTIgMjIgMTIgMTcuNTIgMiAxMiAyWk0xMSAxN1Y3bDYgNS02IDV6Ii8+PC9zdmc+)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![OpenAPI](https://img.shields.io/badge/OpenAPI-3.0-6BA539?style=for-the-badge&logo=openapiinitiative&logoColor=white)
![WSL2](https://img.shields.io/badge/WSL2-Ubuntu_22.04-E95420?style=for-the-badge&logo=ubuntu&logoColor=white)

**A production-grade multi-tenant API gateway built on WSO2 API Manager 4.6.0**

*Two isolated tenant organisations sharing one APIM instance — complete with OAuth2 security, custom mediation, rate limiting, CI/CD, and Dev Portal theming.*

[Architecture](#architecture) • [Quick Start](#quick-start) • [API Reference](#api-reference) • [Security](#security-model) 
</div>

---

## 📐 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              WSO2 APIM 4.6 — Control Plane  :9443               │
│  ┌──────────┐  ┌────────────┐  ┌────────┐  ┌───────────────┐   │
│  │Publisher │  │ Dev Portal │  │ Admin  │  │Carbon Console │   │
│  └──────────┘  └────────────┘  └────────┘  └───────────────┘   │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│              API Gateway  :8243 (HTTPS) / :8280 (HTTP)          │
│        OAuth2 validation · Throttling · Mediation · Routing     │
└──────────────────┬──────────────────────┬───────────────────────┘
                   │                      │
    ┌──────────────▼──────────┐  ┌────────▼────────────────┐
    │  TenantA — finance.com  │  │ TenantB — logistics.com  │
    │  ┌─────────────────┐    │  │  ┌──────────────────┐    │
    │  │  Invoice API    │    │  │  │  Shipment API    │    │
    │  │  Node.js :4001  │    │  │  │  Node.js :4003   │    │
    │  ├─────────────────┤    │  │  ├──────────────────┤    │
    │  │  Payment API    │    │  │  │  Route API       │    │
    │  │  Node.js :4002  │    │  │  │  Node.js :4004   │    │
    │  └─────────────────┘    │  │  └──────────────────┘    │
    └─────────────────────────┘  └──────────────────────────┘
```

---

## 🧰 Tech Stack

| Layer | Technology | Version |
|---|---|---|
| API Manager | WSO2 APIM | 4.6.0 |
| Backend Services | Node.js + Express | v20 |
| Containerisation | Docker Compose | v2.x |
| Runtime OS | WSL2 Ubuntu | 22.04 LTS |
| CLI Tool | apictl (WSO2 API Controller) | v4.6.0 |
| API Specification | OpenAPI | 3.0.0 |

---

## 🚀 Quick Start

### Prerequisites

- WSO2 APIM 4.6.0 installed and running on port `9443`
- Docker Desktop with WSL2 integration enabled
- Node.js v18+ and npm

### 1. Start backend services

```bash
git clone https://github.com/DevJarvis11/WSO2-APIM-Multitenant-Marketplace.git
cd WSO2-APIM-Multitenant-Marketplace

docker compose up -d --build
```

### 2. Verify all backends are healthy

```bash
for port in 4001 4002 4003 4004; do
  echo -n "Port $port: "
  curl -s http://localhost:$port/health | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])"
done
```

Expected output:
```
Port 4001: UP
Port 4002: UP
Port 4003: UP
Port 4004: UP
```

### 3. Get an OAuth2 token

```bash
curl -k -X POST https://localhost:9443/oauth2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=<YOUR_CLIENT_ID>" \
  -d "client_secret=<YOUR_CLIENT_SECRET>" \
  -d "scope=invoice:read payment:read"
```

### 4. Call APIs through the gateway

```bash
export TOKEN="<your-access-token>"

# TenantA — Invoice API
curl -k -H "Authorization: Bearer $TOKEN" \
  https://localhost:8243/t/finance.com/invoices/1.0/invoices

# TenantA — Payment API
curl -k -H "Authorization: Bearer $TOKEN" \
  https://localhost:8243/t/finance.com/paymentapi/1.0/payments
```

---

## 📡 API Reference

### TenantA — finance.com

| API | Context | Port | Visibility | Scopes |
|---|---|---|---|---|
| Invoice API | `/invoices` | 4001 | Restricted | `invoice:read`, `invoice:write` |
| Payment API | `/paymentapi` | 4002 | Public | `payment:read`, `payment:write` |

**Gateway base URL:** `https://localhost:8243/t/finance.com`

```
GET  /invoices/1.0/invoices          → list all invoices
GET  /invoices/1.0/invoices/{id}     → get invoice by ID
POST /invoices/1.0/invoices          → create invoice

GET  /paymentapi/1.0/payments        → list all payments
GET  /paymentapi/1.0/payments/{id}   → get payment by ID
POST /paymentapi/1.0/payments        → create payment
```

### TenantB — logistics.com

| API | Context | Port | Visibility | Scopes |
|---|---|---|---|---|
| Shipment API | `/shipmentapi` | 4003 | Restricted | `shipment:read`, `shipment:write` |
| Route API | `/routeapi` | 4004 | Public | `route:read` |

**Gateway base URL:** `https://localhost:8243/t/logistics.com`

```
GET  /shipmentapi/1.0/shipments      → list all shipments
GET  /shipmentapi/1.0/shipments/{id} → get shipment by ID
POST /shipmentapi/1.0/shipments      → create shipment

GET  /routeapi/1.0/routes            → list all routes
GET  /routeapi/1.0/routes/{id}       → get route by ID
```

---

## 🔐 Security Model

This project implements OAuth2 Client Credentials flow with scope-based access control.

```
Client App
    │
    ▼
POST /oauth2/token
    │  grant_type=client_credentials
    │  client_id + client_secret
    │  scope=invoice:read
    │
    ▼
WSO2 Identity Server validates credentials
    │
    ▼
JWT Token issued (expires in 1 hour)
    │  contains: sub, scope, aud, exp, iss
    │
    ▼
Client calls API Gateway with Bearer token
    │
    ▼  Checks in order:
    ├── ① JWT signature + expiry     → 900901 if invalid
    ├── ② Authorization header       → 900902 if missing
    ├── ③ Scope matches resource     → 900910 if mismatch  ← Key exam concept
    ├── ④ App subscription active    → 900908 if not found
    └── ⑤ Rate limit not exceeded   → 429 if over limit
    │
    ▼
Backend receives request with X-Tenant-ID header (injected by mediation)
```

### WSO2 Error Code Reference

| Code | HTTP Status | Meaning | When It Occurs |
|---|---|---|---|
| `900901` | 401 | Invalid credentials | Expired or malformed JWT token |
| `900902` | 401 | Missing credentials | No Authorization header |
| `900906` | 403 | Resource forbidden | API Restricted, client lacks role |
| `900908` | 401 | Resource not found | Wrong context path or not subscribed |
| `900910` | 403 | **Scope validation failed** | Token scope ≠ resource scope |
| `900912` | 429 | Throttle limit exceeded | Advanced policy triggered |
| `900914` | 401 | Key type mismatch | Sandbox key on production endpoint |

---

## 🏗️ Project Structure

```
WSO2-APIM-Multitenant-Marketplace/
│
├── tenantA-finance/
│   ├── invoice-service/          # Invoice CRUD — port 4001
│   │   ├── index.js
│   │   ├── package.json
│   │   └── Dockerfile
│   └── payment-service/          # Payment CRUD — port 4002
│       ├── index.js
│       ├── package.json
│       └── Dockerfile
│
├── tenantB-logistics/
│   ├── shipment-service/         # Shipment CRUD — port 4003
│   │   ├── index.js
│   │   ├── package.json
│   │   └── Dockerfile
│   └── route-service/            # Route read-only — port 4004
│       ├── index.js
│       ├── package.json
│       └── Dockerfile
│
├── api-definitions/
│   ├── invoice-api.yaml          # OpenAPI 3.0 spec
│   ├── payment-api.yaml
│   ├── shipment-api.yaml
│   └── route-api.yaml
│
├── apictl/
│   └── deploy.sh                 # CI/CD script using apictl
│
├── docker-compose.yml
└── README.md
```

---

## ⚙️ WSO2 Portal Access

| Portal | URL | Purpose |
|---|---|---|
| Publisher | `https://localhost:9443/publisher` | Create & manage APIs |
| Dev Portal (TenantA) | `https://localhost:9443/devportal?tenant=finance.com` | Subscribe & consume |
| Dev Portal (TenantB) | `https://localhost:9443/devportal?tenant=logistics.com` | Subscribe & consume |
| Admin Portal | `https://localhost:9443/admin` | Throttling & workflow |
| Carbon Console | `https://localhost:9443/carbon` | Tenants, users & roles |

---

## 📋 Features Implemented

- ✅ **Multi-tenancy** — two isolated tenant orgs on one APIM instance
- ✅ **OAuth2 + JWT** — client credentials flow with scope enforcement
- ✅ **API Lifecycle** — CREATED → PUBLISHED with revisions and rollback
- ✅ **API Visibility** — Restricted and Public visibility per tenant
- ✅ **Publisher Access Control** — tenant publishers isolated from each other
- ✅ **Custom Throttle Tiers** — FinanceGold, FinanceSilver, LogisticsPremium, DevTest
- ✅ **Advanced Throttle Policy** — header-based conditional rate limiting
- ✅ **IP Deny Policy** — block specific IPs at gateway level
- ✅ **Custom Mediation** — Synapse XML injects X-Tenant-ID header per request
- ✅ **Dev Portal Theming** — custom dark blue branding for TenantA portal
- ✅ **Workflow Approvals** — application creation requires admin approval
- ✅ **Monetisation Metadata** — billing plan mapping per subscription tier
- ✅ **Wire Log Debugging** — raw HTTP exchange logging for troubleshooting
- ✅ **apictl CI/CD** — export/import APIs programmatically via CLI

---

## 🔧 apictl CI/CD

```bash
# Register WSO2 environment
apictl add env local --apim https://localhost:9443

# Login as tenant admin
apictl login finance-local -u financead@finance.com -p <password> -k

# List tenant APIs
apictl get apis -e finance-local -k

# Export API as portable ZIP artifact
apictl export api --name InvoiceAPI --version 1.0 \
  --provider alice@finance.com --environment finance-local -k

# Import/deploy API (CI/CD step)
apictl import api -f ./api-definitions/invoice-api.yaml \
  -e finance-local -k --update
```

---

