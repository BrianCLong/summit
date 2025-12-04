/**
 * Export Commands
 */

import { Command } from 'commander';
import ora from 'ora';
import path from 'node:path';
import type { CLIConfig } from '../lib/config.js';
import { getProfile } from '../lib/config.js';
import { GraphClient } from '../lib/graph-client.js';
import { ExportManager } from '../lib/export-manager.js';
import { formatOutput, success, error, formatTable } from '../utils/output.js';
import { handleError, ConnectionError, ExportError } from '../utils/errors.js';
import { EXPORT_FORMATS, type ExportFormat } from '../lib/constants.js';

export function registerExportCommands(program: Command, config: CLIConfig): void {
  const exportCmd = program
    .command('export')
    .alias('x')
    .description('Air-gapped export operations');

  exportCmd
    .command('graph')
    .description('Export graph data for air-gapped transfer')
    .option('-f, --format <format>', `Output format: ${EXPORT_FORMATS.join(', ')}`, 'json')
    .option('-o, --output <dir>', 'Output directory')
    .option('--labels <labels>', 'Filter by node labels (comma-separated)')
    .option('--types <types>', 'Filter by relationship types (comma-separated)')
    .option('--no-compress', 'Disable compression')
    .option('--sign', 'Sign export with private key')
    .option('--no-metadata', 'Exclude metadata')
    .option('--profile <name>', 'Use named profile')
    .action(async (options) => {
      if (!EXPORT_FORMATS.includes(options.format as ExportFormat)) {
        error(`Invalid format. Must be one of: ${EXPORT_FORMATS.join(', ')}`);
        process.exit(1);
      }

      const spinner = ora('Preparing export...').start();

      try {
        const profile = getProfile(config, options.profile);

        if (!profile.neo4j) {
          throw new ConnectionError('Neo4j configuration not found');
        }

        const exportConfig = profile.export || {
          outputDir: './exports',
          compression: true,
          signExports: false,
        };

        // Connect to graph and fetch data
        spinner.text = 'Connecting to graph database...';
        const graphClient = new GraphClient(profile.neo4j);
        await graphClient.connect();

        spinner.text = 'Fetching nodes...';
        const nodes = await graphClient.queryNodes(undefined, undefined, {
          limit: 100000,
        });

        spinner.text = 'Fetching relationships...';
        const relationships = await graphClient.queryRelationships(undefined, {
          limit: 100000,
        });

        await graphClient.disconnect();

        // Create export
        spinner.text = 'Creating export...';
        const exportManager = new ExportManager(exportConfig);

        const manifest = await exportManager.exportGraph(
          {
            nodes,
            relationships,
            metadata: options.metadata !== false ? {
              exportedAt: new Date().toISOString(),
              source: profile.neo4j.uri,
            } : undefined,
          },
          {
            format: options.format as ExportFormat,
            outputDir: options.output || exportConfig.outputDir,
            compress: options.compress !== false,
            sign: options.sign,
            includeMetadata: options.metadata !== false,
            filter: {
              labels: options.labels?.split(','),
              types: options.types?.split(','),
            },
          }
        );

        spinner.stop();

        if (program.opts().json) {
          console.log(JSON.stringify(manifest, null, 2));
        } else {
          success('Export completed successfully');
          console.log(`\nExport Details:`);
          console.log(`  ID: ${manifest.exportId}`);
          console.log(`  Format: ${manifest.format}`);
          console.log(`  Compressed: ${manifest.compressed}`);
          console.log(`  Signed: ${manifest.signed}`);
          console.log(`  Nodes: ${manifest.stats.totalNodes.toLocaleString()}`);
          console.log(`  Relationships: ${manifest.stats.totalRelationships.toLocaleString()}`);
          console.log(`  Duration: ${manifest.stats.exportDuration}ms`);
          console.log(`\nFiles:`);
          for (const file of manifest.files) {
            const sizeKB = (file.size / 1024).toFixed(1);
            console.log(`  - ${file.name} (${sizeKB} KB)`);
          }
          console.log(`\nOutput: ${path.join(options.output || exportConfig.outputDir, `export-${manifest.exportId}`)}`);
        }
      } catch (err) {
        spinner.stop();
        handleError(err);
      }
    });

  exportCmd
    .command('import <path>')
    .description('Import graph data from export')
    .option('--verify', 'Verify integrity before import', true)
    .option('--dry-run', 'Validate without importing')
    .option('--profile <name>', 'Use named profile')
    .action(async (exportPath: string, options) => {
      const spinner = ora('Preparing import...').start();

      try {
        const profile = getProfile(config, options.profile);
        const exportConfig = profile.export || {
          outputDir: './exports',
          compression: true,
          signExports: false,
        };

        const exportManager = new ExportManager(exportConfig);

        if (options.verify) {
          spinner.text = 'Verifying export integrity...';
          const verifyResult = await exportManager.verifyExport(exportPath);

          if (!verifyResult.valid) {
            spinner.stop();
            error('Export verification failed:');
            for (const err of verifyResult.errors) {
              console.log(`  - ${err}`);
            }
            process.exit(1);
          }

          if (verifyResult.warnings.length > 0) {
            for (const warn of verifyResult.warnings) {
              console.log(`  Warning: ${warn}`);
            }
          }
        }

        spinner.text = options.dryRun ? 'Validating import...' : 'Importing data...';

        const result = await exportManager.importGraph(exportPath, {
          verify: false, // Already verified
          dryRun: options.dryRun,
        });

        spinner.stop();

        if (program.opts().json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          if (result.success) {
            success(options.dryRun ? 'Validation successful' : 'Import completed successfully');
            console.log(`\nImport Details:`);
            console.log(`  ID: ${result.importId}`);
            console.log(`  Nodes: ${result.nodesImported.toLocaleString()}`);
            console.log(`  Relationships: ${result.relationshipsImported.toLocaleString()}`);

            if (result.warnings.length > 0) {
              console.log(`\nWarnings:`);
              for (const warn of result.warnings) {
                console.log(`  - ${warn}`);
              }
            }
          } else {
            error('Import failed:');
            for (const err of result.errors) {
              console.log(`  - ${err}`);
            }
          }
        }
      } catch (err) {
        spinner.stop();
        handleError(err);
      }
    });

  exportCmd
    .command('verify <path>')
    .description('Verify export integrity')
    .action(async (exportPath: string) => {
      const spinner = ora('Verifying export...').start();

      try {
        const exportManager = new ExportManager({
          outputDir: './exports',
          compression: true,
          signExports: false,
        });

        const result = await exportManager.verifyExport(exportPath);

        spinner.stop();

        if (program.opts().json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          if (result.valid) {
            success('Export verification passed');
          } else {
            error('Export verification failed:');
            for (const err of result.errors) {
              console.log(`  - ${err}`);
            }
          }

          if (result.warnings.length > 0) {
            console.log('\nWarnings:');
            for (const warn of result.warnings) {
              console.log(`  - ${warn}`);
            }
          }
        }
      } catch (err) {
        spinner.stop();
        handleError(err);
      }
    });

  exportCmd
    .command('list')
    .alias('ls')
    .description('List available exports')
    .option('-d, --directory <dir>', 'Export directory')
    .option('--profile <name>', 'Use named profile')
    .action(async (options) => {
      try {
        const profile = getProfile(config, options.profile);
        const exportConfig = profile.export || {
          outputDir: './exports',
          compression: true,
          signExports: false,
        };

        const exportManager = new ExportManager(exportConfig);
        const exports = await exportManager.listExports(options.directory);

        if (program.opts().json) {
          console.log(JSON.stringify(exports, null, 2));
        } else {
          if (exports.length === 0) {
            console.log('No exports found');
          } else {
            const tableData = exports.map((e) => ({
              id: e.manifest.exportId.substring(0, 8) + '...',
              timestamp: e.manifest.timestamp.substring(0, 19),
              format: e.manifest.format,
              nodes: e.manifest.stats.totalNodes.toLocaleString(),
              rels: e.manifest.stats.totalRelationships.toLocaleString(),
              signed: e.manifest.signed ? 'Yes' : 'No',
            }));
            console.log(formatTable(tableData));
          }
        }
      } catch (err) {
        handleError(err);
      }
    });

  exportCmd
    .command('formats')
    .description('List supported export formats')
    .action(() => {
      if (program.opts().json) {
        console.log(JSON.stringify(EXPORT_FORMATS, null, 2));
      } else {
        console.log('\nSupported Export Formats:');
        console.log('  - json    : JSON format (default)');
        console.log('  - csv     : Comma-separated values');
        console.log('  - graphml : GraphML XML format');
        console.log('  - parquet : Apache Parquet (columnar)');
      }
    });
}
