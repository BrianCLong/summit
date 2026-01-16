import fs from 'fs';

const sbom = JSON.parse(fs.readFileSync('sbom.cdx.json', 'utf8'));
const vulns = sbom.vulnerabilities || [];

const critical = vulns.filter(v => v.ratings?.some(r => r.severity === 'critical'));

if (critical.length > 0) {
  console.error('Critical vulnerabilities found:', critical.map(v => v.id));
  process.exit(1);
}

console.log('No critical vulnerabilities detected');
