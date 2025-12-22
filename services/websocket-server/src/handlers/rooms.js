"use strict";
/**
 * Room Event Handlers
 */
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoomHandlers = registerRoomHandlers;
var rateLimit_js_1 = require("../middleware/rateLimit.js");
var logger_js_1 = require("../utils/logger.js");
var metrics = require("../metrics/prometheus.js");
function registerRoomHandlers(socket, deps) {
    var _this = this;
    var connectionManager = deps.connectionManager, presenceManager = deps.presenceManager, roomManager = deps.roomManager, rateLimiter = deps.rateLimiter, io = deps.io;
    // Join a room
    socket.on('room:join', (0, rateLimit_js_1.wrapHandlerWithRateLimit)(socket, rateLimiter, function (data, ack) { return __awaiter(_this, void 0, void 0, function () {
        var startTime, room, metadata, validMetadata, result, presence, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    startTime = Date.now();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, , 6]);
                    room = data.room, metadata = data.metadata;
                    validMetadata = metadata;
                    return [4 /*yield*/, roomManager.join(socket, room, validMetadata)];
                case 2:
                    result = _a.sent();
                    if (!result.success) {
                        ack === null || ack === void 0 ? void 0 : ack({ success: false, error: result.error });
                        metrics.recordError(socket.data.tenantId, 'room_join', result.error || 'unknown');
                        return [2 /*return*/];
                    }
                    // Add to connection manager
                    connectionManager.addRoom(socket.data.connectionId, room);
                    // Set presence in room
                    return [4 /*yield*/, presenceManager.setPresence(room, socket.data.user.userId, {
                            status: 'online',
                            username: socket.data.user.userId,
                        })];
                case 3:
                    // Set presence in room
                    _a.sent();
                    return [4 /*yield*/, presenceManager.getRoomPresence(room)];
                case 4:
                    presence = _a.sent();
                    // Notify room of new member
                    socket.to(room).emit('presence:join', {
                        room: room,
                        user: {
                            userId: socket.data.user.userId,
                            status: 'online',
                            lastSeen: Date.now(),
                        },
                    });
                    // Send success response
                    socket.emit('room:joined', { room: room, metadata: metadata });
                    ack === null || ack === void 0 ? void 0 : ack({ success: true });
                    // Send current presence to joiner
                    socket.emit('presence:update', { room: room, presence: presence });
                    metrics.roomJoins.inc({ tenant: socket.data.tenantId });
                    metrics.recordMessageLatency(socket.data.tenantId, 'room:join', Date.now() - startTime);
                    logger_js_1.logger.info({
                        connectionId: socket.data.connectionId,
                        room: room,
                        membersCount: roomManager.getRoomSize(socket.data.tenantId, room),
                    }, 'Room joined');
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _a.sent();
                    logger_js_1.logger.error({
                        connectionId: socket.data.connectionId,
                        error: error_1.message,
                    }, 'Failed to join room');
                    ack === null || ack === void 0 ? void 0 : ack({ success: false, error: 'Internal error' });
                    socket.emit('system:error', {
                        code: 'ROOM_JOIN_FAILED',
                        message: 'Failed to join room',
                    });
                    metrics.recordError(socket.data.tenantId, 'room_join', 'error');
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    }); }));
    // Leave a room
    socket.on('room:leave', (0, rateLimit_js_1.wrapHandlerWithRateLimit)(socket, rateLimiter, function (data, ack) { return __awaiter(_this, void 0, void 0, function () {
        var startTime, room, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    startTime = Date.now();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    room = data.room;
                    // Leave room via room manager
                    return [4 /*yield*/, roomManager.leave(socket, room)];
                case 2:
                    // Leave room via room manager
                    _a.sent();
                    // Remove from connection manager
                    connectionManager.removeRoom(socket.data.connectionId, room);
                    // Remove presence
                    return [4 /*yield*/, presenceManager.removePresence(room, socket.data.user.userId)];
                case 3:
                    // Remove presence
                    _a.sent();
                    // Notify room
                    socket.to(room).emit('presence:leave', {
                        room: room,
                        userId: socket.data.user.userId,
                    });
                    // Send success response
                    socket.emit('room:left', { room: room });
                    ack === null || ack === void 0 ? void 0 : ack({ success: true });
                    metrics.roomLeaves.inc({ tenant: socket.data.tenantId });
                    metrics.recordMessageLatency(socket.data.tenantId, 'room:leave', Date.now() - startTime);
                    logger_js_1.logger.info({
                        connectionId: socket.data.connectionId,
                        room: room,
                    }, 'Room left');
                    return [3 /*break*/, 5];
                case 4:
                    error_2 = _a.sent();
                    logger_js_1.logger.error({
                        connectionId: socket.data.connectionId,
                        error: error_2.message,
                    }, 'Failed to leave room');
                    ack === null || ack === void 0 ? void 0 : ack({ success: false });
                    socket.emit('system:error', {
                        code: 'ROOM_LEAVE_FAILED',
                        message: 'Failed to leave room',
                    });
                    metrics.recordError(socket.data.tenantId, 'room_leave', 'error');
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); }));
    // Query presence in a room
    socket.on('query:presence', (0, rateLimit_js_1.wrapHandlerWithRateLimit)(socket, rateLimiter, function (data, ack) { return __awaiter(_this, void 0, void 0, function () {
        var room, userRooms, presence, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    room = data.room;
                    userRooms = roomManager.getSocketRooms(socket.data.connectionId);
                    if (!userRooms.includes(room)) {
                        ack === null || ack === void 0 ? void 0 : ack({ presence: [] });
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, presenceManager.getRoomPresence(room)];
                case 1:
                    presence = _a.sent();
                    ack === null || ack === void 0 ? void 0 : ack({ presence: presence });
                    return [3 /*break*/, 3];
                case 2:
                    error_3 = _a.sent();
                    logger_js_1.logger.error({
                        connectionId: socket.data.connectionId,
                        error: error_3.message,
                    }, 'Failed to query presence');
                    ack === null || ack === void 0 ? void 0 : ack({ presence: [] });
                    metrics.recordError(socket.data.tenantId, 'query_presence', 'error');
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); }));
    // Query user's rooms
    socket.on('query:rooms', (0, rateLimit_js_1.wrapHandlerWithRateLimit)(socket, rateLimiter, function (ack) {
        try {
            var rooms = roomManager.getSocketRooms(socket.data.connectionId);
            ack === null || ack === void 0 ? void 0 : ack({ rooms: rooms });
        }
        catch (error) {
            logger_js_1.logger.error({
                connectionId: socket.data.connectionId,
                error: error.message,
            }, 'Failed to query rooms');
            ack === null || ack === void 0 ? void 0 : ack({ rooms: [] });
            metrics.recordError(socket.data.tenantId, 'query_rooms', 'error');
        }
    }));
}
