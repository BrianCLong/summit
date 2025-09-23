<<<<<<< HEAD
const express = require('express');
const { Parser } = require('json2csv');
const archiver = require('archiver');
const crypto = require('crypto');
const stream = require('stream');
const { getNeo4jDriver } = require('../config/database');
const { ensureAuthenticated } = require('../middleware/auth');
const { redactData } = require('../utils/dataRedaction'); // Import redactData
=======
const express = require("express");
const { Parser } = require("json2csv");
const crypto = require("crypto");
const stream = require("stream");
const puppeteer = require("puppeteer");
const { getNeo4jDriver } = require("../config/database");
const { ensureAuthenticated } = require("../middleware/auth");
>>>>>>> 1ae8cd71faa0d57638f1dd82b1f544b60eae109f

const router = express.Router();

router.use(ensureAuthenticated);

function addFilterClauses({
  investigationId,
  entityType,
  tags,
  startDate,
  endDate,
}) {
  const where = [];
  const params = {};
  if (investigationId) {
    where.push("e.investigation_id = $investigationId");
    params.investigationId = investigationId;
  }
  if (entityType) {
    where.push("e.type = $entityType");
    params.entityType = entityType;
  }
  if (Array.isArray(tags) && tags.length) {
    where.push("ANY(t IN $tags WHERE t IN e.tags)");
    params.tags = tags;
  }
  if (startDate) {
    where.push("e.created_at >= datetime($startDate)");
    params.startDate = startDate;
  }
  if (endDate) {
    where.push("e.created_at <= datetime($endDate)");
    params.endDate = endDate;
  }
  return { where: where.length ? `WHERE ${where.join(" AND ")}` : "", params };
}

async function streamGraph({
  investigationId,
  entityType,
  tags,
  startDate,
  endDate,
  writableStream,
  format,
}) {
  const driver = getNeo4jDriver();
  const session = driver.session();
  try {
    const { where, params } = addFilterClauses({
      investigationId,
      entityType,
      tags,
      startDate,
      endDate,
    });

    if (format === "json") {
      writableStream.write('{"nodes":[');
      const nodesQuery = `MATCH (e:Entity) ${where} RETURN e`;
      const nodesResult = await session.run(nodesQuery, params);
      for (let i = 0; i < nodesResult.records.length; i++) {
<<<<<<< HEAD
        const originalNode = nodesResult.records[i].get('e').properties;
        const redactedNode = redactData(originalNode, req.user); // Redact data
        writableStream.write(JSON.stringify(redactedNode));
=======
        writableStream.write(
          JSON.stringify(nodesResult.records[i].get("e").properties),
        );
>>>>>>> 1ae8cd71faa0d57638f1dd82b1f544b60eae109f
        if (i < nodesResult.records.length - 1) {
          writableStream.write(",");
        }
      }
      writableStream.write('],"edges":[');
      const edgeWhere = where.replace(/e\./g, "a.");
      const edgesQuery = `MATCH (a:Entity)-[r:RELATIONSHIP]->(b:Entity) ${edgeWhere ? edgeWhere + " AND b.investigation_id = a.investigation_id" : ""} RETURN a,r,b`;
      const edgesResult = await session.run(edgesQuery, params);
      for (let i = 0; i < edgesResult.records.length; i++) {
<<<<<<< HEAD
        const r = edgesResult.records[i].get('r');
        const a = edgesResult.records[i].get('a');
        const b = edgesResult.records[i].get('b');
        const originalEdge = {
=======
        const r = edgesResult.records[i].get("r");
        const a = edgesResult.records[i].get("a");
        const b = edgesResult.records[i].get("b");
        const edge = {
>>>>>>> 1ae8cd71faa0d57638f1dd82b1f544b60eae109f
          id: r.properties?.id || r.identity?.toString?.() || undefined,
          uuid: r.properties?.uuid,
          type: r.type || r.properties?.type,
          label: r.properties?.label,
          source: a.properties?.uuid,
          target: b.properties?.uuid,
          properties: r.properties || {},
        };
        const redactedEdge = redactData(originalEdge, req.user); // Redact data
        writableStream.write(JSON.stringify(redactedEdge));
        if (i < edgesResult.records.length - 1) {
          writableStream.write(",");
        }
      }
      writableStream.write("]}");
    } else if (format === "csv") {
      const nodeParser = new Parser({
        fields: ["uuid", "type", "label", "description", "properties"],
        header: true,
      });
      const edgeParser = new Parser({
        fields: ["uuid", "type", "label", "source", "target", "properties"],
        header: true,
      });
      writableStream.write("# Nodes\n");
      const nodesQuery = `MATCH (e:Entity) ${where} RETURN e`;
      const nodesResult = await session.run(nodesQuery, params);
<<<<<<< HEAD
      const nodes = nodesResult.records.map(rec => redactData(rec.get('e').properties, req.user)); // Redact data
      writableStream.write(nodeParser.parse(nodes.map(n => ({...n, properties: JSON.stringify(n.properties || {})}))) + '\n\n');
      writableStream.write('# Edges\n');
      const edgeWhere = where.replace(/e\./g, 'a.');
      const edgesQuery = `MATCH (a:Entity)-[r:RELATIONSHIP]->(b:Entity) ${edgeWhere ? edgeWhere + ' AND b.investigation_id = a.investigation_id' : ''} RETURN a,r,b`;
      const edgesResult = await session.run(edgesQuery, params);
      const edges = edgesResult.records.map(rec => {
        const r = rec.get('r');
        const a = rec.get('a');
        const b = rec.get('b');
        const originalEdge = {
=======
      const nodes = nodesResult.records.map((rec) => rec.get("e").properties);
      writableStream.write(
        nodeParser.parse(
          nodes.map((n) => ({
            ...n,
            properties: JSON.stringify(n.properties || {}),
          })),
        ) + "\n\n",
      );
      writableStream.write("# Edges\n");
      const edgeWhere = where.replace(/e\./g, "a.");
      const edgesQuery = `MATCH (a:Entity)-[r:RELATIONSHIP]->(b:Entity) ${edgeWhere ? edgeWhere + " AND b.investigation_id = a.investigation_id" : ""} RETURN a,r,b`;
      const edgesResult = await session.run(edgesQuery, params);
      const edges = edgesResult.records.map((rec) => {
        const r = rec.get("r");
        const a = rec.get("a");
        const b = rec.get("b");
        return {
>>>>>>> 1ae8cd71faa0d57638f1dd82b1f544b60eae109f
          id: r.properties?.id || r.identity?.toString?.() || undefined,
          uuid: r.properties?.uuid,
          type: r.type || r.properties?.type,
          label: r.properties?.label,
          source: a.properties?.uuid,
          target: b.properties?.uuid,
          properties: r.properties || {},
        };
        return redactData(originalEdge, req.user); // Redact data
      });
      writableStream.write(
        edgeParser.parse(
          edges.map((e) => ({
            ...e,
            properties: JSON.stringify(e.properties || {}),
          })),
        ) + "\n",
      );
    }
    writableStream.end();
  } finally {
    await session.close();
  }
}

router.get("/graph", async (req, res) => {
  try {
    const {
      format = "json",
      investigationId,
      entityType,
      tags,
      startDate,
      endDate,
      encrypt,
      password,
    } = req.query;
    const tagList =
      typeof tags === "string" && tags.length
        ? tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

    const { writeAudit } = require("../utils/audit");
    await writeAudit({
      userId: req.user?.id,
      action: "EXPORT_GRAPH",
      resourceType: "Graph",
      resourceId: investigationId || null,
      details: {
        format,
        entityType,
        tags: tagList,
        startDate,
        endDate,
        encrypt: !!encrypt,
      },
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      actorRole: req.user?.role,
      sessionId: req.sessionId,
    });

    if (format === "json") {
      res.set("Content-Type", "application/json");
      const passThrough = new stream.PassThrough();
      passThrough.pipe(res);
      streamGraph({
        investigationId,
        entityType,
        tags: tagList,
        startDate,
        endDate,
        writableStream: passThrough,
        format,
      });
    } else if (format === "csv") {
      res.set("Content-Type", "text/csv");
      res.set("Content-Disposition", 'attachment; filename="graph_export.csv"');
      const passThrough = new stream.PassThrough();
      passThrough.pipe(res);
      streamGraph({
        investigationId,
        entityType,
        tags: tagList,
        startDate,
        endDate,
        writableStream: passThrough,
        format,
      });
    } else {
      return res
        .status(400)
        .json({ error: "Unsupported format for streaming. Use json or csv." });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/pdf", async (req, res) => {
  try {
    const { image, metadata = {}, password } = req.body || {};

    const { writeAudit } = require("../utils/audit");
    await writeAudit({
      userId: req.user?.id,
      action: "EXPORT_PDF",
      resourceType: "Graph",
      resourceId: null,
      details: { hasImage: !!image },
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      actorRole: req.user?.role,
      sessionId: req.sessionId,
    });

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    const esc = (s) =>
      String(s).replace(
        /[&<>]/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c],
      );
    const html = `<!DOCTYPE html><html><body><h1>Investigation Export</h1><pre>${esc(
      JSON.stringify(metadata, null, 2),
    )}</pre>${image ? `<img src="${image}" style="max-width:100%;"/>` : ""}</body></html>`;
    await page.setContent(html);
    const pdfBuffer = await page.pdf({ format: "A4" });
    await browser.close();

    let output = pdfBuffer;
    if (password) {
      const key = crypto.createHash("sha256").update(password).digest();
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
      output = Buffer.concat([iv, cipher.update(pdfBuffer), cipher.final()]);
      res.set("Content-Type", "application/octet-stream");
      res.set(
        "Content-Disposition",
        'attachment; filename="investigation.pdf.enc"',
      );
    } else {
      res.set("Content-Type", "application/pdf");
      res.set(
        "Content-Disposition",
        'attachment; filename="investigation.pdf"',
      );
    }
    res.send(output);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
