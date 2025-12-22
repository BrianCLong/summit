"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var http_1 = require("http");
var socket_io_1 = require("socket.io");
var ioredis_1 = require("ioredis");
var logger_js_1 = require("./utils/logger.js");
var ConnectionManager_js_1 = require("./managers/ConnectionManager.js");
var RoomManager_js_1 = require("./managers/RoomManager.js");
var MessagePersistence_js_1 = require("./managers/MessagePersistence.js");
var index_js_1 = require("./handlers/index.js");
// Configuration
var PORT = process.env.PORT || 9001;
var REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
// Initialize services
var app = (0, express_1.default)();
var httpServer = (0, http_1.createServer)(app);
var redis = new ioredis_1.default(REDIS_URL);
var io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: ((_a = process.env.CORS_ORIGIN) === null || _a === void 0 ? void 0 : _a.split(',')) || '*',
        methods: ['GET', 'POST']
    }
});
// Managers
var connectionManager = new ConnectionManager_js_1.ConnectionManager();
var roomManager = new RoomManager_js_1.RoomManager();
var messagePersistence = new MessagePersistence_js_1.MessagePersistence(redis);
// Health check
app.get('/health/live', function (req, res) {
    res.status(200).json({ status: 'ok' });
});
app.get('/health/ready', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var redisStatus, err_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, redis.ping()];
            case 1:
                redisStatus = _a.sent();
                res.status(redisStatus === 'PONG' ? 200 : 503).json({
                    status: redisStatus === 'PONG' ? 'ready' : 'degraded',
                    connections: connectionManager.getTotalConnections()
                });
                return [3 /*break*/, 3];
            case 2:
                err_1 = _a.sent();
                res.status(503).json({ status: 'unhealthy', error: String(err_1) });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Authentication middleware (Simulated for restoration - logic normally checks JWT)
io.use(function (socket, next) {
    // In a real implementation this would verify the JWT token
    // For dev restoration we assume the gateway or client passes valid data or we mock it
    var token = socket.handshake.auth.token;
    if (!token && process.env.NODE_ENV !== 'development') {
        return next(new Error('Authentication failed'));
    }
    // Mock user data for now if not present, to prevent crashes
    socket.data.user = socket.data.user || {
        userId: 'user-' + socket.id,
        tenantId: 'default-tenant',
        roles: [],
        permissions: [],
        sub: 'user-' + socket.id,
        iat: Date.now(),
        exp: Date.now() + 3600
    };
    socket.data.connectionId = socket.id;
    socket.data.tenantId = socket.data.user.tenantId;
    socket.data.connectedAt = Date.now();
    next();
});
// Socket connection
io.on('connection', function (socket) {
    logger_js_1.logger.info({ connectionId: socket.id }, 'New connection established');
    (0, index_js_1.registerHandlers)(socket, connectionManager, roomManager, messagePersistence);
});
// Graceful shutdown
var shutdown = function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                logger_js_1.logger.info('Shutting down...');
                io.close(function () {
                    logger_js_1.logger.info('Socket.IO closed');
                });
                return [4 /*yield*/, redis.quit()];
            case 1:
                _a.sent();
                httpServer.close(function () {
                    logger_js_1.logger.info('HTTP server closed');
                    process.exit(0);
                });
                return [2 /*return*/];
        }
    });
}); };
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
// Start server
httpServer.listen(PORT, function () {
    logger_js_1.logger.info({ port: PORT }, 'WebSocket Server started');
});
