const prBody = process.env.PR_BODY || '';

const requiredSections = [
  { header: '## Assumption Ledger', minLength: 10 },
  { header: '## Diff Budget', minLength: 10 },
  { header: '## Success Criteria', minLength: 5 },
  { header: '## Evidence Summary', minLength: 10 }
];

console.log('🛡️ Verifying Summit Agent Operating Standard (S-AOS) compliance...');

if (prBody.includes('PR created automatically by Jules')) {
  console.warn('⚠️  Skipping strict S-AOS check for automated Jules PR.');
  process.exit(0);
}

const missing = [];
const tooShort = [];

const sections = prBody.split(/^## /m).map(s => '## ' + s);

requiredSections.forEach(req => {
  const section = sections.find(s => s.startsWith(req.header));
  if (!section) {
    missing.push(req.header);
  } else {
    // Basic content check: remove the header and trim
    const content = section.replace(req.header, '').trim();
    // Also remove common placeholders and bullet keys
    const cleaned = content
      .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
      .replace(/- \*\*.*?\*\*: /g, '') // Remove bullet keys
      .trim();

    if (cleaned.length < req.minLength) {
      tooShort.push(req.header);
    }
  }
});

if (missing.length > 0) {
  console.error('❌ S-AOS violation: Missing mandatory PR sections:');
  missing.forEach(m => console.error(`   - ${m}`));
}

if (tooShort.length > 0) {
  console.error('❌ S-AOS violation: Mandatory sections are empty or too short:');
  tooShort.forEach(s => console.error(`   - ${s}`));
}

if (missing.length > 0 || tooShort.length > 0) {
  console.error('\nPlease update the PR description to include and fill out these sections correctly.');
  process.exit(1);
}

console.log('✅ S-AOS compliance check passed.');
