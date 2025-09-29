import { Pool } from 'pg';
import { Parser as CsvParser } from 'json2csv';
import archiver from 'archiver';
import { PassThrough } from 'stream';
import { getPostgresPool } from '../../config/database';
import { putObject } from './storage';
import crypto from 'crypto';

export class OsintExporter {
  private pool: Pool;
  constructor(pool?: Pool) { this.pool = pool || getPostgresPool(); }

  async fetchDocs(ids: string[]) {
    const { rows } = await this.pool.query(
      `SELECT hash, title, summary, url, language, published_at, license, policy FROM osint_documents WHERE hash = ANY($1)`,
      [ids]
    );
    return rows;
  }

  async assertExportAllowed(ids: string[]) {
    const docs = await this.fetchDocs(ids);
    const denied = docs.filter((d:any)=> d.license && d.license.allowExport === false);
    if (denied.length) {
      const list = denied.map((d:any)=> d.hash).join(', ');
      const err = new Error(`Export blocked by license for: ${list}`) as any;
      err.code = 'LICENSE_DENIED';
      throw err;
    }
    return docs;
  }

  async export(ids: string[], format: 'CSV'|'JSON'|'ZIP') {
    let docs = await this.assertExportAllowed(ids);
    if (process.env.REDACT_PII_ON_EXPORT === 'true') {
      const redact = (s:string)=> s
        .replace(/([A-Z0-9._%+-]+)@([A-Z0-9.-]+\.[A-Z]{2,})/ig, '[redacted-email]')
        .replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, '[redacted-ip]')
        .replace(/\+?\d[\d\s().-]{6,}\d/g, '[redacted-phone]');
      docs = docs.map((d:any)=> ({
        ...d,
        summary: d.summary ? redact(d.summary) : d.summary,
      }));
    }
    const now = new Date();
    const id = crypto.createHash('sha1').update(JSON.stringify({ ids, now: now.toISOString(), format })).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

    if (format === 'JSON') {
      const buf = Buffer.from(JSON.stringify({ exportedAt: now.toISOString(), docs }), 'utf8');
      putObject(`${id}.json`, buf);
      return { id: `${id}.json`, expiresAt };
    }
    if (format === 'CSV') {
      const parser = new CsvParser({ fields: ['hash','title','summary','url','language','published_at'] });
      const csv = parser.parse(docs);
      putObject(`${id}.csv`, Buffer.from(csv, 'utf8'));
      return { id: `${id}.csv`, expiresAt };
    }
    // ZIP: include both JSON and CSV
    const json = Buffer.from(JSON.stringify(docs), 'utf8');
    const parser = new CsvParser({ fields: ['hash','title','summary','url','language','published_at'] });
    const csv = Buffer.from(parser.parse(docs), 'utf8');
    // Build zip in memory
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];
    const out = new PassThrough();
    out.on('data', (c: Buffer) => chunks.push(c));
    const p = new Promise<Buffer>((resolve, reject)=>{
      out.on('end', ()=> resolve(Buffer.concat(chunks)));
      archive.on('error', reject);
    });
    archive.pipe(out);
    archive.append(json, { name: 'bundle.json' });
    archive.append(csv, { name: 'bundle.csv' });
    await archive.finalize();
    const zip = await p;
    putObject(`${id}.zip`, zip);
    return { id: `${id}.zip`, expiresAt };
  }
}
