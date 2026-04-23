# WSO2 API Manager 4.6 — Multi-Tenant API Marketplace

A production-grade multi-tenant API marketplace built on WSO2 API Manager 4.6.0.
Two tenant organisations (finance.com and logistics.com) share one WSO2 APIM instance
with complete isolation of users, roles, APIs, and Developer Portal experiences.

## Architecture

- **TenantA (finance.com)** — Invoice API (port 4001), Payment API (port 4002)
- **TenantB (logistics.com)** — Shipment API (port 4003), Route API (port 4004)
- **WSO2 APIM 4.6.0** — Publisher, Dev Portal, Admin, Carbon Console (port 9443)
- **API Gateway** — OAuth2 validation, throttling, mediation (port 8243)
- **Docker Compose** — 4 Node.js/Express backends with static JSON

## Tech Stack

| Component | Technology |
|---|---|
| API Manager | WSO2 APIM 4.6.0 |
| Backend services | Node.js 20 + Express |
| Containerisation | Docker Compose |
| OS | WSL2 Ubuntu 22.04 |
| CLI | apictl v4.6.0 |
| API Spec | OpenAPI 3.0.0 |

## Quick Start

```bash
# Start Docker backends
cd project2-multitenant
docker compose up -d

# Verify all services
curl http://localhost:4001/health
curl http://localhost:4002/health
curl http://localhost:4003/health
curl http://localhost:4004/health

# Get TenantA OAuth2 token
curl -k -X POST https://localhost:9443/oauth2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=<CLIENT_ID>&client_secret=<CLIENT_SECRET>&scope=invoice:read"

# Call Invoice API
curl -k -H "Authorization: Bearer <TOKEN>" \
  https://localhost:8243/t/finance.com/invoices/1.0/invoices
```

## Gateway URLs

| API | URL |
|---|---|
| Invoice API | https://localhost:8243/t/finance.com/invoices/1.0/invoices |
| Payment API | https://localhost:8243/t/finance.com/paymentapi/1.0/payments |
| Shipment API | https://localhost:8243/t/logistics.com/shipmentapi/1.0/shipments |
| Route API | https://localhost:8243/t/logistics.com/routeapi/1.0/routes |

## WSO2 Error Codes

| Code | HTTP | Meaning |
|---|---|---|
| 900901 | 401 | Invalid/expired token |
| 900902 | 401 | Missing Authorization header |
| 900910 | 403 | Scope validation failed |
| 900908 | 401 | Resource not found / not subscribed |

## Certification

This project covers 88% of the WSO2 API Manager Practitioner V4 exam domains.

## Author

Ankith — Quadgen Wireless Solutions
