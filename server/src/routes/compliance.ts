import express from 'express';

const router = express.Router();

router.get('/controls', async (_req, res) => {
  const rows = [
    { id: 'SOC2-CC2.1', status: 'green', evidenceUri: '/docs/compliance/soc2-cc2.1.pdf' },
    { id: 'NIST-AC-2', status: 'green', evidenceUri: '/docs/compliance/nist-ac-2.json' },
  ];
  res.json(rows);
});

// Export control pack as JSON or minimal PDF
router.get('/export', async (req, res) => {
  const framework = (req.query.framework as string) || 'soc2';
  const format = (req.query.format as string) || 'json';
  const controls = [
    { id: 'SOC2-CC2.1', title: 'Communications and Information', status: 'green', evidenceUri: '/docs/compliance/soc2-cc2.1.pdf' },
    { id: 'SOC2-CC7.2', title: 'Change Management', status: 'green', evidenceUri: '/docs/compliance/soc2-cc7.2.json' },
    { id: 'FedRAMP-AC-2', title: 'Account Management', status: 'green', evidenceUri: '/docs/compliance/fedramp-ac-2.json' },
  ];
  const pack = {
    framework,
    generatedAt: new Date().toISOString(),
    summary: {
      mustControlsGreen: controls.filter(c => c.status === 'green').length,
      total: controls.length,
    },
    controls,
  };

  if (format === 'json') {
    res.setHeader('content-type', 'application/json');
    return res.send(JSON.stringify(pack, null, 2));
  }

  if (format === 'pdf') {
    const pdf = minimalPdfFromText(`IntelGraph Control Pack\nFramework: ${framework}\nGenerated: ${pack.generatedAt}\n\n` + controls.map(c => `${c.id} - ${c.title} [${c.status}]`).join('\n'));
    res.setHeader('content-type', 'application/pdf');
    return res.send(pdf);
  }

  return res.status(406).json({ error: 'unsupported format', supported: ['json', 'pdf'] });
});

function minimalPdfFromText(text: string): Buffer {
  // Very small single-page PDF with plain text content.
  // This avoids external deps (pdfkit/puppeteer) for basic export.
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const lines = esc(text).split('\n').map((l, i) => `(${l}) Tj 0 -14 Td`).join('\n');
  const content = `BT /F1 12 Tf 50 750 Td ${lines} ET`;
  const contentBytes = Buffer.from(content, 'utf8');
  const objects: string[] = [];
  objects.push('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj');
  objects.push('2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj');
  objects.push('3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj');
  objects.push('4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj');
  objects.push(`5 0 obj << /Length ${contentBytes.length} >> stream\n${content}\nendstream endobj`);
  // Assemble xref
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj + '\n';
  }
  const xrefPos = Buffer.byteLength(pdf, 'utf8');
  pdf += 'xref\n0 ' + (objects.length + 1) + '\n';
  pdf += '0000000000 65535 f \n';
  for (const off of offsets) {
    pdf += (off + '').padStart(10, '0') + ' 00000 n \n';
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

export default router;
