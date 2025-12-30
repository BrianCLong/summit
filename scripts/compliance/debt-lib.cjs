const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const KEYWORDS = ['TODO', 'FIXME', 'XXX', 'HACK'];
const IGNORE_DIRS = [
    'node_modules', '.git', 'dist', 'build', 'coverage',
    '.next', 'target', '.cache', 'out', 'tmp',
    '__pycache__', 'venv', '.venv', 'eggs', '.eggs',
    'generated', 'migrations', 'debt'
];
const EXTENSIONS = [
    '.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.md', '.yml', '.yaml', '.json'
];

function generateId(filepath, content, index) {
    // ID based on file path, content, and occurrence index (1-based).
    // This is stable against line shifts.
    return 'DEBT-' + crypto.createHash('md5')
        .update(`${filepath}:${content}:${index}`)
        .digest('hex').substring(0, 8).toUpperCase();
}

function scanFile(filepath, rootDir) {
    const items = [];
    try {
        const content = fs.readFileSync(filepath, 'utf-8');
        const lines = content.split('\n');
        const relativePath = path.relative(rootDir, filepath);

        // Track occurrences of identical debt descriptions to assign unique stable IDs
        const occurrenceMap = new Map();

        function getOccurrence(key) {
            const count = (occurrenceMap.get(key) || 0) + 1;
            occurrenceMap.set(key, count);
            return count;
        }

        lines.forEach((lineContent, lineIndex) => {
            if (lineContent.length > 500) return;

            KEYWORDS.forEach(kw => {
                if (lineContent.includes(kw)) {
                    const match = lineContent.match(new RegExp(`${kw}[:\\s]+(.*)`));
                    const desc = match ? match[1].trim() : `${kw} marker found`;
                    const key = `COMMENT:${desc}`;
                    const occ = getOccurrence(key);

                    items.push({
                        id: generateId(relativePath, key, occ),
                        category: 'code_comment',
                        severity: kw === 'FIXME' ? 'high' : 'low',
                        description: `${kw}: ${desc}`.replace(/"/g, "'"),
                        locations: [`${relativePath}:${lineIndex + 1}`],
                        rationale: 'Legacy code comment detected by automated scan.',
                        exit_criteria: 'Address the comment and remove it.',
                        owner: 'unassigned',
                        created_at: new Date().toISOString().split('T')[0]
                    });
                }
            });

            if (lineContent.includes('eslint-disable')) {
                 const key = 'LINT:eslint-disable';
                 const occ = getOccurrence(key);
                 items.push({
                    id: generateId(relativePath, key, occ),
                    category: 'lint_disable',
                    severity: 'medium',
                    description: 'Linter rule disabled',
                    locations: [`${relativePath}:${lineIndex + 1}`],
                    rationale: 'Linter rule disabled in legacy code.',
                    exit_criteria: 'Fix lint error and enable rule.',
                    owner: 'unassigned',
                    created_at: new Date().toISOString().split('T')[0]
                });
            }
        });

        if (content.includes('.skip') || content.includes('xdescribe') || content.includes('xit') || content.includes('pytest.mark.skip')) {
             lines.forEach((lineContent, lineIndex) => {
                 if (lineContent.match(/\.skip|xdescribe|xit|pytest\.mark\.skip/)) {
                      const key = 'TEST:skipped';
                      const occ = getOccurrence(key);
                      items.push({
                        id: generateId(relativePath, key, occ),
                        category: 'test_skipped',
                        severity: 'high',
                        description: 'Test skipped',
                        locations: [`${relativePath}:${lineIndex + 1}`],
                        rationale: 'Test disabled in legacy code.',
                        exit_criteria: 'Enable and fix test.',
                        owner: 'unassigned',
                        created_at: new Date().toISOString().split('T')[0]
                    });
                 }
             });
        }
    } catch (e) {
    }
    return items;
}

function walkDir(dir, callback) {
    if (IGNORE_DIRS.includes(path.basename(dir))) return;
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filepath = path.join(dir, file);
            const stat = fs.statSync(filepath);
            if (stat.isDirectory()) {
                walkDir(filepath, callback);
            } else if (EXTENSIONS.includes(path.extname(file))) {
                callback(filepath);
            }
        }
    } catch (e) {
    }
}

function scanCodebase(rootDir) {
    const allDebt = [];
    walkDir(rootDir, (filepath) => {
        const debt = scanFile(filepath, rootDir);
        allDebt.push(...debt);
    });
    return allDebt;
}

module.exports = { scanCodebase };
