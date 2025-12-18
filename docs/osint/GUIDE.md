# OSINT Automation Platform - User Guide

## Overview

The IntelGraph OSINT Automation Platform provides comprehensive capabilities for Open Source Intelligence gathering, analysis, and dissemination. This guide covers installation, configuration, and usage of all OSINT modules.

## Architecture

The platform consists of several integrated packages and services:

### Core Packages

1. **@intelgraph/osint-collector** - Multi-source data collection framework
2. **@intelgraph/web-scraper** - Advanced web scraping with JavaScript rendering
3. **@intelgraph/social-media-intel** - Social media intelligence (SOCMINT) analysis
4. **@intelgraph/attribution-engine** - Digital identity attribution and footprint analysis
5. **@intelgraph/osint-search** - Search engine for collected OSINT data

### Services

1. **osint-service** - REST API for OSINT operations
2. **enrichment-service** - Data enrichment and analysis service

## Installation

```bash
# Install all OSINT packages
pnpm install

# Build packages
pnpm --filter "@intelgraph/osint-*" build
pnpm --filter "@intelgraph/web-scraper" build
pnpm --filter "@intelgraph/social-media-intel" build
pnpm --filter "@intelgraph/attribution-engine" build

# Build services
pnpm --filter "@intelgraph/osint-service" build
pnpm --filter "@intelgraph/enrichment-service" build
```

## Quick Start

### 1. Start Services

```bash
# Start OSINT service
cd services/osint-service
pnpm start

# Start enrichment service
cd services/enrichment-service
pnpm start
```

### 2. Basic Collection

```typescript
import { SocialMediaCollector } from '@intelgraph/osint-collector';

const collector = new SocialMediaCollector({
  name: 'twitter-collector',
  type: 'social_media',
  enabled: true
});

await collector.initialize();

const result = await collector.collect({
  id: 'task-1',
  type: 'social_media',
  source: 'twitter',
  target: '#osint',
  priority: 5,
  scheduledAt: new Date(),
  status: 'pending',
  config: { platform: 'twitter' }
});
```

### 3. Web Scraping

```typescript
import { ScraperEngine } from '@intelgraph/web-scraper';

const engine = new ScraperEngine();
await engine.initialize();

const result = await engine.scrape({
  id: 'scrape-1',
  url: 'https://example.com',
  method: 'dynamic',
  options: {
    renderJavaScript: true,
    screenshot: true,
    extractLinks: true
  }
});
```

### 4. Social Media Analysis

```typescript
import { SentimentAnalyzer, BotDetector } from '@intelgraph/social-media-intel';

// Sentiment analysis
const sentimentAnalyzer = new SentimentAnalyzer();
const sentiment = sentimentAnalyzer.analyze(post.content);

// Bot detection
const botDetector = new BotDetector();
const botScore = botDetector.analyze(profile, posts);
```

### 5. Attribution

```typescript
import { AttributionEngine } from '@intelgraph/attribution-engine';

const engine = new AttributionEngine();
const result = await engine.attributeIdentity('username@example.com');

console.log(`Found ${result.accounts.length} accounts`);
console.log(`Related identifiers:`, result.identifiers);
```

## Configuration

### Environment Variables

```bash
# OSINT Service
OSINT_SERVICE_PORT=3010
OSINT_SERVICE_API_KEY=your_api_key_here

# Enrichment Service
ENRICHMENT_SERVICE_PORT=3011

# Data Storage
OSINT_DATA_PATH=/var/osint/data
OSINT_CACHE_PATH=/var/osint/cache

# Rate Limiting
OSINT_RATE_LIMIT_REQUESTS=100
OSINT_RATE_LIMIT_PERIOD=60000

# Browser Pool
OSINT_MAX_BROWSERS=5
OSINT_BROWSER_HEADLESS=true

# External APIs (optional)
TWITTER_API_KEY=your_key
TWITTER_API_SECRET=your_secret
TWITTER_BEARER_TOKEN=your_token
```

### Collection Configuration

```typescript
const collectorConfig = {
  name: 'my-collector',
  type: 'social_media',
  enabled: true,
  rateLimit: {
    requests: 100,
    period: 60000 // 1 minute
  },
  timeout: 30000,
  retryPolicy: {
    maxRetries: 3,
    backoff: 'exponential',
    initialDelay: 1000
  },
  authentication: {
    type: 'api_key',
    credentials: {
      apiKey: process.env.TWITTER_API_KEY
    }
  }
};
```

## Use Cases

### 1. Social Media Monitoring

Monitor social media for specific keywords, hashtags, or accounts:

```typescript
import { CollectionScheduler } from '@intelgraph/osint-collector';

const scheduler = new CollectionScheduler();

// Monitor hashtag every hour
scheduler.addSchedule({
  id: 'monitor-cybersecurity',
  name: 'Cybersecurity Hashtag Monitor',
  cronExpression: '0 * * * *', // Every hour
  type: 'social_media',
  source: 'twitter',
  target: '#cybersecurity',
  priority: 5,
  enabled: true
});
```

### 2. Website Change Detection

Monitor websites for changes:

```typescript
import { ChangeDetector, ScraperEngine } from '@intelgraph/web-scraper';

const engine = new ScraperEngine();
const detector = new ChangeDetector();

await engine.initialize();

setInterval(async () => {
  const result = await engine.scrape({
    id: `check-${Date.now()}`,
    url: 'https://target-site.com',
    method: 'static'
  });

  const changes = await detector.detectChanges(
    result.url,
    result.content.html || ''
  );

  if (changes.changed) {
    console.log('Site changed!', changes.diff);
  }
}, 3600000); // Check every hour
```

### 3. Account Investigation

Investigate a person across multiple platforms:

```typescript
import { AttributionEngine } from '@intelgraph/attribution-engine';
import { AccountCorrelator } from '@intelgraph/social-media-intel';

const attribution = new AttributionEngine();
const correlator = new AccountCorrelator();

// Start with one identifier
const footprint = await attribution.buildDigitalFootprint('target@example.com');

// Find related accounts
const correlations = correlator.correlateAccounts(footprint.accounts);

// Analyze each correlated account
for (const correlation of correlations) {
  console.log(`Confidence: ${correlation.confidence}`);
  console.log(`Evidence:`, correlation.evidence);
}
```

### 4. Influencer Identification

Find and rank influencers in a specific domain:

```typescript
import { InfluencerScorer } from '@intelgraph/social-media-intel';

const scorer = new InfluencerScorer();

const profiles = [/* array of profiles */];
const scores = profiles.map(profile =>
  scorer.scoreInfluencer(profile, recentPosts)
);

const ranked = scorer.rankInfluencers(scores);

console.log('Top 10 Influencers:');
ranked.slice(0, 10).forEach(score => {
  console.log(`${score.rank}. ${score.username} - Score: ${score.overallScore}`);
});
```

## Best Practices

### 1. Rate Limiting

Always configure appropriate rate limits to avoid being blocked:

```typescript
import { RateLimiter } from '@intelgraph/osint-collector';

const limiter = new RateLimiter();
limiter.createLimiter('twitter', 15, 900); // 15 requests per 15 minutes

await limiter.consume('twitter');
```

### 2. Robots.txt Compliance

Respect robots.txt when scraping:

```typescript
import { checkRobotsTxt } from '@intelgraph/web-scraper';

const allowed = await checkRobotsTxt(url, 'IntelGraphBot');
if (!allowed) {
  console.log('Scraping not allowed by robots.txt');
  return;
}
```

### 3. Error Handling

Implement proper error handling and retry logic:

```typescript
import { retryWithBackoff } from '@intelgraph/osint-collector';

const result = await retryWithBackoff(
  async () => await collector.collect(task),
  3,  // maxRetries
  1000 // initialDelay
);
```

### 4. Data Privacy

Always consider privacy and legal implications:

- Respect Terms of Service
- Comply with data protection regulations (GDPR, CCPA)
- Implement data retention policies
- Redact PII when necessary
- Maintain audit logs

## API Reference

### REST API Endpoints

#### Collection

```
POST /api/collect
Body: {
  "type": "social_media",
  "source": "twitter",
  "target": "#osint"
}
```

#### Scraping

```
POST /api/scrape
Body: {
  "url": "https://example.com",
  "method": "dynamic",
  "options": {
    "screenshot": true
  }
}
```

#### Attribution

```
POST /api/attribute
Body: {
  "identifier": "username@example.com"
}
```

#### Enrichment

```
POST /api/enrich/sentiment
Body: {
  "text": "This is a great day!"
}

POST /api/enrich/profile
Body: {
  "profile": { /* profile object */ }
}
```

## Troubleshooting

### Common Issues

1. **Browser Pool Exhaustion**
   - Increase `OSINT_MAX_BROWSERS`
   - Implement request queuing
   - Optimize scraping frequency

2. **Rate Limiting**
   - Adjust rate limit configurations
   - Implement backoff strategies
   - Use multiple API keys

3. **Memory Issues**
   - Limit concurrent operations
   - Implement data pagination
   - Clear caches regularly

## Support

For issues, questions, or contributions:

- GitHub: https://github.com/your-org/intelgraph
- Documentation: https://docs.intelgraph.com
- Email: support@intelgraph.com

## License

MIT License - See LICENSE file for details
