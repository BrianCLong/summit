import { Pool } from 'pg';
import { getPostgresPool } from '../../config/database';
import { evaluateOPA } from '../opa';
import { getIO } from '../../realtime/socket';

type Rule = { match?: string; kind?: string; domain?: string; tag?: string; sourceKind?: string };

export class WatchlistEvaluator {
  constructor(private pool: Pool = getPostgresPool()) {}

  private matchRule(rule: Rule, doc: any, entities: any[]): boolean {
    if (rule.sourceKind && String(doc?.sourceKind||'').toUpperCase() !== String(rule.sourceKind).toUpperCase()) return false;
    if (rule.match) {
      const pat = String(rule.match).toLowerCase();
      const hit = entities.some(e => String(e.name||e.id||'').toLowerCase().includes(pat));
      if (!hit) return false;
    }
    if (rule.tag) {
      const tags = doc?.policy?.tags || [];
      if (!tags.includes(rule.tag)) return false;
    }
    return true;
  }

  async evaluate(doc: any, entities: any[], ctx: { user?: any, purpose?: string } = {}) {
    // OPA purpose check
    const decision = await evaluateOPA('osint.alerts.evaluate', { user: ctx.user, purpose: ctx.purpose || 'investigation', doc: { hash: doc.hash }, entities });
    if (!decision.allow) return [];

    const { rows } = await this.pool.query(`SELECT id, name, rules FROM watchlists`);
    const alerts: any[] = [];
    for (const wl of rows) {
      const rules = Array.isArray(wl.rules) ? wl.rules : [];
      for (let idx = 0; idx < rules.length; idx++) {
        const rule: Rule = rules[idx];
        if (this.matchRule(rule, doc, entities)) {
          const ins = await this.pool.query(
            `INSERT INTO alerts(watchlist_id, entity_hash, doc_hash, rule_id, status) VALUES($1,$2,$3,$4,'NEW') RETURNING id`,
            [wl.id, entities[0]?.id || null, doc.hash, String(idx)]
          );
          alerts.push({ id: ins.rows[0].id, watchlistId: wl.id, docHash: doc.hash });
        }
      }
    }
    if (alerts.length) {
      const io = getIO();
      io?.emit('ALERT_EVT', { count: alerts.length, docHash: doc.hash });
    }
    return alerts;
  }
}

