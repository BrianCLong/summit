# Summit Multi-Product Architecture

## Core Principle
One verification engine → Seven product APIs → Unified billing/auth

## Directory Structure
/api/verification/    # Core (shared)
/api/factflow/        # Product 1
/api/factlaw/         # Product 2
/api/factmarkets/     # Product 3
/api/factapi/         # Product 4
/api/factcert/        # Product 5
/api/factdatasets/    # Product 6
/api/factgov/         # Product 7

## Shared Services
- Auth: JWT via Auth0
- Billing: Stripe Connect
- Cache: Redis
- DB: PostgreSQL (multi-tenant via schema-per-customer)
