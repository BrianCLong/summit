#!/usr/bin/env node
import { Command } from 'commander';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { load as loadYaml } from 'js-yaml';
import { Pool } from 'pg';
import neo4j from 'neo4j-driver';
import { glob } from 'glob';
import { PgLoader } from './loader/pg.js';
import { Neo4jLoader } from './loader/neo4j.js';
import { diffStream } from './diff/compare.js';
import { createReport } from './report/emit.js';
import { generatePlan } from './autofix/plan.js';
import { Selector, DriftFinding } from './types.js';
import chalk from 'chalk';
import path from 'path';

const program = new Command();

program
  .name('graph-sync-validator')
  .description('Graph-Postgres drift validator')
  .version('0.1.0');

program.command('run')
  .requiredOption('--selectors <pattern>', 'Path to selectors yaml (glob supported)')
  .requiredOption('--pg <url>', 'Postgres connection string')
  .requiredOption('--neo4j <url>', 'Neo4j connection string')
  .option('--out <path>', 'Output path for report.json', './report.json')
  .option('--chunk-size <number>', 'Chunk size', '1000')
  .option('--apply', 'Apply autofix', false)
  .action(async (options) => {
    const startTime = Date.now();
    console.log(chalk.blue('Starting Graph-Sync Validator...'));

    // Load Selectors
    const files = await glob(options.selectors);
    if (files.length === 0) {
        console.error(chalk.red(`No selectors found for pattern: ${options.selectors}`));
        process.exit(1);
    }

    console.log(chalk.dim(`Loaded ${files.length} selector files.`));

    // Connect DBs
    const pool = new Pool({ connectionString: options.pg });
    // Handle potential auth in URL or assume standardized connection string
    const driver = neo4j.driver(options.neo4j);

    const pgLoader = new PgLoader(pool);
    const neoLoader = new Neo4jLoader(driver);

    const severityWeights = {
        MISSING_NODE: 10,
        MISSING_REL: 7,
        PROP_MISMATCH: 6,
        ORPHAN_NODE: 3,
        ORPHAN_REL: 3
    };

    const allFindings: DriftFinding[] = [];
    const aggregatedPlan = { cypher: [] as string[], sql: [] as string[] };
    const metrics = { scannedRows: 0, scannedNodes: 0, scannedRels: 0, durationMs: 0 };

    try {
        await driver.verifyConnectivity();

        for (const file of files) {
            console.log(chalk.yellow(`Processing ${file}...`));
            const content = await readFile(file, 'utf-8');
            const selector = loadYaml(content) as Selector;

            const selectorFindings: DriftFinding[] = [];
            const pgStream = pgLoader.load(selector, Number(options.chunkSize));
            const neoStream = neoLoader.load(selector, Number(options.chunkSize));

            const diffIter = diffStream(pgStream, neoStream, selector, severityWeights);

            for await (const finding of diffIter) {
                selectorFindings.push(finding);
                allFindings.push(finding);
            }

            const plan = generatePlan(selectorFindings, selector);
            aggregatedPlan.cypher.push(...plan.cypher);
            aggregatedPlan.sql.push(...plan.sql);
        }
    } catch (err) {
        console.error(chalk.red('Error during execution:'), err);
        process.exit(1);
    } finally {
        await pool.end();
        await driver.close();
    }

    metrics.durationMs = Date.now() - startTime;

    const report = createReport(
        `run-${startTime}`,
        allFindings,
        aggregatedPlan,
        metrics
    );

    const reportJson = JSON.stringify(report, null, 2);
    await mkdir(path.dirname(options.out), { recursive: true });
    await writeFile(options.out, reportJson);

    console.log(chalk.green(`Report written to ${options.out}`));
    console.log(chalk.dim(`Hash: ${report.deterministicHash}`));

    if (options.apply) {
        if (aggregatedPlan.cypher.length > 0 || aggregatedPlan.sql.length > 0) {
            console.log(chalk.yellow('Applying auto-fix...'));

            // Execute Cypher
            if (aggregatedPlan.cypher.length > 0) {
                const session = driver.session();
                try {
                    for (const query of aggregatedPlan.cypher) {
                        console.log(chalk.dim(`Exec Cypher: ${query}`));
                        await session.run(query);
                    }
                } catch (e) {
                    console.error(chalk.red('Cypher Apply failed'), e);
                    throw e;
                } finally {
                    await session.close();
                }
            }

            // Execute SQL
            if (aggregatedPlan.sql.length > 0) {
                 const client = await pool.connect();
                 try {
                     await client.query('BEGIN');
                     for (const query of aggregatedPlan.sql) {
                         console.log(chalk.dim(`Exec SQL: ${query}`));
                         await client.query(query);
                     }
                     await client.query('COMMIT');
                 } catch (e) {
                     await client.query('ROLLBACK');
                     console.error(chalk.red('SQL Apply failed, rolled back.'), e);
                     throw e;
                 } finally {
                     client.release();
                 }
            }

            console.log(chalk.green('Auto-fix applied successfully.'));
        } else {
             console.log(chalk.green('No drift to fix.'));
        }
    }
});

async function run() {
    await program.parseAsync(process.argv);
}

run();
