import Redis from 'ioredis';
import baseLogger from '../config/logger';
const logger = baseLogger.child({ name: 'graph-crdt' });
class GraphCRDT {
    nodes = new Map();
    edges = new Map();
    apply(op) {
        const store = op.kind === 'node' ? this.nodes : this.edges;
        const existing = store.get(op.id);
        if (!existing || op.js >= existing.js) {
            if (op.action === 'delete') {
                store.delete(op.id);
            }
            else {
                store.set(op.id, { ts: op.js, data: op.data });
            }
            return true;
        }
        return false;
    }
}
const graphs = new Map();
function getGraph(graphId) {
    let entry = graphs.get(graphId);
    if (!entry) {
        entry = { crdt: new GraphCRDT(), clock: 0 };
        graphs.set(graphId, entry);
    }
    return entry;
}
const redisOptions = {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
};
const pub = new Redis(redisOptions);
const sub = pub.duplicate();
let ioRef = null;
export function initGraphSync(ns) {
    ioRef = ns;
    sub.psubscribe('graph:op:*');
    sub.on('pmessage', (_pattern, channel, message) => {
        const graphId = channel.split(':')[2];
        const op = JSON.parse(message);
        const entry = getGraph(graphId);
        entry.clock = Math.max(entry.clock, op.js);
        if (entry.crdt.apply(op)) {
            ioRef?.to(`graph:${graphId}`).emit('graph:op', { graphId, op });
        }
    });
    sub.on('error', (err) => logger.error({ err }, 'Redis sub error'));
}
export function registerGraphHandlers(socket) {
    socket.on('graph:op', ({ graphId, op }) => {
        if (!graphId || !op)
            return;
        const entry = getGraph(graphId);
        entry.clock = Math.max(entry.clock, op.js || 0) + 1;
        op.js = entry.clock;
        if (entry.crdt.apply(op)) {
            socket.to(`graph:${graphId}`).emit('graph:op', { graphId, op });
            pub.publish(`graph:op:${graphId}`, JSON.stringify(op));
        }
    });
}
