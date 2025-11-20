# Cyber Threat Intelligence (CTI) System

Enterprise-grade Cyber Threat Intelligence and Attribution System for proactive threat defense.

## Overview

The CTI system provides comprehensive threat intelligence capabilities including:

- **STIX/TAXII 2.1 Protocol Support** - Standards-based threat intelligence exchange
- **MISP Platform Integration** - Connect to MISP instances for collaborative intelligence sharing
- **Multiple Feed Sources** - Ingest from commercial and open-source threat feeds
- **IoC Management** - Advanced indicator tracking with enrichment and contextualization
- **MITRE ATT&CK Integration** - Map threats to ATT&CK framework for TTP analysis
- **Threat Actor Profiling** - Build comprehensive threat actor profiles and attribution
- **Malware Analysis** - Integration with sandboxes and malware analysis platforms
- **Vulnerability Intelligence** - CVE tracking and exploit prediction
- **Threat Hunting** - Hypothesis-driven hunting workflows and analytics
- **Attribution Engine** - Multi-factor attribution using infrastructure, TTPs, and behavioral analysis
- **Intelligence Sharing** - Export and share intelligence in STIX format

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CTI System Architecture                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Threat Intelligence Sources                   │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  • TAXII Servers    • AlienVault OTX                 │  │
│  │  • MISP Platforms   • URLhaus / ThreatFox            │  │
│  │  • VirusTotal       • AbuseIPDB                      │  │
│  │  • Custom Feeds     • Recorded Future / ThreatConnect│  │
│  └─────────────────┬────────────────────────────────────┘  │
│                    │                                         │
│  ┌─────────────────▼────────────────────────────────────┐  │
│  │       Threat Feed Aggregator & Ingestion             │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  • Feed Registration & Polling                        │  │
│  │  • STIX Processing & Normalization                    │  │
│  │  • Deduplication & Correlation                        │  │
│  └─────────────────┬────────────────────────────────────┘  │
│                    │                                         │
│  ┌─────────────────▼────────────────────────────────────┐  │
│  │             Enrichment Pipeline                       │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  • Geolocation (MaxMind, ipapi)                      │  │
│  │  • Reputation (VirusTotal, AbuseIPDB)                │  │
│  │  • DNS/WHOIS Data                                     │  │
│  │  • Sandbox Analysis (Hybrid Analysis, URLScan)       │  │
│  │  • Malware Family Detection                           │  │
│  └─────────────────┬────────────────────────────────────┘  │
│                    │                                         │
│  ┌─────────────────▼────────────────────────────────────┐  │
│  │         Attribution & Analysis Engine                 │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  • TTP-based Attribution (MITRE ATT&CK)              │  │
│  │  • Infrastructure Overlap Analysis                    │  │
│  │  • Malware Family Correlation                         │  │
│  │  • Campaign Tracking                                  │  │
│  │  • Confidence Scoring                                 │  │
│  └─────────────────┬────────────────────────────────────┘  │
│                    │                                         │
│  ┌─────────────────▼────────────────────────────────────┐  │
│  │            IoC Repository & Database                  │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  • Persistent Storage                                 │  │
│  │  • Full-text Search                                   │  │
│  │  • Relationship Graphs                                │  │
│  │  • Temporal Analysis                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Components

### 1. Threat Intelligence Package (`@intelgraph/threat-intelligence`)

Core threat intelligence functionality with STIX/TAXII support.

**Key Features:**
- STIX 2.1 object processing and conversion
- TAXII 2.1 client for server connectivity
- MISP client for platform integration
- Threat feed aggregation from multiple sources
- IoC enrichment with external services
- Type-safe TypeScript implementations

**Main Services:**
- `TaxiiClient` - Connect to TAXII 2.1 servers
- `MispClient` - MISP platform integration
- `StixProcessor` - Convert STIX objects to internal format
- `ThreatFeedAggregator` - Aggregate feeds from multiple sources
- `EnrichmentService` - Enrich IoCs with additional context

### 2. MITRE ATT&CK Package (`@intelgraph/mitre-attack`)

Integration with MITRE ATT&CK framework for TTP analysis.

**Key Features:**
- Complete ATT&CK Enterprise matrix
- Technique, tactic, and group lookups
- TTP fingerprinting for attribution
- Coverage matrix generation
- Threat actor profiling

**Main Services:**
- `AttackService` - Load and query ATT&CK data
- TTP-based attribution
- Campaign correlation
- Coverage analysis

### 3. Threat Feed Ingestion Service (`@intelgraph/threat-feed-ingestion`)

Autonomous service for continuous threat intelligence ingestion.

**Key Features:**
- Automated feed polling
- Real-time processing
- Attribution analysis
- RESTful API for management
- Health monitoring

**Supported Feeds:**
- URLhaus (abuse.ch)
- ThreatFox (abuse.ch)
- AbuseIPDB
- AlienVault OTX
- MISP instances
- Custom STIX feeds

## Installation & Setup

### Prerequisites

```bash
# Install Node.js 18+ and pnpm
npm install -g pnpm

# Clone repository
cd summit/
```

### Install Dependencies

```bash
# Install workspace dependencies
pnpm install

# Build packages
pnpm -F @intelgraph/threat-intelligence build
pnpm -F @intelgraph/mitre-attack build
pnpm -F @intelgraph/threat-feed-ingestion build
```

### Configuration

Create `.env` file in `services/threat-feed-ingestion/`:

```env
# Service Configuration
PORT=3010
NODE_ENV=production

# Threat Feed APIs
VIRUSTOTAL_API_KEY=your_vt_api_key_here
ABUSEIPDB_API_KEY=your_abuseipdb_api_key_here
URLSCAN_API_KEY=your_urlscan_api_key_here
HYBRID_ANALYSIS_API_KEY=your_hybrid_api_key_here
OTX_API_KEY=your_otx_api_key_here

# MISP Configuration (if using MISP)
MISP_URL=https://your-misp-instance.com
MISP_API_KEY=your_misp_api_key_here

# TAXII Configuration (if using TAXII servers)
TAXII_SERVER_URL=https://taxii-server.com
TAXII_COLLECTION_ID=your_collection_id
TAXII_USERNAME=your_username
TAXII_PASSWORD=your_password

# Database (to be configured based on your database)
DATABASE_URL=postgresql://user:password@localhost:5432/cti
```

## Usage

### Starting the Threat Feed Ingestion Service

```bash
cd services/threat-feed-ingestion
pnpm start
```

The service will:
1. Initialize MITRE ATT&CK data
2. Register configured threat feeds
3. Start polling feeds at configured intervals
4. Process and enrich IoCs automatically
5. Perform attribution analysis
6. Store results in the database

### Using the Threat Intelligence Package

```typescript
import {
  ThreatFeedAggregator,
  EnrichmentService,
  createTaxiiClient,
  createMispClient,
} from '@intelgraph/threat-intelligence';

// Create TAXII client
const taxiiClient = createTaxiiClient({
  discoveryUrl: 'https://taxii-server.com/taxii2/',
  apiRootUrl: 'https://taxii-server.com/taxii2/api-root/',
  collectionId: 'collection-id',
  auth: {
    type: 'basic',
    credentials: {
      username: 'user',
      password: 'pass',
    },
  },
});

// Poll for new objects
const objects = await taxiiClient.poll('collection-id', since);

// Create MISP client
const mispClient = createMispClient({
  url: 'https://misp-instance.com',
  apiKey: 'api-key',
});

// Search for events
const events = await mispClient.searchEvents({
  from: '2025-01-01',
  published: true,
});

// Create enrichment service
const enrichment = new EnrichmentService({
  virustotal: { apiKey: 'vt-key', enabled: true },
  abuseipdb: { apiKey: 'abuse-key', enabled: true },
});

// Enrich an IoC
const enrichedData = await enrichment.enrichIoC(ioc);
```

### Using MITRE ATT&CK Integration

```typescript
import { AttackService } from '@intelgraph/mitre-attack';

// Initialize service
const attackService = new AttackService();
await attackService.initialize();

// Get all techniques
const techniques = attackService.getTechniques({
  tactics: ['initial-access', 'execution'],
  platforms: ['Windows'],
});

// Get threat actor groups
const groups = attackService.getGroups({
  search: 'APT',
});

// Generate TTP fingerprint
const fingerprint = attackService.generateTTPFingerprint([
  'T1566.001', // Phishing: Spearphishing Attachment
  'T1204.002', // User Execution: Malicious File
  'T1059.001', // Command and Scripting Interpreter: PowerShell
]);

console.log('Matching groups:', fingerprint.groups);
console.log('Confidence:', fingerprint.confidence);

// Build threat actor profile
const profile = attackService.buildThreatActorProfile(['G0007', 'G0016']);
```

## API Reference

### Threat Feed Ingestion Service API

#### Health Check
```
GET /health
```

#### Get Feed Statistics
```
GET /api/feeds/stats

Response:
[
  {
    "feedId": "urlhaus",
    "feedName": "URLhaus",
    "lastPoll": "2025-01-15T10:30:00Z",
    "totalFetched": 1234,
    "totalProcessed": 1230,
    "totalErrors": 4,
    "status": "active"
  }
]
```

#### Manually Trigger Feed Fetch
```
POST /api/feeds/:feedId/fetch

Response:
{
  "success": true,
  "count": 50
}
```

#### Get IoC Statistics
```
GET /api/iocs/stats

Response:
{
  "total": 10000,
  "active": 8500,
  "byType": {
    "ip": 3000,
    "domain": 2500,
    "url": 2000,
    "file_hash": 2500
  },
  "bySeverity": {
    "CRITICAL": 500,
    "HIGH": 2000,
    "MEDIUM": 5000,
    "LOW": 2500
  }
}
```

#### Search IoCs
```
GET /api/iocs/search?value=evil.com&type=domain&severity=HIGH

Response:
{
  "iocs": [...],
  "total": 100,
  "page": 1,
  "pageSize": 100,
  "hasMore": false
}
```

## Threat Feed Sources

### Supported Feed Types

| Feed | Type | Cost | Update Frequency | IoC Types |
|------|------|------|-----------------|-----------|
| URLhaus | Open | Free | Hourly | URLs, domains |
| ThreatFox | Open | Free | Hourly | IPs, domains, hashes |
| AbuseIPDB | Commercial | Freemium | 2 hours | IPs |
| AlienVault OTX | Open | Free | Hourly | All types |
| MISP | Platform | Self-hosted | Custom | All types |
| VirusTotal | Commercial | Paid | On-demand | Hashes |
| Recorded Future | Commercial | Paid | Real-time | All types |
| ThreatConnect | Commercial | Paid | Real-time | All types |

### Feed Registration

```typescript
const feedConfig = {
  id: 'custom-feed',
  name: 'Custom Threat Feed',
  type: 'stix',
  enabled: true,
  url: 'https://feed.example.com/stix-bundle.json',
  pollInterval: 3600000, // 1 hour
  priority: 8,
  tags: ['custom', 'malware'],
  tlpOverride: 'AMBER',
};

feedAggregator.registerFeed(feedConfig);
```

## Attribution Engine

The attribution engine uses multiple factors to identify threat actors:

### Attribution Factors

1. **TTP Similarity (35% weight)**
   - Match techniques against known threat actor TTPs
   - Use MITRE ATT&CK framework for correlation
   - Calculate technique overlap scores

2. **Infrastructure Overlap (20% weight)**
   - ASN clustering
   - IP geolocation patterns
   - Domain registration patterns
   - Hosting provider analysis

3. **Malware Family (25% weight)**
   - Identify malware families
   - Map to known threat actors
   - Code similarity analysis

4. **Geolocation (10% weight)**
   - Infrastructure location
   - Known actor operating regions
   - VPN/proxy detection

5. **Timing Analysis (5% weight)**
   - Activity time zones
   - Working hours patterns
   - Campaign timelines

6. **Victim Targeting (5% weight)**
   - Industry sectors
   - Geographic regions
   - Organization profiles

### Confidence Levels

- **CONFIRMED (90-100%)** - High certainty attribution
- **HIGH (70-89%)** - Strong evidence
- **MEDIUM (50-69%)** - Moderate evidence
- **LOW (30-49%)** - Weak evidence
- **UNKNOWN (<30%)** - Insufficient data

## Data Models

### IoC Structure

```typescript
interface IOC {
  id: string;
  type: IOCType; // ip, domain, url, file_hash, etc.
  value: string;
  description?: string;
  threatType: ThreatType[];
  severity: Severity;
  confidence: Confidence;
  confidenceScore: number;
  firstSeen: string;
  lastSeen: string;
  tags: string[];
  source: string;
  sources: IOCSource[];
  tlp: TLP;
  isActive: boolean;
  falsePositive: boolean;
  whitelisted: boolean;
  context: IOCContext;
  relationships: IOCRelationship[];
  sightings: IOCSighting[];
  enrichment: IOCEnrichment;
  attribution: Attribution;
  metadata: any;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  stixId?: string;
}
```

### Attribution Structure

```typescript
interface Attribution {
  actor?: string;
  actors?: string[];
  group?: string;
  groups?: string[];
  country?: string;
  countries?: string[];
  confidence: Confidence;
  confidenceScore: number;
  reasoning: string[];
  aliases?: string[];
  motivations?: string[];
  ttps?: string[];
}
```

## Integration Examples

### Threat Hunting Integration

```typescript
import { threatHuntingService } from './services/threatHuntingService';
import { ThreatFeedAggregator } from '@intelgraph/threat-intelligence';

// Create hunt based on new IoCs
feedAggregator.on('iocCreated', async (ioc) => {
  if (ioc.severity === 'CRITICAL') {
    await threatHuntingService.createThreatHunt({
      name: `Hunt for ${ioc.value}`,
      hypothesis: `Identify systems communicating with ${ioc.value}`,
      huntType: 'REACTIVE',
      priority: 'CRITICAL',
      queries: [
        {
          name: 'Network connections',
          query: `destination_ip:${ioc.value}`,
          queryType: 'ELASTICSEARCH',
          dataSource: 'network_logs',
        },
      ],
      // ... other fields
    }, 'cti-system');
  }
});
```

### SIEM Integration

```typescript
// Forward high-confidence IoCs to SIEM
feedAggregator.on('iocProcessed', async (ioc) => {
  if (ioc.confidenceScore >= 75) {
    await siemClient.createAlert({
      title: `High-confidence threat indicator: ${ioc.value}`,
      severity: ioc.severity,
      indicators: [ioc],
      attribution: ioc.attribution,
      recommendations: generateRecommendations(ioc),
    });
  }
});
```

## Performance & Scalability

### Recommended Configuration

- **Small Deployment** (< 10K IoCs/day)
  - Single service instance
  - PostgreSQL database
  - Redis cache
  - 2 CPU cores, 4GB RAM

- **Medium Deployment** (10K-100K IoCs/day)
  - 3-5 service instances (load balanced)
  - PostgreSQL with read replicas
  - Redis cluster
  - 4 CPU cores, 8GB RAM per instance

- **Large Deployment** (> 100K IoCs/day)
  - 10+ service instances
  - PostgreSQL cluster with sharding
  - Redis cluster
  - Message queue (RabbitMQ/Kafka)
  - 8 CPU cores, 16GB RAM per instance

### Optimization Tips

1. **Feed Polling**
   - Adjust poll intervals based on feed update frequency
   - Use conditional requests (If-Modified-Since)
   - Implement exponential backoff for failures

2. **Enrichment**
   - Cache enrichment results (TTL: 24 hours)
   - Batch enrichment requests
   - Rate limit API calls

3. **Attribution**
   - Pre-compute TTP fingerprints
   - Cache ATT&CK framework data
   - Use incremental updates

4. **Storage**
   - Partition tables by date
   - Archive old IoCs to cold storage
   - Use appropriate indexes

## Security Considerations

### API Keys & Credentials

- Store all API keys in environment variables or secret management system
- Rotate keys regularly
- Use least-privilege access

### TLP Handling

Respect Traffic Light Protocol (TLP) markings:
- **TLP:RED** - Restrict to named recipients only
- **TLP:AMBER** - Limited distribution within organization
- **TLP:GREEN** - Community-wide distribution
- **TLP:WHITE/CLEAR** - Public distribution

### Data Protection

- Encrypt data at rest and in transit
- Implement access controls
- Audit all data access
- Regular security assessments

## Troubleshooting

### Common Issues

**Feed polling failures:**
```bash
# Check feed status
curl http://localhost:3010/api/feeds/stats

# Manually trigger fetch
curl -X POST http://localhost:3010/api/feeds/urlhaus/fetch
```

**Enrichment failures:**
- Verify API keys are valid
- Check rate limits
- Review service logs

**Attribution low confidence:**
- Ensure MITRE ATT&CK data is loaded
- Check technique mappings
- Review enrichment data quality

## Roadmap

- [ ] Dark web monitoring integration
- [ ] Advanced malware analysis (YARA, Sigma)
- [ ] Machine learning-based attribution
- [ ] Automated playbook generation
- [ ] Integration with SOAR platforms
- [ ] Threat intelligence marketplace
- [ ] Collaborative hunting workflows
- [ ] Advanced visualization dashboards

## Support & Contributing

For issues, questions, or contributions:
- GitHub Issues: https://github.com/org/summit/issues
- Documentation: https://docs.intelgraph.com/cti
- Email: support@intelgraph.com

## License

Copyright © 2025 IntelGraph. All rights reserved.
