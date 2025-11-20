/**
 * Example: Sync Salesforce contacts to PostgreSQL
 */

import { createLogger, transports, format } from 'winston';
import { SalesforceConnector } from '../../packages/data-integration/src/connectors/SalesforceConnector';
import { PipelineExecutor } from '../../packages/etl-framework/src/pipeline/PipelineExecutor';
import {
  DataSourceConfig,
  SourceType,
  ExtractionStrategy,
  LoadStrategy
} from '../../packages/data-integration/src/types';

// Setup logger
const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()]
});

// Configure Salesforce source
const config: DataSourceConfig = {
  id: 'salesforce-contacts-sync',
  name: 'Salesforce Contacts',
  type: SourceType.SAAS,

  connectionConfig: {
    host: 'https://login.salesforce.com',
    oauth: {
      clientId: process.env.SALESFORCE_CLIENT_ID!,
      clientSecret: process.env.SALESFORCE_CLIENT_SECRET!,
      tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
      refreshToken: process.env.SALESFORCE_REFRESH_TOKEN!
    }
  },

  extractionConfig: {
    strategy: ExtractionStrategy.INCREMENTAL,
    incrementalColumn: 'LastModifiedDate',
    lastExtractedValue: process.env.LAST_SYNC_DATE,
    batchSize: 1000,
    rateLimitConfig: {
      maxRequestsPerSecond: 10,
      maxRequestsPerMinute: 500,
      maxRequestsPerHour: 25000
    }
  },

  transformationConfig: {
    type: 'custom',
    transformations: [
      {
        id: 'map-fields',
        name: 'Map Salesforce fields',
        type: 'map',
        order: 1,
        config: {
          fieldMapping: {
            contact_id: 'Id',
            first_name: 'FirstName',
            last_name: 'LastName',
            email: 'Email',
            phone: 'Phone',
            account_id: 'AccountId',
            created_date: 'CreatedDate',
            modified_date: 'LastModifiedDate'
          }
        }
      },
      {
        id: 'normalize-email',
        name: 'Normalize email addresses',
        type: 'normalize',
        order: 2,
        config: {
          stringFields: ['email']
        }
      },
      {
        id: 'typecast',
        name: 'Cast field types',
        type: 'typecast',
        order: 3,
        config: {
          typeMapping: {
            created_date: 'date',
            modified_date: 'date'
          }
        }
      }
    ],
    validations: [
      {
        id: 'email-required',
        name: 'Email is required',
        type: 'null',
        config: {
          field: 'email',
          allowNull: false
        },
        severity: 'error',
        action: 'skip'
      },
      {
        id: 'email-format',
        name: 'Validate email format',
        type: 'format',
        config: {
          field: 'email',
          format: 'email'
        },
        severity: 'error',
        action: 'skip'
      }
    ],
    enrichments: [
      {
        id: 'enrich-account',
        name: 'Enrich with account data',
        type: 'lookup',
        config: {
          lookupField: 'account_id',
          lookupTable: 'accounts',
          lookupKey: 'account_id'
        },
        targetFields: ['account_name', 'account_industry', 'account_revenue']
      }
    ]
  },

  loadConfig: {
    strategy: LoadStrategy.UPSERT,
    targetTable: 'contacts',
    targetSchema: 'public',
    targetDatabase: 'analytics',
    upsertKey: ['contact_id'],
    batchSize: 1000,
    errorHandling: {
      onError: 'skip',
      maxErrors: 100,
      errorLogTable: 'etl_errors'
    }
  },

  scheduleConfig: {
    type: 'cron',
    cronExpression: '0 */6 * * *', // Every 6 hours
    enabled: true,
    timezone: 'America/New_York'
  },

  metadata: {
    description: 'Sync Salesforce contacts to PostgreSQL analytics database',
    owner: 'data-engineering',
    tags: ['salesforce', 'crm', 'contacts', 'bi'],
    sobjectType: 'Contact'
  }
};

// Execute pipeline
async function main() {
  try {
    logger.info('Starting Salesforce to PostgreSQL sync');

    const connector = new SalesforceConnector(config, logger);
    const executor = new PipelineExecutor(logger);

    // Listen to events
    executor.on('pipeline:started', (run) => {
      logger.info(`Pipeline started: ${run.id}`);
    });

    executor.on('pipeline:progress', (progress) => {
      logger.info(`Progress: ${progress.recordsExtracted} extracted, ${progress.recordsLoaded} loaded`);
    });

    executor.on('pipeline:completed', (run) => {
      logger.info(`Pipeline completed successfully`, {
        recordsExtracted: run.recordsExtracted,
        recordsLoaded: run.recordsLoaded,
        recordsFailed: run.recordsFailed,
        durationMs: run.metrics.totalDurationMs
      });
    });

    executor.on('pipeline:failed', (run) => {
      logger.error(`Pipeline failed`, {
        errors: run.errors
      });
    });

    // Execute
    const run = await executor.execute(connector, config);

    logger.info('Sync completed', {
      status: run.status,
      recordsLoaded: run.recordsLoaded,
      duration: `${run.metrics.totalDurationMs / 1000}s`
    });

    process.exit(0);
  } catch (error) {
    logger.error('Sync failed', { error });
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { main };
