import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

const TAXONOMY_FILE = path.join(process.cwd(), 'docs/ci/FAILURE_TAXONOMY.yml');

function validateTaxonomy() {
    console.log('Validating Failure Taxonomy...');

    if (!fs.existsSync(TAXONOMY_FILE)) {
        console.error(`Error: Taxonomy file not found at ${TAXONOMY_FILE}`);
        process.exit(1);
    }

    let doc;
    try {
        const fileContents = fs.readFileSync(TAXONOMY_FILE, 'utf8');
        doc = yaml.load(fileContents);
    } catch (e) {
        console.error('Error: Failed to parse YAML file:', e.message);
        process.exit(1);
    }

    if (!doc || !doc.failures || !Array.isArray(doc.failures)) {
        console.error('Error: Root "failures" array missing or invalid.');
        process.exit(1);
    }

    const codes = new Set();
    const errors = [];

    const allowedCategories = new Set([
        'path', 'network', 'timeout', 'dependency', 'test', 'docker', 'artifact', 'infra', 'unknown'
    ]);

    const allowedSeverities = new Set(['info', 'warn', 'fail']);

    doc.failures.forEach((entry, index) => {
        const context = `Entry #${index + 1}`;

        // Check required fields
        if (!entry.code) errors.push(`${context}: Missing "code"`);
        if (!entry.category) errors.push(`${context}: Missing "category"`);
        if (!entry.title) errors.push(`${context}: Missing "title"`);
        if (!entry.diagnosis) errors.push(`${context}: Missing "diagnosis"`);
        if (!entry.next_steps) errors.push(`${context}: Missing "next_steps"`);
        if (!entry.severity) errors.push(`${context}: Missing "severity"`);

        // Check Match object
        if (!entry.match) {
            errors.push(`${context}: Missing "match" object`);
        } else {
            if (entry.match.type !== 'regex') {
                errors.push(`${context}: match.type must be "regex"`);
            }
            if (!entry.match.pattern) {
                errors.push(`${context}: match.pattern is required`);
            } else {
                try {
                    new RegExp(entry.match.pattern);
                } catch (e) {
                    errors.push(`${context}: Invalid regex pattern "${entry.match.pattern}"`);
                }
            }
        }

        // Check constraints
        if (entry.code) {
            if (codes.has(entry.code)) {
                errors.push(`${context}: Duplicate code "${entry.code}"`);
            }
            codes.add(entry.code);

            if (!/^CI-[A-Z]+-\d{3}$/.test(entry.code)) {
                errors.push(`${context}: Invalid code format "${entry.code}". Must be CI-<AREA>-###.`);
            }
        }

        if (entry.category && !allowedCategories.has(entry.category)) {
            errors.push(`${context}: Invalid category "${entry.category}". Allowed: ${Array.from(allowedCategories).join(', ')}`);
        }

        if (entry.severity && !allowedSeverities.has(entry.severity)) {
            errors.push(`${context}: Invalid severity "${entry.severity}". Allowed: ${Array.from(allowedSeverities).join(', ')}`);
        }

        if (entry.next_steps && (!Array.isArray(entry.next_steps) || entry.next_steps.length < 1)) {
            errors.push(`${context}: next_steps must be a list with at least 1 item`);
        }
    });

    if (errors.length > 0) {
        console.error('Validation failed with errors:');
        errors.forEach(err => console.error(`- ${err}`));
        process.exit(1);
    }

    console.log(`✅ Taxonomy valid! Found ${doc.failures.length} definitions.`);
}

validateTaxonomy();
