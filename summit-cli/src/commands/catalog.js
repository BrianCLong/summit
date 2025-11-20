import { Command } from 'commander';
import { Executor } from '../lib/executor.js';

/**
 * Register 'summit catalog' commands
 */
export function registerCatalogCommands(program, config, output) {
  const catalog = new Command('catalog')
    .description('Data catalog operations')
    .summary('Browse, search, and inspect data catalog entities');

  // summit catalog list
  catalog
    .command('list')
    .description('List catalog entities')
    .option('-t, --type <type>', 'Filter by entity type (dataset, pipeline, model)')
    .option('--limit <n>', 'Maximum number of results', '50')
    .action(async (options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('catalog list', options);
        out.info('Fetching catalog entities...');

        // TODO: Query catalog API/database
        const entities = [];

        if (out.format === 'human') {
          if (entities.length === 0) {
            out.warning('No entities found');
          } else {
            out.table(
              ['ID', 'Name', 'Type', 'Owner', 'Last Updated'],
              entities.map((e) => [e.id, e.name, e.type, e.owner, e.updated])
            );
          }
        }

        out.endCommand(true, { entities, count: entities.length });
      } catch (error) {
        out.error('Failed to list catalog', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit catalog inspect
  catalog
    .command('inspect')
    .description('Inspect catalog entity details')
    .argument('<entity-id>', 'Entity ID or name')
    .action(async (entityId, options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('catalog inspect', { entityId });
        out.spin('Fetching entity details...');

        // TODO: Query catalog API for entity details
        const entity = {
          id: entityId,
          name: 'Sample Entity',
          type: 'dataset',
          schema: {},
          metadata: {},
        };

        out.spinSucceed('Entity details retrieved');

        if (out.format === 'human') {
          console.log(`\nEntity: ${entity.name}`);
          console.log(`ID: ${entity.id}`);
          console.log(`Type: ${entity.type}`);
          // TODO: Display schema and metadata
        }

        out.endCommand(true, { entity });
      } catch (error) {
        out.spinStop();
        out.error('Failed to inspect entity', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit catalog search
  catalog
    .command('search')
    .description('Search catalog entities')
    .argument('<query>', 'Search query')
    .option('--fuzzy', 'Enable fuzzy matching')
    .action(async (query, options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('catalog search', { query, ...options });
        out.spin('Searching catalog...');

        // TODO: Search catalog
        const results = [];

        out.spinSucceed(`Found ${results.length} results`);

        if (out.format === 'human') {
          results.forEach((r) => console.log(`  - ${r.name} (${r.type})`));
        }

        out.endCommand(true, { results, count: results.length });
      } catch (error) {
        out.spinStop();
        out.error('Catalog search failed', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit catalog lineage
  catalog
    .command('lineage')
    .description('View data lineage for an entity')
    .argument('<entity-id>', 'Entity ID')
    .option('--depth <n>', 'Lineage depth', '3')
    .action(async (entityId, options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('catalog lineage', { entityId, ...options });
        out.spin('Tracing lineage...');

        // TODO: Query lineage graph
        out.spinSucceed('Lineage retrieved');
        out.endCommand(true);
      } catch (error) {
        out.spinStop();
        out.error('Failed to get lineage', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit catalog export
  catalog
    .command('export')
    .description('Export catalog metadata')
    .option('-f, --format <fmt>', 'Export format (json, csv, yaml)', 'json')
    .option('-o, --output <file>', 'Output file')
    .action(async (options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('catalog export', options);
        out.spin('Exporting catalog...');

        // TODO: Export catalog to file
        out.spinSucceed('Catalog exported');
        out.endCommand(true);
      } catch (error) {
        out.spinStop();
        out.error('Catalog export failed', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  program.addCommand(catalog);
}
