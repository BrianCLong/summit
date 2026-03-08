"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDashboardHandlers = registerDashboardHandlers;
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default();
function registerDashboardHandlers(io, socket) {
    // Join the dashboard room
    socket.on('dashboard:join', () => {
        logger.info(`User ${socket.id} joined dashboard`);
        socket.join('dashboard:main');
        // Send initial state (could be fetched from a service)
        socket.emit('dashboard:state', {
            connected: true,
            timestamp: Date.now(),
            message: 'Joined dashboard stream'
        });
    });
    socket.on('dashboard:leave', () => {
        logger.info(`User ${socket.id} left dashboard`);
        socket.leave('dashboard:main');
    });
}
