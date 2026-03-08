"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const logging_1 = require("../../observability/logging");
let io;
const initSocket = (httpServer) => {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });
    io.on('connection', (socket) => {
        logging_1.logger.info('a user connected');
        socket.on('disconnect', () => {
            logging_1.logger.info('user disconnected');
        });
    });
};
exports.initSocket = initSocket;
const getIO = () => {
    if (!io) {
        throw new Error('Socket.IO not initialized!');
    }
    return io;
};
exports.getIO = getIO;
