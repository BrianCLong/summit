import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { SchemaValidator } from '../lib/config/schema-validator';
import { SecretManager } from '../lib/secrets/secret-manager';

const secretManager = new SecretManager();
const validator = new SchemaValidator(secretManager);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadYaml(filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Configuration file not found: ${filePath}`);
  }
  return yaml.load(fs.readFileSync(filePath, 'utf8'));
}

function loadJson(filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Configuration file not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function validateAppConfig() {
  const appConfigPath = path.resolve(__dirname, '../../config/app.yaml');
  const config = loadYaml(appConfigPath);
  validator.validate(config, 'app');
  console.log(`✔ app.yaml validated against app.schema`);
}

function validateFeatureFlags() {
  const flagsPath = path.resolve(__dirname, '../../config/feature-flags.json');
  if (!fs.existsSync(flagsPath)) {
    console.warn('feature-flags.json not found; skipping feature flag validation');
    return;
  }
  const flags = loadJson(flagsPath);
  validator.validate(flags, 'feature-flags');
  console.log(`✔ feature-flags.json validated against feature-flags.schema`);
}

function main() {
  validateAppConfig();
  validateFeatureFlags();
}

main();
