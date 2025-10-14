import { Router } from 'express';
import archiver from 'archiver';
import { getPostgresPool } from '../db/postgres.js';
import { ProvenanceRepo } from '../repos/ProvenanceRepo.js';
export const auditRouter = Router();
auditRouter.get('/incidents/:id/audit-bundle.zip', async (req, res) => {
    const tenant = String(req.headers['x-tenant-id'] || req.headers['x-tenant'] || '');
    if (!tenant)
        return res.status(400).json({ error: 'tenant_required' });
    const { id } = req.params;
    const pg = getPostgresPool();
    const prov = new ProvenanceRepo(pg);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="incident-${id}-audit.zip"`);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => res.status(500).end(`Archive error: ${err.message}`));
    archive.pipe(res);
    try {
        const { rows } = await pg.query('SELECT * FROM incidents WHERE id = $1', [id]);
        archive.append(JSON.stringify({ incident: rows[0] ?? null, generatedAt: new Date().toISOString() }, null, 2), { name: 'incident.json' });
    }
    catch {
        archive.append(JSON.stringify({ warning: 'incidents table not available', generatedAt: new Date().toISOString() }, null, 2), { name: 'incident.json' });
    }
    try {
        const events = await prov.by('incident', id, undefined, 5000, 0);
        archive.append(JSON.stringify(events, null, 2), { name: 'provenance.json' });
    }
    catch {
        archive.append(JSON.stringify({ error: 'failed to load provenance' }, null, 2), {
            name: 'provenance.json',
        });
    }
    await archive.finalize();
});
auditRouter.get('/investigations/:id/audit-bundle.zip', async (req, res) => {
    const tenant = String(req.headers['x-tenant-id'] || req.headers['x-tenant'] || '');
    if (!tenant)
        return res.status(400).json({ error: 'tenant_required' });
    const { id } = req.params;
    const pg = getPostgresPool();
    const prov = new ProvenanceRepo(pg);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="investigation-${id}-audit.zip"`);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => res.status(500).end(`Archive error: ${err.message}`));
    archive.pipe(res);
    try {
        const { rows } = await pg.query('SELECT * FROM investigations WHERE id = $1', [id]);
        archive.append(JSON.stringify({ investigation: rows[0] ?? null, generatedAt: new Date().toISOString() }, null, 2), { name: 'investigation.json' });
    }
    catch {
        archive.append(JSON.stringify({ warning: 'investigations table not available', generatedAt: new Date().toISOString() }, null, 2), { name: 'investigation.json' });
    }
    try {
        const events = await prov.by('investigation', id, undefined, 5000, 0);
        archive.append(JSON.stringify(events, null, 2), { name: 'provenance.json' });
    }
    catch {
        archive.append(JSON.stringify({ error: 'failed to load provenance' }, null, 2), {
            name: 'provenance.json',
        });
    }
    await archive.finalize();
});
export default auditRouter;
//# sourceMappingURL=audit.js.map