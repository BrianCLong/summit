"use strict";
/**
 * Message Event Handlers
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.registerMessageHandlers = registerMessageHandlers;
var crypto_1 = require("crypto");
var rateLimit_js_1 = require("../middleware/rateLimit.js");
var logger_js_1 = require("../utils/logger.js");
var metrics = require("../metrics/prometheus.js");
function registerMessageHandlers(socket, deps) {
    var _this = this;
    var roomManager = deps.roomManager, messagePersistence = deps.messagePersistence, rateLimiter = deps.rateLimiter, io = deps.io;
    // Send message to a room
    socket.on('room:send', (0, rateLimit_js_1.wrapHandlerWithRateLimit)(socket, rateLimiter, function (data, ack) { return __awaiter(_this, void 0, void 0, function () {
        var startTime, room, payload, _a, persistent, userRooms, message, messageId, persisted, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    startTime = Date.now();
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 5, , 6]);
                    room = data.room, payload = data.payload, _a = data.persistent, persistent = _a === void 0 ? false : _a;
                    userRooms = roomManager.getSocketRooms(socket.data.connectionId);
                    if (!userRooms.includes(room)) {
                        logger_js_1.logger.warn({
                            connectionId: socket.data.connectionId,
                            room: room,
                        }, 'Attempted to send message to room not joined');
                        ack === null || ack === void 0 ? void 0 : ack({ success: false });
                        socket.emit('system:error', {
                            code: 'NOT_IN_ROOM',
                            message: 'You are not a member of this room',
                        });
                        metrics.recordError(socket.data.tenantId, 'room_send', 'not_in_room');
                        return [2 /*return*/];
                    }
                    message = {
                        room: room,
                        from: socket.data.user.userId,
                        payload: payload,
                        timestamp: Date.now(),
                    };
                    messageId = void 0;
                    if (!persistent) return [3 /*break*/, 3];
                    return [4 /*yield*/, messagePersistence.storeMessage(message)];
                case 2:
                    persisted = _b.sent();
                    messageId = persisted.id;
                    metrics.messagePersisted.inc({ tenant: socket.data.tenantId, room: room });
                    metrics.messagePersisted.inc({ tenant: socket.tenantId, room: room });
                    return [3 /*break*/, 4];
                case 3:
                    messageId = crypto_1.default.randomUUID();
                    _b.label = 4;
                case 4:
                    // Broadcast to room (excluding sender)
                    socket.to(room).emit('room:message', __assign(__assign({}, message), { id: messageId }));
                    // Send to sender as confirmation
                    socket.emit('room:message', __assign(__assign({}, message), { id: messageId }));
                    ack === null || ack === void 0 ? void 0 : ack({ success: true, messageId: messageId });
                    metrics.recordMessageSent(socket.data.tenantId, 'room:message');
                    metrics.recordMessageLatency(socket.data.tenantId, 'room:send', Date.now() - startTime);
                    logger_js_1.logger.debug({
                        connectionId: socket.data.connectionId,
                        room: room,
                        persistent: persistent,
                        messageId: messageId,
                    }, 'Message sent');
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _b.sent();
                    logger_js_1.logger.error({
                        connectionId: socket.data.connectionId,
                        error: error_1.message,
                    }, 'Failed to send message');
                    ack === null || ack === void 0 ? void 0 : ack({ success: false });
                    socket.emit('system:error', {
                        code: 'MESSAGE_SEND_FAILED',
                        message: 'Failed to send message',
                    });
                    metrics.recordError(socket.data.tenantId, 'room_send', 'error');
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    }); }));
}
