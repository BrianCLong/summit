import Redis from 'ioredis';
import neo4j, { Driver } from 'neo4j-driver';
import { Fingerprint } from './types';

export class AFLStore {
  private redis: Redis;
  private neo: Driver | null = null;

  constructor(redisUrl = process.env.AFL_REDIS_URL || 'redis://redis-afl:6379', neo4jUrl?: string, neoUser?: string, neoPass?: string) {
    this.redis = new Redis(redisUrl);
    if (neo4jUrl) this.neo = neo4j.driver(neo4jUrl, neo4j.auth.basic(neoUser||'neo4j', neoPass||'password'));
  }

  key(fp: Fingerprint) { return `afl:${fp.formatSig}:${fp.timingSig}:${fp.xformSig}`; }

  async put(fp: Fingerprint) {
    const k = this.key(fp);
    const now = Date.now();
    const existing = await this.redis.get(k);
    const merged: Fingerprint = existing ? { ...JSON.parse(existing), ...fp, lastSeen: now, count: (JSON.parse(existing).count||0)+1 } : { ...fp, firstSeen: now, lastSeen: now, count:1 };
    await this.redis.set(k, JSON.stringify(merged), 'EX', 60*60*24*30);
    if (this.neo) { await this.upsertNeo(fp); }
  }

  async getBySignature(sig: {formatSig:string; timingSig:string; xformSig:string}) {
    const k = `afl:${sig.formatSig}:${sig.timingSig}:${sig.xformSig}`;
    const v = await this.redis.get(k); return v ? JSON.parse(v) as Fingerprint : null;
  }

  async topByRoute(route: string, limit=50) {
    const keys = await this.redis.keys(`afl:*:*:*`);
    const vals = await this.redis.mget(keys);
    return (vals.filter(Boolean).map(v => JSON.parse(v as string) as Fingerprint).filter(f => f.route===route))
      .sort((a,b)=>(b.count||0)-(a.count||0)).slice(0,limit);
  }

  private async upsertNeo(fp: Fingerprint) {
    const s = this.neo!.session();
    try {
      await s.run(
        `MERGE (sig:AFSig {formatSig:$f, timingSig:$t, xformSig:$x})
         ON CREATE SET sig.firstSeen=$now, sig.count=1
         ON MATCH  SET sig.lastSeen=$now, sig.count=coalesce(sig.count,0)+1
         MERGE (r:Ingress {id:$route}) MERGE (r)-[:HAS]->(sig)`,
        { f: fp.formatSig, t: fp.timingSig, x: fp.xformSig, now: Date.now(), route: fp.route }
      );
    } finally { await s.close(); }
  }

  async close(){ await this.redis.quit(); if (this.neo) await this.neo.close(); }
}