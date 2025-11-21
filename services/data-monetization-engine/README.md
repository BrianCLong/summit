# Data Monetization Engine

Full-Spectrum Automated Data Monetization Engine - An AI-powered system for identifying, packaging, and marketing data assets with automated compliance checks and contract generation.

## Features

### Core Capabilities

- **Automated Data Asset Discovery**: Scan databases, APIs, file systems, streams, and cloud storage to identify monetizable data assets
- **Multi-Framework Compliance Checking**: Validate data against GDPR, CCPA, HIPAA, SOC2, ISO27001, FedRAMP, PCI-DSS, LGPD, and PIPEDA
- **AI-Powered Valuation**: Estimate fair market value using multiple factors (uniqueness, freshness, completeness, accuracy, volume, demand, compliance)
- **Automated Contract Generation**: Create legally-compliant data licensing agreements with GDPR clauses and digital signatures
- **Data Marketplace**: Manage listings, transactions, ratings, and revenue analytics

### Services

| Service | Description |
|---------|-------------|
| `AssetDiscoveryService` | Discovers and catalogs data assets from connected sources |
| `ComplianceService` | Performs multi-framework compliance validation with PII detection |
| `ValuationService` | AI-powered asset valuation with pricing recommendations |
| `ContractService` | Generates and manages data licensing contracts |
| `MarketplaceService` | Handles marketplace listings, transactions, and analytics |

## Quick Start

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Start development server
npm run dev

# Start production server
npm start
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /health/ready` | Readiness check (includes database) |
| `GET /metrics` | Prometheus metrics |
| `GET /api/info` | Service information |
| `POST /graphql` | GraphQL API |

## GraphQL API

### Queries

```graphql
# Get data assets
dataAssets(limit: Int, offset: Int): [DataAsset!]!
dataAsset(id: ID!): DataAsset

# Get compliance checks
assetComplianceChecks(assetId: ID!): [ComplianceCheck!]!
supportedFrameworks: [ComplianceFramework!]!

# Get data products
dataProducts(limit: Int, offset: Int): [DataProduct!]!
dataProduct(id: ID!): DataProduct

# Get contracts
contracts(status: ContractStatus, limit: Int, offset: Int): [DataContract!]!
contract(id: ID!): DataContract

# Search marketplace
searchListings(input: MarketplaceSearchInput!): MarketplaceSearchResult!
featuredListings(limit: Int): [MarketplaceListing!]!

# Get valuation
valuation(assetId: ID!): DataValuation

# Get revenue report
revenueReport(startDate: DateTime!, endDate: DateTime!): RevenueReport!
```

### Mutations

```graphql
# Data Assets
createDataAsset(input: CreateDataAssetInput!): DataAsset!
discoverAssets(sources: [DiscoverySourceInput!]!): [DataAsset!]!

# Compliance
runComplianceCheck(input: ComplianceCheckInput!): [ComplianceCheck!]!

# Products
createDataProduct(input: CreateDataProductInput!): DataProduct!
publishDataProduct(id: ID!): DataProduct!

# Contracts
generateContract(input: CreateContractInput!): DataContract!
signContract(contractId: ID!, party: String!, signedBy: String!): DataContract!

# Marketplace
createListing(input: CreateListingInput!): MarketplaceListing!
publishListing(id: ID!): MarketplaceListing!
purchaseProduct(listingId: ID!, contractId: ID!): Transaction!

# Valuation
valuateAsset(assetId: ID!): DataValuation!
```

## Compliance Frameworks

| Framework | Description |
|-----------|-------------|
| GDPR | EU General Data Protection Regulation |
| CCPA | California Consumer Privacy Act |
| HIPAA | Health Insurance Portability and Accountability Act |
| SOC2 | Service Organization Control 2 |
| ISO27001 | Information Security Management |
| FedRAMP | Federal Risk and Authorization Management Program |
| PCI-DSS | Payment Card Industry Data Security Standard |
| LGPD | Brazil General Data Protection Law |
| PIPEDA | Personal Information Protection (Canada) |

## Environment Variables

```env
PORT=4100
NODE_ENV=development
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=intelgraph
POSTGRES_USER=intelgraph
POSTGRES_PASSWORD=password
ALLOWED_ORIGINS=http://localhost:3000
LOG_LEVEL=info
```

## Architecture

```
src/
├── index.ts                 # Entry point
├── db/
│   └── postgres.ts         # PostgreSQL connection
├── graphql/
│   ├── schema.ts           # GraphQL type definitions
│   └── resolvers/
│       └── index.ts        # GraphQL resolvers
├── services/
│   ├── AssetDiscoveryService.ts
│   ├── ComplianceService.ts
│   ├── ContractService.ts
│   ├── MarketplaceService.ts
│   └── ValuationService.ts
├── utils/
│   └── logger.ts           # Pino logger
└── __tests__/              # Unit tests
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage
```

## License

MIT
