import { loadConfig } from '../src/config/load.js';

console.log('Validating configuration...');
try {
  process.env.CONFIG_VALIDATE_ON_START = 'true';
  const config = loadConfig();
  console.log('✅ Configuration is valid.');
  process.exit(0);
} catch (error) {
  console.error('❌ Configuration validation failed:', error);
  process.exit(1);
}
