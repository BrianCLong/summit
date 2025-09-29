#!/usr/bin/env node

/**
 * Neo4j Migration CLI
 * Command-line tool for managing Neo4j database migrations
 */

const { migrationManager } = require('../src/db/migrations/index');
const logger = require('../src/utils/logger');

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'migrate':
        await migrationManager.migrate();
        break;
        
      case 'status':
        const status = await migrationManager.status();
        console.log('\n📊 Migration Status:');
        console.log('==================');
        if (status.length === 0) {
          console.log('No migrations found.');
        } else {
          status.forEach(migration => {
            console.log(`${migration.status} ${migration.version}`);
          });
        }
        break;
        
      case 'create':
        const migrationName = args[1];
        if (!migrationName) {
          console.error('❌ Please provide a migration name');
          console.log('Usage: npm run migrate:create "migration name"');
          process.exit(1);
        }
        const version = await migrationManager.createMigration(migrationName);
        console.log(`✅ Created migration: ${version}`);
        break;
        
      case 'help':
      default:
        console.log(`
Neo4j Migration CLI

Commands:
  migrate     Run all pending migrations
  status      Show migration status
  create      Create a new migration file
  help        Show this help message

Examples:
  npm run migrate                    # Run all pending migrations
  npm run migrate:status            # Show migration status  
  npm run migrate:create "add user indexes"  # Create new migration

Environment Variables:
  NEO4J_URI        Neo4j connection URI
  NEO4J_USERNAME   Neo4j username
  NEO4J_PASSWORD   Neo4j password
  DATABASE_URL     PostgreSQL connection string (for migration tracking)
        `);
        break;
    }
  } catch (error) {
    logger.error('Migration failed:', error.message);
    console.error(`❌ Migration failed: ${error.message}`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});