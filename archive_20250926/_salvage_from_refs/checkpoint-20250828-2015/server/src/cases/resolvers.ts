import { getPostgresPool } from '../src/config/database';
import { evaluateOPA } from '../src/osint/opa';
import otelService from '../src/monitoring/opentelemetry';
import crypto from 'crypto';

const pool = getPostgresPool();

export const caseResolvers = {
  Query: {
    cases: async (_:any, args:any, ctx:any) => {
      if (!ctx.user?.scopes?.includes('intelgraph.case.read')) throw new Error('forbidden');
      const decision = await evaluateOPA('cases.query', { user: ctx.user, purpose: ctx.purpose||'investigation', op:'cases', args });
      if (!decision.allow) throw new Error(decision.reason || 'purpose_denied');
      const where:string[] = []; const params:any[] = [];
      if (args?.status) where.push(`status = $${params.push(args.status)}`);
      if (args?.search) { const q = `%${args.search}%`; where.push(`(name ILIKE $${params.push(q)} OR summary ILIKE $${params.push(q)})`); }
      const sql = `SELECT id, tenant_id, name, status, priority, summary, created_by, created_at, updated_at FROM cases` + (where.length?` WHERE ${where.join(' AND ')}`:'') + ` ORDER BY created_at DESC LIMIT $${params.push(args?.limit||50)}`;
      const { rows } = await pool.query(sql, params);
      return rows.map((r:any)=>({ id:r.id, tenantId:r.tenant_id, name:r.name, status:r.status, priority:r.priority, summary:r.summary, createdBy:r.created_by, createdAt:r.created_at, updatedAt:r.updated_at }));
    },
    case: async (_:any, { id }:any, ctx:any) => {
      if (!ctx.user?.scopes?.includes('intelgraph.case.read')) throw new Error('forbidden');
      const decision = await evaluateOPA('cases.query', { user: ctx.user, purpose: ctx.purpose||'investigation', op:'case', args:{ id } });
      if (!decision.allow) throw new Error(decision.reason || 'purpose_denied');
      const { rows } = await pool.query(`SELECT id, tenant_id, name, status, priority, summary, created_by, created_at, updated_at FROM cases WHERE id=$1`, [id]);
      const r = rows[0];
      return r ? { id:r.id, tenantId:r.tenant_id, name:r.name, status:r.status, priority:r.priority, summary:r.summary, createdBy:r.created_by, createdAt:r.created_at, updatedAt:r.updated_at } : null;
    },
    caseItems: async (_:any, { caseId }:any, ctx:any) => {
      if (!ctx.user?.scopes?.includes('intelgraph.case.read')) throw new Error('forbidden');
      const { rows } = await pool.query(`SELECT id, case_id, kind, ref_id, tags, added_by, added_at FROM case_items WHERE case_id=$1 ORDER BY added_at DESC`, [caseId]);
      return rows.map((r:any)=> ({ id:r.id, caseId:r.case_id, kind:r.kind, refId:r.ref_id, tags:r.tags||[], addedBy:r.added_by, addedAt:r.added_at }));
    },
    caseTimeline: async (_:any, { caseId, limit = 100 }:any, ctx:any) => {
      if (!ctx.user?.scopes?.includes('intelgraph.case.read')) throw new Error('forbidden');
      const { rows } = await pool.query(`SELECT id, case_id, at, event, payload FROM case_timeline WHERE case_id=$1 ORDER BY at DESC LIMIT $2`, [caseId, limit]);
      return rows.map((r:any)=> ({ id:r.id, caseId:r.case_id, at:r.at, event:r.event, payload:r.payload }));
    },
  },
  Mutation: {
    createCase: async (_:any, { input }:any, ctx:any) => {
      if (!ctx.user?.scopes?.includes('intelgraph.case.manage')) throw new Error('forbidden');
      const decision = await evaluateOPA('cases.mutate', { user: ctx.user, purpose: ctx.purpose||'investigation', op:'createCase', args:{ input } });
      if (!decision.allow) throw new Error(decision.reason || 'purpose_denied');
      const span = otelService.startSpan('case.create');
      try {
        const { rows } = await pool.query(`INSERT INTO cases(tenant_id, name, status, priority, summary, created_by) VALUES($1,$2,'OPEN',$3,$4,$5) RETURNING id, tenant_id, name, status, priority, summary, created_by, created_at, updated_at`, [input.tenantId||null, input.name, input.priority||null, input.summary||null, ctx.user?.id||null]);
        const r = rows[0];
        return { id:r.id, tenantId:r.tenant_id, name:r.name, status:r.status, priority:r.priority, summary:r.summary, createdBy:r.created_by, createdAt:r.created_at, updatedAt:r.updated_at };
      } finally { span.end(); }
    },
    updateCase: async (_:any, { id, input }:any, ctx:any) => {
      if (!ctx.user?.scopes?.includes('intelgraph.case.manage')) throw new Error('forbidden');
      const fields:string[] = []; const params:any[] = [];
      if (input.name !== undefined) fields.push(`name=$${params.push(input.name)}`);
      if (input.priority !== undefined) fields.push(`priority=$${params.push(input.priority)}`);
      if (input.summary !== undefined) fields.push(`summary=$${params.push(input.summary)}`);
      params.push(id);
      const sql = `UPDATE cases SET ${fields.join(', ')}, updated_at=now() WHERE id=$${params.length} RETURNING id, tenant_id, name, status, priority, summary, created_by, created_at, updated_at`;
      const { rows } = await pool.query(sql, params);
      const r = rows[0];
      return { id:r.id, tenantId:r.tenant_id, name:r.name, status:r.status, priority:r.priority, summary:r.summary, createdBy:r.created_by, createdAt:r.created_at, updatedAt:r.updated_at };
    },
    addCaseItem: async (_:any, { caseId, kind, refId, tags }:any, ctx:any) => {
      if (!ctx.user?.scopes?.includes('intelgraph.case.manage')) throw new Error('forbidden');
      const span = otelService.startSpan('case.addItem');
      try {
        if (String(kind).toUpperCase() === 'OSINT_DOC') {
          const d = await pool.query(`SELECT license FROM osint_documents WHERE hash=$1`, [refId]);
          const lic = d.rows[0]?.license || {};
          if (lic.allowExport === false) throw new Error('license_denied: evidence cannot be exported');
        }
        const { rows } = await pool.query(`INSERT INTO case_items(case_id, kind, ref_id, tags, added_by) VALUES($1,$2,$3,COALESCE($4,'{}'::TEXT[]),$5) RETURNING id, case_id, kind, ref_id, tags, added_by, added_at`, [caseId, kind, refId, tags||[], ctx.user?.id||null]);
        await pool.query(`INSERT INTO case_timeline(case_id, event, payload) VALUES($1,$2,$3)`, [caseId, 'added.item', { kind, refId, tags: tags||[] }]);
        const r = rows[0];
        return { id:r.id, caseId:r.case_id, kind:r.kind, refId:r.ref_id, tags:r.tags||[], addedBy:r.added_by, addedAt:r.added_at };
      } finally { span.end(); }
    },
    addCaseNote: async (_:any, { caseId, body }:any, ctx:any) => {
      if (!ctx.user?.scopes?.includes('intelgraph.case.manage')) throw new Error('forbidden');
      const { rows } = await pool.query(`INSERT INTO case_notes(case_id, author_id, body) VALUES($1,$2,$3) RETURNING id, case_id, author_id, body, created_at`, [caseId, ctx.user?.id||null, body]);
      await pool.query(`INSERT INTO case_timeline(case_id, event, payload) VALUES($1,$2,$3)`, [caseId, 'added.note', { body }]);
      const r = rows[0];
      return { id:r.id, caseId:r.case_id, authorId:r.author_id, body:r.body, createdAt:r.created_at };
    },
    closeCase: async (_:any, { id }:any, ctx:any) => {
      if (!ctx.user?.scopes?.includes('intelgraph.case.manage')) throw new Error('forbidden');
      await pool.query(`UPDATE cases SET status='CLOSED', updated_at=now() WHERE id=$1`, [id]);
      await pool.query(`INSERT INTO case_timeline(case_id, event, payload) VALUES($1,$2,$3)`, [id, 'status.changed', { status:'CLOSED' }]);
      return true;
    },
    exportCaseBundle: async (_:any, { caseId, format }:any, ctx:any) => {
      if (!ctx.user?.scopes?.includes('intelgraph.case.export')) throw new Error('forbidden');
      const decision = await evaluateOPA('cases.mutate', { user: ctx.user, purpose: ctx.purpose||'investigation', op:'exportCaseBundle', args:{ caseId, format } });
      if (!decision.allow) throw new Error(decision.reason || 'purpose_denied');
      const it = await pool.query(`SELECT kind, ref_id FROM case_items WHERE case_id=$1`, [caseId]);
      const docs = it.rows.filter((r:any)=> String(r.kind).toUpperCase()==='OSINT_DOC').map((r:any)=> r.ref_id);
      if (docs.length) {
        const q = await pool.query(`SELECT hash, license FROM osint_documents WHERE hash = ANY($1)`, [docs]);
        const denied = q.rows.filter((d:any)=> d.license && d.license.allowExport === false);
        if (denied.length) {
          const list = denied.map((d:any)=> d.hash).join(', ');
          const err:any = new Error(`case export blocked by license for: ${list}`);
          err.code = 'LICENSE_DENIED';
          throw err;
        }
      }
      const id = crypto.randomBytes(8).toString('hex');
      const { putObject } = await import('../src/osint/export/storage');
      const c = await pool.query(`SELECT name, summary, priority, status, created_at FROM cases WHERE id=$1`, [caseId]);
      const caseRow = c.rows[0]||{};
      const report = `<html><body><h1>${caseRow.name||'Case'}</h1><p>Status: ${caseRow.status}</p><p>Priority: ${caseRow.priority||''}</p><h2>Items</h2><ul>${it.rows.map((r:any)=>`<li>${r.kind}: ${r.ref_id}</li>`).join('')}</ul></body></html>`;
      putObject(`${id}.html`, Buffer.from(report,'utf8'));
      if (String(format).toUpperCase()==='ZIP') {
        const archiver = (await import('archiver')).default;
        const { PassThrough } = await import('stream');
        const archive = archiver('zip', { zlib: { level: 9 } });
        const chunks:Buffer[]=[]; const out = new PassThrough(); out.on('data', (c:Buffer)=>chunks.push(c));
        const p = new Promise<Buffer>((resolve,reject)=>{ out.on('end',()=>resolve(Buffer.concat(chunks))); archive.on('error',reject); });
        archive.pipe(out);
        archive.append(Buffer.from(report,'utf8'), { name:'report.html' });
        archive.append(Buffer.from(JSON.stringify({ items: it.rows }), 'utf8'), { name:'evidence/evidence.json' });
        await archive.finalize(); const zip = await p; putObject(`${id}.zip`, zip);
      } else if (String(format).toUpperCase()==='PDF') {
        const puppeteer = (await import('puppeteer')).default;
        const browser = await puppeteer.launch({ headless: 'new' });
        try {
          const page = await browser.newPage();
          await page.setContent(report, { waitUntil: 'networkidle0' });
          const pdf = await page.pdf({ format: 'A4', printBackground: true });
          putObject(`${id}.pdf`, pdf);
        } finally { await browser.close(); }
      }
      const ts = Date.now(); const secret = process.env.EXPORT_SIGNING_SECRET || 'dev-secret'; const file = `${id}.${String(format).toLowerCase()==='zip'?'zip':String(format).toLowerCase()==='pdf'?'pdf':'html'}`;
      const base = `id=${file}&ts=${ts}`; const sig = crypto.createHmac('sha256', secret).update(base).digest('hex');
      return { id, url: `/api/export/case/${file}?ts=${ts}&sig=${sig}`, expiresAt: new Date(Date.now()+15*60*1000) } as any;
    }
  }
};

export default caseResolvers;
