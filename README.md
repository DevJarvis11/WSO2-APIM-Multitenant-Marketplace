# 🏢 WSO2 APIM — Multi-Tenant API Marketplace

<div align="center">

![WSO2](https://img.shields.io/badge/WSO2_APIM-4.6.0-FF6B00?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![OpenAPI](https://img.shields.io/badge/OpenAPI-3.0-6BA539?style=for-the-badge)
![WSL2](https://img.shields.io/badge/WSL2-Ubuntu_22.04-E95420?style=for-the-badge&logo=ubuntu&logoColor=white)
![Choreo](https://img.shields.io/badge/Choreo-Analytics-6B2FD9?style=for-the-badge)

**A production-grade multi-tenant API gateway built on WSO2 API Manager 4.6.0**

*Two isolated tenant organisations sharing one APIM instance — complete with OAuth2 security, custom mediation, rate limiting, CI/CD, Choreo analytics, and a real-time operations dashboard.*

[Architecture](#architecture) • [Quick Start](#quick-start) • [API Reference](#api-reference) • [Dashboard](#live-ops-dashboard) • [Security](#security-model)

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
    │  Invoice API  :4001     │  │  Shipment API  :4003     │
    │  Payment API  :4002     │  │  Route API     :4004     │
    └─────────────────────────┘  └──────────────────────────┘
              │                              │
              └──────────────┬───────────────┘
                             ▼
              ┌──────────────────────────┐
              │  Dashboard Server :5000  │
              │  WSO2 REST API Proxy     │
              │  WSO2 Log Parser (SSE)   │
              │  Backend Metrics Agg.    │
              └──────────────┬───────────┘
                             ▼
              ┌──────────────────────────┐
              │  Choreo Analytics Cloud  │
              │  Real-time API insights  │
              └──────────────────────────┘
```

---

## 🧰 Tech Stack

| Layer | Technology | Version |
|---|---|---|
| API Manager | WSO2 APIM | 4.6.0 |
| Backend Services | Node.js + Express | v20 Alpine |
| Containerisation | Docker Compose | v2.x |
| Runtime OS | WSL2 Ubuntu | 22.04 LTS |
| CLI Tool | apictl | v4.6.0 |
| API Specification | OpenAPI | 3.0.0 |
| Analytics | Choreo Cloud | On-prem key |
| Dashboard | Node.js + Vanilla JS | Express :5000 |
| CI/CD | GitHub Actions | Self-hosted runner |
| Linting | Spectral | CLI v6.x |

---

## 🚀 Quick Start

### Prerequisites

- WSO2 APIM 4.6.0 at `~/wso2am-4.6.0/`
- Docker Desktop with WSL2 integration
- Node.js v18+ and npm

### 1. Start all services

```bash
# Start WSO2
~/wso2am-4.6.0/bin/api-manager.sh start

# Start backend services
cd ~/project2-multitenant
docker compose up -d

# Start dashboard (requires GitHub PAT for CI/CD page)
cd dashboard
GITHUB_TOKEN="your_pat_here" node server.js &
```

### 2. Verify everything is healthy

```bash
curl -k https://localhost:9443/services/Version   # WSO2 version
curl http://localhost:5000/api/health             # All 4 backends
```

### 3. Open the dashboard

```
http://localhost:5000
```

### 4. Get a token and call an API

```bash
TOKEN=$(curl -s -k -X POST "https://localhost:9443/oauth2/token" \
  -H "Authorization: Basic $(echo -n 'y0m_BwegSfeqfXcDXX3zi22QvWIa:011B0fWLqGkSq2umtnqdUzz_E6Ua' | base64)" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&scope=invoice:read" \
  | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

curl -k "https://localhost:8243/t/finance.com/invoices/1.0/invoices" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📡 API Reference

### TenantA — finance.com

**Gateway base:** `https://localhost:8243/t/finance.com`

| Method | Path | Scope | Description |
|---|---|---|---|
| GET | `/invoices/1.0/invoices` | `invoice:read` | List invoices |
| GET | `/invoices/1.0/invoices/{id}` | `invoice:read` | Get invoice |
| POST | `/invoices/1.0/invoices` | `invoice:write` | Create invoice |
| GET | `/paymentapi/1.0/payments` | `payment:read` | List payments |
| POST | `/paymentapi/1.0/payments` | `payment:write` | Process payment |

### TenantB — logistics.com

**Gateway base:** `https://localhost:8243/t/logistics.com`

| Method | Path | Scope | Description |
|---|---|---|---|
| GET | `/shipmentapi/1.0/shipments` | `shipment:read` | List shipments |
| POST | `/shipmentapi/1.0/shipments` | `shipment:write` | Create shipment |
| GET | `/routeapi/1.0/routes` | `route:read` | List routes |

---

## 📊 Live Ops Dashboard

Real-time NOC-style dashboard at `http://localhost:5000`.

| Page | What's Real |
|---|---|
| **Live Operations** | RPS, P95, error rate, health grid, response code donut, event feed |
| **Analytics** | P50/P95/P99 per API, call volume chart, performance table |
| **API Registry** | Live from WSO2 Publisher (both tenants) |
| **Publish API** | Creates real API in WSO2 via 4-step wizard |
| **API Tester** | Real OAuth2 tokens + real gateway requests |
| **Live Logs** | WSO2 `wso2carbon.log` via SSE stream |
| **CI/CD Pipeline** | GitHub Actions run history, job statuses, trigger button |
| **Notifications** | Real WSO2 auth failure events |

### Dashboard Proxy Endpoints

```
GET  /api/health                → backend metrics (calls, p95, errors)
GET  /api/apis                  → WSO2 Publisher APIs (both tenants)
POST /api/apis                  → create API in WSO2
POST /api/token                 → OAuth2 proxy
GET  /api/logs/stream           → SSE real-time WSO2 logs
GET  /api/gateway/statuscodes   → 200/401/403/429 from log parser
GET  /api/pipeline/runs         → GitHub Actions history
POST /api/pipeline/trigger      → trigger workflow dispatch
GET  /api/notifications         → real gateway event notifications
```

---

## 🔐 Security Model

OAuth2 Client Credentials with scope enforcement at gateway level.

### WSO2 Error Codes

| Code | HTTP | Meaning |
|---|---|---|
| `900901` | 401 | Invalid/expired token |
| `900902` | 401 | Missing credentials |
| `900906` | 403 | Resource forbidden |
| `900910` | 403 | **Scope validation failed** |
| `900912` | 429 | Throttle limit exceeded |
| `900914` | 401 | Key type mismatch |

---

## 🏗️ Project Structure

```
project2-multitenant/
├── tenantA-finance/
│   ├── invoice-service/          # :4001 — /_metrics included
│   └── payment-service/          # :4002 — /_metrics included
├── tenantB-logistics/
│   ├── shipment-service/         # :4003 — /_metrics included
│   └── route-service/            # :4004 — /_metrics included
├── api-definitions/              # OpenAPI 3.0 YAMLs
├── dashboard/
│   ├── server.js                 # Express proxy + log parser
│   └── public/index.html         # NOC dashboard (2400+ lines)
├── .github/workflows/
│   └── deploy-apis.yml           # 5-job CI/CD pipeline
├── .spectral.yaml                # OpenAPI linting rules
├── docker-compose.yml
└── ecosystem.config.js
```

---

## 🔄 CI/CD Pipeline

5-job GitHub Actions pipeline on self-hosted WSL2 runner:

```
① Lint OpenAPI (Spectral)
② Deploy TenantA  ←→  ③ Deploy TenantB  (parallel)
④ Post-Deploy Smoke Test
⑤ Slack Notification
```

---

## 📈 Choreo Analytics

Real API events flowing to Choreo cloud.

```toml
[apim.analytics]
enable = true
config_endpoint = "https://analytics-event-auth.choreo.dev/auth/v1"
auth_token = "your-on-prem-key"
```

View at: `https://console.choreo.dev` → Insights → Usage

---

## ✅ Features Implemented

- Multi-tenancy — two isolated orgs on one APIM instance
- OAuth2 + JWT — client credentials with scope enforcement
- API Lifecycle — CREATED → PUBLISHED with revisions
- Custom Throttle Tiers — FinanceGold, FinanceSilver, LogisticsPremium, DevTest
- IP Deny Policy — gateway-level IP blacklisting
- Custom Mediation — X-Tenant-ID header injection via Synapse
- Dev Portal Theming — custom branding per tenant
- apictl CI/CD — 5-job GitHub Actions pipeline
- Spectral Linting — custom OpenAPI ruleset
- Backend Metrics Middleware — `/_metrics` on all 4 services
- Real-time NOC Dashboard — 2400+ lines, single HTML file
- WSO2 Log Parser — SSE stream from `wso2carbon.log`
- Choreo Analytics — real events via on-prem key
- GitHub Actions Integration — real run history in dashboard

---

## License

MIT — see [LICENSE](LICENSE)
