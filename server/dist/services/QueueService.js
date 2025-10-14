import { Queue, Worker } from "bullmq";
import config from "../config/index.js";
import SocialService from "./SocialService.js";
const connection = {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    db: config.redis.db,
};
export const socialQueue = new Queue("social:ingest", { connection });
export function startWorkers() {
    const worker = new Worker("social:ingest", async (job) => {
        const { provider, query, investigationId, host, limit } = job.data || {};
        const svc = new SocialService();
        return await svc.queryProvider(provider, query, investigationId, {
            host,
            limit,
        });
    }, { connection });
    return worker;
}
export async function enqueueSocial(provider, query, investigationId, options = {}) {
    const job = await socialQueue.add("ingest", { provider, query, investigationId, ...options }, { attempts: 3, backoff: { type: "exponential", delay: 1000 } });
    return job.id;
}
//# sourceMappingURL=QueueService.js.map