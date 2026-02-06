import fs from 'node:fs';
try {
    const content = fs.readFileSync('.env', 'utf8');
    console.log('✅ Read .env successfully, length:', content.length);
} catch (e) {
    console.error('❌ Failed to read .env:', e.message);
}
