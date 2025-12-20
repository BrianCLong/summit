# Espionage Platform Operations Manual

## Table of Contents

1. [Getting Started](#getting-started)
2. [Common Operations](#common-operations)
3. [Foreign Intelligence Service Management](#foreign-intelligence-service-management)
4. [Agent Tracking and Analysis](#agent-tracking-and-analysis)
5. [Operations Detection and Tracking](#operations-detection-and-tracking)
6. [Technical Intelligence](#technical-intelligence)
7. [Counterintelligence Operations](#counterintelligence-operations)
8. [Analytics and Reporting](#analytics-and-reporting)
9. [Troubleshooting](#troubleshooting)
10. [Operational Security](#operational-security)

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9.12+
- Access credentials with appropriate clearance level
- Tenant ID assigned to your organization

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm -r build

# Start services
pnpm --filter @intelgraph/espionage-service dev    # Port 4100
pnpm --filter @intelgraph/foreign-intel-service dev # Port 4101
```

### Authentication

All API requests require authentication:

```bash
# Set your JWT token
export AUTH_TOKEN="your-jwt-token"

# Make authenticated requests
curl -H "Authorization: Bearer $AUTH_TOKEN" \
  https://api.example.com/api/operations/espionage
```

---

## Common Operations

### 1. Checking System Health

```bash
# Check espionage service
curl https://api.example.com/health

# Check foreign intel service
curl https://api.example.com:4101/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "espionage-service",
  "timestamp": "2024-11-20T10:00:00Z",
  "version": "0.1.0"
}
```

### 2. Searching for Data

```bash
# Search operations by status
curl "https://api.example.com/api/operations/espionage?status=ACTIVE"

# Search officers by agency
curl "https://api.example.com/api/agents/officers?agency=agency-uuid"

# Search with multiple filters
curl "https://api.example.com/api/agents/officers?role=CASE_OFFICER&status=ACTIVE&nationality=CountryX"
```

### 3. Creating Records

All creation requests follow this pattern:

```bash
curl -X POST https://api.example.com/api/resource \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d @data.json
```

---

## Foreign Intelligence Service Management

### Create Intelligence Agency Profile

**Scenario**: New foreign intelligence service identified

```bash
cat > agency.json << 'EOF'
{
  "name": "Foreign Intelligence Service Alpha",
  "country": "Country X",
  "agencyType": "FOREIGN_INTELLIGENCE",
  "aliases": ["FIS-A", "Service Alpha"],
  "headquarters": "Capital City, Country X",
  "estimatedBudget": 2500000000,
  "estimatedPersonnel": 15000,
  "capabilities": [
    "HUMINT",
    "SIGINT",
    "CYBER",
    "TECHNICAL_INTELLIGENCE"
  ],
  "priorityTargets": [
    "Western Technology",
    "Defense Systems",
    "Government Communications"
  ],
  "classification": "SECRET",
  "tenantId": "your-tenant-id"
}
EOF

curl -X POST https://api.example.com:4101/api/agencies \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d @agency.json
```

### Track Organizational Structure

```bash
cat > org-unit.json << 'EOF'
{
  "name": "Directorate S - Illegals Program",
  "type": "DIRECTORATE",
  "primaryMission": "Deep cover operations in Western countries",
  "secondaryMissions": [
    "Long-term intelligence collection",
    "Agent recruitment"
  ],
  "estimatedPersonnel": 250,
  "location": "Headquarters, Country X",
  "capabilities": [
    "NOC placement",
    "Long-term operations",
    "Agent handling"
  ],
  "tenantId": "your-tenant-id"
}
EOF

curl -X POST https://api.example.com:4101/api/agencies/{agency-id}/units \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d @org-unit.json
```

### Assess Capabilities

```bash
cat > capability.json << 'EOF'
{
  "capabilityType": "CYBER",
  "capabilityName": "Advanced Persistent Threat Operations",
  "maturityLevel": "ADVANCED",
  "effectiveness": "VERY_HIGH",
  "scope": "GLOBAL",
  "technicalSophistication": "CUTTING_EDGE",
  "platforms": [{
    "platform": "APT-28 Infrastructure",
    "type": "Cyber Operations Platform",
    "capabilities": [
      "Spearphishing",
      "Zero-day exploitation",
      "Long-term persistence"
    ],
    "limitations": ["Detection by modern EDR systems"]
  }],
  "knownSystems": [{
    "system": "X-Agent",
    "purpose": "Remote access trojan",
    "capabilities": ["Keylogging", "Screenshot capture", "File exfiltration"],
    "deploymentStatus": "OPERATIONAL"
  }],
  "assessmentConfidence": "HIGH",
  "lastUpdated": "2024-11-20T00:00:00Z",
  "tenantId": "your-tenant-id"
}
EOF

curl -X POST https://api.example.com:4101/api/capabilities \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d @capability.json
```

### Get Agency Assessment

```bash
curl https://api.example.com:4101/api/agencies/{agency-id}/assessment \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

Response:
```json
{
  "threatLevel": "HIGH",
  "capabilities": ["HUMINT", "SIGINT", "CYBER"],
  "priorities": ["Technology", "Defense", "Government"],
  "relationships": "12 partners, 8 adversaries"
}
```

---

## Agent Tracking and Analysis

### Create Intelligence Officer Record

**Scenario**: New intelligence officer identified at embassy

```bash
cat > officer.json << 'EOF'
{
  "realName": "Ivan Petrov",
  "aliases": ["John Smith", "Michael Johnson"],
  "coverIdentities": [{
    "name": "John Smith",
    "coverType": "DIPLOMATIC",
    "organization": "Embassy of Country X",
    "position": "Second Secretary",
    "location": "Capital City",
    "validFrom": "2023-01-15T00:00:00Z",
    "compromised": false
  }],
  "agency": "agency-uuid",
  "role": "CASE_OFFICER",
  "rank": "Major",
  "nationality": "Country X",
  "languages": ["Russian", "English", "French"],
  "education": [{
    "institution": "Moscow State Institute",
    "degree": "Master's",
    "fieldOfStudy": "International Relations",
    "graduationYear": 2015
  }],
  "postings": [{
    "location": "Capital City",
    "position": "Second Secretary",
    "startDate": "2023-01-15T00:00:00Z",
    "coverOrganization": "Embassy of Country X"
  }],
  "operationalStatus": "ACTIVE",
  "specialties": ["Recruitment", "HUMINT"],
  "classification": "SECRET",
  "tenantId": "your-tenant-id"
}
EOF

curl -X POST https://api.example.com/api/agents/officers \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d @officer.json
```

### Analyze Cover Identity

```bash
curl -X POST https://api.example.com/api/agents/officers/{officer-id}/analyze-cover \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"coverIdentity": "John Smith"}'
```

Response:
```json
{
  "id": "cover-analysis-uuid",
  "officerId": "officer-uuid",
  "coverIdentity": "John Smith",
  "coverType": "DIPLOMATIC",
  "credibility": "GOOD",
  "backstoppingQuality": "SUBSTANTIAL",
  "compromiseRisk": "LOW",
  "verifiableElements": [],
  "inconsistencies": []
}
```

### Analyze Travel Patterns

```bash
curl -X POST https://api.example.com/api/agents/officers/{officer-id}/analyze-travel \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-11-20T00:00:00Z"
  }'
```

Response shows:
- Frequent destinations
- Travel clusters
- Unusual trips
- Meeting locations
- Pattern analysis

### Generate Risk Profile

```bash
curl https://api.example.com/api/agents/officers/{officer-id}/risk-profile \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

Response:
```json
{
  "officerId": "officer-uuid",
  "overallRisk": "MEDIUM",
  "factors": [{
    "factor": "Increased surveillance",
    "severity": "MEDIUM",
    "description": "Officer under surveillance 3 times in past month"
  }],
  "recommendations": [
    "Increase surveillance detection activities",
    "Review and update cover identities",
    "Limit operational exposure"
  ]
}
```

### Map Agent Network

```bash
curl -X POST https://api.example.com/api/agents/networks/map \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "networkName": "Embassy Network Alpha",
    "officerIds": [
      "officer-uuid-1",
      "officer-uuid-2",
      "officer-uuid-3"
    ]
  }'
```

---

## Operations Detection and Tracking

### Create Espionage Operation

```bash
cat > operation.json << 'EOF'
{
  "codename": "Operation Nightfall",
  "operationType": "COLLECTION",
  "status": "ACTIVE",
  "sponsoringAgency": "agency-uuid",
  "targetCountry": "Country Y",
  "targetSector": "Defense Technology",
  "objectives": [
    "Collect intelligence on advanced weapons systems",
    "Identify key personnel",
    "Map organizational structure"
  ],
  "startDate": "2024-01-01T00:00:00Z",
  "operationalArea": "Capital Region",
  "primaryOfficers": ["officer-uuid-1", "officer-uuid-2"],
  "targets": [{
    "type": "ORGANIZATION",
    "identifier": "Defense Research Laboratory",
    "priority": "CRITICAL",
    "status": "UNDER_SURVEILLANCE"
  }],
  "classification": "SECRET",
  "tenantId": "your-tenant-id"
}
EOF

curl -X POST https://api.example.com/api/operations/espionage \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d @operation.json
```

### Track Influence Operation

```bash
cat > influence-op.json << 'EOF'
{
  "operationName": "Social Media Influence Campaign",
  "sponsoringAgency": "agency-uuid",
  "targetCountry": "Country Y",
  "targetAudience": ["Young adults", "Political activists"],
  "objectives": [
    "Amplify social divisions",
    "Undermine trust in institutions"
  ],
  "narratives": [{
    "narrative": "Government corruption",
    "themes": ["corruption", "incompetence", "elitism"],
    "targetDemographic": "18-35 age group",
    "disseminationChannels": ["Facebook", "Twitter", "Reddit"],
    "reach": "MASS"
  }],
  "platforms": [{
    "platform": "Facebook",
    "platformType": "SOCIAL_MEDIA",
    "accounts": 150,
    "followers": 450000,
    "activity": "VERY_HIGH"
  }],
  "status": "ACTIVE",
  "tenantId": "your-tenant-id"
}
EOF

curl -X POST https://api.example.com/api/operations/influence \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d @influence-op.json
```

### Monitor Political Interference

```bash
cat > political-interference.json << 'EOF'
{
  "operationName": "Election Interference 2024",
  "sponsoringAgency": "agency-uuid",
  "targetCountry": "Country Y",
  "interferenceType": "ELECTION_INTERFERENCE",
  "targets": [{
    "targetType": "CANDIDATE",
    "targetName": "Opposition Candidate",
    "targetedOutcome": "Damage reputation"
  }],
  "methods": [{
    "method": "Hack and leak",
    "description": "Compromise email accounts and leak damaging information",
    "scale": "LARGE",
    "sophistication": "ADVANCED"
  }],
  "timeline": {
    "startDate": "2024-06-01T00:00:00Z",
    "peakActivity": "2024-10-15T00:00:00Z"
  },
  "tenantId": "your-tenant-id"
}
EOF

curl -X POST https://api.example.com/api/operations/political-interference \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d @political-interference.json
```

---

## Technical Intelligence

### Track SIGINT Collection

```bash
cat > sigint.json << 'EOF'
{
  "collectionName": "SIGINT Collection Alpha",
  "collectionType": "COMINT",
  "targetSystems": [{
    "systemName": "Government Communications Network",
    "systemType": "Encrypted Communications",
    "frequency": "VHF/UHF",
    "encryption": true,
    "priority": "CRITICAL"
  }],
  "collectionPlatforms": [{
    "platformId": "platform-uuid",
    "platformType": "SATELLITE",
    "location": "Orbit",
    "capabilities": ["Wideband collection", "Signal analysis"],
    "operational": true
  }],
  "status": "ACTIVE",
  "tenantId": "your-tenant-id"
}
EOF

curl -X POST https://api.example.com/api/operations/sigint \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d @sigint.json
```

### Track Cyber Operations

```bash
cat > cyber-op.json << 'EOF'
{
  "operationName": "APT-28 Campaign",
  "sponsoringAgency": "agency-uuid",
  "operationType": "ADVANCED_PERSISTENT_THREAT",
  "targets": [{
    "targetName": "Government Network",
    "targetType": "NETWORK",
    "sector": "Government",
    "criticalityLevel": "CRITICAL",
    "compromised": true,
    "compromiseDate": "2024-06-15T00:00:00Z"
  }],
  "ttps": [{
    "tactic": "Initial Access",
    "technique": "Spearphishing Attachment",
    "procedure": "Targeted emails with malicious Office documents",
    "mitreId": "T1566.001",
    "frequency": "ROUTINE"
  }],
  "infrastructure": [{
    "infrastructureType": "C2_SERVER",
    "address": "192.0.2.100",
    "active": true,
    "firstSeen": "2024-06-01T00:00:00Z"
  }],
  "malware": [{
    "malwareName": "X-Agent",
    "malwareType": "BACKDOOR",
    "hash": "sha256:abc123...",
    "capabilities": ["Keylogging", "Screenshot capture", "File exfiltration"],
    "sophistication": "ADVANCED"
  }],
  "status": "ACTIVE",
  "tenantId": "your-tenant-id"
}
EOF

curl -X POST https://api.example.com/api/operations/cyber \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d @cyber-op.json
```

---

## Counterintelligence Operations

### Create Penetration Indicator

**Scenario**: Suspicious activity detected

```bash
cat > indicator.json << 'EOF'
{
  "indicatorType": "UNAUTHORIZED_ACCESS",
  "description": "Unauthorized access to classified systems detected",
  "observedAt": "2024-11-20T10:30:00Z",
  "suspectedIndividual": "employee-uuid",
  "severity": "CRITICAL",
  "confidence": 0.92,
  "evidence": [{
    "type": "Access logs",
    "description": "After-hours access to highly classified database",
    "source": "Security System",
    "timestamp": "2024-11-20T03:15:00Z",
    "classification": "SECRET"
  }],
  "investigationStatus": "INVESTIGATING",
  "tenantId": "your-tenant-id"
}
EOF

curl -X POST https://api.example.com/api/counterintel/penetration-indicators \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d @indicator.json
```

### Register Double Agent

**Scenario**: Foreign agent agrees to work for us

```bash
cat > double-agent.json << 'EOF'
{
  "agentId": "officer-uuid",
  "codename": "BLUEBIRD",
  "targetAgency": "foreign-agency-uuid",
  "targetHandler": "foreign-handler-uuid",
  "ourHandler": "our-handler-uuid",
  "recruitmentDate": "2024-01-15T00:00:00Z",
  "recruitmentMethod": "Ideological conversion",
  "controlLevel": "SUBSTANTIAL_CONTROL",
  "motivation": [
    "Disillusionment with regime",
    "Ideological alignment",
    "Financial security"
  ],
  "reliability": "HIGH",
  "productionValue": "CRITICAL",
  "intelligence": [{
    "date": "2024-02-01T00:00:00Z",
    "intelligenceType": "Operational planning",
    "summary": "Details of planned recruitment operations",
    "value": "CRITICAL",
    "verified": true
  }],
  "status": "ACTIVE",
  "tenantId": "your-tenant-id"
}
EOF

curl -X POST https://api.example.com/api/counterintel/double-agents \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d @double-agent.json
```

### Create Deception Operation

```bash
cat > deception.json << 'EOF'
{
  "operationName": "Operation Mirage",
  "codename": "MIRAGE",
  "targetAgency": "foreign-agency-uuid",
  "objective": "Mislead adversary about defensive capabilities",
  "targetBelief": "Air defense system is vulnerable to low-altitude penetration",
  "actualSituation": "New low-altitude radar network fully operational",
  "deceptionTheme": "Technical vulnerability exploitation",
  "channels": [{
    "channelType": "DOUBLE_AGENT",
    "channelId": "double-agent-uuid",
    "credibility": "HIGH",
    "usage": "PRIMARY"
  }],
  "status": "ACTIVE",
  "tenantId": "your-tenant-id"
}
EOF

curl -X POST https://api.example.com/api/counterintel/deception \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d @deception.json
```

### Create Insider Threat Profile

```bash
cat > insider-threat.json << 'EOF'
{
  "subjectId": "employee-uuid",
  "subjectName": "John Doe",
  "organization": "Defense Research Agency",
  "position": "Senior Scientist",
  "clearanceLevel": "TOP_SECRET",
  "accessLevel": "Comprehensive research access",
  "threatLevel": "HIGH",
  "threatCategory": "ESPIONAGE",
  "riskFactors": [{
    "factor": "Unexplained wealth",
    "category": "FINANCIAL",
    "severity": "HIGH",
    "firstObserved": "2024-09-01T00:00:00Z",
    "current": true
  }, {
    "factor": "Unreported foreign contacts",
    "category": "FOREIGN_CONTACT",
    "severity": "CRITICAL",
    "firstObserved": "2024-10-15T00:00:00Z",
    "current": true
  }],
  "tenantId": "your-tenant-id"
}
EOF

curl -X POST https://api.example.com/api/counterintel/insider-threats \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d @insider-threat.json
```

### Get CI Posture Assessment

```bash
curl https://api.example.com/api/counterintel/posture \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

Response:
```json
{
  "posture": "FAIR",
  "risks": ["Some concerning indicators"],
  "recommendations": ["Continue monitoring"],
  "data": {
    "penetrationIndicators": 7,
    "activeDoubleAgents": 2,
    "insiderThreats": 1,
    "recentCompromises": 0
  },
  "assessedAt": "2024-11-20T10:00:00Z"
}
```

---

## Analytics and Reporting

### Create Analytical Product

```bash
cat > product.json << 'EOF'
{
  "title": "Quarterly Intelligence Threat Assessment: Country X",
  "productType": "THREAT_ASSESSMENT",
  "summary": "Comprehensive assessment of intelligence threats from Country X services",
  "keyFindings": [
    "25% increase in cyber operations targeting defense sector",
    "Expanded HUMINT network with 15 new officers identified",
    "Shift in priorities toward advanced technology acquisition"
  ],
  "analysis": "Detailed analysis of trends, capabilities, and intentions...",
  "conclusions": [
    "Country X intelligence services pose elevated threat",
    "Cyber capabilities continue to mature",
    "Recommend enhanced counterintelligence measures"
  ],
  "recommendations": [
    "Increase monitoring of identified officers",
    "Enhance cyber defenses in defense sector",
    "Expand double agent operations"
  ],
  "confidence": "HIGH",
  "sources": [{
    "sourceId": "source-uuid",
    "sourceType": "HUMINT",
    "reliability": "A",
    "credibility": "1"
  }],
  "classification": "SECRET",
  "createdBy": "analyst-uuid",
  "tenantId": "your-tenant-id"
}
EOF

curl -X POST https://api.example.com/api/analytics/products \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d @product.json
```

### Generate Threat Assessment

```bash
curl -X POST https://api.example.com/api/analytics/threat-assessment \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "targetAgency": "agency-uuid",
    "timeframe": {
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-12-31T23:59:59Z"
    }
  }'
```

### Pattern Analysis

```bash
curl -X POST https://api.example.com/api/analytics/pattern-analysis \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agencyId": "agency-uuid",
    "timeframe": {
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-11-20T00:00:00Z"
    },
    "analysisType": "COMPREHENSIVE"
  }'
```

### Generate Collection Requirements

```bash
curl -X POST https://api.example.com/api/analytics/collection-requirements \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "targets": [
      {"name": "Directorate S", "type": "ORGANIZATION", "priority": "CRITICAL"},
      {"name": "Officer Petrov", "type": "PERSON", "priority": "HIGH"}
    ],
    "priority": "HIGH"
  }'
```

### Predictive Intelligence

```bash
curl -X POST https://api.example.com/api/analytics/predictive \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agencyId": "agency-uuid",
    "targetArea": "Cyber Operations",
    "timeHorizon": "6 months"
  }'
```

---

## Troubleshooting

### Common Issues

#### 1. Authentication Failures

**Problem**: 401 Unauthorized responses

**Solutions**:
```bash
# Verify token is valid
echo $AUTH_TOKEN

# Check token expiration
jwt decode $AUTH_TOKEN

# Request new token
curl -X POST https://auth.example.com/token \
  -d "username=user&password=pass"
```

#### 2. Validation Errors

**Problem**: 400 Bad Request with validation details

**Solution**: Check the error details
```json
{
  "error": "Validation failed",
  "details": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "number",
      "path": ["classification"]
    }
  ]
}
```

Fix the data type and retry.

#### 3. Classification Access Denied

**Problem**: 403 Forbidden for classified data

**Solution**: Verify your clearance level
```bash
# Check your user profile
curl https://api.example.com/api/user/profile \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

Request higher clearance if needed.

#### 4. Tenant Isolation Issues

**Problem**: No data returned or wrong data

**Solution**: Verify tenantId
```bash
# Always include tenantId in requests
{
  "tenantId": "your-tenant-id",
  ...
}
```

---

## Operational Security

### Best Practices

1. **Always Use HTTPS**: Never send data over unencrypted connections
2. **Rotate Credentials**: Change passwords and tokens regularly
3. **Limit Data Exposure**: Only request data you need
4. **Audit Logging**: All actions are logged
5. **Classification Handling**: Follow proper classification procedures
6. **Compartmented Access**: Respect compartment boundaries
7. **Data Retention**: Follow retention policies
8. **Incident Reporting**: Report security incidents immediately

### Security Checklist

- [ ] Using HTTPS for all connections
- [ ] JWT tokens stored securely
- [ ] Proper classification markings on all data
- [ ] Tenant ID correctly set
- [ ] Clearance level verified
- [ ] Audit logs reviewed regularly
- [ ] Access controls configured
- [ ] Encryption enabled

### Emergency Procedures

#### Compromised Credentials

1. Immediately revoke tokens
2. Change passwords
3. Notify security team
4. Review access logs
5. Assess potential damage

#### Data Breach

1. Isolate affected systems
2. Activate incident response
3. Notify stakeholders
4. Preserve evidence
5. Begin damage assessment

---

## Support and Resources

- **Technical Support**: support@example.com
- **Security Incidents**: security@example.com
- **Documentation**: https://docs.example.com
- **API Reference**: https://api.example.com/api-docs
- **Status Page**: https://status.example.com

---

## Appendices

### A. Classification Markings

| Level | Marking | Description |
|-------|---------|-------------|
| UNCLASSIFIED | U | Public information |
| CONFIDENTIAL | C | Could damage national security |
| SECRET | S | Serious damage to national security |
| TOP SECRET | TS | Exceptionally grave damage |
| TOP SECRET/SCI | TS/SCI | Special compartmented information |
| SAP | SAP | Special Access Program |

### B. Common Compartments

- **SI**: Special Intelligence (SIGINT)
- **TK**: TALENT KEYHOLE (Satellite imagery)
- **HCS**: HUMINT Control System
- **G**: GAMMA (extremely sensitive SIGINT)

### C. API Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Continue |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Check request format |
| 401 | Unauthorized | Check authentication |
| 403 | Forbidden | Check permissions |
| 404 | Not Found | Check resource ID |
| 500 | Server Error | Contact support |

---

*This operations manual is classified SECRET. Handle accordingly.*
