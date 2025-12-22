"use strict";
/**
 * Presence Event Handlers
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
exports.registerPresenceHandlers = registerPresenceHandlers;
var rateLimit_js_1 = require("../middleware/rateLimit.js");
var logger_js_1 = require("../utils/logger.js");
var metrics = require("../metrics/prometheus.js");
function registerPresenceHandlers(socket, deps) {
    var _this = this;
    var connectionManager = deps.connectionManager, presenceManager = deps.presenceManager, roomManager = deps.roomManager, rateLimiter = deps.rateLimiter, io = deps.io;
    // Heartbeat to keep presence alive
    socket.on('presence:heartbeat', (0, rateLimit_js_1.wrapHandlerWithRateLimit)(socket, rateLimiter, function (data) { return __awaiter(_this, void 0, void 0, function () {
        var startTime, status_1, rooms, _i, rooms_1, room, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    startTime = Date.now();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 6, , 7]);
                    status_1 = data.status || 'online';
                    // Update connection manager
                    connectionManager.updatePresence(socket.data.connectionId, status_1);
                    rooms = roomManager.getSocketRooms(socket.data.connectionId);
                    _i = 0, rooms_1 = rooms;
                    _a.label = 2;
                case 2:
                    if (!(_i < rooms_1.length)) return [3 /*break*/, 5];
                    room = rooms_1[_i];
                    return [4 /*yield*/, presenceManager.touchPresence(room, socket.data.user.userId)];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    metrics.recordMessageLatency(socket.data.tenantId, 'presence:heartbeat', Date.now() - startTime);
                    return [3 /*break*/, 7];
                case 6:
                    error_1 = _a.sent();
                    logger_js_1.logger.error({
                        connectionId: socket.data.connectionId,
                        error: error_1.message,
                    }, 'Failed to process heartbeat');
                    metrics.recordError(socket.data.tenantId, 'presence_heartbeat', 'error');
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    }); }));
    // Update presence status
    socket.on('presence:status', (0, rateLimit_js_1.wrapHandlerWithRateLimit)(socket, rateLimiter, function (data) { return __awaiter(_this, void 0, void 0, function () {
        var startTime, status_2, metadata, validMetadata, rooms, _i, rooms_2, room, presence, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    startTime = Date.now();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 8, , 9]);
                    status_2 = data.status, metadata = data.metadata;
                    validMetadata = metadata;
                    // Update connection manager
                    connectionManager.updatePresence(socket.data.connectionId, status_2);
                    rooms = roomManager.getSocketRooms(socket.data.connectionId);
                    _i = 0, rooms_2 = rooms;
                    _a.label = 2;
                case 2:
                    if (!(_i < rooms_2.length)) return [3 /*break*/, 7];
                    room = rooms_2[_i];
                    return [4 /*yield*/, presenceManager.updateStatus(room, socket.data.user.userId, status_2, metadata)];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, presenceManager.updateStatus(room, socket.user.userId, status_2, validMetadata)];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, presenceManager.getRoomPresence(room)];
                case 5:
                    presence = _a.sent();
                    io.to(room).emit('presence:update', { room: room, presence: presence });
                    _a.label = 6;
                case 6:
                    _i++;
                    return [3 /*break*/, 2];
                case 7:
                    metrics.presenceUpdates.inc({ tenant: socket.data.tenantId, status: status_2 });
                    metrics.recordMessageLatency(socket.data.tenantId, 'presence:status', Date.now() - startTime);
                    return [3 /*break*/, 9];
                case 8:
                    error_2 = _a.sent();
                    logger_js_1.logger.error({
                        connectionId: socket.data.connectionId,
                        error: error_2.message,
                    }, 'Failed to update presence status');
                    socket.emit('system:error', {
                        code: 'PRESENCE_UPDATE_FAILED',
                        message: 'Failed to update presence status',
                    });
                    metrics.recordError(socket.data.tenantId, 'presence_status', 'error');
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/];
            }
        });
    }); }));
}
