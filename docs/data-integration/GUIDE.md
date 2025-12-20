# IntelGraph Data Integration Platform - Comprehensive Guide

## Overview

The IntelGraph Data Integration Platform is an enterprise-grade ETL/ELT system designed to rival industry leaders like Fivetran, Talend, and Informatica. It provides comprehensive capabilities for:

- **100+ Data Source Connectors**: Databases, REST APIs, cloud storage, SaaS platforms, and more
- **Robust ETL/ELT Pipelines**: Full extraction, transformation, validation, enrichment, and loading
- **Data Quality & Validation**: Schema validation, type checking, format validation, and anomaly detection
- **Data Lineage Tracking**: End-to-end and column-level lineage with impact analysis
- **Pipeline Orchestration**: Apache Airflow integration with cron-based and event-driven scheduling
- **Monitoring & Observability**: Real-time metrics, alerting, and operational dashboards

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Orchestration Layer                      │
│  (Apache Airflow + Scheduler + Workflow Management)        │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                  ETL/ELT Framework                          │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Extraction  │→ │Transformation│→ │  Validation  │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│         │                                     │            │
│  ┌──────┴──────┐                       ┌─────┴─────┐     │
│  │ Enrichment  │                       │  Loading  │     │
│  └─────────────┘                       └───────────┘     │
└─────────────────────────────────────────────────────────────┘
         │                                         │
┌────────┴────────────┐                  ┌────────┴────────────┐
│  Data Connectors    │                  │  Data Lineage &     │
│                     │                  │  Governance         │
│  • PostgreSQL       │                  │                     │
│  • MySQL            │                  │  • Lineage Tracking │
│  • MongoDB          │                  │  • PII Detection    │
│  • REST APIs        │                  │  • Data Catalog     │
│  • S3/GCS/Azure     │                  │  • Compliance       │
│  • SaaS Platforms   │                  └─────────────────────┘
│  • 100+ more...     │
└─────────────────────┘
```

## Quick Start

### 1. Installation

```bash
# Clone repository
git clone https://github.com/your-org/summit.git
cd summit

# Install dependencies
pnpm install

# Build packages
pnpm run build

# Start Airflow infrastructure
cd infrastructure/airflow
docker-compose up -d
```

### 2. Create Your First Pipeline

```typescript
import { DataSourceConfig, SourceType, ExtractionStrategy, LoadStrategy } from '@intelgraph/data-integration';
import { PipelineOrchestrator } from '@intelgraph/orchestration';

// Configure data source
const config: DataSourceConfig = {
  id: 'salesforce-contacts',
  name: 'Salesforce Contacts Pipeline',
  type: SourceType.REST_API,

  // Connection configuration
  connectionConfig: {
    host: 'https://api.salesforce.com',
    apiKey: process.env.SALESFORCE_API_KEY,
    oauth: {
      clientId: process.env.SALESFORCE_CLIENT_ID,
      clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
      tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
      refreshToken: process.env.SALESFORCE_REFRESH_TOKEN
    }
  },

  // Extraction configuration
  extractionConfig: {
    strategy: ExtractionStrategy.INCREMENTAL,
    query: '/services/data/v58.0/query/?q=SELECT Id, Name, Email FROM Contact',
    incrementalColumn: 'LastModifiedDate',
    paginationConfig: {
      type: 'cursor',
      pageSize: 1000
    },
    rateLimitConfig: {
      maxRequestsPerSecond: 10,
      maxRequestsPerMinute: 500,
      maxRequestsPerHour: 25000
    }
  },

  // Transformation configuration
  transformationConfig: {
    type: 'custom',
    transformations: [
      {
        id: 'map-fields',
        name: 'Map Salesforce fields to target schema',
        type: 'map',
        order: 1,
        config: {
          fieldMapping: {
            'contact_id': 'Id',
            'full_name': 'Name',
            'email_address': 'Email'
          }
        }
      },
      {
        id: 'normalize-email',
        name: 'Normalize email addresses',
        type: 'normalize',
        order: 2,
        config: {
          stringFields: ['email_address']
        }
      }
    ],
    validations: [
      {
        id: 'email-format',
        name: 'Validate email format',
        type: 'format',
        config: {
          field: 'email_address',
          format: 'email'
        },
        severity: 'error',
        action: 'skip'
      }
    ],
    enrichments: [
      {
        id: 'enrich-company',
        name: 'Enrich with company data',
        type: 'lookup',
        config: {
          lookupField: 'AccountId',
          lookupTable: 'companies'
        },
        targetFields: ['company_name', 'company_industry']
      }
    ]
  },

  // Load configuration
  loadConfig: {
    strategy: LoadStrategy.UPSERT,
    targetTable: 'contacts',
    targetSchema: 'public',
    upsertKey: ['contact_id'],
    batchSize: 1000
  },

  // Schedule configuration
  scheduleConfig: {
    type: 'cron',
    cronExpression: '0 */6 * * *', // Every 6 hours
    enabled: true,
    timezone: 'UTC'
  },

  metadata: {
    description: 'Sync Salesforce contacts to data warehouse',
    owner: 'data-engineering',
    tags: ['salesforce', 'crm', 'contacts']
  }
};

// Create and execute pipeline
const orchestrator = new PipelineOrchestrator(logger);
const pipeline = await orchestrator.createPipeline(config);
const run = await orchestrator.executePipeline(pipeline.id);

console.log(`Pipeline completed: ${run.recordsLoaded} records loaded`);
```

## Supported Data Sources

### Databases
- PostgreSQL (with streaming support)
- MySQL
- Oracle
- SQL Server
- MongoDB
- Cassandra
- Redis
- Elasticsearch
- DynamoDB

### Cloud Storage
- AWS S3
- Google Cloud Storage (GCS)
- Azure Blob Storage
- HDFS
- MinIO

### SaaS Platforms
- Salesforce
- HubSpot
- Jira
- ServiceNow
- Zendesk
- Intercom
- Stripe
- Shopify

### Social Media
- Twitter API
- Facebook Graph API
- LinkedIn API
- Reddit API
- YouTube API

### Financial Data
- Bloomberg Terminal
- Reuters DataScope
- Alpha Vantage
- IEX Cloud
- Polygon.io

### Threat Intelligence
- STIX/TAXII feeds
- MISP
- OpenCTI
- ThreatConnect
- AlienVault OTX

### Communication
- IMAP/SMTP
- Microsoft Exchange
- Gmail API
- Slack API
- Microsoft Teams

### Custom Connectors
- Webhook receivers
- Kafka streams
- Custom SDK for building new connectors

## Extraction Strategies

### Full Extraction
Complete dataset extraction on each run.

```typescript
extractionConfig: {
  strategy: ExtractionStrategy.FULL,
  batchSize: 10000
}
```

### Incremental Extraction
Only extract changed/new records since last run.

```typescript
extractionConfig: {
  strategy: ExtractionStrategy.INCREMENTAL,
  incrementalColumn: 'updated_at',
  lastExtractedValue: '2025-01-01T00:00:00Z'
}
```

### Change Data Capture (CDC)
Real-time capture of database changes.

```typescript
extractionConfig: {
  strategy: ExtractionStrategy.CDC,
  cdcConfig: {
    replicationSlot: 'intelgraph_slot',
    publications: ['all_tables']
  }
}
```

### Real-Time Streaming
Continuous data streaming.

```typescript
extractionConfig: {
  strategy: ExtractionStrategy.REAL_TIME,
  streamConfig: {
    topic: 'events',
    consumerGroup: 'intelgraph-etl'
  }
}
```

## Data Transformations

### SQL-Based Transformations
```typescript
transformationConfig: {
  type: 'sql',
  transformations: [
    {
      id: 'aggregate',
      name: 'Aggregate sales by region',
      type: 'sql',
      config: {
        query: `
          SELECT
            region,
            DATE_TRUNC('day', sale_date) as day,
            SUM(amount) as total_sales,
            COUNT(*) as transaction_count
          FROM sales
          GROUP BY region, day
        `
      }
    }
  ]
}
```

### Python/Pandas Transformations
```typescript
transformationConfig: {
  type: 'python',
  transformations: [
    {
      id: 'clean-text',
      name: 'Clean text fields',
      type: 'custom',
      config: {
        transformFunction: (record) => {
          record.description = record.description
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s]/g, '');
          return record;
        }
      }
    }
  ]
}
```

## Data Quality & Validation

### Schema Validation
```typescript
validations: [
  {
    id: 'required-fields',
    name: 'Check required fields',
    type: 'schema',
    config: {
      requiredFields: ['id', 'name', 'email', 'created_at']
    },
    severity: 'error',
    action: 'fail'
  }
]
```

### Type Validation
```typescript
validations: [
  {
    id: 'email-type',
    name: 'Validate email type',
    type: 'type',
    config: {
      field: 'email',
      expectedType: 'string'
    },
    severity: 'error',
    action: 'skip'
  }
]
```

### Range Validation
```typescript
validations: [
  {
    id: 'age-range',
    name: 'Validate age range',
    type: 'range',
    config: {
      field: 'age',
      min: 0,
      max: 120
    },
    severity: 'warning',
    action: 'warn'
  }
]
```

### Format Validation
```typescript
validations: [
  {
    id: 'phone-format',
    name: 'Validate phone format',
    type: 'format',
    config: {
      field: 'phone',
      format: 'phone'  // email, phone, url, date, uuid
    },
    severity: 'error',
    action: 'quarantine'
  }
]
```

## Data Enrichment

### Geolocation Enrichment
```typescript
enrichments: [
  {
    id: 'geo-enrich',
    name: 'Enrich with geolocation',
    type: 'geolocation',
    config: {
      sourceField: 'address'
    },
    targetFields: ['latitude', 'longitude', 'country', 'city']
  }
]
```

### Entity Resolution
```typescript
enrichments: [
  {
    id: 'entity-resolve',
    name: 'Resolve company entities',
    type: 'entity_resolution',
    config: {
      entityField: 'company_name',
      entityType: 'organization'
    },
    targetFields: ['company_id', 'confidence_score', 'aliases']
  }
]
```

### Machine Learning Enrichment
```typescript
enrichments: [
  {
    id: 'sentiment',
    name: 'Sentiment analysis',
    type: 'ml',
    config: {
      modelType: 'sentiment',
      inputFields: ['review_text']
    },
    targetFields: ['sentiment', 'sentiment_confidence']
  }
]
```

## Load Strategies

### Bulk Load
```typescript
loadConfig: {
  strategy: LoadStrategy.BULK,
  targetTable: 'events',
  batchSize: 10000
}
```

### Upsert (Insert/Update)
```typescript
loadConfig: {
  strategy: LoadStrategy.UPSERT,
  targetTable: 'customers',
  upsertKey: ['customer_id'],
  batchSize: 1000
}
```

### Slowly Changing Dimension (SCD) Type 2
```typescript
loadConfig: {
  strategy: LoadStrategy.SCD_TYPE2,
  targetTable: 'dim_customer',
  upsertKey: ['customer_id'],
  timestampColumn: 'effective_from'
}
```

## Data Lineage & Governance

### Track Lineage
```typescript
import { LineageTracker } from '@intelgraph/data-lineage';

const lineageTracker = new LineageTracker(logger);

// Track source
lineageTracker.trackSource('salesforce-api', 'Salesforce API', {
  endpoint: 'https://api.salesforce.com',
  objectType: 'Contact'
});

// Track transformation
lineageTracker.trackTransformation(
  'transform-1',
  'Map and normalize fields',
  'salesforce-api',
  { transformationType: 'mapping' }
);

// Track target
lineageTracker.trackTarget(
  'postgres-contacts',
  'contacts table',
  'transform-1',
  { schema: 'public', table: 'contacts' }
);

// Get impact analysis
const impact = lineageTracker.getImpactAnalysis('salesforce-api');
console.log(`${impact.affectedCount} downstream nodes would be affected`);
```

## Monitoring & Observability

### Pipeline Metrics
- Records extracted, transformed, loaded, failed
- Processing duration and throughput
- Data quality scores
- Resource utilization (CPU, memory)
- Cost tracking

### Alerting
- Pipeline failures
- Data quality issues
- SLA violations
- Performance degradation
- Resource constraints

### Dashboards
- Pipeline health overview
- Data freshness tracking
- Quality trend analysis
- Lineage visualization
- Cost optimization insights

## Best Practices

### 1. Incremental Loading
Always use incremental extraction when possible to reduce data transfer and processing costs.

### 2. Data Quality First
Implement comprehensive validation rules to catch data quality issues early in the pipeline.

### 3. Error Handling
Use dead letter queues for failed records and implement retry logic with exponential backoff.

### 4. Monitoring
Set up alerts for pipeline failures, data quality degradation, and SLA violations.

### 5. Lineage Tracking
Enable lineage tracking for all pipelines to support impact analysis and compliance.

### 6. Testing
Test pipelines with sample data before deploying to production.

### 7. Documentation
Document data sources, transformations, and business logic for all pipelines.

## Troubleshooting

### Pipeline Failures
1. Check pipeline logs for error messages
2. Verify source connectivity
3. Validate configuration
4. Check resource availability
5. Review error patterns

### Performance Issues
1. Optimize batch sizes
2. Enable parallel processing
3. Add indexes to target tables
4. Use incremental extraction
5. Monitor resource utilization

### Data Quality Issues
1. Review validation rules
2. Check source data quality
3. Verify transformation logic
4. Analyze failed records
5. Implement data profiling

## Support & Resources

- Documentation: https://docs.intelgraph.io/data-integration
- API Reference: https://api-docs.intelgraph.io
- GitHub: https://github.com/your-org/summit
- Community Forum: https://community.intelgraph.io
- Support: support@intelgraph.io

## License

MIT License - see LICENSE file for details
