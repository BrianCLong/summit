const fs = require('fs');
const msg = process.env.PR_TITLE + ' ' + (process.env.PR_BODY || '');
const touchesDb =
  /(db\/migrations|schema|prisma|sequelize|knex)/.test(msg) ||
  (process.env.CHANGED_FILES || '')
    .split('\n')
    .some((p) => /db\/migrations|schema/.test(p));
if (touchesDb && !fs.existsSync('SECURITY/migration-plan.md')) {
  console.error('❌ DB change detected but SECURITY/migration-plan.md missing');
  process.exit(1);
}
console.log('✅ Migration plan present or no DB change.');
