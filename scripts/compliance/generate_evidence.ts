import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const outDir = join(process.cwd(), 'dist/evidence');
mkdirSync(outDir, { recursive: true });
const version = process.env.VERSION || '5.3.1';
writeFileSync(join(outDir, `ga-v${version}.zip`), 'stub evidence');
console.log('Generated stub evidence bundle');
