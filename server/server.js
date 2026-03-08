"use strict";
// server/server.ts
async function pingDatabase() {
    const start = Date.now();
    // In a real app, this would connect to the DB and run a simple query like `SELECT 1`.
    await new Promise((res) => setTimeout(res, 50)); // Simulate DB ping latency
    const latency = Date.now() - start;
    console.log(`Database ping successful in ${latency}ms`);
    return { status: 'ok', latency };
}
async function healthCheck(req, res) {
    try {
        // Old: // TODO: ping DB/queue
        const dbStatus = await pingDatabase();
        res.send({ status: 'ok', dependencies: { database: dbStatus } });
    }
    catch (error) {
        res.status(503).send({ status: 'error', message: error.message });
    }
}
// Example usage
const app = {
    get: (path, handler) => { },
};
app.get('/healthz', healthCheck);
