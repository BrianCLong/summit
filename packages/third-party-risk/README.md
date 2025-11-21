# @intelgraph/third-party-risk

Third-party vendor risk management and monitoring.

## Features

- Vendor onboarding workflows
- Continuous vendor monitoring
- Fourth-party (sub-supplier) risk assessment
- Contract compliance tracking
- Due diligence automation
- SLA performance monitoring

## Installation

```bash
pnpm add @intelgraph/third-party-risk
```

## Usage

```typescript
import { ThirdPartyRiskManager } from '@intelgraph/third-party-risk';

const manager = new ThirdPartyRiskManager();

// Initiate vendor onboarding
const onboarding = manager.initiateOnboarding(vendorId, 'ACME Corp');

// Conduct assessment
const assessment = await manager.conductAssessment(vendor, 'initial-onboarding');
console.log(`Recommendation: ${assessment.recommendation}`);

// Monitor vendor
const monitoring = await manager.monitorVendor(vendorId, config);
console.log(`Status: ${monitoring.status}`);

// Track contract compliance
const compliance = manager.trackContractCompliance(contract, performance);
console.log(`Compliant: ${compliance.compliant}`);
```

## License

Proprietary - IntelGraph
