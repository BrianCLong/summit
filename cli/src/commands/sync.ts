/**
 * Sync Commands
 */

import { Command } from 'commander';
import ora from 'ora';
import type { CLIConfig } from '../lib/config.js';
import { getProfile } from '../lib/config.js';
import { GraphClient } from '../lib/graph-client.js';
import { PgVectorSync, type SyncStatus } from '../lib/pgvector-sync.js';
import { formatOutput, success, error, formatTable, progress } from '../utils/output.js';
import { handleError, ConnectionError, SyncError } from '../utils/errors.js';

export function registerSyncCommands(program: Command, config: CLIConfig): void {
  const sync = program
    .command('sync')
    .alias('s')
    .description('PgVector synchronization operations');

  sync
    .command('run')
    .description('Synchronize graph nodes to pgvector')
    .option('--batch-size <number>', 'Batch size for processing', '1000')
    .option('--dimension <number>', 'Embedding dimension', '1536')
    .option('--table <name>', 'Target table name', 'node_embeddings')
    .option('--truncate', 'Truncate table before sync')
    .option('--dry-run', 'Simulate sync without writing')
    .option('--profile <name>', 'Use named profile')
    .action(async (options) => {
      const spinner = ora('Initializing sync...').start();

      try {
        const profile = getProfile(config, options.profile);

        if (!profile.neo4j) {
          throw new ConnectionError('Neo4j configuration not found');
        }

        if (!profile.postgres) {
          throw new ConnectionError('PostgreSQL configuration not found');
        }

        // Initialize clients
        spinner.text = 'Connecting to databases...';
        const graphClient = new GraphClient(profile.neo4j);
        await graphClient.connect();

        const pgSync = new PgVectorSync(profile.postgres);
        pgSync.setGraphClient(graphClient);
        await pgSync.connect();

        // Run sync
        spinner.text = 'Running synchronization...';

        const status = await pgSync.syncFromGraph(
          {
            batchSize: parseInt(options.batchSize),
            embeddingDimension: parseInt(options.dimension),
            tableName: options.table,
            truncate: options.truncate,
            dryRun: options.dryRun,
          },
          (s: SyncStatus) => {
            spinner.text = `Syncing: ${s.progress}% (${s.stats.processedNodes}/${s.stats.totalNodes} nodes)`;
          }
        );

        await graphClient.disconnect();
        await pgSync.disconnect();

        spinner.stop();

        if (program.opts().json) {
          console.log(JSON.stringify(status, null, 2));
        } else {
          if (status.status === 'completed') {
            success(options.dryRun ? 'Dry run completed' : 'Sync completed successfully');
            console.log(`\nSync Statistics:`);
            console.log(`  Total Nodes: ${status.stats.totalNodes.toLocaleString()}`);
            console.log(`  Processed: ${status.stats.processedNodes.toLocaleString()}`);
            console.log(`  Inserted: ${status.stats.insertedRows.toLocaleString()}`);
            console.log(`  Updated: ${status.stats.updatedRows.toLocaleString()}`);
            console.log(`  Skipped: ${status.stats.skippedRows.toLocaleString()}`);
            console.log(`  Errors: ${status.stats.errors}`);
            console.log(`  Duration: ${(status.stats.duration / 1000).toFixed(2)}s`);
          } else {
            error(`Sync failed: ${status.error}`);
          }
        }
      } catch (err) {
        spinner.stop();
        handleError(err);
      }
    });

  sync
    .command('search <query>')
    .description('Search embeddings by similarity')
    .option('--limit <number>', 'Maximum results', '10')
    .option('--threshold <number>', 'Minimum similarity threshold')
    .option('--labels <labels>', 'Filter by labels (comma-separated)')
    .option('--table <name>', 'Table name', 'node_embeddings')
    .option('--profile <name>', 'Use named profile')
    .action(async (query: string, options) => {
      const spinner = ora('Searching embeddings...').start();

      try {
        const profile = getProfile(config, options.profile);

        if (!profile.postgres) {
          throw new ConnectionError('PostgreSQL configuration not found');
        }

        const pgSync = new PgVectorSync(profile.postgres);
        await pgSync.connect();

        // Generate query embedding (placeholder - in production call embedding service)
        const queryEmbedding = generateQueryEmbedding(query, 1536);

        const results = await pgSync.search(queryEmbedding, {
          limit: parseInt(options.limit),
          threshold: options.threshold ? parseFloat(options.threshold) : undefined,
          labels: options.labels?.split(','),
          tableName: options.table,
        });

        await pgSync.disconnect();

        spinner.stop();

        if (program.opts().json) {
          console.log(JSON.stringify(results, null, 2));
        } else {
          if (results.length === 0) {
            console.log('No results found');
          } else {
            const tableData = results.map((r) => ({
              id: r.id.substring(0, 20) + '...',
              similarity: r.similarity?.toFixed(4) || 'N/A',
              labels: (r.metadata?.labels as string[])?.join(', ') || '',
            }));
            console.log(formatTable(tableData));
            console.log(`\n${results.length} results found`);
          }
        }
      } catch (err) {
        spinner.stop();
        handleError(err);
      }
    });

  sync
    .command('get <nodeId>')
    .description('Get embedding for a specific node')
    .option('--table <name>', 'Table name', 'node_embeddings')
    .option('--profile <name>', 'Use named profile')
    .action(async (nodeId: string, options) => {
      try {
        const profile = getProfile(config, options.profile);

        if (!profile.postgres) {
          throw new ConnectionError('PostgreSQL configuration not found');
        }

        const pgSync = new PgVectorSync(profile.postgres);
        await pgSync.connect();

        const result = await pgSync.getEmbedding(nodeId, options.table);

        await pgSync.disconnect();

        if (!result) {
          error(`Embedding not found for node ${nodeId}`);
          process.exit(1);
        }

        if (program.opts().json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(`\nEmbedding for node ${nodeId}:`);
          console.log(`  Dimension: ${result.embedding.length}`);
          console.log(`  Labels: ${(result.metadata?.labels as string[])?.join(', ') || 'none'}`);
          console.log(`  Preview: [${result.embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
        }
      } catch (err) {
        handleError(err);
      }
    });

  sync
    .command('delete <nodeId>')
    .description('Delete embedding for a node')
    .option('--table <name>', 'Table name', 'node_embeddings')
    .option('--profile <name>', 'Use named profile')
    .action(async (nodeId: string, options) => {
      try {
        const profile = getProfile(config, options.profile);

        if (!profile.postgres) {
          throw new ConnectionError('PostgreSQL configuration not found');
        }

        const pgSync = new PgVectorSync(profile.postgres);
        await pgSync.connect();

        const deleted = await pgSync.deleteEmbedding(nodeId, options.table);

        await pgSync.disconnect();

        if (deleted) {
          success(`Embedding deleted for node ${nodeId}`);
        } else {
          error(`Embedding not found for node ${nodeId}`);
        }
      } catch (err) {
        handleError(err);
      }
    });

  sync
    .command('stats')
    .description('Show pgvector synchronization statistics')
    .option('--table <name>', 'Table name', 'node_embeddings')
    .option('--profile <name>', 'Use named profile')
    .action(async (options) => {
      const spinner = ora('Fetching statistics...').start();

      try {
        const profile = getProfile(config, options.profile);

        if (!profile.postgres) {
          throw new ConnectionError('PostgreSQL configuration not found');
        }

        const pgSync = new PgVectorSync(profile.postgres);
        await pgSync.connect();

        const stats = await pgSync.getStats(options.table);

        await pgSync.disconnect();

        spinner.stop();

        if (program.opts().json) {
          console.log(JSON.stringify(stats, null, 2));
        } else {
          console.log('\nPgVector Statistics:');
          console.log(`  Total Embeddings: ${stats.totalEmbeddings.toLocaleString()}`);
          console.log(`  Dimension: ${stats.dimension}`);
          console.log(`  Labels: ${stats.labels.join(', ') || 'none'}`);
          if (stats.lastUpdated) {
            console.log(`  Last Updated: ${stats.lastUpdated.toISOString()}`);
          }
        }
      } catch (err) {
        spinner.stop();
        handleError(err);
      }
    });

  sync
    .command('health')
    .description('Check pgvector connectivity')
    .option('--profile <name>', 'Use named profile')
    .action(async (options) => {
      const spinner = ora('Checking connection...').start();

      try {
        const profile = getProfile(config, options.profile);

        if (!profile.postgres) {
          throw new ConnectionError('PostgreSQL configuration not found');
        }

        const pgSync = new PgVectorSync(profile.postgres);
        const health = await pgSync.healthCheck();

        await pgSync.disconnect();

        spinner.stop();

        if (program.opts().json) {
          console.log(JSON.stringify(health, null, 2));
        } else {
          if (health.connected) {
            success(`Connected to PostgreSQL (${health.latencyMs}ms)`);
            if (health.pgvectorVersion) {
              console.log(`  pgvector version: ${health.pgvectorVersion}`);
            }
          } else {
            error('Failed to connect to PostgreSQL');
          }
        }
      } catch (err) {
        spinner.stop();
        handleError(err);
      }
    });

  sync
    .command('init')
    .description('Initialize pgvector table and indexes')
    .option('--dimension <number>', 'Embedding dimension', '1536')
    .option('--table <name>', 'Table name', 'node_embeddings')
    .option('--profile <name>', 'Use named profile')
    .action(async (options) => {
      const spinner = ora('Initializing table...').start();

      try {
        const profile = getProfile(config, options.profile);

        if (!profile.postgres) {
          throw new ConnectionError('PostgreSQL configuration not found');
        }

        const pgSync = new PgVectorSync(profile.postgres);
        await pgSync.connect();

        await pgSync.ensureTable({
          embeddingDimension: parseInt(options.dimension),
          tableName: options.table,
        });

        await pgSync.disconnect();

        spinner.stop();
        success(`Table ${options.table} initialized with dimension ${options.dimension}`);
      } catch (err) {
        spinner.stop();
        handleError(err);
      }
    });
}

/**
 * Generate a placeholder query embedding (in production, call embedding service)
 */
function generateQueryEmbedding(query: string, dimension: number): number[] {
  const hash = (str: string): number => {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h = h & h;
    }
    return h;
  };

  const seed = hash(query);
  const embedding: number[] = [];

  for (let i = 0; i < dimension; i++) {
    embedding.push(Math.sin(seed + i) * 0.5 + 0.5);
  }

  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map((val) => val / magnitude);
}
