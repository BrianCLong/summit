"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDocs = validateDocs;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
async function loadTaxonomy() {
    try {
        const content = await promises_1.default.readFile(path_1.default.resolve(__dirname, '../../docs/content-taxonomy.yaml'), 'utf-8');
        return js_yaml_1.default.load(content);
    }
    catch (e) {
        console.error("Failed to load taxonomy", e);
        return null;
    }
}
function parseFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---\n/);
    if (!match)
        return null;
    const frontmatterRaw = match[1];
    const metadata = {};
    frontmatterRaw.split('\n').forEach(line => {
        const [key, ...values] = line.split(':');
        if (key && values.length) {
            const val = values.join(':').trim();
            if (val.startsWith('[') && val.endsWith(']')) {
                metadata[key.trim()] = val.slice(1, -1).split(',').map((s) => s.trim());
            }
            else {
                metadata[key.trim()] = val;
            }
        }
    });
    return metadata;
}
async function getFiles(dir) {
    const dirents = await promises_1.default.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
        const res = path_1.default.resolve(dir, dirent.name);
        return dirent.isDirectory() ? getFiles(res) : res;
    }));
    return Array.prototype.concat(...files);
}
async function validateDocs() {
    const taxonomy = await loadTaxonomy();
    if (!taxonomy)
        return;
    const docsDir = path_1.default.resolve(__dirname, '../../docs');
    const files = await getFiles(docsDir);
    const markdownFiles = files.filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
    let errors = 0;
    let stale = 0;
    const now = Date.now();
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
    console.log(`Validating ${markdownFiles.length} files against taxonomy...`);
    for (const file of markdownFiles) {
        const relPath = path_1.default.relative(docsDir, file);
        const stat = await promises_1.default.stat(file);
        if (now - stat.mtimeMs > ninetyDaysMs) {
            stale++;
        }
        const content = await promises_1.default.readFile(file, 'utf-8');
        const metadata = parseFrontmatter(content);
        if (!metadata) {
            continue;
        }
        if (metadata.use_case) {
            const valid = taxonomy.use_cases.includes(metadata.use_case);
            if (!valid) {
                console.error(`[INVALID TAXONOMY] ${relPath}: use_case '${metadata.use_case}' is not valid.`);
                errors++;
            }
        }
    }
    console.log(`Validation Complete.`);
    console.log(`Stale Files (>90d): ${stale}`);
    console.log(`Taxonomy Errors: ${errors}`);
    if (errors > 0)
        process.exit(1);
}
if (import.meta.url === `file://${process.argv[1]}`) {
    validateDocs();
}
