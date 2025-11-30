# OSINT Collector

Comprehensive OSINT collection framework with multi-source data collection capabilities.

## Features

- **Multi-Source Collection**: Social media, web scraping, RSS feeds, public records, domain intelligence, and dark web monitoring
- **Automated Scheduling**: Cron-based scheduling for automated collection tasks
- **Priority Queue**: Intelligent task queue with priority-based processing
- **Rate Limiting**: Respectful crawling with configurable rate limits
- **Event-Driven Architecture**: Real-time events for monitoring collection progress

## Installation

```bash
pnpm install @intelgraph/osint-collector
```

## Usage

### Basic Collection

```typescript
import { SocialMediaCollector, CollectionTask } from '@intelgraph/osint-collector';

const collector = new SocialMediaCollector({
  name: 'twitter-collector',
  type: 'social_media',
  enabled: true,
  rateLimit: {
    requests: 100,
    period: 60000 // 100 requests per minute
  }
});

await collector.initialize();

const task: CollectionTask = {
  id: 'task-1',
  type: 'social_media',
  source: 'twitter',
  target: '#osint',
  priority: 5,
  scheduledAt: new Date(),
  status: 'pending',
  config: { platform: 'twitter' }
};

const result = await collector.collect(task);
```

### Automated Scheduling

```typescript
import { CollectionScheduler } from '@intelgraph/osint-collector';

const scheduler = new CollectionScheduler();

// Run every hour
scheduler.addSchedule({
  id: 'hourly-twitter-check',
  name: 'Twitter Monitoring',
  cronExpression: '0 * * * *',
  type: 'social_media',
  source: 'twitter',
  target: '#cybersecurity',
  priority: 5,
  enabled: true
});

scheduler.on('task:scheduled', (task) => {
  console.log('Task scheduled:', task);
});
```

### Collection Queue

```typescript
import { CollectionQueue } from '@intelgraph/osint-collector';

const queue = new CollectionQueue(5); // 5 concurrent workers

queue.on('task:processing', (task) => {
  console.log('Processing:', task.id);
});

queue.enqueue(task1);
queue.enqueue(task2);
queue.enqueueBatch([task3, task4, task5]);
```

## Collectors

### Social Media Collector
- Twitter, Facebook, LinkedIn, Instagram, TikTok
- Profile discovery and enrichment
- Timeline collection
- Hashtag monitoring
- Sentiment analysis

### Domain Intelligence Collector
- WHOIS lookups
- DNS record enumeration
- IP geolocation
- SSL certificate analysis
- Subdomain enumeration

### RSS Feed Collector
- RSS/Atom feed parsing
- Change detection
- Category filtering
- Keyword searching

### Dark Web Collector (Optional)
- Tor hidden service monitoring
- Marketplace tracking
- Forum monitoring
- Paste site monitoring
- Leaked database tracking

### Public Records Collector
- Court records
- Business registries
- Property records

## Configuration

Each collector accepts a `CollectorConfig`:

```typescript
interface CollectorConfig {
  name: string;
  type: CollectionType;
  enabled: boolean;
  rateLimit?: {
    requests: number;
    period: number;
  };
  timeout?: number;
  retryPolicy?: {
    maxRetries: number;
    backoff: 'linear' | 'exponential';
    initialDelay: number;
  };
  authentication?: {
    type: 'api_key' | 'oauth' | 'basic' | 'token';
    credentials: Record<string, string>;
  };
}
```

## Events

All collectors emit events:

- `collection:start` - Collection started
- `collection:complete` - Collection completed successfully
- `collection:error` - Collection failed

## License

MIT
