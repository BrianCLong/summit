import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const ROOT_DIR = path.resolve(__dirname, '../../');
const OUTPUT_DIR = path.join(ROOT_DIR, 'artifacts/evidence/governance');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'ai-inventory.json');

// Patterns to look for
const MODEL_EXTENSIONS = ['.onnx', '.pt', '.bin', '.gguf', '.h5', '.tflite'];
const CONFIG_FILES = ['Modelfile', 'litellm_config.yaml', 'config.yaml'];
const TAG_MARKER = '@ai-system';

interface AIEntity {
  id: string;
  type: 'model_file' | 'config' | 'code_reference';
  path: string;
  description?: string;
  classification?: string;
}

const inventory: AIEntity[] = [];

// Recursive file scanner
function scanDirectory(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(ROOT_DIR, fullPath);

    // Skip node_modules, .git, dist, etc.
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'build', 'artifacts', 'coverage'].includes(entry.name)) {
        continue;
      }
      scanDirectory(fullPath);
    } else if (entry.isFile()) {
      checkFile(fullPath, relativePath, entry.name);
    }
  }
}

function checkFile(fullPath: string, relativePath: string, fileName: string) {
  // 1. Check Extensions
  const ext = path.extname(fileName).toLowerCase();
  if (MODEL_EXTENSIONS.includes(ext)) {
    inventory.push({
      id: `model-${inventory.length + 1}`,
      type: 'model_file',
      path: relativePath,
      description: `Model weight file: ${fileName}`
    });
    return;
  }

  // 2. Check Config Files
  if (CONFIG_FILES.includes(fileName)) {
    inventory.push({
      id: `config-${inventory.length + 1}`,
      type: 'config',
      path: relativePath,
      description: `AI Configuration file: ${fileName}`
    });
    // We could read the file here to parse details
    return;
  }

  // 3. Check for Code Tags (text files only)
  if (['.ts', '.js', '.tsx', '.jsx', '.py', '.md'].includes(ext)) {
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (content.includes(TAG_MARKER)) {
        // Extract description if possible: @ai-system: Description
        const match = content.match(/@ai-system:?\s*(.*)/);
        const description = match ? match[1].trim() : 'Tagged AI System code';

        inventory.push({
          id: `code-${inventory.length + 1}`,
          type: 'code_reference',
          path: relativePath,
          description: description
        });
      }
    } catch (e) {
      // Ignore read errors
    }
  }
}

// Main execution
function main() {
  console.log(`Starting AI Inventory Scan from: ${ROOT_DIR}`);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  scanDirectory(ROOT_DIR);

  const report = {
    generated_at: new Date().toISOString(),
    total_items: inventory.length,
    items: inventory
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));
  console.log(`Inventory generated: ${OUTPUT_FILE} (${inventory.length} items found)`);
}

main();
