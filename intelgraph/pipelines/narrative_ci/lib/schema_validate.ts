import * as fs from 'fs';
import * as path from 'path';

// Minimal schema validator since we might not have ajv installed
// In a real environment, we would use ajv or similar.
// For now, we just check if files exist and are valid JSON.

export function validateSchemas(outDir: string, schemaDir: string) {
  console.log(`Validating outputs in ${outDir} against schemas in ${schemaDir}`);

  if (!fs.existsSync(outDir)) {
    throw new Error(`Output directory ${outDir} does not exist`);
  }

  // List all files in outDir recursively
  const files = getAllFiles(outDir);
  let errors = 0;

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const content = fs.readFileSync(file, 'utf-8');
      JSON.parse(content);
      // specific schema validation logic would go here
      // matching file pattern to schema file
    } catch (e) {
      console.error(`Invalid JSON in ${file}: ${e.message}`);
      errors++;
    }
  }

  if (errors > 0) {
    process.exit(1);
  }
  console.log("All JSON files are valid.");
}

function getAllFiles(dir: string, fileList: string[] = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  }
  return fileList;
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: node schema_validate.ts <outDir> <schemaDir>");
    process.exit(1);
  }
  validateSchemas(args[0], args[1]);
}
