import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

const TAXONOMY_FILE = path.join(process.cwd(), 'docs/ci/FAILURE_TAXONOMY.yml');

// Load taxonomy once
let taxonomy = null;

try {
    const fileContents = fs.readFileSync(TAXONOMY_FILE, 'utf8');
    taxonomy = yaml.load(fileContents);
} catch (e) {
    console.error('Error: Failed to load taxonomy:', e.message);
    process.exit(1);
}

const UNKNOWN_FAILURE = {
    code: 'CI-UNK-000',
    category: 'unknown',
    title: 'Unknown failure',
    diagnosis: 'Unclassified failure signature',
    next_steps: ['Investigate raw logs', 'Add new signature to taxonomy']
};

export function classifyFailure(logContent, context = {}) {
    if (!taxonomy || !taxonomy.failures) {
        return {
            ...UNKNOWN_FAILURE,
            matched_signature: null
        };
    }

    for (const entry of taxonomy.failures) {
        if (!entry.match || entry.match.type !== 'regex') continue;

        try {
            const flags = entry.match.flags || '';
            const regex = new RegExp(entry.match.pattern, flags);
            const match = logContent.match(regex);

            if (match) {
                return {
                    code: entry.code,
                    category: entry.category,
                    title: entry.title,
                    diagnosis: entry.diagnosis,
                    next_steps: entry.next_steps,
                    matched_signature: match[0],
                    severity: entry.severity
                };
            }
        } catch (e) {
            console.warn(`Invalid regex for ${entry.code}: ${entry.match.pattern}`, e);
        }
    }

    // Default if no match found
    // If there is an explicit UNKNOWN entry in taxonomy, it might have been skipped if regex didn't match ".*"
    // (though .* should match everything if it reaches there).
    // However, we look for explicit unknown in our loop.
    // If not found by loop (unlikely if .* is last), return default.
    return {
        ...UNKNOWN_FAILURE,
        matched_signature: logContent.slice(0, 200) + '...' // Preserve snippet
    };
}

// CLI Mode
if (process.argv[1] === new URL(import.meta.url).pathname) {
    const logFile = process.argv[2];
    if (!logFile) {
        console.error('Usage: node scripts/ci/classify_failure.mjs <logfile>');
        process.exit(1);
    }

    if (!fs.existsSync(logFile)) {
        console.error(`Log file not found: ${logFile}`);
        process.exit(1);
    }

    const content = fs.readFileSync(logFile, 'utf8');
    const result = classifyFailure(content);
    console.log(JSON.stringify(result, null, 2));
}
