import express from 'express';
import archiver from 'archiver';
import { v4 as uuidv4 } from 'uuid';
import { EvidenceStore, ClaimStore, InMemoryEvidenceStore, Neo4jEvidenceStore } from './storage/neo4j.js';
import { S3Blobs, InMemoryBlobs, S3BlobStore } from './storage/blobs.js';
import { loadConfig } from './config.js';
import { buildManifest, Manifest, ManifestEntry } from './domain/manifest.js';
import { evaluateExport } from './policy/engine.js';

export async function createServer() {
  const app = express();
  app.use(express.json());

  // dependency wiring (swap to real impl later)
  const cfg = loadConfig();
  let evidenceStore: EvidenceStore & ClaimStore = new InMemoryEvidenceStore();
  let blobs: S3Blobs = new InMemoryBlobs();
  if (cfg.neo4j) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const neo4j = require('neo4j-driver');
    const driver = neo4j.driver(cfg.neo4j.url, neo4j.auth.basic(cfg.neo4j.user, cfg.neo4j.password));
    evidenceStore = new Neo4jEvidenceStore(driver);
  }
  if (cfg.s3) {
    blobs = new S3BlobStore(cfg.s3);
  }

  // POST /prov/v1/evidence
  app.post('/prov/v1/evidence', async (req, res) => {
    try {
      const { checksum, algorithm, source, license, transforms = [], confidence } = req.body || {};
      if (!checksum || !algorithm || !source || !license) {
        return res.status(400).json({ error: 'missing_required_fields' });
      }
      const id = uuidv4();
      await evidenceStore.createEvidence({ id, checksum, algorithm, source, license, transforms, confidence });
      res.status(201).json({ id });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'failed' });
    }
  });

  // POST /prov/v1/claim
  app.post('/prov/v1/claim', async (req, res) => {
    try {
      const { statement, evidenceIds = [] } = req.body || {};
      if (!statement || !Array.isArray(evidenceIds) || evidenceIds.length === 0) {
        return res.status(400).json({ error: 'invalid_payload' });
      }
      const id = uuidv4();
      await evidenceStore.createClaim({ id, statement, evidenceIds });
      res.status(201).json({ id });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'failed' });
    }
  });

  // POST /prov/v1/export/:caseId
  app.post('/prov/v1/export/:caseId', async (req, res) => {
    try {
      const { caseId } = req.params;
      const selection: string[] = (req.body && req.body.evidenceIds) || []; // optional subset
      const rightToReply = req.body?.rightToReply; // optional metadata

      const ev = selection.length ? await evidenceStore.getEvidenceByIds(selection) : await evidenceStore.getEvidenceByCase(caseId);
      const deny = await evaluateExport(ev);
      if (deny.length) {
        return res.status(403).json({ error: 'policy_denied', reasons: deny });
      }

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="disclosure-${caseId}.zip"`);

      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.on('error', (err) => res.status(500).end(`Archive error: ${err.message}`));
      archive.pipe(res);

      // Exhibits (if any uploaded blobs were referenced)
      const entries: ManifestEntry[] = [];
      for (const e of ev) {
        if (e.blobKey) {
          const buf = await blobs.get(e.blobKey);
          const path = `exhibits/${e.id}`;
          archive.append(buf, { name: path });
          entries.push({ path, size: buf.length, sha256: await Manifest.sha256(buf) });
        }
      }

      const manifest: Manifest = await buildManifest(entries);
      archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

      const prov = { caseId, generatedAt: new Date().toISOString(), evidence: ev, rightToReply: rightToReply || null };
      archive.append(JSON.stringify(prov, null, 2), { name: 'provenance.json' });

      // LICENSES (collect unique licenses)
      const licenses = Array.from(new Set(ev.map(e => e.license))).sort();
      archive.append(licenses.map(l => `- ${l}`).join('\n') + '\n', { name: 'LICENSES.txt' });

      await archive.finalize();
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'export_failed' });
    }
  });

  // GET /prov/v1/manifest/:bundleId (stub: return not persisted yet)
  app.get('/prov/v1/manifest/:bundleId', async (req, res) => {
    // For beta: derive from store later. Placeholder returns 404.
    res.status(404).json({ error: 'not_implemented' });
  });

  return app;
}
