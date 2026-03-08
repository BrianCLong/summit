"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchQueryExecutor = void 0;
const neo4j_js_1 = require("../../db/neo4j.js");
class BatchQueryExecutor {
    queue = [];
    timer = null;
    batchSize = 10;
    batchWindowMs = 50;
    execute(query, params) {
        return new Promise((resolve, reject) => {
            this.queue.push({ query, params, resolve, reject });
            if (this.queue.length >= this.batchSize) {
                this.flush();
            }
            else if (!this.timer) {
                this.timer = setTimeout(() => this.flush(), this.batchWindowMs);
            }
        });
    }
    async flush() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        if (this.queue.length === 0)
            return;
        const batch = this.queue.splice(0, this.batchSize);
        // Execute as transaction
        const session = (0, neo4j_js_1.getNeo4jDriver)().session();
        const tx = session.beginTransaction();
        try {
            const promises = batch.map(item => tx.run(item.query, item.params)
                .then((res) => ({ status: 'fulfilled', value: res, item }))
                .catch((err) => ({ status: 'rejected', reason: err, item })));
            const results = await Promise.all(promises);
            await tx.commit();
            results.forEach((res) => {
                if (res.status === 'fulfilled') {
                    res.item.resolve(res.value);
                }
                else {
                    res.item.reject(res.reason);
                }
            });
            // telemetry.subsystems.database.batch.size.record(batch.length);
        }
        catch (error) {
            await tx.rollback();
            batch.forEach(item => item.reject(error));
        }
        finally {
            await session.close();
        }
    }
}
exports.BatchQueryExecutor = BatchQueryExecutor;
