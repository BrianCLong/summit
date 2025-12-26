import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, 'dist', 'server.js');
if (fs.existsSync(distPath)) {
  await import(distPath);
} else {
  await import('./src/server.js');
}
