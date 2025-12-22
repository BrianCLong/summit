"use strict";
/**
 * Presence Tracking Manager
 * Manages user presence across rooms with Redis persistence
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
exports.PresenceManager = void 0;
var logger_js_1 = require("../utils/logger.js");
var PresenceManager = /** @class */ (function () {
    function PresenceManager(redis, ttlSeconds) {
        if (ttlSeconds === void 0) { ttlSeconds = 300; }
        this.keyPrefix = 'presence';
        this.redis = redis;
        this.ttl = ttlSeconds;
    }
    /**
     * Set user presence in a room
     */
    PresenceManager.prototype.setPresence = function (room, userId, data) {
        return __awaiter(this, void 0, void 0, function () {
            var key, presence;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        key = this.getRoomKey(room);
                        presence = {
                            userId: userId,
                            status: data.status || 'online',
                            lastSeen: Date.now(),
                            username: data.username,
                            metadata: data.metadata,
                        };
                        return [4 /*yield*/, this.redis
                                .multi()
                                .hset(key, userId, JSON.stringify(presence))
                                .expire(key, this.ttl)
                                .exec()];
                    case 1:
                        _a.sent();
                        logger_js_1.logger.debug({ room: room, userId: userId, status: presence.status }, 'Presence set');
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update user presence status
     */
    PresenceManager.prototype.updateStatus = function (room, userId, status, metadata) {
        return __awaiter(this, void 0, void 0, function () {
            var key, existingData, presence;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        key = this.getRoomKey(room);
                        return [4 /*yield*/, this.redis.hget(key, userId)];
                    case 1:
                        existingData = _a.sent();
                        if (!existingData) return [3 /*break*/, 3];
                        presence = JSON.parse(existingData);
                        presence.status = status;
                        presence.lastSeen = Date.now();
                        if (metadata) {
                            presence.metadata = __assign(__assign({}, presence.metadata), metadata);
                        }
                        return [4 /*yield*/, this.redis
                                .multi()
                                .hset(key, userId, JSON.stringify(presence))
                                .expire(key, this.ttl)
                                .exec()];
                    case 2:
                        _a.sent();
                        logger_js_1.logger.debug({ room: room, userId: userId, status: status }, 'Presence status updated');
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Touch user presence (update lastSeen)
     */
    PresenceManager.prototype.touchPresence = function (room, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var key, existingData, presence;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        key = this.getRoomKey(room);
                        return [4 /*yield*/, this.redis.hget(key, userId)];
                    case 1:
                        existingData = _a.sent();
                        if (!existingData) return [3 /*break*/, 3];
                        presence = JSON.parse(existingData);
                        presence.lastSeen = Date.now();
                        return [4 /*yield*/, this.redis
                                .multi()
                                .hset(key, userId, JSON.stringify(presence))
                                .expire(key, this.ttl)
                                .exec()];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Remove user presence from room
     */
    PresenceManager.prototype.removePresence = function (room, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var key;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        key = this.getRoomKey(room);
                        return [4 /*yield*/, this.redis.hdel(key, userId)];
                    case 1:
                        _a.sent();
                        logger_js_1.logger.debug({ room: room, userId: userId }, 'Presence removed');
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get all presence in a room
     */
    PresenceManager.prototype.getRoomPresence = function (room) {
        return __awaiter(this, void 0, void 0, function () {
            var key, data, presence, now, staleThreshold, _i, _a, _b, userId, json, info, error_1;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        key = this.getRoomKey(room);
                        return [4 /*yield*/, this.redis.hgetall(key)];
                    case 1:
                        data = _c.sent();
                        presence = [];
                        now = Date.now();
                        staleThreshold = this.ttl * 1000;
                        _i = 0, _a = Object.entries(data);
                        _c.label = 2;
                    case 2:
                        if (!(_i < _a.length)) return [3 /*break*/, 9];
                        _b = _a[_i], userId = _b[0], json = _b[1];
                        _c.label = 3;
                    case 3:
                        _c.trys.push([3, 7, , 8]);
                        info = JSON.parse(json);
                        if (!(now - info.lastSeen < staleThreshold)) return [3 /*break*/, 4];
                        presence.push(info);
                        return [3 /*break*/, 6];
                    case 4: 
                    // Clean up stale entry
                    return [4 /*yield*/, this.redis.hdel(key, userId)];
                    case 5:
                        // Clean up stale entry
                        _c.sent();
                        _c.label = 6;
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        error_1 = _c.sent();
                        logger_js_1.logger.warn({ userId: userId, error: error_1 }, 'Failed to parse presence data');
                        return [3 /*break*/, 8];
                    case 8:
                        _i++;
                        return [3 /*break*/, 2];
                    case 9: return [2 /*return*/, presence];
                }
            });
        });
    };
    /**
     * Get user presence in a room
     */
    PresenceManager.prototype.getUserPresence = function (room, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var key, data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        key = this.getRoomKey(room);
                        return [4 /*yield*/, this.redis.hget(key, userId)];
                    case 1:
                        data = _a.sent();
                        if (!data) {
                            return [2 /*return*/, null];
                        }
                        try {
                            return [2 /*return*/, JSON.parse(data)];
                        }
                        catch (error) {
                            logger_js_1.logger.warn({ room: room, userId: userId, error: error }, 'Failed to parse user presence');
                            return [2 /*return*/, null];
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get all rooms where user is present
     */
    PresenceManager.prototype.getUserRooms = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var pattern, rooms, cursor, _a, newCursor, keys, _i, keys_1, key, hasUser, room;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        pattern = "".concat(this.keyPrefix, ":room:*");
                        rooms = [];
                        cursor = '0';
                        _b.label = 1;
                    case 1: return [4 /*yield*/, this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100)];
                    case 2:
                        _a = _b.sent(), newCursor = _a[0], keys = _a[1];
                        cursor = newCursor;
                        _i = 0, keys_1 = keys;
                        _b.label = 3;
                    case 3:
                        if (!(_i < keys_1.length)) return [3 /*break*/, 6];
                        key = keys_1[_i];
                        return [4 /*yield*/, this.redis.hexists(key, userId)];
                    case 4:
                        hasUser = _b.sent();
                        if (hasUser) {
                            room = key.replace("".concat(this.keyPrefix, ":room:"), '');
                            rooms.push(room);
                        }
                        _b.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 3];
                    case 6:
                        if (cursor !== '0') return [3 /*break*/, 1];
                        _b.label = 7;
                    case 7: return [2 /*return*/, rooms];
                }
            });
        });
    };
    /**
     * Clear all presence in a room
     */
    PresenceManager.prototype.clearRoom = function (room) {
        return __awaiter(this, void 0, void 0, function () {
            var key;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        key = this.getRoomKey(room);
                        return [4 /*yield*/, this.redis.del(key)];
                    case 1:
                        _a.sent();
                        logger_js_1.logger.debug({ room: room }, 'Room presence cleared');
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get presence statistics
     */
    PresenceManager.prototype.getStats = function () {
        return __awaiter(this, void 0, void 0, function () {
            var pattern, userIds, statusCounts, cursor, roomCount, _a, newCursor, keys, _i, keys_2, key, data, _b, _c, _d, userId, json, info;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        pattern = "".concat(this.keyPrefix, ":room:*");
                        userIds = new Set();
                        statusCounts = {
                            online: 0,
                            away: 0,
                            busy: 0,
                            offline: 0,
                        };
                        cursor = '0';
                        roomCount = 0;
                        _e.label = 1;
                    case 1: return [4 /*yield*/, this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100)];
                    case 2:
                        _a = _e.sent(), newCursor = _a[0], keys = _a[1];
                        cursor = newCursor;
                        roomCount += keys.length;
                        _i = 0, keys_2 = keys;
                        _e.label = 3;
                    case 3:
                        if (!(_i < keys_2.length)) return [3 /*break*/, 6];
                        key = keys_2[_i];
                        return [4 /*yield*/, this.redis.hgetall(key)];
                    case 4:
                        data = _e.sent();
                        for (_b = 0, _c = Object.entries(data); _b < _c.length; _b++) {
                            _d = _c[_b], userId = _d[0], json = _d[1];
                            userIds.add(userId);
                            try {
                                info = JSON.parse(json);
                                statusCounts[info.status]++;
                            }
                            catch (error) {
                                // Ignore parse errors in stats
                            }
                        }
                        _e.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 3];
                    case 6:
                        if (cursor !== '0') return [3 /*break*/, 1];
                        _e.label = 7;
                    case 7: return [2 /*return*/, {
                            totalRooms: roomCount,
                            totalUsers: userIds.size,
                            byStatus: statusCounts,
                        }];
                }
            });
        });
    };
    PresenceManager.prototype.getRoomKey = function (room) {
        return "".concat(this.keyPrefix, ":room:").concat(room);
    };
    return PresenceManager;
}());
exports.PresenceManager = PresenceManager;
