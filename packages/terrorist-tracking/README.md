# Terrorist Tracking Package

Comprehensive terrorist organization monitoring and tracking system for intelligence analysis and counterterrorism operations.

## Features

- **Organization Tracking**: Monitor known terrorist groups, their leadership, and hierarchies
- **Network Analysis**: Analyze connections and relationships between organizations
- **Financing Tracking**: Track funding sources and financial networks
- **Recruitment Monitoring**: Monitor recruitment tactics and networks
- **Facility Identification**: Track training camps, safe houses, and operational centers
- **Supply Network Analysis**: Monitor supply chains and logistics
- **Timeline Management**: Track organizational evolution and significant events

## Usage

```typescript
import { OrganizationTracker, NetworkAnalyzer } from '@intelgraph/terrorist-tracking';

// Initialize tracker
const tracker = new OrganizationTracker();

// Track an organization
await tracker.trackOrganization({
  id: 'org-001',
  name: 'Example Organization',
  aliases: ['Alias 1', 'Alias 2'],
  type: OrganizationType.PRIMARY,
  ideology: [Ideology.RELIGIOUS_EXTREMISM],
  operatingRegions: ['Region A', 'Region B'],
  status: OrganizationStatus.ACTIVE,
  affiliates: [],
  metadata: {}
});

// Query organizations
const results = await tracker.queryOrganizations({
  regions: ['Region A'],
  status: [OrganizationStatus.ACTIVE]
});

// Analyze network
const analyzer = new NetworkAnalyzer();
const network = await analyzer.buildNetwork(results.organizations);
const keyNodes = analyzer.identifyKeyNodes(network);
```

## Security & Compliance

This package is designed for authorized law enforcement and intelligence use only:

- Complies with applicable counterterrorism laws and regulations
- Includes audit logging for all operations
- Respects human rights and legal compliance requirements
- Designed for defensive security purposes only

## License

MIT
