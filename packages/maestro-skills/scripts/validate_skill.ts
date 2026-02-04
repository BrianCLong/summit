import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import Ajv from 'ajv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.resolve(__dirname, '../schemas/skill-manifest.schema.json');

if (!fs.existsSync(schemaPath)) {
  console.error(`Schema file not found at ${schemaPath}`);
  process.exit(1);
}

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

const ajv = new Ajv();
const validate = ajv.compile(schema);

const skillDir = process.argv[2];

if (!skillDir) {
  console.error('Usage: tsx validate_skill.ts <skill-directory>');
  process.exit(1);
}

const absoluteSkillDir = path.resolve(process.cwd(), skillDir);
const manifestPath = path.join(absoluteSkillDir, 'skill.yaml');

if (!fs.existsSync(manifestPath)) {
  console.error(`Error: skill.yaml not found in ${absoluteSkillDir}`);
  process.exit(1);
}

try {
  const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
  const manifest = yaml.load(manifestContent);

  const valid = validate(manifest);

  if (!valid) {
    console.error('Validation failed:');
    console.error(JSON.stringify(validate.errors, null, 2));
    process.exit(1);
  }

  // Check structure
  const requiredFiles = ['SKILL.md', 'src/index.ts', 'package.json'];
  const missingFiles = requiredFiles.filter(f => !fs.existsSync(path.join(absoluteSkillDir, f)));

  if (missingFiles.length > 0) {
     console.error('Missing required files:', missingFiles.join(', '));
     process.exit(1);
  }

  // Check directories
  const requiredDirs = ['tests'];
  const missingDirs = requiredDirs.filter(d => !fs.existsSync(path.join(absoluteSkillDir, d)));

  if (missingDirs.length > 0) {
      console.error('Missing required directories:', missingDirs.join(', '));
      process.exit(1);
  }

  console.log(`✅ Skill ${path.basename(skillDir)} is valid!`);
} catch (e) {
  console.error('Error validating skill:', e);
  process.exit(1);
}
