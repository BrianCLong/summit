const fs = require('fs');
const list = require('../.security/allowlist.yaml');
const today = new Date().toISOString().slice(0, 10);
for (const e of list.exceptions) {
  if (e.expires < today) {
    console.error(`Expired exception ${e.id}`);
    process.exit(1);
  }
}
console.log('✅ Exceptions valid');
