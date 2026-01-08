
import { Router } from 'express';
import { SyncRepository } from '../sync/SyncRepository.js';
import { getPostgresPool } from '../config/database.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import { AuthenticatedRequest } from './types.js';
import crypto from 'crypto';

const router = Router();
const pool = getPostgresPool();
const repo = new SyncRepository(pool);

router.post('/v2/pull', ensureAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
        const { tenantId } = req.user!;
        const { sinceCursor, limit, scope, includeTombstones } = req.body;

        // Scope validation & parsing
        const safeScope = {
            types: Array.isArray(scope?.types) ? scope.types : undefined,
            ids: Array.isArray(scope?.ids) ? scope.ids : undefined,
            tags: Array.isArray(scope?.tags) ? scope.tags : undefined,
            timeRange: scope?.timeRange ? {
                start: scope.timeRange.start ? new Date(scope.timeRange.start) : undefined,
                end: scope.timeRange.end ? new Date(scope.timeRange.end) : undefined
            } : undefined
        };

        const result = await repo.pull(tenantId, safeScope, Number(sinceCursor) || 0, Number(limit) || 100);

        res.json({
            materializedObjects: result.objects,
            serverCursor: result.maxId,
            hasMore: result.objects.length === (Number(limit) || 100)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/v2/push', ensureAuthenticated, async (req: AuthenticatedRequest, res) => {
   try {
       const { tenantId } = req.user!;
       const { entries } = req.body;

       if (!Array.isArray(entries)) {
           return res.status(400).json({ error: 'entries must be an array' });
       }

       const safeEntries = entries.map((e: any) => ({
           ...e,
           tenantId // Enforce tenantId from auth
       }));

       const result = await repo.ingestJournal(safeEntries);
       res.json(result);

   } catch (err) {
       console.error(err);
       res.status(500).json({ error: 'Internal Server Error' });
   }
});

router.post('/v2/ingest-pack', ensureAuthenticated, async (req: AuthenticatedRequest, res) => {
     try {
       const { tenantId } = req.user!;
       const { pack, signature } = req.body;

       if (!pack || !pack.objects) return res.status(400).json({ error: 'Invalid pack' });

       // Verify tenantId match
       if (pack.tenantId !== tenantId) {
           return res.status(403).json({ error: 'Pack tenant mismatch' });
       }

       // Verify signature
       // TODO: Replace with actual public key verification using crypto
       // Requires loading tenant's public key or a global verify key.
       if (!signature) {
           return res.status(400).json({ error: 'Missing signature' });
       }
       // Stub verification for "verified" simulation
       // In production, use: verify(pack, signature, publicKey)

       const result = await repo.ingestJournal(pack.objects.map((o: any) => ({
           ...o,
           tenantId,
           // Generated fields for initial ingest if missing
           opId: o.opId || crypto.randomUUID(),
           vectorClock: o.vectorClock || { server: 1 }
       })));

       res.json(result);

   } catch (err) {
       console.error(err);
       res.status(500).json({ error: 'Internal Server Error' });
   }
});

export default router;
