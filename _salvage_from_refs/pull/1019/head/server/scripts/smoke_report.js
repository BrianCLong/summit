// Smoke test for report generation
const path = require('path');
const ReportService = require('../src/services/ReportService');

async function main() {
  const svc = new ReportService(console);
  const base = { investigationId: 'demo-123', title: 'Smoke Test Report', findings: ['Finding A', 'Finding B'], evidence: ['Evidence 1', 'Evidence 2'], metadata: { env: 'smoke' } };
  const htmlZip = await svc.generate({ ...base, format: 'html', zip: true });
  console.log('HTML+ZIP generated:', htmlZip);
  try {
    const pdfZip = await svc.generate({ ...base, format: 'pdf', zip: true });
    console.log('PDF+ZIP generated:', pdfZip);
  } catch (e) {
    console.warn('PDF generation failed (likely puppeteer/Chromium not available):', e.message);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

