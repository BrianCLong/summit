"use strict";
/**
 * Room Subscription Management
 * Handles room-based pub/sub with authorization
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.RoomManager = void 0;
var logger_js_1 = require("../utils/logger.js");
var events_1 = require("events");
var RoomManager = /** @class */ (function (_super) {
    __extends(RoomManager, _super);
    function RoomManager() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.roomToSockets = new Map();
        _this.socketToRooms = new Map();
        return _this;
    }
    /**
     * Set authorization handler
     */
    RoomManager.prototype.setAuthHandler = function (handler) {
        this.authHandler = handler;
    };
    /**
     * Join a room
     */
    RoomManager.prototype.join = function (socket, room, metadata) {
        return __awaiter(this, void 0, void 0, function () {
            var allowed, normalizedRoom;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.authHandler) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.authHandler(socket, room, 'join')];
                    case 1:
                        allowed = _a.sent();
                        if (!allowed) {
                            logger_js_1.logger.warn({ connectionId: socket.data.connectionId, room: room }, 'Room join unauthorized');
                            return [2 /*return*/, { success: false, error: 'Unauthorized' }];
                        }
                        _a.label = 2;
                    case 2:
                        normalizedRoom = this.normalizeRoom(socket.data.tenantId, room);
                        // Join Socket.IO room
                        socket.join(normalizedRoom);
                        // Track in our maps
                        if (!this.roomToSockets.has(normalizedRoom)) {
                            this.roomToSockets.set(normalizedRoom, new Set());
                        }
                        this.roomToSockets.get(normalizedRoom).add(socket.data.connectionId);
                        if (!this.socketToRooms.has(socket.data.connectionId)) {
                            this.socketToRooms.set(socket.data.connectionId, new Set());
                        }
                        this.socketToRooms.get(socket.data.connectionId).add(normalizedRoom);
                        logger_js_1.logger.info({
                            connectionId: socket.data.connectionId,
                            room: normalizedRoom,
                            membersCount: this.roomToSockets.get(normalizedRoom).size,
                        }, 'Joined room');
                        this.emit('room:joined', {
                            connectionId: socket.data.connectionId,
                            userId: socket.data.user.userId,
                            tenantId: socket.data.tenantId,
                            room: normalizedRoom,
                            metadata: metadata,
                        });
                        return [2 /*return*/, { success: true }];
                }
            });
        });
    };
    /**
     * Leave a room
     */
    RoomManager.prototype.leave = function (socket, room) {
        return __awaiter(this, void 0, void 0, function () {
            var normalizedRoom, roomSockets, socketRooms;
            return __generator(this, function (_a) {
                normalizedRoom = this.normalizeRoom(socket.data.tenantId, room);
                // Leave Socket.IO room
                socket.leave(normalizedRoom);
                roomSockets = this.roomToSockets.get(normalizedRoom);
                if (roomSockets) {
                    roomSockets.delete(socket.data.connectionId);
                    if (roomSockets.size === 0) {
                        this.roomToSockets.delete(normalizedRoom);
                    }
                }
                socketRooms = this.socketToRooms.get(socket.data.connectionId);
                if (socketRooms) {
                    socketRooms.delete(normalizedRoom);
                    if (socketRooms.size === 0) {
                        this.socketToRooms.delete(socket.data.connectionId);
                    }
                }
                logger_js_1.logger.info({
                    connectionId: socket.data.connectionId,
                    room: normalizedRoom,
                    remainingMembers: (roomSockets === null || roomSockets === void 0 ? void 0 : roomSockets.size) || 0,
                }, 'Left room');
                this.emit('room:left', {
                    connectionId: socket.data.connectionId,
                    userId: socket.data.user.userId,
                    tenantId: socket.data.tenantId,
                    room: normalizedRoom,
                });
                return [2 /*return*/, { success: true }];
            });
        });
    };
    /**
     * Leave all rooms for a connection
     */
    RoomManager.prototype.leaveAll = function (connectionId) {
        var rooms = this.socketToRooms.get(connectionId);
        if (!rooms) {
            return;
        }
        for (var _i = 0, rooms_1 = rooms; _i < rooms_1.length; _i++) {
            var room = rooms_1[_i];
            var roomSockets = this.roomToSockets.get(room);
            if (roomSockets) {
                roomSockets.delete(connectionId);
                if (roomSockets.size === 0) {
                    this.roomToSockets.delete(room);
                }
            }
            this.emit('room:left', { connectionId: connectionId, room: room });
        }
        this.socketToRooms.delete(connectionId);
        logger_js_1.logger.debug({ connectionId: connectionId, roomCount: rooms.size }, 'Left all rooms');
    };
    /**
     * Get rooms for a connection
     */
    RoomManager.prototype.getSocketRooms = function (connectionId) {
        var rooms = this.socketToRooms.get(connectionId);
        return rooms ? Array.from(rooms) : [];
    };
    /**
     * Get connections in a room
     */
    RoomManager.prototype.getRoomConnections = function (tenantId, room) {
        var normalizedRoom = this.normalizeRoom(tenantId, room);
        var sockets = this.roomToSockets.get(normalizedRoom);
        return sockets ? Array.from(sockets) : [];
    };
    /**
     * Get member count for a room
     */
    RoomManager.prototype.getRoomSize = function (tenantId, room) {
        var _a;
        var normalizedRoom = this.normalizeRoom(tenantId, room);
        return ((_a = this.roomToSockets.get(normalizedRoom)) === null || _a === void 0 ? void 0 : _a.size) || 0;
    };
    /**
     * Get all rooms
     */
    RoomManager.prototype.getAllRooms = function () {
        return Array.from(this.roomToSockets.keys());
    };
    /**
     * Get room statistics
     */
    RoomManager.prototype.getStats = function () {
        var totalRooms = this.roomToSockets.size;
        var totalSubscriptions = 0;
        var largestRoom = null;
        for (var _i = 0, _a = this.roomToSockets; _i < _a.length; _i++) {
            var _b = _a[_i], room = _b[0], sockets = _b[1];
            var size = sockets.size;
            totalSubscriptions += size;
            if (!largestRoom || size > largestRoom.size) {
                largestRoom = { room: room, size: size };
            }
        }
        return {
            totalRooms: totalRooms,
            totalSubscriptions: totalSubscriptions,
            avgSubscriptionsPerRoom: totalRooms > 0 ? totalSubscriptions / totalRooms : 0,
            largestRoom: largestRoom,
        };
    };
    /**
     * Normalize room name with tenant prefix
     */
    RoomManager.prototype.normalizeRoom = function (tenantId, room) {
        // If room already has tenant prefix, return as is
        if (room.startsWith("".concat(tenantId, ":"))) {
            return room;
        }
        return "".concat(tenantId, ":").concat(room);
    };
    return RoomManager;
}(events_1.EventEmitter));
exports.RoomManager = RoomManager;
