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
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerHandlers = registerHandlers;
var logger_js_1 = require("../utils/logger.js");
function registerHandlers(socket, connectionManager, roomManager, messagePersistence) {
    var _this = this;
    // Register connection
    connectionManager.register(socket);
    // Connection Error Handler
    socket.on('error', function (err) {
        logger_js_1.logger.error({ err: err, connectionId: socket.data.connectionId }, 'Socket error');
    });
    // Disconnect Handler
    socket.on('disconnect', function (reason) {
        logger_js_1.logger.info({ reason: reason, connectionId: socket.data.connectionId }, 'Client disconnected');
        connectionManager.unregister(socket.data.connectionId);
        roomManager.leaveAll(socket.data.connectionId);
    });
    // Room Events
    socket.on('room:join', function (data, ack) { return __awaiter(_this, void 0, void 0, function () {
        var result, history_1, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, roomManager.join(socket, data.room, data.metadata)];
                case 1:
                    result = _a.sent();
                    if (ack)
                        ack(result);
                    if (!result.success) return [3 /*break*/, 3];
                    return [4 /*yield*/, messagePersistence.getHistory(data.room)];
                case 2:
                    history_1 = _a.sent();
                    history_1.forEach(function (msg) { return socket.emit('room:message', {
                        id: "".concat(msg.timestamp), // simplistic ID
                        room: msg.room,
                        from: msg.from,
                        payload: msg.data,
                        timestamp: msg.timestamp || Date.now()
                    }); });
                    _a.label = 3;
                case 3: return [3 /*break*/, 5];
                case 4:
                    error_1 = _a.sent();
                    if (ack)
                        ack({ success: false, error: 'Internal server error' });
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); });
    socket.on('room:leave', function (data, ack) { return __awaiter(_this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, roomManager.leave(socket, data.room)];
                case 1:
                    result = _a.sent();
                    if (ack)
                        ack(result);
                    return [2 /*return*/];
            }
        });
    }); });
    socket.on('room:send', function (data, ack) { return __awaiter(_this, void 0, void 0, function () {
        var rooms, message, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    rooms = roomManager.getSocketRooms(socket.data.connectionId);
                    if (!rooms.includes(data.room) && !rooms.includes("".concat(socket.data.tenantId, ":").concat(data.room))) {
                        if (ack)
                            ack({ success: false, messageId: undefined }); // Not in room
                        return [2 /*return*/];
                    }
                    message = {
                        room: data.room,
                        from: socket.data.user.userId,
                        data: data.payload,
                        timestamp: Date.now()
                    };
                    if (!data.persistent) return [3 /*break*/, 2];
                    return [4 /*yield*/, messagePersistence.storeMessage(message)];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    // Broadcast to room
                    socket.to(data.room).emit('room:message', {
                        id: "".concat(message.timestamp),
                        room: message.room,
                        from: message.from,
                        payload: message.data,
                        timestamp: message.timestamp
                    });
                    if (ack)
                        ack({ success: true, messageId: "".concat(message.timestamp) });
                    return [3 /*break*/, 4];
                case 3:
                    error_2 = _a.sent();
                    logger_js_1.logger.error({ error: error_2 }, 'Failed to send message');
                    if (ack)
                        ack({ success: false });
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); });
}
