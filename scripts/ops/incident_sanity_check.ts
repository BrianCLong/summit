import fs from 'fs';
import path from 'path';

const PLAYBOOK_PATH = path.join(process.cwd(), 'docs/ops/INCIDENT_PLAYBOOK.md');
const INDEX_PATH = path.join(process.cwd(), 'docs/ops/RUNBOOK_INDEX.md');

const main = () => {
  console.log('🚑 Starting Incident Sanity Check...');
  let hasErrors = false;

  // 1. Check Incident Playbook
  if (fs.existsSync(PLAYBOOK_PATH)) {
    const content = fs.readFileSync(PLAYBOOK_PATH, 'utf8');
    const requiredSections = ['Severity Model', 'Roles & Responsibilities', 'Communication Templates', 'Escalation Rules'];

    requiredSections.forEach(section => {
      if (!content.includes(section)) {
        console.error(`❌ Playbook missing required section: "${section}"`);
        hasErrors = true;
      }
    });

    if (!hasErrors) console.log('✅ Incident Playbook structure verified.');
  } else {
    console.error(`❌ Incident Playbook not found at ${PLAYBOOK_PATH}`);
    hasErrors = true;
  }

  // 2. Check Runbook Index
  if (fs.existsSync(INDEX_PATH)) {
    const content = fs.readFileSync(INDEX_PATH, 'utf8');
    // Check for links to critical docs
    const criticalDocs = ['BACKUP_RESTORE.md', 'INCIDENT_PLAYBOOK.md'];

    criticalDocs.forEach(doc => {
      if (!content.includes(doc)) {
        console.error(`❌ Runbook Index missing link to: "${doc}"`);
        hasErrors = true;
      }
    });

    if (!hasErrors) console.log('✅ Runbook Index verified.');
  } else {
    console.error(`❌ Runbook Index not found at ${INDEX_PATH}`);
    hasErrors = true;
  }

  if (hasErrors) {
    process.exit(1);
  }
};

main();
