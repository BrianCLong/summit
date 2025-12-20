# Cyber Threat Intelligence Platform Guide

## Overview

The IntelGraph Cyber Threat Intelligence (CTI) Platform is an enterprise-grade solution for comprehensive threat intelligence collection, analysis, and response. This platform surpasses commercial solutions like Recorded Future, ThreatConnect, Anomali, and MISP with advanced automation, integration capabilities, and scalability.

## Architecture

### Core Components

1. **Threat Intelligence Collection** (`@intelgraph/threat-intelligence`)
   - Multi-source feed aggregation
   - OSINT collection
   - Dark web monitoring
   - Social media monitoring
   - Honeypot integration
   - STIX/TAXII support

2. **IOC Management** (`@intelgraph/ioc-manager`)
   - Centralized IOC database
   - Automatic deduplication
   - Multi-provider enrichment
   - Export capabilities (JSON, CSV, STIX)
   - False positive tracking

3. **Malware Analysis** (`@intelgraph/malware-analysis`)
   - Static analysis
   - Dynamic sandbox analysis
   - Behavioral pattern detection
   - Malware family classification
   - C2 infrastructure mapping

4. **Threat Actor Tracking** (`@intelgraph/threat-actors`)
   - Threat actor profiles
   - MITRE ATT&CK mapping
   - Campaign tracking
   - TTP analysis
   - Attribution analytics

5. **Vulnerability Intelligence** (`@intelgraph/vulnerability-intel`)
   - CVE/CWE tracking
   - Exploit monitoring
   - EPSS scoring
   - Patch management
   - Asset-vulnerability correlation

6. **Attack Surface Monitoring** (`@intelgraph/attack-surface`)
   - External asset discovery
   - Subdomain enumeration
   - Certificate transparency monitoring
   - Cloud asset discovery
   - Shadow IT detection
   - Brand monitoring
   - Data leak detection

### Services

1. **Cyber Intel Service** (`services/cyber-intel-service`)
   - RESTful API for all CTI operations
   - Real-time threat feed ingestion
   - IOC enrichment pipeline
   - Threat correlation engine

2. **Threat Hunting Service** (`services/threat-hunting-service`)
   - Hypothesis-driven hunting
   - Automated playbook execution
   - IOC sweeping
   - Behavioral analytics
   - Timeline reconstruction

## Getting Started

### Prerequisites

- Node.js >= 18.18
- Python >= 3.11
- pnpm package manager
- Docker (optional, for services)

### Installation

1. **Install dependencies:**

```bash
pnpm install
```

2. **Build packages:**

```bash
# Build all CTI packages
pnpm run build

# Or build individually
cd packages/threat-intelligence && pnpm build
cd packages/ioc-manager && pnpm build
cd packages/malware-analysis && pnpm build
cd packages/threat-actors && pnpm build
cd packages/vulnerability-intel && pnpm build
cd packages/attack-surface && pnpm build
```

3. **Start services:**

```bash
# Start Cyber Intel Service
cd services/cyber-intel-service
pip install -r requirements.txt
python main.py

# Start Threat Hunting Service
cd services/threat-hunting-service
pip install -r requirements.txt
python main.py
```

## Usage

### Threat Intelligence Collection

```typescript
import { ThreatFeedAggregator } from '@intelgraph/threat-intelligence';

const aggregator = new ThreatFeedAggregator();

// Register a threat feed
await aggregator.registerFeed({
  id: 'feed-1',
  name: 'Commercial TI Feed',
  source: 'COMMERCIAL',
  url: 'https://api.threatprovider.com/feed',
  apiKey: 'your-api-key',
  refreshInterval: 3600,
  tlp: 'AMBER',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// Sync feed
const threats = await aggregator.syncFeed('feed-1');
```

### IOC Management

```typescript
import { IOCManager } from '@intelgraph/ioc-manager';

const iocManager = new IOCManager();

// Add IOC
await iocManager.addIOC({
  id: 'ioc-1',
  type: 'IP_ADDRESS',
  value: '192.0.2.1',
  severity: 'HIGH',
  confidence: 85,
  status: 'ACTIVE',
  tags: ['malware', 'botnet'],
  firstSeen: new Date().toISOString(),
  lastSeen: new Date().toISOString(),
  sources: [{
    name: 'ThreatFeed',
    confidence: 85,
    timestamp: new Date().toISOString(),
  }],
  tenantId: 'default',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// Search IOCs
const { iocs, total } = await iocManager.search({
  types: ['IP_ADDRESS'],
  severities: ['HIGH', 'CRITICAL'],
  minConfidence: 80,
  limit: 100,
  offset: 0,
});

// Enrich IOC
import { IOCEnrichmentService } from '@intelgraph/ioc-manager';

const enrichment = new IOCEnrichmentService();
enrichment.setApiKey('VIRUSTOTAL', 'your-vt-api-key');

const enriched = await enrichment.enrichIOC(
  iocs[0],
  ['VIRUSTOTAL', 'ABUSEIPDB']
);
```

### Dark Web Monitoring

```typescript
import { DarkWebMonitorService } from '@intelgraph/threat-intelligence';

const darkWebMonitor = new DarkWebMonitorService();

// Register monitor
await darkWebMonitor.registerMonitor({
  id: 'monitor-1',
  name: 'Underground Forum Monitor',
  sourceType: 'FORUM',
  url: 'http://darkwebforum.onion',
  keywords: ['ransomware', 'exploit', 'database'],
  enabled: true,
  scanFrequency: 3600,
  proxyConfig: {
    enabled: true,
    host: 'localhost',
    port: 9050,
    protocol: 'socks5',
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// Scan source
const findings = await darkWebMonitor.scanSource('monitor-1');
```

### Threat Hunting

```http
POST /api/v1/hunts
Content-Type: application/json

{
  "name": "Lateral Movement Detection",
  "description": "Hunt for potential lateral movement using SMB",
  "hypothesis": {
    "title": "Adversary using PsExec for lateral movement",
    "description": "Looking for signs of remote execution via SMB",
    "assumptions": [
      "Adversary has valid credentials",
      "SMB is enabled on target systems"
    ],
    "data_sources": ["process_logs", "network_logs"],
    "priority": "HIGH"
  },
  "techniques": ["T1021.002"],
  "auto_execute": true
}
```

## API Reference

### Cyber Intel Service

Base URL: `http://localhost:8000/api/v1`

#### Threat Intelligence

- `POST /threats` - Create threat intelligence item
- `GET /threats` - List threats
- `GET /threats/{id}` - Get specific threat
- `POST /threats/search` - Search threats

#### IOC Management

- `POST /iocs` - Create IOC
- `GET /iocs` - List IOCs
- `GET /iocs/{id}` - Get specific IOC
- `POST /iocs/{id}/enrich` - Enrich IOC
- `POST /iocs/bulk` - Bulk import IOCs

#### Threat Feeds

- `POST /feeds` - Register feed
- `GET /feeds` - List feeds
- `POST /feeds/{id}/sync` - Sync feed

#### Malware Analysis

- `POST /malware/submit` - Submit sample
- `GET /malware/{id}` - Get analysis results

#### Threat Actors

- `GET /threat-actors` - List actors
- `GET /threat-actors/{id}` - Get actor details

#### Vulnerabilities

- `GET /vulnerabilities` - List vulnerabilities
- `GET /vulnerabilities/{cve}` - Get vulnerability details

#### Attack Surface

- `GET /attack-surface/assets` - List external assets
- `POST /attack-surface/discover` - Discover assets

### Threat Hunting Service

Base URL: `http://localhost:8001/api/v1`

#### Hunts

- `POST /hunts` - Create threat hunt
- `GET /hunts` - List hunts
- `GET /hunts/{id}` - Get hunt details
- `POST /hunts/{id}/execute` - Execute hunt
- `GET /hunts/{id}/findings` - Get findings

#### Playbooks

- `POST /playbooks` - Create playbook
- `GET /playbooks` - List playbooks
- `POST /playbooks/{id}/execute` - Execute playbook

#### Detection

- `POST /ioc-sweep` - Sweep for IOCs
- `POST /behavioral-analysis` - Analyze behavior
- `POST /detect/lateral-movement` - Detect lateral movement
- `POST /detect/persistence` - Detect persistence

## Configuration

### Environment Variables

```bash
# Cyber Intel Service
CTI_DATABASE_URL=postgresql://user:pass@localhost/cti
CTI_REDIS_URL=redis://localhost:6379
CTI_API_PORT=8000

# Threat Hunting Service
HUNT_DATABASE_URL=postgresql://user:pass@localhost/hunting
HUNT_ELASTICSEARCH_URL=http://localhost:9200
HUNT_API_PORT=8001

# API Keys
VIRUSTOTAL_API_KEY=your-key
ABUSEIPDB_API_KEY=your-key
SHODAN_API_KEY=your-key
ALIENVAULT_OTX_API_KEY=your-key
```

### Feed Configuration

Create `feeds.json`:

```json
{
  "feeds": [
    {
      "name": "AlienVault OTX",
      "source": "OSINT",
      "url": "https://otx.alienvault.com/api/v1/pulses/subscribed",
      "refreshInterval": 3600,
      "tlp": "WHITE"
    },
    {
      "name": "CVE Feed",
      "source": "CVE_NVD",
      "url": "https://services.nvd.nist.gov/rest/json/cves/2.0",
      "refreshInterval": 7200,
      "tlp": "WHITE"
    }
  ]
}
```

## Integration

### SIEM Integration

```python
# Forward IOCs to SIEM
from cyber_intel_client import CTIClient

client = CTIClient(api_url='http://localhost:8000/api/v1')

# Get recent IOCs
iocs = client.get_iocs(
    severity=['HIGH', 'CRITICAL'],
    created_after='2024-01-01'
)

# Push to SIEM
for ioc in iocs:
    siem.add_watchlist_item(ioc)
```

### SOAR Integration

```javascript
// Automated playbook in SOAR
const response = await fetch('http://localhost:8001/api/v1/playbooks/incident-response/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    incident_id: 'INC-12345',
    iocs: ['192.0.2.1', 'evil.com']
  })
});
```

## Best Practices

### 1. IOC Management

- Set appropriate confidence thresholds
- Regularly review false positives
- Configure aging/expiration policies
- Use TLP markings correctly

### 2. Threat Hunting

- Start with hypotheses, not data
- Document all hunting activities
- Create playbooks for repeatable hunts
- Integrate findings into detection

### 3. Feed Management

- Prioritize quality over quantity
- Monitor feed reliability
- Implement rate limiting
- Cache frequently accessed data

### 4. Security

- Use TLS for all API communications
- Rotate API keys regularly
- Implement role-based access control
- Audit all modifications

## Troubleshooting

### Common Issues

1. **Feed sync failures**
   - Check API key validity
   - Verify network connectivity
   - Review rate limits

2. **Enrichment errors**
   - Confirm provider API keys
   - Check quota limits
   - Validate IOC formats

3. **Performance issues**
   - Enable caching
   - Optimize queries
   - Scale horizontally

## Support

For issues and questions:
- GitHub Issues: `https://github.com/your-org/intelgraph/issues`
- Documentation: `https://docs.intelgraph.io`
- Email: `support@intelgraph.io`

## License

MIT License - See LICENSE file for details
