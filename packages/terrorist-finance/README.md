# Terrorist Finance Package

Comprehensive terrorist financing tracking and analysis for disrupting financial support networks.

## Features

- **Financial Entity Tracking**: Monitor individuals, organizations, and businesses
- **Transaction Monitoring**: Track suspicious financial transactions
- **Hawala Network Detection**: Identify informal value transfer systems
- **Cryptocurrency Tracking**: Monitor crypto-based financing
- **Front Company Identification**: Identify shell companies and fronts
- **Charity Monitoring**: Detect charity abuse and diversion
- **Criminal Revenue Tracking**: Monitor extortion, kidnapping, and trafficking
- **State Sponsor Analysis**: Track state-sponsored support
- **Asset Freeze Coordination**: Manage asset freezing operations
- **Sanction Enforcement**: Track and enforce sanctions
- **Money Laundering Detection**: Identify laundering schemes

## Usage

```typescript
import { FinanceTracker } from '@intelgraph/terrorist-finance';

const tracker = new FinanceTracker();

// Track entity
await tracker.trackEntity({
  id: 'entity-001',
  type: 'ORGANIZATION',
  name: 'Example Org',
  identifiers: [],
  status: 'ACTIVE',
  sanctioned: false,
  riskScore: 0.8
});

// Record transaction
await tracker.recordTransaction({
  id: 'tx-001',
  from: 'entity-001',
  to: 'entity-002',
  amount: 50000,
  currency: 'USD',
  date: new Date(),
  method: 'HAWALA',
  suspicious: true,
  flagged: true
});

// Get funding sources
const sources = await tracker.getFundingSources('entity-001');
```

## License

MIT
