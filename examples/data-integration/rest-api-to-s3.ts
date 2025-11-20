/**
 * Example: Extract data from REST API and store in S3 as JSON
 */

import { createLogger, transports, format } from 'winston';
import { RESTAPIConnector } from '../../packages/data-integration/src/connectors/RESTAPIConnector';
import { S3Connector } from '../../packages/data-integration/src/connectors/S3Connector';
import { PipelineExecutor } from '../../packages/etl-framework/src/pipeline/PipelineExecutor';
import {
  DataSourceConfig,
  SourceType,
  ExtractionStrategy,
  LoadStrategy
} from '../../packages/data-integration/src/types';

const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()]
});

// Configure REST API source
const apiConfig: DataSourceConfig = {
  id: 'github-issues-extract',
  name: 'GitHub Issues API',
  type: SourceType.REST_API,

  connectionConfig: {
    host: 'https://api.github.com',
    apiKey: process.env.GITHUB_TOKEN
  },

  extractionConfig: {
    strategy: ExtractionStrategy.FULL,
    query: '/repos/octocat/Hello-World/issues',
    paginationConfig: {
      type: 'page',
      pageSize: 100,
      maxPages: 10
    },
    rateLimitConfig: {
      maxRequestsPerSecond: 1,
      maxRequestsPerMinute: 60,
      maxRequestsPerHour: 5000
    }
  },

  transformationConfig: {
    type: 'custom',
    transformations: [
      {
        id: 'extract-fields',
        name: 'Extract relevant fields',
        type: 'map',
        order: 1,
        config: {
          fieldMapping: {
            issue_id: 'id',
            issue_number: 'number',
            title: 'title',
            state: 'state',
            created_at: 'created_at',
            updated_at: 'updated_at',
            closed_at: 'closed_at',
            user_login: 'user.login',
            labels: 'labels',
            comments_count: 'comments'
          }
        }
      },
      {
        id: 'parse-dates',
        name: 'Parse date fields',
        type: 'typecast',
        order: 2,
        config: {
          typeMapping: {
            created_at: 'date',
            updated_at: 'date',
            closed_at: 'date'
          }
        }
      }
    ],
    validations: [
      {
        id: 'required-fields',
        name: 'Check required fields',
        type: 'schema',
        config: {
          requiredFields: ['issue_id', 'issue_number', 'title', 'state']
        },
        severity: 'error',
        action: 'fail'
      }
    ]
  },

  loadConfig: {
    strategy: LoadStrategy.APPEND_ONLY,
    targetTable: 'github_issues',
    targetDatabase: 'data-lake'
  },

  metadata: {
    description: 'Extract GitHub issues and store in data lake',
    owner: 'data-engineering',
    tags: ['github', 'api', 'issues'],
    endpoint: '/repos/octocat/Hello-World/issues'
  }
};

async function main() {
  try {
    logger.info('Starting GitHub Issues extraction to S3');

    const connector = new RESTAPIConnector(apiConfig, logger);
    const executor = new PipelineExecutor(logger);

    const run = await executor.execute(connector, apiConfig);

    logger.info('Extraction completed', {
      status: run.status,
      recordsExtracted: run.recordsExtracted,
      recordsLoaded: run.recordsLoaded
    });

    process.exit(0);
  } catch (error) {
    logger.error('Extraction failed', { error });
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { main };
