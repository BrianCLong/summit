import { Driver, Session } from 'neo4j-driver';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import pino from 'pino';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { writeAudit } from '../utils/audit.js';

const gzip = promisify(zlib.gzip);
const logger = pino().child({ name: 'GraphArchivalService' });

export interface GraphArchivalPolicy {
  label: string;
  ageThresholdDays: number;
  batchSize: number;
  targetTier: 'S3_STANDARD' | 'S3_STANDARD_IA' | 'GLACIER' | 'DEEP_ARCHIVE';
  dateProperty: string; // e.g. 'createdAt'
}

export interface GraphArchivalConfig {
  s3Bucket: string;
  s3Region: string;
  policies: GraphArchivalPolicy[];
  checkIntervalHours: number;
  enabled: boolean;
}

const DEFAULT_CONFIG: GraphArchivalConfig = {
  s3Bucket: process.env.ARCHIVAL_S3_BUCKET || 'intelgraph-archives',
  s3Region: process.env.AWS_REGION || 'us-east-1',
  checkIntervalHours: 24,
  enabled: process.env.GRAPH_ARCHIVAL_ENABLED === 'true',
  policies: [
    {
      label: 'Event',
      ageThresholdDays: 365,
      batchSize: 100,
      targetTier: 'GLACIER',
      dateProperty: 'createdAt'
    },
    // Add more default policies as needed
  ],
};

export class GraphArchivalService {
  private neo4j: Driver;
  private s3Client: S3Client;
  private config: GraphArchivalConfig;
  private checkInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(driver: Driver, config: Partial<GraphArchivalConfig> = {}) {
    this.neo4j = driver;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.s3Client = new S3Client({ region: this.config.s3Region });
  }

  public start() {
    if (this.checkInterval) {
      return;
    }

    if (this.config.enabled) {
      logger.info('Graph Archival Service started');
      // Run immediately
      this.runArchivalCycle().catch(err => logger.error({ err }, 'Error in initial archival cycle'));

      this.checkInterval = setInterval(
        () => this.runArchivalCycle(),
        this.config.checkIntervalHours * 60 * 60 * 1000
      );
    } else {
      logger.info('Graph Archival Service is disabled');
    }
  }

  public stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info('Graph Archival Service stopped');
    }
  }

  public async runArchivalCycle() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      logger.info('Starting graph archival cycle');
      for (const policy of this.config.policies) {
        await this.executePolicy(policy);
      }
    } catch (error) {
      logger.error({ error }, 'Graph archival cycle failed');
    } finally {
      this.isRunning = false;
    }
  }

  private async executePolicy(policy: GraphArchivalPolicy) {
    const session = this.neo4j.session();
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.ageThresholdDays);
      const cutoffTimestamp = cutoffDate.toISOString();

      // Find candidates
      // We look for nodes that are NOT already archived (missing _archived property)
      const countQuery = `
        MATCH (n:${policy.label})
        WHERE n.${policy.dateProperty} < datetime($cutoffTimestamp)
          AND n._archived IS NULL
        RETURN count(n) as count
      `;

      const result = await session.run(countQuery, { cutoffTimestamp });
      const count = result.records[0].get('count').toNumber();

      if (count === 0) {
        return;
      }

      logger.info({ policy: policy.label, count }, 'Found graph nodes to archive');

      // Process in batches
      let processed = 0;
      while (processed < count) {
        // Fetch batch
        // We fetch elementId to safely identify nodes for update
        const fetchQuery = `
          MATCH (n:${policy.label})
          WHERE n.${policy.dateProperty} < datetime($cutoffTimestamp)
            AND n._archived IS NULL
          WITH n LIMIT toInteger($batchSize)
          RETURN n, properties(n) as props, elementId(n) as eid
        `;

        const batchResult = await session.run(fetchQuery, {
          cutoffTimestamp,
          batchSize: policy.batchSize
        });

        if (batchResult.records.length === 0) break;

        const batchData = batchResult.records.map(r => {
          const node = r.get('n');
          const props = r.get('props');
          const eid = r.get('eid');
          return {
            elementId: eid,
            id: props.id || eid, // Fallback ID for JSON export
            labels: node.labels,
            properties: props
          };
        });

        // Archive to S3
        const key = `graph/${policy.label}/${cutoffDate.getFullYear()}/${Date.now()}_${processed}.json.gz`;
        await this.uploadToS3(key, batchData, policy.targetTier);

        // Stub the nodes using elementId
        const elementIds = batchData.map(d => d.elementId);

        await this.stubNodes(session, policy, elementIds, key);

        processed += batchData.length;

        await writeAudit({
          action: 'GRAPH_ARCHIVED',
          resourceType: policy.label,
          details: {
            count: batchData.length,
            s3Key: key,
            policy: policy.label
          }
        });
      }

    } catch (error) {
      logger.error({ error, policy: policy.label }, 'Error executing graph archival policy');
    } finally {
      await session.close();
    }
  }

  private async uploadToS3(key: string, data: any, tier: string) {
    const json = JSON.stringify(data);
    const buffer = await gzip(json);

    const upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: this.config.s3Bucket,
        Key: key,
        Body: buffer,
        StorageClass: tier,
        ContentType: 'application/json',
        ContentEncoding: 'gzip',
        Metadata: {
          timestamp: new Date().toISOString()
        }
      }
    });

    await upload.done();
  }

  private async stubNodes(session: Session, policy: GraphArchivalPolicy, elementIds: string[], s3Key: string) {
    // We match by elementId(n) to ensure we get the exact nodes we just exported

    const stubQuery = `
      UNWIND $elementIds as eid
      MATCH (n:${policy.label})
      WHERE elementId(n) = eid
      WITH n
      // Copy properties we want to keep
      WITH n, n.id as savedId, n.${policy.dateProperty} as savedDate
      // Remove all properties
      SET n = {}
      // Restore kept properties and add archive markers
      // If original node didn't have an ID, we don't set it (savedId will be null)
      FOREACH (_ IN CASE WHEN savedId IS NOT NULL THEN [1] ELSE [] END | SET n.id = savedId)
      SET n.${policy.dateProperty} = savedDate
      SET n._archived = true
      SET n._archivedAt = datetime()
      SET n._archiveRef = $s3Key
    `;

    await session.run(stubQuery, { elementIds, s3Key });
  }

  // Method to restore a specific node (for future use)
  public async restoreNode(id: string, label: string) {
    // This would involve fetching from S3 and updating the node
    // Implementation deferred
  }
}
