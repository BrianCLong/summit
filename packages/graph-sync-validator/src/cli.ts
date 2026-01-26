import { Command } from 'commander';
import { Client as PgClient } from 'pg';
import neo4j from 'neo4j-driver';
import fs from 'fs';
import yaml from 'yaml';
import { GraphSyncValidator, SyncConfig } from './validator';

const program = new Command();

program
  .name('graph-sync-validator')
  .description('Validate sync between Postgres and Neo4j')
  .version('1.0.0')
  .requiredOption('--config <path>', 'Path to mapping config YAML')
  .option('--pg-dsn <dsn>', 'Postgres DSN', process.env.PG_DSN)
  .option('--neo4j-uri <uri>', 'Neo4j URI', process.env.NEO4J_URI)
  .option('--neo4j-user <user>', 'Neo4j User', process.env.NEO4J_USER)
  .option('--neo4j-pass <pass>', 'Neo4j Password', process.env.NEO4J_PASS)
  .option('--output <path>', 'Path to output metrics.json', 'metrics.json')
  .action(async (options) => {
    const configContent = fs.readFileSync(options.config, 'utf8');
    const config = yaml.parse(configContent) as SyncConfig;

    const pgClient = new PgClient({
      connectionString: options.pgDsn
    });
    await pgClient.connect();

    const neo4jDriver = neo4j.driver(
      options.neo4jUri,
      neo4j.auth.basic(options.neo4jUser, options.neo4jPass)
    );

    const validator = new GraphSyncValidator(pgClient, neo4jDriver, config);

    try {
      const metrics = await validator.validate();
      fs.writeFileSync(options.output, JSON.stringify(metrics, null, 2));
      console.log(`Validation finished with status: ${metrics.status}`);
      console.log(`Metrics written to ${options.output}`);

      if (metrics.status === 'FAIL') {
        process.exit(1);
      }
    } catch (error) {
      console.error('Validation failed:', error);
      process.exit(1);
    } finally {
      await pgClient.end();
      await neo4jDriver.close();
    }
  });

program.parse();
