const fs = require('fs');
const cls = JSON.parse(
  fs.readFileSync('docs/learn/badges/badge-classes.json', 'utf8'),
);
const id = process.argv[2] || 'user-essentials';
const email = process.argv[3] || 'user@example.com';
const badge = cls[id];
if (!badge) throw new Error('Unknown badge ' + id);
const assertion = {
  '@context': 'https://w3id.org/openbadges/v2',
  type: 'Assertion',
  id: `${badge.id}/assertions/${Date.now()}`,
  recipient: { type: 'email', identity: email },
  badge: badge.id,
  verification: { type: 'HostedBadge' },
  issuedOn: new Date().toISOString(),
};
const out = `docs/learn/badges/assertions/${id}-${Date.now()}.json`;
fs.mkdirSync('docs/learn/badges/assertions', { recursive: true });
fs.writeFileSync(out, JSON.stringify(assertion, null, 2));
console.log('Wrote', out);
