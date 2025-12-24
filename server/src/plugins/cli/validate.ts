import fs from 'fs';
import path from 'path';
import { ManifestValidator } from '../sdk/validator.js';

export async function validatePlugin(pluginPath: string): Promise<boolean> {
  const manifestPath = path.join(pluginPath, 'plugin.json'); // Assumption: manifest is plugin.json

  if (!fs.existsSync(manifestPath)) {
    console.error(`Error: No manifest found at ${manifestPath}`);
    return false;
  }

  try {
    const content = fs.readFileSync(manifestPath, 'utf-8');
    const json = JSON.parse(content);
    const result = ManifestValidator.validate(json);

    if (result.success) {
      console.log(`✅ Plugin '${result.data!.name}' v${result.data!.version} is valid.`);
      return true;
    } else {
      console.error(`❌ Manifest validation failed:`);
      result.errors?.forEach(e => console.error(`   - ${e}`));
      return false;
    }
  } catch (e: any) {
    console.error(`❌ Error reading or parsing manifest: ${e.message}`);
    return false;
  }
}

// Simple CLI entry point if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const targetPath = process.argv[2] || '.';
  validatePlugin(targetPath);
}
