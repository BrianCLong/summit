const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
let puppeteer = null;
try {
  puppeteer = require('puppeteer');
} catch (e) {
  /* optional dep */
}

class ReportService {
  constructor(logger) {
    this.logger = logger;
    this.outputDir = path.join(process.cwd(), 'uploads', 'reports');
    fs.mkdirSync(this.outputDir, { recursive: true });
  }

  resolveReportTimestamp(metadata = {}) {
    const candidate =
      metadata.generatedAt ||
      metadata.deterministicTimestamp ||
      metadata.reportTimestamp;
    if (!candidate) {
      return new Date();
    }
    const parsed = new Date(candidate);
    if (Number.isNaN(parsed.getTime())) {
      return new Date();
    }
    return parsed;
  }

  formatTimestampForFilename(date) {
    return date.toISOString().slice(0, 19).replace(/[:T]/g, '-');
  }

  normalizeValue(value) {
    if (Array.isArray(value)) {
      return value.map((item) => this.normalizeValue(item));
    }
    if (value && typeof value === 'object') {
      return Object.keys(value)
        .sort()
        .reduce((acc, key) => {
          acc[key] = this.normalizeValue(value[key]);
          return acc;
        }, {});
    }
    return value;
  }

  stableStringify(value) {
    return JSON.stringify(this.normalizeValue(value), null, 2);
  }

  normalizeReportCollections(findings = [], evidence = [], gaps = [], metadata = {}) {
    if (!metadata || metadata.deterministic !== true) {
      return { findings, evidence, gaps };
    }
    const keyForItem = (item) => {
      if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
        return String(item);
      }
      return this.stableStringify(item);
    };
    const sortItems = (items) =>
      [...items].sort((a, b) => keyForItem(a).localeCompare(keyForItem(b)));
    return {
      findings: sortItems(findings || []),
      evidence: sortItems(evidence || []),
      gaps: sortItems(gaps || []),
    };
  }

  resolveProvenance(metadata = {}) {
    const provenance = metadata.provenance || {};
    const deferred = 'Deferred pending source';
    return {
      buildVersion:
        metadata.buildVersion ||
        provenance.buildVersion ||
        process.env.BUILD_VERSION ||
        deferred,
      policyBundleHash:
        metadata.policyBundleHash ||
        provenance.policyBundleHash ||
        process.env.POLICY_BUNDLE_HASH ||
        deferred,
      exportHash:
        metadata.exportHash ||
        provenance.exportHash ||
        metadata.bundleHash ||
        deferred,
      timeWindow:
        metadata.timeWindow ||
        provenance.timeWindow ||
        deferred,
    };
  }

  async generateHTMLReport({
    investigationId,
    title,
    findings,
    evidence,
    metadata,
  }) {
    // Citation Gate
    let gaps = [];
    try {
      // Dynamic import to handle ESM/TS interop
      const { CitationGate } = await import('../gates/CitationGate.ts').catch(() =>
        import('../gates/CitationGate.js'),
      );
      if (CitationGate) {
        const payload = { findings, evidence, metadata };
        const validated = await CitationGate.validateCitations(payload, {
          tenantId: (metadata && metadata.tenantId) || 'default',
          userId: (metadata && metadata.userId) || 'system',
        });
        findings = validated.findings;
        if (validated.gaps) {
          gaps = validated.gaps;
        }
      }
    } catch (e) {
      this.logger &&
        this.logger.warn('CitationGate check failed or skipped', {
          error: e.message,
        });
    }

    const reportTimestamp = this.resolveReportTimestamp(metadata);
    const generatedAt = reportTimestamp.toISOString();
    const safeTitle = (
      title || `investigation-${investigationId || 'general'}`
    ).replace(/[^a-z0-9-_]+/gi, '-');
    const filename = `${safeTitle}-${this.formatTimestampForFilename(reportTimestamp)}.html`;
    const filePath = path.join(this.outputDir, filename);

    const normalized = this.normalizeReportCollections(findings, evidence, gaps, metadata);
    const html = this.renderHTML({
      investigationId,
      title: title || 'Investigation Report',
      findings: normalized.findings,
      evidence: normalized.evidence,
      metadata,
      gaps: normalized.gaps,
      generatedAt,
    });
    fs.writeFileSync(filePath, html, 'utf-8');
    this.logger && this.logger.info('Report generated', { filePath });
    const url = `/uploads/reports/${filename}`;
    return { filename, url, path: filePath, contentType: 'text/html' };
  }

  async generatePDFReport({
    investigationId,
    title,
    findings,
    evidence,
    metadata,
  }) {
    if (!puppeteer) {
      throw new Error(
        'Puppeteer not installed on server. Run npm install to enable PDF export.',
      );
    }
    const htmlRes = await this.generateHTMLReport({
      investigationId,
      title,
      findings,
      evidence,
      metadata,
    });
    const pdfName = htmlRes.filename.replace(/\.html$/, '.pdf');
    const pdfPath = path.join(this.outputDir, pdfName);
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
      const page = await browser.newPage();
      await page.goto('file://' + htmlRes.path, { waitUntil: 'networkidle0' });
      await page.pdf({ path: pdfPath, format: 'A4', printBackground: true });
    } finally {
      await browser.close();
    }
    const url = `/uploads/reports/${pdfName}`;
    return {
      filename: pdfName,
      url,
      path: pdfPath,
      contentType: 'application/pdf',
      source: htmlRes,
    };
  }

  async generateMarkdownReport({
    investigationId,
    title,
    findings,
    evidence,
    metadata,
  }) {
    // Citation Gate
    let gaps = [];
    try {
      const { CitationGate } = await import('../gates/CitationGate.ts').catch(() =>
        import('../gates/CitationGate.js'),
      );
      if (CitationGate) {
        const payload = { findings, evidence, metadata };
        const validated = await CitationGate.validateCitations(payload, {
          tenantId: (metadata && metadata.tenantId) || 'default',
          userId: (metadata && metadata.userId) || 'system',
        });
        findings = validated.findings;
        if (validated.gaps) {
          gaps = validated.gaps;
        }
      }
    } catch (e) {
      this.logger &&
        this.logger.warn('CitationGate check failed or skipped', {
          error: e.message,
        });
    }

    const reportTimestamp = this.resolveReportTimestamp(metadata);
    const generatedAt = reportTimestamp.toISOString();
    const safeTitle = (
      title || `investigation-${investigationId || 'general'}`
    ).replace(/[^a-z0-9-_]+/gi, '-');
    const filename = `${safeTitle}-${this.formatTimestampForFilename(reportTimestamp)}.md`;
    const filePath = path.join(this.outputDir, filename);

    const normalized = this.normalizeReportCollections(findings, evidence, gaps, metadata);
    const markdown = this.renderMarkdown({
      investigationId,
      title: title || 'Investigation Report',
      findings: normalized.findings,
      evidence: normalized.evidence,
      metadata,
      gaps: normalized.gaps,
      generatedAt,
    });
    fs.writeFileSync(filePath, markdown, 'utf-8');
    this.logger && this.logger.info('Markdown report generated', { filePath });
    const url = `/uploads/reports/${filename}`;
    return { filename, url, path: filePath, contentType: 'text/markdown' };
  }

  async generateESGReport({
    title = 'ESG Compliance Report',
    period = new Date().getFullYear().toString(),
    environmental = {},
    social = {},
    governance = {},
    metadata = {},
    format = 'pdf',
  }) {
    const reportTimestamp = this.resolveReportTimestamp(metadata);
    const generatedAt = reportTimestamp.toISOString();
    const safeTitle = `${title.replace(/[^a-z0-9-_]+/gi, '-')}-${period}`;
    const filenameBase = `${safeTitle}-${this.formatTimestampForFilename(reportTimestamp)}`;

    const html = this.renderESGHTML({
      title,
      period,
      environmental,
      social,
      governance,
      metadata,
      generatedAt,
    });

    const htmlPath = path.join(this.outputDir, `${filenameBase}.html`);
    fs.writeFileSync(htmlPath, html, 'utf-8');

    let result = {
      filename: `${filenameBase}.html`,
      url: `/uploads/reports/${filenameBase}.html`,
      path: htmlPath,
      contentType: 'text/html',
    };

    if (format === 'pdf' && puppeteer) {
      const pdfPath = path.join(this.outputDir, `${filenameBase}.pdf`);
      const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      try {
        const page = await browser.newPage();
        await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0' });
        await page.pdf({ path: pdfPath, format: 'A4', printBackground: true });
      } finally {
        await browser.close();
      }
      result = {
        filename: `${filenameBase}.pdf`,
        url: `/uploads/reports/${filenameBase}.pdf`,
        path: pdfPath,
        contentType: 'application/pdf',
        source: result,
      };
    }

    this.logger && this.logger.info('ESG report generated', { path: result.path });
    return result;
  }

  async zipFiles(items, zipBasename) {
    const zipName = zipBasename.endsWith('.zip')
      ? zipBasename
      : `${zipBasename}.zip`;
    const zipPath = path.join(this.outputDir, zipName);
    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      output.on('close', resolve);
      archive.on('error', reject);
      archive.pipe(output);
      items.forEach((it) => {
        if (it.path) {
          archive.file(it.path, { name: it.name || path.basename(it.path) });
        } else if (it.content !== undefined) {
          archive.append(it.content, { name: it.name });
        }
      });
      archive.finalize();
    });
    const url = `/uploads/reports/${zipName}`;
    return {
      filename: zipName,
      url,
      path: zipPath,
      contentType: 'application/zip',
    };
  }

  async generate({
    investigationId,
    title,
    findings,
    evidence,
    metadata,
    format = 'html',
    zip = false,
  }) {
    let primary;
    const reportTimestamp = this.resolveReportTimestamp(metadata);
    const generatedAt = reportTimestamp.toISOString();
    if (format === 'pdf')
      primary = await this.generatePDFReport({
        investigationId,
        title,
        findings,
        evidence,
        metadata,
      });
    else if (format === 'md' || format === 'markdown')
      primary = await this.generateMarkdownReport({
        investigationId,
        title,
        findings,
        evidence,
        metadata,
      });
    else
      primary = await this.generateHTMLReport({
        investigationId,
        title,
        findings,
        evidence,
        metadata,
      });
    if (!zip) return primary;
    const normalized = this.normalizeReportCollections(findings, evidence, [], metadata);
    const json = JSON.stringify(
      {
        investigationId,
        title,
        findings: normalized.findings,
        evidence: normalized.evidence,
        metadata,
        generatedAt,
      },
      null,
      2,
    );
    const csvHeader = 'section,value\n';
    const csvFindings = (normalized.findings || [])
      .map((f) => `finding,${JSON.stringify(String(f))}`)
      .join('\n');
    const csvEvidence = (normalized.evidence || [])
      .map((e) => `evidence,${JSON.stringify(String(e))}`)
      .join('\n');
    const csv =
      csvHeader +
      csvFindings +
      (csvFindings && csvEvidence ? '\n' : '') +
      csvEvidence +
      '\n';
    const items = [];
    if (primary.contentType === 'application/pdf' && primary.source)
      items.push({ path: primary.source.path });
    items.push({ path: primary.path });
    items.push({ name: 'report.json', content: json });
    items.push({ name: 'report.csv', content: csv });
    const zipRes = await this.zipFiles(
      items,
      `${title || 'report'}-${this.formatTimestampForFilename(reportTimestamp)}`,
    );
    return { ...zipRes, items: [primary] };
  }

  renderESGHTML({
    title,
    period,
    environmental = {},
    social = {},
    governance = {},
    metadata = {},
    generatedAt,
  }) {
    const esc = (s) =>
      String(s || '').replace(
        /[&<>]/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c],
      );
    const provenance = this.resolveProvenance(metadata);

    const metricRow = (label, value, unit = '') => `
      <div class="metric-row">
        <span class="metric-label">${esc(label)}</span>
        <span class="metric-value">${esc(value)}${unit ? ' <span class="unit">' + esc(unit) + '</span>' : ''}</span>
      </div>`;

    const section = (name, data) => {
      const metrics = Object.entries(data).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => {
        if (typeof v === 'object' && v !== null) {
          return metricRow(k, v.value, v.unit);
        }
        return metricRow(k, v);
      }).join('');

      return `
        <div class="section ${name.toLowerCase()}">
          <h2>${esc(name)}</h2>
          <div class="metrics-grid">
            ${metrics || '<p>No data recorded.</p>'}
          </div>
        </div>`;
    };

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <style>
    body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; margin: 2rem; color: #333; }
    h1 { color: #2c3e50; border-bottom: 2px solid #eee; padding-bottom: 0.5rem; }
    h2 { color: #34495e; margin-top: 2rem; border-left: 4px solid #3498db; padding-left: 10px; }
    .meta { color: #7f8c8d; font-size: 0.9rem; margin-bottom: 2rem; }
    .metric-row { display: flex; justify-content: space-between; border-bottom: 1px solid #f0f0f0; padding: 8px 0; }
    .metric-label { font-weight: 500; }
    .metric-value { font-family: monospace; font-weight: bold; }
    .unit { color: #95a5a6; font-size: 0.8em; font-weight: normal; }
    .footer { margin-top: 4rem; font-size: 0.8rem; text-align: center; color: #bdc3c7; }
    .provenance { margin-top: 2rem; font-size: 0.85rem; color: #555; }
    .provenance ul { padding-left: 1.2rem; }
  </style>
</head>
<body>
  <h1>${esc(title)}</h1>
  <div class="meta">
    Report Period: ${esc(period)}<br>
    Generated: ${esc(generatedAt)}
  </div>

  ${section('Environmental', environmental)}
  ${section('Social', social)}
  ${section('Governance', governance)}

  <div class="section">
    <h2>Metadata</h2>
    <pre style="background: #f8f9fa; padding: 10px; border-radius: 4px;">${esc(
      this.stableStringify(metadata || {}),
    )}</pre>
  </div>

  <div class="section provenance">
    <h2>Provenance</h2>
    <ul>
      <li>Build: ${esc(provenance.buildVersion)}</li>
      <li>Policy bundle hash: ${esc(provenance.policyBundleHash)}</li>
      <li>Export hash: ${esc(provenance.exportHash)}</li>
      <li>Time window: ${esc(provenance.timeWindow)}</li>
    </ul>
  </div>

  <div class="footer">
    Generated by Summit OS ESG Toolkit
  </div>
</body>
</html>`;
  }

  renderHTML({
    investigationId,
    title,
    findings = [],
    evidence = [],
    metadata = {},
    gaps = [],
    generatedAt,
  }) {
    const esc = (s) =>
      String(s || '').replace(
        /[&<>]/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c],
      );
    const renderItem = (x) => {
      if (typeof x === 'object' && x.text) {
        // Render statement with citations if present
        let html = esc(x.text);
        if (x.citations && x.citations.length) {
          html += ' <span class="citations">[' + x.citations.map(c => typeof c === 'string' ? esc(c) : esc(c.locator)).join(', ') + ']</span>';
        }
        return `<li>${html}</li>`;
      }
      return `<li>${esc(x)}</li>`;
    };
    const items = (arr) => arr.map(renderItem).join('\n');
    const provenance = this.resolveProvenance(metadata);

    let gapsHtml = '';
    if (gaps && gaps.length > 0) {
      gapsHtml = `
  <div class="section gaps">
    <h2>Gaps Appendix (Uncited Statements)</h2>
    <p>The following statements were removed from the main report due to missing evidence citations.</p>
    <ul>
      ${items(gaps)}
    </ul>
  </div>`;
    }

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <style>
    body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; margin: 2rem; }
    h1, h2 { margin-top: 1.5rem; }
    .meta { color: #555; font-size: 0.9rem; }
    .section { margin-bottom: 1.5rem; }
    .evidence li, .findings li { margin-bottom: 0.25rem; }
    .citations { font-size: 0.8em; color: #666; vertical-align: super; }
    .gaps { background-color: #fff8f8; padding: 1rem; border-left: 4px solid #ff4444; }
    code { background: #f6f8fa; padding: 2px 4px; border-radius: 4px; }
    .provenance { margin-top: 2rem; font-size: 0.85rem; color: #555; }
    .provenance ul { padding-left: 1.2rem; }
  </style>
  </head>
<body>
  <h1>${esc(title)}</h1>
  <div class="meta">Generated: ${esc(generatedAt)}${investigationId ? ` • Investigation: ${esc(investigationId)}` : ''}</div>
  <div class="section summary">
    <h2>Summary</h2>
    <ul>
      <li>Total Findings: ${findings.length}</li>
      <li>Total Evidence: ${evidence.length}</li>
      ${gaps.length > 0 ? `<li>Uncited Statements: ${gaps.length}</li>` : ''}
    </ul>
  </div>
  <div class="section findings">
    <h2>Findings</h2>
    <ul>
      ${items(findings)}
    </ul>
  </div>
  <div class="section evidence">
    <h2>Evidence</h2>
    <ul>
      ${items(evidence)}
    </ul>
  </div>
  ${gapsHtml}
  <div class="section">
    <h2>Metadata</h2>
    <pre>${esc(this.stableStringify(metadata || {}))}</pre>
  </div>
  <div class="section provenance">
    <h2>Provenance</h2>
    <ul>
      <li>Build: ${esc(provenance.buildVersion)}</li>
      <li>Policy bundle hash: ${esc(provenance.policyBundleHash)}</li>
      <li>Export hash: ${esc(provenance.exportHash)}</li>
      <li>Time window: ${esc(provenance.timeWindow)}</li>
    </ul>
  </div>
</body>
</html>`;
  }

  renderMarkdown({
    investigationId,
    title,
    findings = [],
    evidence = [],
    metadata = {},
    gaps = [],
    generatedAt,
  }) {
    const esc = (s) => String(s || '');
    const renderItem = (x) => {
      if (typeof x === 'object' && x.text) {
        let md = `- ${esc(x.text)}`;
        if (x.citations && x.citations.length) {
          md += ` [${x.citations.map(c => typeof c === 'string' ? esc(c) : esc(c.locator)).join(', ')}]`;
        }
        return md;
      }
      return `- ${esc(x)}`;
    };
    const items = (arr) => arr.map(renderItem).join('\n');
    const provenance = this.resolveProvenance(metadata);

    let gapsMd = '';
    if (gaps && gaps.length > 0) {
      gapsMd = `\n## Gaps Appendix (Uncited Statements)\n\nThe following statements were removed from the main report due to missing evidence citations.\n\n${items(gaps)}\n`;
    }

    return `# ${esc(title)}\n\nGenerated: ${esc(generatedAt)}$${
      investigationId ? `\nInvestigation: ${esc(investigationId)}` : ''
    }\n\n## Summary\n\n- Total Findings: ${findings.length}\n- Total Evidence: ${evidence.length}${gaps.length > 0 ? `\n- Uncited Statements: ${gaps.length}` : ''}\n\n## Findings\n${items(findings)}\n\n## Evidence\n${items(evidence)}\n${gapsMd}\n## Metadata\n\n\`\`\`json\n${esc(
      this.stableStringify(metadata || {}),
    )}\n\`\`\`\n\n## Provenance\n\n- Build: ${esc(provenance.buildVersion)}\n- Policy bundle hash: ${esc(provenance.policyBundleHash)}\n- Export hash: ${esc(provenance.exportHash)}\n- Time window: ${esc(provenance.timeWindow)}\n`;
  }
}

module.exports = ReportService;
