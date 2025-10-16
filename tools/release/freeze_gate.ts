import fs from 'fs';
const now = new Date().toISOString();
const wins = JSON.parse(
  fs.readFileSync('.maestro/freeze_windows.json', 'utf8'),
);
const blocked = wins.find((w: any) => now >= w.from && now <= w.to);
if (blocked) {
  console.error(`❌ freeze window '${blocked.name}' in effect`);
  process.exit(1);
}
console.log('✅ no freeze windows active');
