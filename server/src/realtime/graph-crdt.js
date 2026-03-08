"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initGraphSync = initGraphSync;
exports.registerGraphHandlers = registerGraphHandlers;
exports.getGraphSnapshot = getGraphSnapshot;
const ioredis_1 = __importDefault(require("ioredis"));
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default();
class GraphCRDT {
    nodes = new Map();
    edges = new Map();
    apply(op) {
        const store = op.kind === 'node' ? this.nodes : this.edges;
        const existing = store.get(op.id);
        if (!existing || op.ts >= existing.ts) {
            if (op.action === 'delete') {
                store.delete(op.id);
            }
            else {
                store.set(op.id, { ts: op.ts, data: op.data });
            }
            return true;
        }
        return false;
    }
    snapshot() {
        return {
            nodes: Array.from(this.nodes.values()).map((entry) => entry.data),
            edges: Array.from(this.edges.values()).map((entry) => entry.data),
        };
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
const pub = new ioredis_1.default(redisOptions);
const sub = typeof pub.duplicate === 'function' ? pub.duplicate() : new ioredis_1.default(redisOptions);
let ioRef = null;
function initGraphSync(ns) {
    ioRef = ns;
    if (typeof sub.psubscribe === 'function') {
        sub.psubscribe('graph:op:*');
    }
    sub.on('pmessage', (_pattern, channel, message) => {
        const graphId = channel.split(':')[2];
        const op = JSON.parse(message);
        const entry = getGraph(graphId);
        entry.clock = Math.max(entry.clock, op.ts);
        if (entry.crdt.apply(op)) {
            ioRef?.to(`graph:${graphId}`).emit('graph:op', { graphId, op });
        }
    });
    sub.on('error', (err) => logger.error({ err }, 'Redis sub error'));
}
function registerGraphHandlers(socket, options = {}) {
    socket.on('graph:op', async ({ graphId, op }) => {
        if (!graphId || !op)
            return;
        if (options.authorize) {
            const allowed = await options.authorize(graphId, op, 'mutate');
            if (!allowed) {
                socket.emit('graph:error', {
                    graphId,
                    reason: 'forbidden',
                });
                return;
            }
        }
        const entry = getGraph(graphId);
        entry.clock = Math.max(entry.clock, op.ts || 0) + 1;
        op.ts = entry.clock;
        if (entry.crdt.apply(op)) {
            socket.to(`graph:${graphId}`).emit('graph:op', { graphId, op });
            pub.publish(`graph:op:${graphId}`, JSON.stringify(op));
            await Promise.resolve(options.onApplied?.(graphId, op));
        }
    });
    socket.on('graph:sync', async ({ graphId }) => {
        if (!graphId)
            return;
        if (options.authorize) {
            const allowed = await options.authorize(graphId, {
                id: 'sync',
                kind: 'node',
                action: 'set',
                ts: Date.now(),
            }, 'view');
            if (!allowed) {
                socket.emit('graph:error', { graphId, reason: 'forbidden' });
                return;
            }
        }
        const entry = getGraph(graphId);
        const snapshot = entry.crdt.snapshot();
        socket.emit('graph:state', {
            graphId,
            nodes: snapshot.nodes,
            edges: snapshot.edges,
            clock: entry.clock,
        });
    });
}
function getGraphSnapshot(graphId) {
    const entry = getGraph(graphId);
    const snapshot = entry.crdt.snapshot();
    return { ...snapshot, clock: entry.clock };
}
