"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startReplicator = startReplicator;
const pull_1 = require("./pull");
const metrics_1 = require("./metrics");
const peers = (() => {
    try {
        return JSON.parse(process.env.REGION_PEERS_JSON || '{}');
    }
    catch {
        return {};
    }
})();
const interval = Number(process.env.REPLICATION_PULL_INTERVAL || '5000');
function startReplicator() {
    for (const [peer, base] of Object.entries(peers)) {
        setInterval(async () => {
            const t0 = Date.now();
            try {
                await (0, pull_1.pullFrom)(peer, `${base}/api/replicate`);
            }
            catch (e) {
                /* log */
            }
            finally {
                (0, metrics_1.setLag)(peer, (Date.now() - t0) / 1000);
            }
        }, interval);
    }
}
