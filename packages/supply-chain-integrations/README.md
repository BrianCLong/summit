# @intelgraph/supply-chain-integrations

Integration adapters for external systems and data providers.

## Features

- **ERP Integration**: SAP, Oracle, Microsoft Dynamics, NetSuite
- **Carrier Integration**: FedEx, UPS, DHL, Maersk, MSC
- **Threat Intelligence**: Recorded Future, ThreatConnect, Anomali
- **ESG Ratings**: MSCI, Sustainalytics, Refinitiv

## Installation

```bash
pnpm add @intelgraph/supply-chain-integrations
```

## Usage

### ERP Integration

```typescript
import { ERPAdapter } from '@intelgraph/supply-chain-integrations';

const erp = new ERPAdapter({
  apiUrl: 'https://erp.company.com/api',
  apiKey: 'your-api-key',
  company: 'ACME Corp',
  environment: 'production',
});

// Sync suppliers
const suppliers = await erp.syncSuppliers();

// Sync purchase orders
const orders = await erp.syncPurchaseOrders({
  from: new Date('2024-01-01'),
  to: new Date('2024-12-31'),
});

// Sync inventory
const inventory = await erp.syncInventory();

// Create purchase requisition
const pr = await erp.createPurchaseRequisition({
  componentId: 'COMP-123',
  quantity: 1000,
  requiredDate: new Date('2024-06-01'),
  justification: 'Safety stock replenishment',
});
```

### Carrier Integration

```typescript
import { CarrierAdapter } from '@intelgraph/supply-chain-integrations';

const carrier = new CarrierAdapter({
  carrier: 'fedex',
  accountNumber: '123456789',
  apiKey: 'your-api-key',
});

// Track shipment
const tracking = await carrier.trackShipment('TRACKING-123');
console.log(`Status: ${tracking.currentStatus}`);

// Get shipping rates
const rates = await carrier.getRates({
  origin: { country: 'US', postalCode: '10001' },
  destination: { country: 'CN', postalCode: '200000' },
  weight: 10,
  weightUnit: 'kg',
});

// Create shipment
const shipment = await carrier.createShipment({
  origin: { /* ... */ },
  destination: { /* ... */ },
  packages: [{ /* ... */ }],
  serviceType: 'express',
});
```

### Threat Intelligence

```typescript
import { ThreatIntelAdapter } from '@intelgraph/supply-chain-integrations';

const threatIntel = new ThreatIntelAdapter({
  provider: 'recorded-future',
  apiKey: 'your-api-key',
});

// Get active threats
const threats = await threatIntel.getActiveThreats({
  type: ['geopolitical', 'cyber'],
  severity: ['high', 'critical'],
  regions: ['Asia'],
});

// Get country risk score
const riskScore = await threatIntel.getCountryRiskScore('China');
console.log(`Risk Level: ${riskScore.riskLevel}`);

// Monitor entity
const monitoring = await threatIntel.monitorEntity({
  name: 'ACME Supplier',
  type: 'company',
});
```

### ESG Ratings

```typescript
import { ESGRatingAdapter } from '@intelgraph/supply-chain-integrations';

const esgProvider = new ESGRatingAdapter({
  provider: 'msci',
  apiKey: 'your-api-key',
});

// Get ESG score
const esgScore = await esgProvider.getESGScore({
  ticker: 'AAPL',
});

console.log(`Overall Score: ${esgScore.overallScore}`);
console.log(`Environmental: ${esgScore.environmentalScore}`);
console.log(`Social: ${esgScore.socialScore}`);
console.log(`Governance: ${esgScore.governanceScore}`);

// Get controversies
const controversies = await esgProvider.getControversies({
  ticker: 'AAPL',
});

// Get industry benchmarks
const benchmarks = await esgProvider.getIndustryBenchmarks('Technology');
```

## Supported Providers

### ERP Systems
- SAP
- Oracle ERP Cloud
- Microsoft Dynamics 365
- NetSuite
- Infor
- Epicor
- Custom REST APIs

### Carriers
- FedEx
- UPS
- DHL
- Maersk
- MSC
- CMA CGM
- COSCO
- Custom carrier APIs

### Threat Intelligence
- Recorded Future
- ThreatConnect
- Anomali
- Flashpoint
- RiskIQ
- Custom threat feeds

### ESG Rating Providers
- MSCI
- Sustainalytics
- Refinitiv
- S&P Global
- Bloomberg ESG
- Custom ESG data sources

## Configuration

Each adapter requires specific configuration. Refer to the individual adapter documentation for details.

## License

Proprietary - IntelGraph
