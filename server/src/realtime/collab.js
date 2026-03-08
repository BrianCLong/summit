"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initRealtime = initRealtime;
const redis_adapter_1 = require("@socket.io/redis-adapter");
const socket_io_1 = require("socket.io");
const ioredis_1 = __importDefault(require("ioredis"));
async function initRealtime(httpServer) {
    const io = new socket_io_1.Server(httpServer, { path: '/ws' });
    const url = process.env.REDIS_URL;
    if (url) {
        try {
            const pub = new ioredis_1.default(url);
            const sub = pub.duplicate();
            io.adapter((0, redis_adapter_1.createAdapter)(pub, sub));
        }
        catch (err) {
            console.warn('Redis adapter disabled', err);
        }
    }
    io.use((socket, next) => {
        const { tenantId, userId } = socket.handshake.auth;
        if (!tenantId || !userId) {
            return next(new Error('FORBIDDEN'));
        }
        socket.ctx = { tenantId, userId };
        next();
    });
    io.on('connection', (socket) => {
        const { tenantId, userId } = socket.ctx;
        socket.on('join', ({ investigationId }) => {
            const room = `tenant:${tenantId}:investigation:${investigationId}`;
            socket.join(room);
            io.to(room).emit('presence:join', { userId, ts: Date.now() });
        });
        socket.on('cursor:move', ({ investigationId, x, y }) => {
            const room = `tenant:${tenantId}:investigation:${investigationId}`;
            socket.to(room).emit('cursor:move', { userId, x, y, ts: Date.now() });
        });
        socket.on('lock:acquire', ({ investigationId, id, kind }) => {
            const room = `tenant:${tenantId}:investigation:${investigationId}`;
            socket.to(room).emit('lock:update', { id, kind, userId, locked: true });
        });
        socket.on('lock:release', ({ investigationId, id, kind }) => {
            const room = `tenant:${tenantId}:investigation:${investigationId}`;
            socket.to(room).emit('lock:update', { id, kind, userId, locked: false });
        });
        socket.on('disconnect', () => {
            for (const room of socket.rooms) {
                if (room.startsWith('tenant:')) {
                    io.to(room).emit('presence:leave', { userId });
                }
            }
        });
    });
    return io;
}
