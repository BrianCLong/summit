# Finance Normalizer Service

Financial data normalization and flow analysis service for the IntelGraph platform.

## Overview

The Finance Normalizer Service provides:

- **Data Ingestion**: Parse and normalize financial data from multiple formats (CSV, SWIFT MT940/MT942/MT103, bank APIs)
- **Canonical Schema**: Transform heterogeneous financial data into a unified canonical format
- **Flow Analysis**: Detect patterns like fan-in/fan-out, structuring, rapid movement, and circular flows
- **Query APIs**: Query transactions, flows between counterparties, and detected patterns

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build

# Start with Docker
docker-compose up -d
```

## API Endpoints

### Import & Normalization

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/import/formats` | List supported import formats |
| POST | `/api/v1/import/ledger` | Start ledger import job |
| POST | `/api/v1/import/normalize` | Normalize single transaction |
| POST | `/api/v1/import/validate` | Validate data without importing |
| GET | `/api/v1/import/jobs` | List import jobs |
| GET | `/api/v1/import/jobs/:id` | Get import job status |

### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/transactions` | List transactions |
| GET | `/api/v1/transactions/:id` | Get transaction by ID |

### Flow Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/flows/query` | Query flows between entities |
| GET | `/api/v1/flows/between` | Shorthand flow query |
| GET | `/api/v1/flows/patterns` | Get detected patterns |
| POST | `/api/v1/flows/analyze` | Analyze transactions for patterns |
| POST | `/api/v1/flows/aggregate` | Build aggregated flows |

### Parties & Accounts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/parties/search` | Search parties |
| GET | `/api/v1/parties/:id` | Get party by ID |
| GET | `/api/v1/parties/:id/transactions` | Get party's transactions |
| GET | `/api/v1/parties/:id/counterparties` | Get party's counterparties |
| GET | `/api/v1/accounts` | List accounts |
| GET | `/api/v1/accounts/:id` | Get account by ID |
| GET | `/api/v1/accounts/:id/transactions` | Get account transactions |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Basic health check |
| GET | `/health/live` | Liveness probe |
| GET | `/health/ready` | Readiness probe |
| GET | `/health/detailed` | Detailed health status |

## Supported Import Formats

| Format | Description |
|--------|-------------|
| `CSV` | Comma/semicolon/tab-delimited files |
| `SWIFT_MT940` | SWIFT bank statement format |
| `SWIFT_MT942` | SWIFT interim transaction report |
| `SWIFT_MT103` | SWIFT single customer credit transfer |
| `JSON` | Generic bank API JSON format |

## Canonical Schema

### Transaction
- Amount stored as minor units (cents) using BigInt for precision
- Separate value date and posting date
- Full party and account linkage
- Provenance tracking for audit

### Party
- Normalized canonical name
- Multiple identifier types (LEI, BIC, DUNS, etc.)
- Risk classification and PEP/sanctions flags

### Account
- Multi-currency support
- Balance tracking
- Institution linkage

### Flow Pattern
- Pattern types: FAN_IN, FAN_OUT, STRUCTURING, RAPID_MOVEMENT, CIRCULAR
- Confidence scoring
- Review workflow support

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4200 | Service port |
| `POSTGRES_HOST` | localhost | Database host |
| `POSTGRES_DB` | intelgraph | Database name |
| `STRUCTURING_THRESHOLD_CENTS` | 1000000 | Pattern detection threshold |
| `PATTERN_TIME_WINDOW_HOURS` | 24 | Time window for pattern detection |

## Development

```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint

# Run specific test file
pnpm test src/__tests__/parsers/csv.test.ts

# Test coverage
pnpm test:coverage

# Database migration
pnpm db:migrate
```

## Architecture

```
src/
├── index.ts              # Application entry point
├── middleware/           # Express middleware
│   ├── audit.ts          # Audit logging
│   ├── errorHandler.ts   # Error handling
│   ├── rateLimiter.ts    # Rate limiting
│   ├── requestLogger.ts  # Request logging
│   └── tenant.ts         # Multi-tenancy
├── parsers/              # Data parsers
│   ├── csv.ts            # CSV parser
│   ├── swift.ts          # SWIFT MT parser
│   ├── bankApi.ts        # Bank API parser
│   └── utils.ts          # Parser utilities
├── routes/               # API routes
│   ├── accounts.ts
│   ├── flows.ts
│   ├── health.ts
│   ├── import.ts
│   ├── parties.ts
│   └── transactions.ts
├── services/             # Business logic
│   ├── FlowDetectionService.ts
│   ├── NormalizationService.ts
│   └── QueryService.ts
└── utils/                # Shared utilities
    ├── db.ts             # Database connection
    └── logger.ts         # Logging
```

## License

Proprietary - IntelGraph Platform
