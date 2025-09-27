import fs from 'fs';
import path from 'path';

// Placeholder script that would register persisted queries
const patternsDir = path.join(__dirname, '../../docs/hunting/patterns');
const files = fs.readdirSync(patternsDir).filter(f => f.endsWith('.md'));
console.log('Installing patterns:', files);
// Implementation would create persisted queries in backend
