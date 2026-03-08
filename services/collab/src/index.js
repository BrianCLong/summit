"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCollabServer = createCollabServer;
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
/**
 * createCollabServer sets up a minimal Socket.IO server that relays
 * operational events between connected clients. Clients join a room for a
 * specific branch and broadcast changes to peers.
 */
function createCollabServer() {
    const httpServer = http_1.default.createServer();
    const io = new socket_io_1.Server(httpServer, { path: '/collab' });
    io.on('connection', (socket) => {
        socket.on('branch:join', (branchId) => {
            socket.join(`branch:${branchId}`);
        });
        socket.on('op', (branchId, op) => {
            socket.to(`branch:${branchId}`).emit('op', op);
        });
    });
    return { io, httpServer };
}
