"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AFLStore = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
class AFLStore {
    redis;
    neo = null;
    constructor(redisUrl = process.env.AFL_REDIS_URL || 'redis://redis-afl:6379', neo4jUrl, neoUser, neoPass) {
        this.redis = new ioredis_1.default(redisUrl);
        if (neo4jUrl)
            this.neo = neo4j_driver_1.default.driver(neo4jUrl, neo4j_driver_1.default.auth.basic(neoUser || 'neo4j', neoPass || 'password'));
    }
    key(fp) {
        return `afl:${fp.formatSig}:${fp.timingSig}:${fp.xformSig}`;
    }
    async put(fp) {
        const k = this.key(fp);
        const now = Date.now();
        const existing = await this.redis.get(k);
        const merged = existing
            ? {
                ...JSON.parse(existing),
                ...fp,
                lastSeen: now,
                count: (JSON.parse(existing).count || 0) + 1,
            }
            : { ...fp, firstSeen: now, lastSeen: now, count: 1 };
        await this.redis.set(k, JSON.stringify(merged), 'EX', 60 * 60 * 24 * 30);
        if (this.neo) {
            await this.upsertNeo(fp);
        }
    }
    async getBySignature(sig) {
        const k = `afl:${sig.formatSig}:${sig.timingSig}:${sig.xformSig}`;
        const v = await this.redis.get(k);
        return v ? JSON.parse(v) : null;
    }
    async topByRoute(route, limit = 50) {
        const keys = await this.redis.keys(`afl:*:*:*`);
        const vals = await this.redis.mget(keys);
        return vals
            .filter(Boolean)
            .map((v) => JSON.parse(v))
            .filter((f) => f.route === route)
            .sort((a, b) => (b.count || 0) - (a.count || 0))
            .slice(0, limit);
    }
    async upsertNeo(fp) {
        const s = this.neo.session();
        try {
            await s.run(`MERGE (sig:AFSig {formatSig:$f, timingSig:$t, xformSig:$x})
         ON CREATE SET sig.firstSeen=$now, sig.count=1
         ON MATCH  SET sig.lastSeen=$now, sig.count=coalesce(sig.count,0)+1
         MERGE (r:Ingress {id:$route}) MERGE (r)-[:HAS]->(sig)`, {
                f: fp.formatSig,
                t: fp.timingSig,
                x: fp.xformSig,
                now: Date.now(),
                route: fp.route,
            });
        }
        finally {
            await s.close();
        }
    }
    async close() {
        await this.redis.quit();
        if (this.neo)
            await this.neo.close();
    }
}
exports.AFLStore = AFLStore;
