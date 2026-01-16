import fs from 'fs';
import path from 'path';

const DOC_PATH = path.join(process.cwd(), 'docs/ops/BACKUP_RESTORE.md');

const main = () => {
  console.log('💾 Starting Backup Plan Check...');

  if (!fs.existsSync(DOC_PATH)) {
    console.error(`❌ Backup documentation not found at ${DOC_PATH}`);
    process.exit(1);
  }

  const content = fs.readFileSync(DOC_PATH, 'utf8');
  const requiredSystems = ['PostgreSQL', 'Neo4j', 'Redis'];
  const missing = [];

  requiredSystems.forEach(sys => {
    if (!content.includes(sys)) {
      missing.push(sys);
    }
  });

  if (missing.length > 0) {
    console.error(`❌ Backup plan missing systems: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Check for S3 locations
  if (!content.includes('s3://intelgraph-backups')) {
    console.error('❌ Backup plan does not specify S3 location (s3://intelgraph-backups)');
    process.exit(1);
  }

  console.log('✅ Backup Plan is documented and covers core systems.');
};

main();
