# Financial Compliance Module

A comprehensive financial compliance, surveillance, risk analytics, fraud detection, and regulatory reporting module for the Summit platform.

## Overview

This module provides enterprise-grade financial compliance capabilities for:

- **Trade Surveillance** - Real-time monitoring for market manipulation (wash trading, spoofing, layering)
- **Risk Analytics** - Portfolio VaR, stress testing, counterparty and liquidity risk
- **Fraud Detection** - AML/KYC, transaction monitoring, sanctions screening
- **Market Data** - Security master, corporate actions, execution quality (TCA)
- **Regulatory Reporting** - CAT, TRACE, Form PF, MiFID II, SAR/CTR

## Quick Start

```typescript
import { createFinancialServices } from './financial';
import { Pool } from 'pg';

const pg = new Pool({ connectionString: process.env.DATABASE_URL });
const services = createFinancialServices(pg);

// Analyze a trade for compliance violations
const alerts = await services.surveillance.analyzeTrade(trade);

// Calculate portfolio risk metrics
const risk = await services.risk.calculatePortfolioRisk(tenantId, portfolioId);

// Screen a transaction for fraud
const fraudAlerts = await services.fraud.analyzeTransaction(transaction);

// Generate regulatory reports
const catReport = await services.reporting.generateCATReport(tenantId, reportDate);
```

## Services

### Trade Surveillance Service

Monitors trading activity for regulatory violations and market manipulation.

**Capabilities:**
- Wash trading detection
- Layering/spoofing detection
- Restricted list enforcement
- Position limit monitoring
- Unusual volume detection
- Best execution analysis
- Cross-account pattern analysis

```typescript
// Real-time trade analysis
const alerts = await services.surveillance.analyzeTrade(trade);

// Pre-trade order analysis
const orderAlerts = await services.surveillance.analyzeOrder(order);

// End-of-day analysis
const eodAlerts = await services.surveillance.runEndOfDayAnalysis(tenantId, date);

// Manage restricted list
await services.surveillance.addToRestrictedList(tenantId, 'AAPL', 'Pending M&A', userId);
```

### Risk Analytics Service

Comprehensive portfolio and counterparty risk analytics.

**Capabilities:**
- Value at Risk (VaR) - Historical simulation, 95% and 99% confidence
- Conditional VaR (Expected Shortfall)
- Sharpe/Sortino ratios
- Maximum drawdown
- Beta and Alpha
- Concentration risk (Herfindahl Index)
- Stress testing (historical and hypothetical scenarios)
- Counterparty credit risk
- Liquidity risk assessment

```typescript
// Calculate portfolio risk
const portfolioRisk = await services.risk.calculatePortfolioRisk(tenantId, portfolioId);
// Returns: VaR, CVaR, Sharpe, Sortino, Beta, Alpha, stress test results

// Calculate counterparty risk
const cpRisk = await services.risk.calculateCounterpartyRisk(tenantId, counterpartyId);
// Returns: PD, EAD, LGD, Expected Loss, utilization

// Calculate liquidity risk
const liquidityRisk = await services.risk.calculateLiquidityRisk(tenantId, portfolioId);
// Returns: liquidity score, days to liquidate, market impact
```

### Fraud Detection Service

AML/KYC compliance and transaction monitoring.

**Capabilities:**
- Structuring (smurfing) detection
- Velocity anomaly detection
- Geographic risk screening
- Behavior change detection
- Sanctions screening (OFAC, EU)
- PEP screening
- Adverse media screening
- KYC profile management
- AML case management
- SAR filing

```typescript
// Analyze transaction
const alerts = await services.fraud.analyzeTransaction(transaction);

// KYC screening
const profile = await services.fraud.performKYCScreening(tenantId, customerId, customerData);

// Create AML case
const amlCase = await services.fraud.createAMLCase(tenantId, customerId, alertIds, investigator);

// File SAR
const { sarReferenceNumber } = await services.fraud.fileSAR(caseId, userId, sarData);
```

### Market Data Service

Market data management and execution quality analytics.

**Capabilities:**
- Real-time market data ingestion
- VWAP/TWAP calculation
- Security master management
- Corporate action processing
- Transaction Cost Analysis (TCA)
- Best execution reporting

```typescript
// Ingest market data
await services.market.ingestMarketData(marketDataPoint);

// Calculate VWAP
const vwap = await services.market.calculateVWAP(symbol, startTime, endTime);

// Analyze execution quality
const tca = await services.market.analyzeExecutionQuality(trade);

// Get TCA report
const report = await services.market.getTCAReport(tenantId, portfolioId, startDate, endDate);
```

### Regulatory Reporting Service

Automated regulatory report generation and submission.

**Capabilities:**
- CAT (Consolidated Audit Trail)
- TRACE (Fixed income trade reporting)
- Form PF (SEC private fund reporting)
- MiFID II RTS 28 (Best execution reporting)
- SAR (Suspicious Activity Reports)
- CTR (Currency Transaction Reports)

```typescript
// Generate CAT report
const catReport = await services.reporting.generateCATReport(tenantId, reportDate);

// Generate TRACE report
const traceReport = await services.reporting.generateTRACEReport(tenantId, reportDate);

// Generate Form PF
const formPF = await services.reporting.generateFormPFReport(tenantId, { start, end });

// Submit report
const { success, reference } = await services.reporting.submitReport(reportId, userId);
```

## Database Schema

Run the migration to create required tables:

```bash
pnpm db:migrate
```

Or manually run:
```sql
-- See migrations/023_financial_compliance_module.ts
```

### Key Tables

| Table | Purpose |
|-------|---------|
| `trades` | Trade records |
| `orders` | Order records |
| `surveillance_alerts` | Trade surveillance alerts |
| `restricted_list` | Trading restrictions |
| `portfolio_risk_metrics` | VaR and risk calculations |
| `counterparty_risk_metrics` | Credit risk metrics |
| `fraud_alerts` | AML/fraud alerts |
| `kyc_profiles` | Customer KYC data |
| `aml_cases` | AML investigations |
| `regulatory_reports` | Report metadata |
| `cat_reports` | CAT report data |
| `trace_reports` | TRACE report data |

## Configuration

```typescript
const services = createFinancialServices(pg, {
  surveillance: {
    washTradingTimeWindowMs: 60000,    // 1 minute window
    washTradingMinTrades: 3,
    layeringCancelRatioThreshold: 0.8, // 80% cancel rate
    spoofingMinOrderSize: 10000,
    unusualVolumeMultiplier: 3,
  },
  risk: {
    varConfidenceLevels: [0.95, 0.99],
    varHorizonDays: 1,
    historicalDays: 252,
  },
  fraud: {
    structuringThreshold: 10000,
    velocityThresholdPerDay: 50000,
    geographicRiskCountries: ['IR', 'KP', 'SY', 'CU'],
  },
  reporting: {
    firmId: 'YOUR_FIRM_ID',
    reportingEntityId: 'YOUR_ENTITY_ID',
  },
});
```

## Alert Types

### Surveillance Alerts
- `wash_trading` - Offsetting trades between related accounts
- `layering` - Multiple orders at different prices with high cancel rate
- `spoofing` - Large orders quickly cancelled
- `front_running` - Trading ahead of customer orders
- `restricted_list_violation` - Trading restricted securities
- `position_limit_breach` - Exceeding position limits
- `unusual_volume` - Abnormal trading volume
- `best_execution_failure` - Poor execution vs benchmarks

### Fraud Alerts
- `structuring` - Breaking up transactions to avoid reporting
- `velocity_anomaly` - Unusual transaction frequency
- `geographic_anomaly` - High-risk jurisdiction
- `behavior_change` - Deviation from normal patterns
- `sanctions_hit` - Match on sanctions list
- `pep_match` - Politically exposed person
- `adverse_media` - Negative news coverage

## Compliance Framework

This module supports compliance with:

- **SEC** - Securities Exchange Act, Reg SHO, Reg NMS
- **FINRA** - Rules 3110, 3120, CAT, TRACE
- **FinCEN** - BSA, AML, KYC requirements
- **MiFID II** - Best execution, transaction reporting
- **OFAC** - Sanctions screening
- **GDPR** - Data privacy (audit logging)

## Testing

```bash
# Run all financial module tests
pnpm test --filter='financial'

# Run specific service tests
pnpm test surveillance
pnpm test risk
pnpm test fraud
pnpm test market
pnpm test reporting
```

## Architecture

```
financial/
├── types.ts                      # Shared type definitions
├── index.ts                      # Module exports and factory
├── surveillance/
│   └── TradeSurveillanceService.ts
├── risk/
│   └── RiskAnalyticsService.ts
├── fraud/
│   └── FraudDetectionService.ts
├── market/
│   └── MarketDataService.ts
├── reporting/
│   └── RegulatoryReportingService.ts
└── __tests__/
    └── financial-services.test.ts
```

## Security Considerations

1. **Data Access** - All services require tenant isolation
2. **Audit Logging** - All compliance actions are logged
3. **Encryption** - Sensitive data (PII, SAR) should be encrypted at rest
4. **Access Control** - Role-based access for compliance functions
5. **Data Retention** - Configurable retention per regulation requirements

## Performance

- Batch processing for end-of-day analysis
- Incremental VaR calculation
- Indexed queries for alert retrieval
- Connection pooling for database access

## License

Internal use only - Summit/IntelGraph Platform
