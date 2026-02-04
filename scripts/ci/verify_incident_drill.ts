import fs from 'fs';
import path from 'path';

const DRILLS_DIR = 'drills';
const MAX_AGE_DAYS = 30;

export function verifyIncidentDrill(): boolean {
    console.log(`\n🚨 Verifying Incident Drill Freshness (Drills must be < ${MAX_AGE_DAYS} days old)...`);

    if (!fs.existsSync(DRILLS_DIR)) {
        console.error(`❌ Drills directory not found: ${DRILLS_DIR}`);
        return false;
    }

    const files = fs.readdirSync(DRILLS_DIR);
    if (files.length === 0) {
        console.error(`❌ No drills found in ${DRILLS_DIR}.`);
        return false;
    }

    const now = new Date();
    const limit = new Date();
    limit.setDate(limit.getDate() - MAX_AGE_DAYS);

    let recentDrills = 0;

    for (const file of files) {
        // Skip hidden files
        if (file.startsWith('.')) continue;

        const filePath = path.join(DRILLS_DIR, file);
        const stats = fs.statSync(filePath);

        // Check mtime (modification time)
        if (stats.mtime > limit) {
            console.log(`   Found recent drill: ${file} (${stats.mtime.toISOString().split('T')[0]})`);
            recentDrills++;
        }
    }

    if (recentDrills === 0) {
        console.error(`❌ No recent incident drills found in the last ${MAX_AGE_DAYS} days.`);
        console.error(`   Please perform a drill and document it in ${DRILLS_DIR}/`);
        return false;
    }

    console.log('✅ Recent incident drill verified.');
    return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!verifyIncidentDrill()) {
    process.exit(1);
  }
}
