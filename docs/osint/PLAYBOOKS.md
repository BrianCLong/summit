# OSINT Investigation Playbooks

## Overview

This document provides standardized playbooks for common OSINT investigation scenarios. Each playbook includes objectives, tools, techniques, and step-by-step procedures.

## Playbook Categories

1. [Person Investigation](#playbook-1-person-investigation)
2. [Organization Research](#playbook-2-organization-research)
3. [Domain/Infrastructure Analysis](#playbook-3-domain-infrastructure-analysis)
4. [Social Media Campaign Tracking](#playbook-4-social-media-campaign-tracking)
5. [Threat Actor Profiling](#playbook-5-threat-actor-profiling)
6. [Data Breach Investigation](#playbook-6-data-breach-investigation)

---

## Playbook 1: Person Investigation

### Objective
Create a comprehensive profile of an individual using publicly available information.

### Tools Required
- @intelgraph/attribution-engine
- @intelgraph/social-media-intel
- @intelgraph/web-scraper

### Procedure

#### Phase 1: Initial Identification
1. **Starting Point**: Obtain initial identifier (email, username, phone)
2. **Username Enumeration**: Check username across platforms
3. **Email Analysis**: Validate email and check for breaches
4. **Phone Lookup**: Validate and analyze phone number

```typescript
import { AttributionEngine } from '@intelgraph/attribution-engine';

const engine = new AttributionEngine();
const footprint = await engine.buildDigitalFootprint('target@example.com');
```

#### Phase 2: Social Media Discovery
1. **Platform Search**: Search discovered usernames on major platforms
2. **Profile Collection**: Gather profile information
3. **Post History**: Collect recent posts and activity
4. **Network Analysis**: Map connections and relationships

```typescript
import { ProfileAnalyzer, AccountCorrelator } from '@intelgraph/social-media-intel';

const analyzer = new ProfileAnalyzer();
const profiles = [/* collected profiles */];
const analysis = profiles.map(p => analyzer.analyzeProfile(p));

const correlator = new AccountCorrelator();
const correlations = correlator.correlateAccounts(profiles);
```

#### Phase 3: Deep Analysis
1. **Sentiment Analysis**: Analyze posting patterns and sentiment
2. **Timeline Reconstruction**: Build activity timeline
3. **Location Analysis**: Extract location data from posts/images
4. **Interest Profiling**: Identify topics, hashtags, interests

```typescript
import { SentimentAnalyzer, TimelineReconstructor } from '@intelgraph/social-media-intel';

const sentimentAnalyzer = new SentimentAnalyzer();
const trends = sentimentAnalyzer.analyzeTrends(posts);

const reconstructor = new TimelineReconstructor();
const timeline = reconstructor.buildTimeline(posts);
```

#### Phase 4: Attribution & Correlation
1. **Cross-Platform Linking**: Link accounts across platforms
2. **Digital Footprint Mapping**: Create comprehensive footprint map
3. **Relationship Mapping**: Identify key relationships
4. **Verification**: Cross-reference findings

#### Phase 5: Reporting
1. **Document findings** with evidence
2. **Create timeline** visualization
3. **Map relationships** in network graph
4. **Export report** in required format

### Success Criteria
- [ ] Identified 5+ social media accounts
- [ ] Mapped key relationships
- [ ] Created activity timeline
- [ ] Verified account correlations
- [ ] Generated comprehensive report

---

## Playbook 2: Organization Research

### Objective
Gather intelligence on an organization's digital presence, employees, and operations.

### Tools Required
- @intelgraph/web-scraper
- @intelgraph/osint-collector
- @intelgraph/attribution-engine

### Procedure

#### Phase 1: Digital Footprint Discovery
1. **Domain Enumeration**: Find all domains owned by organization
2. **Subdomain Discovery**: Enumerate subdomains
3. **Website Analysis**: Technology stack, structure, content
4. **Social Media Presence**: Find official accounts

```typescript
import { DomainIntelCollector } from '@intelgraph/osint-collector';

const collector = new DomainIntelCollector({
  name: 'domain-intel',
  type: 'domain_intel',
  enabled: true
});

const intel = await collector.collectDomainIntel('example.com');
```

#### Phase 2: Employee Discovery
1. **LinkedIn Scraping**: Find employees on LinkedIn
2. **Email Pattern Analysis**: Determine email format
3. **Social Media**: Find employee accounts
4. **Role Identification**: Map organizational structure

#### Phase 3: Technology Analysis
1. **Tech Stack Detection**: Identify technologies used
2. **API Discovery**: Find public APIs
3. **Service Identification**: Identify cloud services
4. **Security Assessment**: Check for exposed services

```typescript
import { TechnologyDetector } from '@intelgraph/web-scraper';

const detector = new TechnologyDetector();
const technologies = detector.detect(html, headers);
```

#### Phase 4: Content Analysis
1. **News Monitoring**: Track mentions in news
2. **Social Monitoring**: Track social media activity
3. **Job Postings**: Analyze hiring patterns
4. **Financial Data**: Gather public financial info

#### Phase 5: Network Mapping
1. **Partner Identification**: Find business partners
2. **Vendor Discovery**: Identify vendors/suppliers
3. **Customer Analysis**: Identify key customers
4. **Competitor Mapping**: Map competitive landscape

### Success Criteria
- [ ] Mapped domain infrastructure
- [ ] Identified key employees
- [ ] Documented technology stack
- [ ] Created org chart
- [ ] Generated threat profile

---

## Playbook 3: Domain/Infrastructure Analysis

### Objective
Perform comprehensive analysis of domain and infrastructure.

### Procedure

#### Phase 1: Domain Intelligence
1. **WHOIS Lookup**: Registration details, dates, contacts
2. **DNS Enumeration**: All DNS records
3. **SSL Certificate**: Certificate information
4. **Historical Data**: Check Wayback Machine

```typescript
import { DomainIntelCollector } from '@intelgraph/osint-collector';
import { ArchiveScraper } from '@intelgraph/web-scraper';

const domainCollector = new DomainIntelCollector({/*...*/});
const intel = await domainCollector.collectDomainIntel('example.com');

const archiveScraper = new ArchiveScraper();
const snapshots = await archiveScraper.getSnapshots('https://example.com');
```

#### Phase 2: Infrastructure Mapping
1. **IP Resolution**: Resolve IPs
2. **Geolocation**: Locate servers
3. **Hosting Provider**: Identify hosting
4. **CDN Detection**: Identify CDN usage

#### Phase 3: Service Enumeration
1. **Port Scanning**: Open ports (external tools)
2. **Service Detection**: Running services
3. **API Endpoints**: Discover APIs
4. **Technology Fingerprinting**: Identify tech

#### Phase 4: Security Assessment
1. **Exposed Services**: Check for exposures
2. **Certificate Validity**: SSL/TLS check
3. **Security Headers**: Analyze headers
4. **Known Vulnerabilities**: Check CVE databases

### Success Criteria
- [ ] Complete domain registration info
- [ ] Full DNS record enumeration
- [ ] Infrastructure map created
- [ ] Security posture documented

---

## Playbook 4: Social Media Campaign Tracking

### Objective
Monitor and analyze social media campaigns, including potential disinformation.

### Procedure

#### Phase 1: Campaign Identification
1. **Hashtag Monitoring**: Track campaign hashtags
2. **Account Discovery**: Find key accounts
3. **Content Analysis**: Analyze messaging
4. **Timeline Creation**: Map campaign timeline

```typescript
import { CollectionScheduler } from '@intelgraph/osint-collector';

const scheduler = new CollectionScheduler();
scheduler.addSchedule({
  id: 'campaign-monitor',
  name: 'Campaign Hashtag Monitor',
  cronExpression: '*/15 * * * *', // Every 15 minutes
  type: 'social_media',
  source: 'twitter',
  target: '#campaignhashtag',
  priority: 10,
  enabled: true
});
```

#### Phase 2: Network Analysis
1. **Influencer Identification**: Find key influencers
2. **Bot Detection**: Identify automated accounts
3. **Network Mapping**: Map amplification networks
4. **Community Detection**: Identify communities

```typescript
import { NetworkAnalyzer, BotDetector, InfluencerScorer } from '@intelgraph/social-media-intel';

const networkAnalyzer = new NetworkAnalyzer();
const network = networkAnalyzer.buildNetwork(profiles, relationships);
const communities = networkAnalyzer.detectCommunities(network);

const botDetector = new BotDetector();
const botScores = profiles.map(p => botDetector.analyze(p, posts));

const influencerScorer = new InfluencerScorer();
const influencers = influencerScorer.rankInfluencers(scores);
```

#### Phase 3: Content Analysis
1. **Sentiment Analysis**: Track sentiment trends
2. **Message Extraction**: Identify key messages
3. **Narrative Analysis**: Map narrative threads
4. **Coordination Detection**: Find coordinated activity

#### Phase 4: Impact Assessment
1. **Reach Calculation**: Measure reach
2. **Engagement Metrics**: Analyze engagement
3. **Spread Patterns**: Track message spread
4. **Effectiveness**: Assess campaign effectiveness

### Success Criteria
- [ ] Campaign timeline documented
- [ ] Key influencers identified
- [ ] Bot networks mapped
- [ ] Impact metrics calculated
- [ ] Report generated

---

## Playbook 5: Threat Actor Profiling

### Objective
Create comprehensive profile of cyber threat actor or group.

### Procedure

#### Phase 1: Initial Intelligence
1. **Alias Collection**: Gather known aliases
2. **Attribution Data**: Collect attribution indicators
3. **TTPs Documentation**: Document tactics, techniques, procedures
4. **Historical Activity**: Map historical operations

#### Phase 2: Digital Footprint
1. **Account Discovery**: Find associated accounts
2. **Infrastructure Mapping**: Identify C2 infrastructure
3. **Tool Analysis**: Identify tools and malware
4. **Communication Channels**: Find communication methods

#### Phase 3: Behavior Analysis
1. **Posting Patterns**: Analyze activity patterns
2. **Language Analysis**: Linguistic analysis
3. **Timezone Analysis**: Determine operating hours
4. **Target Analysis**: Identify targeting patterns

#### Phase 4: Attribution
1. **Technical Attribution**: Technical indicators
2. **Behavioral Attribution**: Behavioral patterns
3. **Linguistic Attribution**: Writing style analysis
4. **Infrastructure Attribution**: Infrastructure patterns

### Success Criteria
- [ ] Complete threat actor profile
- [ ] TTPs documented
- [ ] Infrastructure mapped
- [ ] Attribution confidence assessed
- [ ] IOCs extracted

---

## Playbook 6: Data Breach Investigation

### Objective
Investigate and analyze data breaches affecting individuals or organizations.

### Procedure

#### Phase 1: Breach Discovery
1. **Source Identification**: Identify breach source
2. **Data Collection**: Collect exposed data samples
3. **Scope Assessment**: Determine breach scope
4. **Timeline Establishment**: Establish breach timeline

#### Phase 2: Data Analysis
1. **Data Classification**: Classify exposed data
2. **PII Identification**: Identify personal information
3. **Credential Analysis**: Analyze exposed credentials
4. **Pattern Recognition**: Find patterns in data

#### Phase 3: Impact Assessment
1. **Affected Parties**: Identify affected individuals/orgs
2. **Risk Scoring**: Assess risk levels
3. **Secondary Risks**: Identify secondary risks
4. **Credential Reuse**: Check credential reuse

```typescript
import { EmailAnalyzer } from '@intelgraph/attribution-engine';

const emailAnalyzer = new EmailAnalyzer();
const results = await Promise.all(
  exposedEmails.map(email => emailAnalyzer.analyzeEmail(email))
);

const breached = results.filter(r => r.breaches.length > 0);
```

#### Phase 4: Remediation Support
1. **Notification**: Prepare notifications
2. **Mitigation Steps**: Document mitigation
3. **Monitoring**: Set up ongoing monitoring
4. **Reporting**: Create incident report

### Success Criteria
- [ ] Breach scope documented
- [ ] Affected parties identified
- [ ] Risk assessment complete
- [ ] Remediation plan created
- [ ] Monitoring implemented

---

## General Best Practices

### Legal & Ethical
- Always comply with applicable laws
- Respect Terms of Service
- Obtain necessary authorizations
- Document all activities
- Maintain audit trail

### Technical
- Use rate limiting
- Respect robots.txt
- Implement retry logic
- Cache data appropriately
- Version control investigations

### Operational
- Document methodology
- Preserve evidence
- Timestamp all activities
- Cross-verify findings
- Maintain chain of custody

### Reporting
- Include executive summary
- Document methodology
- Present findings clearly
- Include evidence
- Assess confidence levels
- Provide recommendations

---

## Investigation Workflow Template

```markdown
## Investigation: [Name]
**Date**: [Date]
**Investigator**: [Name]
**Objective**: [Objective]

### Phase 1: Planning
- [ ] Define objectives
- [ ] Identify starting points
- [ ] Select tools/playbooks
- [ ] Establish timeline

### Phase 2: Collection
- [ ] Gather initial data
- [ ] Document sources
- [ ] Collect evidence
- [ ] Maintain chain of custody

### Phase 3: Analysis
- [ ] Analyze collected data
- [ ] Identify patterns
- [ ] Cross-reference findings
- [ ] Assess confidence

### Phase 4: Reporting
- [ ] Draft report
- [ ] Review findings
- [ ] Create visualizations
- [ ] Deliver report

### Findings
[Document findings here]

### Recommendations
[Document recommendations here]

### Evidence
[Link to evidence]
```

---

## Appendix: Tool Quick Reference

### Collection
- `CollectionScheduler` - Automated collection scheduling
- `SocialMediaCollector` - Social media data collection
- `DomainIntelCollector` - Domain intelligence
- `RSSFeedCollector` - RSS feed monitoring

### Analysis
- `SentimentAnalyzer` - Sentiment analysis
- `NetworkAnalyzer` - Network analysis
- `BotDetector` - Bot detection
- `ProfileAnalyzer` - Profile analysis

### Attribution
- `AttributionEngine` - Identity attribution
- `AccountCorrelator` - Account correlation
- `UsernameAnalyzer` - Username enumeration

### Scraping
- `ScraperEngine` - Web scraping
- `ChangeDetector` - Change detection
- `ContentExtractor` - Content extraction

---

*Last Updated: 2025-01-20*
