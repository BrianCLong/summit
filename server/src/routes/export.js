const express = require('express');
const { Parser } = require('json2csv');
const archiver = require('archiver');
const crypto = require('crypto');
const stream = require('stream');
const { getNeo4jDriver } = require('../config/database');
const { ensureAuthenticated } = require('../middleware/auth');

const router = express.Router();

router.use(ensureAuthenticated);

function addFilterClauses({ investigationId, entityType, tags, startDate, endDate }) {
  const where = [];
  const params = {};
  if (investigationId) { where.push('e.investigation_id = $investigationId'); params.investigationId = investigationId; }
  if (entityType) { where.push('e.type = $entityType'); params.entityType = entityType; }
  if (Array.isArray(tags) && tags.length) { where.push('ANY(t IN $tags WHERE t IN e.tags)'); params.tags = tags; }
  if (startDate) { where.push('e.created_at >= datetime($startDate)'); params.startDate = startDate; }
  if (endDate) { where.push('e.created_at <= datetime($endDate)'); params.endDate = endDate; }
  return { where: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

async function fetchGraph({ investigationId, entityType, tags, startDate, endDate }) {
  const driver = getNeo4jDriver();
  const session = driver.session();
  try {
    const { where, params } = addFilterClauses({ investigationId, entityType, tags, startDate, endDate });
    const nodesRes = await session.run(`MATCH (e:Entity) ${where} RETURN e` , params);
    const edgeWhere = where.replace(/e\./g, 'a.');
    const edgesRes = await session.run(`MATCH (a:Entity)-[r:RELATIONSHIP]->(b:Entity) ${edgeWhere ? edgeWhere + ' AND b.investigation_id = a.investigation_id' : ''} RETURN a,r,b`, params);
    const nodes = nodesRes.records.map(rec => rec.get('e').properties);
    const edges = edgesRes.records.map(rec => {
      const r = rec.get('r');
      const a = rec.get('a');
      const b = rec.get('b');
      return {
        id: r.properties?.id || r.identity?.toString?.() || undefined,
        uuid: r.properties?.uuid,
        type: r.type || r.properties?.type,
        label: r.properties?.label,
        source: a.properties?.uuid,
        target: b.properties?.uuid,
        properties: r.properties || {},
      };
    });
    return { nodes, edges };
  } finally {
    await session.close();
  }
}

router.get('/graph', async (req, res) => {
  try {
    const { format = 'json', investigationId, entityType, tags, startDate, endDate, encrypt, password } = req.query;
    const tagList = typeof tags === 'string' && tags.length ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const graph = await fetchGraph({ investigationId, entityType, tags: tagList, startDate, endDate });
    const { writeAudit } = require('../utils/audit');
    await writeAudit({
      userId: req.user?.id,
      action: 'EXPORT_GRAPH',
      resourceType: 'Graph',
      resourceId: investigationId || null,
      details: { format, entityType, tags: tagList, startDate, endDate, encrypt: !!encrypt },
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      actorRole: req.user?.role,
      sessionId: req.sessionId,
    });
    if (format === 'json') {
      res.set('Content-Type', 'application/json');
      return res.status(200).json(graph);
    }
    if (format === 'csv') {
      const nodeParser = new Parser({ fields: ['uuid','type','label','description','properties'] });
      const edgeParser = new Parser({ fields: ['uuid','type','label','source','target','properties'] });
      const nodesCsv = nodeParser.parse(graph.nodes.map(n => ({...n, properties: JSON.stringify(n.properties || {})})));
      const edgesCsv = edgeParser.parse(graph.edges.map(e => ({...e, properties: JSON.stringify(e.properties || {})})));
      res.set('Content-Type', 'text/csv');
      res.set('Content-Disposition', 'attachment; filename="graph_export.csv"');
      return res.status(200).send(`# Nodes\n${nodesCsv}\n\n# Edges\n${edgesCsv}\n`);
    }
    if (format === 'zip') {
      // Build a zip archive in-memory; prefer password-zip if requested and plugin available
      const baseZip = async () => new Promise((resolve, reject) => {
        const bufs = [];
        const pass = new stream.PassThrough();
        pass.on('data', (d) => bufs.push(d));
        pass.on('end', () => resolve(Buffer.concat(bufs)));
        pass.on('error', reject);
        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.on('error', reject);
        archive.pipe(pass);
        archive.append(JSON.stringify(graph.nodes, null, 2), { name: 'nodes.json' });
        archive.append(JSON.stringify(graph.edges, null, 2), { name: 'edges.json' });
        archive.finalize();
      });

      if (encrypt && password) {
        try {
          // Try standard password-zip (if dependency present)
          const archiverEncrypted = require('archiver-zip-encrypted');
          const bufs = [];
          const pass = new stream.PassThrough();
          pass.on('data', (d) => bufs.push(d));
          pass.on('end', () => {
            res.set('Content-Type', 'application/zip');
            res.set('Content-Disposition', 'attachment; filename="graph_export.zip"');
            return res.status(200).send(Buffer.concat(bufs));
          });
          pass.on('error', (e) => { throw e; });
          archiver.registerFormat('zip-encrypted', archiverEncrypted);
          const archive = archiver('zip-encrypted', {
            zlib: { level: 9 },
            encryptionMethod: process.env.ZIP_ENCRYPTION_METHOD || 'aes256',
            password: String(password),
          });
          archive.on('error', (e) => { throw e; });
          archive.pipe(pass);
          archive.append(JSON.stringify(graph.nodes, null, 2), { name: 'nodes.json' });
          archive.append(JSON.stringify(graph.edges, null, 2), { name: 'edges.json' });
          archive.finalize();
          return; // Response sent on stream end
        } catch (_) {
          // Fallback: AES-256-GCM envelope over plain zip
          const zipBuffer = await baseZip();
          const salt = crypto.randomBytes(16);
          const iv = crypto.randomBytes(12);
          const key = crypto.pbkdf2Sync(String(password), salt, 100_000, 32, 'sha256');
          const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
          const ciphertext = Buffer.concat([cipher.update(zipBuffer), cipher.final()]);
          const tag = cipher.getAuthTag();
          const magic = Buffer.from('IGZ1');
          const out = Buffer.concat([magic, salt, iv, tag, ciphertext]);
          res.set('Content-Type', 'application/octet-stream');
          res.set('Content-Disposition', 'attachment; filename="graph_export.enc"');
          return res.status(200).send(out);
        }
      }

      const zipBuffer = await baseZip();
      res.set('Content-Type', 'application/zip');
      res.set('Content-Disposition', 'attachment; filename="graph_export.zip"');
      return res.status(200).send(zipBuffer);
    }
    if (format === 'pdf') {
      // Lightweight summary PDF using Puppeteer (if installed)
      try {
        const puppeteer = require('puppeteer');
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>Graph Export</title></head><body>
        <h1>Graph Export Summary</h1>
        <p>Nodes: ${graph.nodes.length} | Edges: ${graph.edges.length}</p>
        <pre>${JSON.stringify(graph, null, 2).slice(0, 5000)}</pre>
        </body></html>`;
        const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdf = await page.pdf({ format: 'A4' });
        await browser.close();
        res.set('Content-Type', 'application/pdf');
        res.set('Content-Disposition', 'attachment; filename="graph_export.pdf"');
        return res.status(200).send(Buffer.from(pdf));
      } catch (e) {
        return res.status(500).json({ error: 'PDF generation failed', detail: e.message });
      }
    }
    return res.status(400).json({ error: 'Unsupported format' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
