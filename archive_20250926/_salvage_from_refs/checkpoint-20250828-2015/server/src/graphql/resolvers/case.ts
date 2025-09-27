import { IResolvers } from '@graphql-tools/utils';
import { getPostgresPool } from '../../db/postgres.js';
import { generatePdf } from '../../lib/pdfGenerator';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { getObjectPath, ensureExportDir } from '../../osint/export/storage';
import { sign } from '../../routes/export'; // Import the sign function
import { evaluateOPA } from '../../osint/opa'; // Import evaluateOPA
import crypto from 'crypto'; // Import crypto
import { ProvenanceRepo } from '../../repos/ProvenanceRepo'; // Import ProvenanceRepo

const caseResolvers: IResolvers = {
  Query: {
    case: async (parent, { id }, { user, purpose }, info) => {
      const pool = getPostgresPool();
      const client = await pool.connect();
      try {
        // OPA check for read permission
        const decision = await evaluateOPA('cases.query', { user, purpose, op: 'case', args: { id } });
        if (!decision.allow) {
          throw new Error(decision.reason || 'Unauthorized to view case.');
        }

        const caseResult = await client.query('SELECT * FROM cases WHERE id = $1', [id]);
        if (caseResult.rows.length === 0) {
          return null;
        }
        const caseData = caseResult.rows[0];

        const membersResult = await client.query('SELECT * FROM case_members WHERE case_id = $1', [id]);
        const itemsResult = await client.query('SELECT * FROM case_items WHERE case_id = $1', [id]);
        const notesResult = await client.query('SELECT * FROM case_notes WHERE case_id = $1', [id]);
        const timelineResult = await client.query('SELECT * FROM case_timeline WHERE case_id = $1', [id]);

        return {
          ...caseData,
          members: membersResult.rows,
          items: itemsResult.rows,
          notes: notesResult.rows,
          timeline: timelineResult.rows,
        };
      } finally {
        client.release();
      }
    },
    cases: async (parent, args, { user }, info) => {
      const pool = getPostgresPool();
      const client = await pool.connect();
      try {
        const result = await client.query('SELECT * FROM cases WHERE tenant_id = $1 ORDER BY created_at DESC', [user.tenant_id]);
        return result.rows;
      } finally {
        client.release();
      }
    },
    legalHolds: async (parent, { search, after, limit = 25 }, { user }, info) => {
      const pool = getPostgresPool();
      const client = await pool.connect();
      try {
        let query = 'SELECT * FROM legal_holds WHERE tenant_id = $1';
        const params = [user.tenant_id];

        if (search) {
          query += ' AND name ILIKE $2';
          params.push(`%${search}%`);
        }

        if (after) {
          query += ` AND id > ${params.length + 1}`;
          params.push(after);
        }

        query += ` ORDER BY id LIMIT ${params.length + 1}`;
        params.push(limit);

        const result = await client.query(query, params);
        return result.rows;
      } finally {
        client.release();
      }
    },
  },
  Mutation: {
    addCaseNote: async (parent, { caseId, body }, { user }, info) => {
      const pool = getPostgresPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const noteResult = await client.query(
          'INSERT INTO case_notes (case_id, author_id, body) VALUES ($1, $2, $3) RETURNING *',
          [caseId, user.id, body]
        );
        const newNote = noteResult.rows[0];

        await client.query(
          'INSERT INTO case_timeline (case_id, event, payload) VALUES ($1, $2, $3)',
          [caseId, 'note.created', { note_id: newNote.id, author_id: user.id }]
        );

        await client.query('COMMIT');
        return newNote;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    },
    addCaseItem: async (parent, { caseId, kind, refId, tags = [] }, { user }, info) => {
      const pool = getPostgresPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const itemResult = await client.query(
          'INSERT INTO case_items (case_id, kind, ref_id, tags, added_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [caseId, kind, refId, tags, user.id]
        );
        const newItem = itemResult.rows[0];

        await client.query(
          'INSERT INTO case_timeline (case_id, event, payload) VALUES ($1, $2, $3)',
          [caseId, 'item.added', { item_id: newItem.id, kind, ref_id: refId, user_id: user.id }]
        );

        await client.query('COMMIT');
        return newItem;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    },
    createCase: async (parent, { name, summary }, { user }, info) => {
      const pool = getPostgresPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const caseResult = await client.query(
          'INSERT INTO cases (tenant_id, name, summary, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
          [user.tenant_id, name, summary, user.id]
        );
        const newCase = caseResult.rows[0];

        await client.query(
          'INSERT INTO case_members (case_id, user_id, role) VALUES ($1, $2, $3)',
          [newCase.id, user.id, 'OWNER']
        );

        await client.query(
          'INSERT INTO case_timeline (case_id, event, payload) VALUES ($1, $2, $3)',
          [newCase.id, 'case.created', { case_id: newCase.id, user_id: user.id }]
        );

        await client.query('COMMIT');
        return newCase;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    },
    updateCase: async (parent, { id, status, priority }, { user }, info) => {
      const pool = getPostgresPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const currentCaseResult = await client.query('SELECT * FROM cases WHERE id = $1', [id]);
        if (currentCaseResult.rows.length === 0) {
          throw new Error('Case not found');
        }
        const currentCase = currentCaseResult.rows[0];

        const newStatus = status || currentCase.status;
        const newPriority = priority || currentCase.priority;

        const updatedCaseResult = await client.query(
          'UPDATE cases SET status = $1, priority = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
          [newStatus, newPriority, id]
        );
        const updatedCase = updatedCaseResult.rows[0];

        if (status && status !== currentCase.status) {
          await client.query(
            'INSERT INTO case_timeline (case_id, event, payload) VALUES ($1, $2, $3)',
            [id, 'status.changed', { old: currentCase.status, new: status, user_id: user.id }]
          );
        }

        if (priority && priority !== currentCase.priority) {
          await client.query(
            'INSERT INTO case_timeline (case_id, event, payload) VALUES ($1, $2, $3)',
            [id, 'priority.changed', { old: currentCase.priority, new: priority, user_id: user.id }]
          );
        }

        await client.query('COMMIT');
        return updatedCase;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    },
    removeCaseItem: async (parent, { caseId, itemId }, { user }, info) => {
      const pool = getPostgresPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const itemResult = await client.query('SELECT * FROM case_items WHERE id = $1 AND case_id = $2', [itemId, caseId]);
        if (itemResult.rows.length === 0) {
          throw new Error('Item not found in case');
        }
        const item = itemResult.rows[0];

        await client.query('DELETE FROM case_items WHERE id = $1', [itemId]);

        await client.query(
          'INSERT INTO case_timeline (case_id, event, payload) VALUES ($1, $2, $3)',
          [caseId, 'item.removed', { item_id: itemId, kind: item.kind, ref_id: item.ref_id, user_id: user.id }]
        );

        await client.query('COMMIT');
        return true;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    },
            exportCaseBundle: async (parent, { caseId, format }, { user, purpose }, info) => {
      const pool = getPostgresPool();
      const client = await pool.connect();
      try {
        // OPA check for export permission
        const decision = await evaluateOPA('cases.mutate', { user, purpose: 'export', op: 'exportCaseBundle', args: { caseId, format } });
        if (!decision.allow) {
          throw new Error(decision.reason || 'Unauthorized to export case bundle.');
        }

        // 1. Check for legal hold
        const holdResult = await client.query(
          'SELECT 1 FROM legal_hold_items WHERE kind = \'CASE\' AND ref_id = $1',
          [caseId]
        );
        if (holdResult.rows.length > 0) {
          // Now, we'll use OPA to check if the legal hold blocks the export
          const legalHoldDecision = await evaluateOPA('cases.mutate', { user, purpose: 'export', op: 'exportCaseBundle', args: { caseId, format, onLegalHold: true } });
          if (!legalHoldDecision.allow) {
            throw new Error(legalHoldDecision.reason || 'Export blocked due to legal hold policy.');
          } else {
            // If OPA allows despite legal hold, log a warning or specific audit event
            console.warn(`OPA allowed export of case ${caseId} despite legal hold. Policy reason: ${legalHoldDecision.reason}`);
          }
        }

        // 2. Fetch case items and their provenance
        const itemsResult = await client.query('SELECT * FROM case_items WHERE case_id = $1', [caseId]);
        const items = itemsResult.rows;

        const provenanceRepo = new ProvenanceRepo(pool); // Initialize ProvenanceRepo
        const manifest: any[] = [];

        for (const item of items) {
          // TODO: Check license for each item to see if export is allowed.
          // This will likely involve another DB query or a call to a license service.

          // Fetch provenance for each item
          const provenance = await provenanceRepo.by(item.kind, item.ref_id); // Assuming kind and ref_id map to provenance
          const itemContent = JSON.stringify(item); // Placeholder for actual item content
          const itemHash = crypto.createHash('sha256').update(itemContent).digest('hex');

          manifest.push({
            itemId: item.id,
            kind: item.kind,
            refId: item.ref_id,
            hash: itemHash,
            provenance: provenance,
          });
        }

        ensureExportDir(); // Ensure the export directory exists

        let bundleFileName: string;
        let bundlePath: string;
        const timestamp = Date.now();
        const secret = process.env.EXPORT_SIGNING_SECRET || 'dev-secret';
        const baseUrl = process.env.BASE_URL || 'http://localhost:3001';

        if (format === 'PDF') {
          bundleFileName = `case-${caseId}-${timestamp}.pdf`;
          bundlePath = getObjectPath(bundleFileName);

          const caseResult = await client.query('SELECT * FROM cases WHERE id = $1', [caseId]);
          const caseData = caseResult.rows[0];

          const html = `
            <html>
              <head>
                <title>Case Report: ${caseData.name}</title>
              </head>
              <body>
                <h1>Case Report: ${caseData.name}</h1>
                <p><b>Status:</b> ${caseData.status}</p>
                <p><b>Priority:</b> ${caseData.priority}</p>
                <h2>Evidence</h2>
                <ul>
                  ${items.map(item => `<li>${item.kind}: ${item.ref_id} (Hash: ${manifest.find(m => m.itemId === item.id)?.hash})</li>`).join('')}
                </ul>
                <h2>Provenance Manifest</h2>
                <pre>${JSON.stringify(manifest, null, 2)}</pre>
              </body>
            </html>
          `;
          const pdfBuffer = await generatePdf(html);
          fs.writeFileSync(bundlePath, pdfBuffer);
        } else if (format === 'HTML') {
          bundleFileName = `case-${caseId}-${timestamp}.html`;
          bundlePath = getObjectPath(bundleFileName);

          const caseResult = await client.query('SELECT * FROM cases WHERE id = $1', [caseId]);
          const caseData = caseResult.rows[0];

          const htmlContent = `
            <html>
              <head>
                <title>Case Report: ${caseData.name}</title>
              </head>
              <body>
                <h1>Case Report: ${caseData.name}</h1>
                <p><b>Status:</b> ${caseData.status}</p>
                <p><b>Priority:</b> ${caseData.priority}</p>
                <h2>Evidence</h2>
                <ul>
                  ${items.map(item => `<li>${item.kind}: ${item.ref_id} (Hash: ${manifest.find(m => m.itemId === item.id)?.hash})</li>`).join('')}</ul>
                <h2>Provenance Manifest</h2>
                <pre>${JSON.stringify(manifest, null, 2)}</pre>
              </body>
            </html>
          `;
          fs.writeFileSync(bundlePath, htmlContent);
        } else if (format === 'ZIP') {
          bundleFileName = `case-${caseId}-${timestamp}.zip`;
          bundlePath = getObjectPath(bundleFileName);

          const output = fs.createWriteStream(bundlePath);
          const archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
          });

          archive.pipe(output);

          // Add manifest.json to the ZIP
          archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

          // TODO: Add actual evidence files to the ZIP
          // For now, add a dummy file
          archive.append('This is a dummy file for the ZIP archive.', { name: 'dummy.txt' });

          await archive.finalize();
        } else {
          throw new Error('Unsupported format');
        }
      } finally {
        client.release();
      }
    },
    createLegalHold: async (parent, { name }, { user }, info) => {
      const pool = getPostgresPool();
      const client = await pool.connect();
      try {
        const result = await client.query(
          'INSERT INTO legal_holds (tenant_id, name, created_by) VALUES ($1, $2, $3) RETURNING *',
          [user.tenant_id, name, user.id]
        );
        return result.rows[0];
      } finally {
        client.release();
      }
    },
    addToLegalHold: async (parent, { holdId, kind, refId }, { user }, info) => {
      const pool = getPostgresPool();
      const client = await pool.connect();
      try {
        const result = await client.query(
          'INSERT INTO legal_hold_items (hold_id, kind, ref_id) VALUES ($1, $2, $3) RETURNING *',
          [holdId, kind, refId]
        );
        return result.rows[0];
      } finally {
        client.release();
      }
    },
    removeFromLegalHold: async (parent, { holdId, kind, refId }, { user }, info) => {
      const pool = getPostgresPool();
      const client = await pool.connect();
      try {
        const result = await client.query(
          'DELETE FROM legal_hold_items WHERE hold_id = $1 AND kind = $2 AND ref_id = $3',
          [holdId, kind, refId]
        );
        return result.rowCount > 0;
      } finally {
        client.release();
      }
    },
  },
};

export default caseResolvers;
