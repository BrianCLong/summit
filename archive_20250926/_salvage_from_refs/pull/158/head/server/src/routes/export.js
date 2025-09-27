const express = require('express');
const { Parser } = require('json2csv');
const { getNeo4jDriver } = require('../config/database');
const { ensureAuthenticated } = require('../middleware/auth');

const router = express.Router();

router.use(ensureAuthenticated);

async function fetchGraph(investigationId) {
  const driver = getNeo4jDriver();
  const session = driver.session();
  try {
    const params = {};
    const where = investigationId ? 'WHERE e.investigation_id = $id' : '';
    if (investigationId) params.id = investigationId;
    const nodesRes = await session.run(`MATCH (e:Entity) ${where} RETURN e` , params);
    const edgesRes = await session.run(`MATCH (a:Entity)-[r:RELATIONSHIP]->(b:Entity) ${where ? 'WHERE a.investigation_id = $id AND b.investigation_id = $id' : ''} RETURN a,r,b`, params);
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
    const { format = 'json', investigationId } = req.query;
    const graph = await fetchGraph(investigationId);
    const { writeAudit } = require('../utils/audit');
    await writeAudit({ userId: req.user?.id, action: 'EXPORT_GRAPH', resourceType: 'Graph', resourceId: investigationId || null, details: { format } });
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
