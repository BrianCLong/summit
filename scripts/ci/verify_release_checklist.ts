import fs from 'fs';
import yaml from 'js-yaml';

const CHECKLIST_PATH = 'governance/release_checklist.yaml';

export function verifyReleaseChecklist(): boolean {
    console.log(`\n📋 Verifying Release Checklist (${CHECKLIST_PATH})...`);

    if (!fs.existsSync(CHECKLIST_PATH)) {
        console.error(`❌ Checklist file not found: ${CHECKLIST_PATH}`);
        return false;
    }

    try {
        const content = fs.readFileSync(CHECKLIST_PATH, 'utf8');
        const doc = yaml.load(content) as any;

        if (!doc.checklist || !Array.isArray(doc.checklist)) {
             console.error(`❌ Invalid checklist: 'checklist' missing or not an array.`);
             return false;
        }

        console.log(`   Found ${doc.checklist.length} checklist items.`);

        for (const item of doc.checklist) {
            if (!item.id || !item.description) {
                console.error(`❌ Invalid item: missing id or description`, item);
                return false;
            }
        }

        console.log('✅ Release Checklist is valid.');
        return true;
    } catch (e) {
        console.error(`❌ Failed to parse checklist:`, e);
        return false;
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!verifyReleaseChecklist()) {
    process.exit(1);
  }
}
