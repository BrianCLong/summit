import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadTaxonomy() {
    try {
        const content = await fs.readFile(path.resolve(__dirname, '../../docs/content-taxonomy.yaml'), 'utf-8');
        return yaml.load(content) as any;
    } catch (e) {
        console.error("Failed to load taxonomy", e);
        return null;
    }
}

function parseFrontmatter(content: string) {
    const match = content.match(/^---\n([\s\S]*?)\n---\n/);
    if (!match) return null;

    const frontmatterRaw = match[1];
    const metadata: any = {};

    frontmatterRaw.split('\n').forEach(line => {
      const [key, ...values] = line.split(':');
      if (key && values.length) {
        const val = values.join(':').trim();
        if (val.startsWith('[') && val.endsWith(']')) {
             metadata[key.trim()] = val.slice(1, -1).split(',').map((s: string) => s.trim());
        } else {
             metadata[key.trim()] = val;
        }
      }
    });
    return metadata;
  }

async function getFiles(dir: string): Promise<string[]> {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
      const res = path.resolve(dir, dirent.name);
      return dirent.isDirectory() ? getFiles(res) : res;
    }));
    return Array.prototype.concat(...files);
}

export async function validateDocs() {
    const taxonomy = await loadTaxonomy();
    if (!taxonomy) return;

    const docsDir = path.resolve(__dirname, '../../docs');
    const files = await getFiles(docsDir);
    const markdownFiles = files.filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

    let errors = 0;
    let stale = 0;
    const now = Date.now();
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

    console.log(`Validating ${markdownFiles.length} files against taxonomy...`);

    for (const file of markdownFiles) {
        const relPath = path.relative(docsDir, file);
        const stat = await fs.stat(file);

        if (now - stat.mtimeMs > ninetyDaysMs) {
            stale++;
        }

        const content = await fs.readFile(file, 'utf-8');
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

    if (errors > 0) process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    validateDocs();
}
