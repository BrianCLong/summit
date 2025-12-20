"use strict";
/**
 * Entity Repository - Production persistence layer
 * Replaces demo resolvers with PostgreSQL (canonical) + Neo4j (graph) dual-write
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
exports.EntityRepo = void 0;
var crypto_1 = require("crypto");
var logger_js_1 = require("../config/logger.js");
var repoLogger = logger_js_1.default.child({ name: 'EntityRepo' });
var EntityRepo = /** @class */ (function () {
    function EntityRepo(pg, neo4j) {
        this.pg = pg;
        this.neo4j = neo4j;
    }
    /**
     * Create new entity with dual-write to PG (canonical) + Neo4j (graph)
     */
    EntityRepo.prototype.create = function (input, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var id, client, rows, entity, neo4jError_1, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        id = (0, crypto_1.randomUUID)();
                        return [4 /*yield*/, this.pg.connect()];
                    case 1:
                        client = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 11, 13, 14]);
                        return [4 /*yield*/, client.query('BEGIN')];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, client.query("INSERT INTO entities (id, tenant_id, kind, labels, props, created_by)\n         VALUES ($1, $2, $3, $4, $5, $6)\n         RETURNING *", [
                                id,
                                input.tenantId,
                                input.kind,
                                input.labels || [],
                                JSON.stringify(input.props || {}),
                                userId,
                            ])];
                    case 4:
                        rows = (_a.sent()).rows;
                        entity = rows[0];
                        // 2. Outbox event for Neo4j sync
                        return [4 /*yield*/, client.query("INSERT INTO outbox_events (id, topic, payload)\n         VALUES ($1, $2, $3)", [
                                (0, crypto_1.randomUUID)(),
                                'entity.upsert',
                                JSON.stringify({ id: entity.id, tenantId: entity.tenant_id }),
                            ])];
                    case 5:
                        // 2. Outbox event for Neo4j sync
                        _a.sent();
                        return [4 /*yield*/, client.query('COMMIT')];
                    case 6:
                        _a.sent();
                        _a.label = 7;
                    case 7:
                        _a.trys.push([7, 9, , 10]);
                        return [4 /*yield*/, this.upsertNeo4jNode({
                                id: entity.id,
                                tenantId: entity.tenant_id,
                                kind: entity.kind,
                                labels: entity.labels,
                                props: entity.props,
                            })];
                    case 8:
                        _a.sent();
                        return [3 /*break*/, 10];
                    case 9:
                        neo4jError_1 = _a.sent();
                        repoLogger.warn({ entityId: id, error: neo4jError_1 }, 'Neo4j write failed, will retry via outbox');
                        return [3 /*break*/, 10];
                    case 10: return [2 /*return*/, this.mapRow(entity)];
                    case 11:
                        error_1 = _a.sent();
                        return [4 /*yield*/, client.query('ROLLBACK')];
                    case 12:
                        _a.sent();
                        throw error_1;
                    case 13:
                        client.release();
                        return [7 /*endfinally*/];
                    case 14: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update entity with dual-write
     */
    EntityRepo.prototype.update = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var client, updateFields, params, paramIndex, rows, entity, neo4jError_2, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.pg.connect()];
                    case 1:
                        client = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 13, 15, 16]);
                        return [4 /*yield*/, client.query('BEGIN')];
                    case 3:
                        _a.sent();
                        updateFields = [];
                        params = [input.id];
                        paramIndex = 2;
                        if (input.labels !== undefined) {
                            updateFields.push("labels = $".concat(paramIndex));
                            params.push(input.labels);
                            paramIndex++;
                        }
                        if (input.props !== undefined) {
                            updateFields.push("props = $".concat(paramIndex));
                            params.push(JSON.stringify(input.props));
                            paramIndex++;
                        }
                        updateFields.push("updated_at = now()");
                        return [4 /*yield*/, client.query("UPDATE entities SET ".concat(updateFields.join(', '), "\n         WHERE id = $1\n         RETURNING *"), params)];
                    case 4:
                        rows = (_a.sent()).rows;
                        if (!(rows.length === 0)) return [3 /*break*/, 6];
                        return [4 /*yield*/, client.query('ROLLBACK')];
                    case 5:
                        _a.sent();
                        return [2 /*return*/, null];
                    case 6:
                        entity = rows[0];
                        // Outbox event for Neo4j sync
                        return [4 /*yield*/, client.query("INSERT INTO outbox_events (id, topic, payload)\n         VALUES ($1, $2, $3)", [
                                (0, crypto_1.randomUUID)(),
                                'entity.upsert',
                                JSON.stringify({ id: entity.id, tenantId: entity.tenant_id }),
                            ])];
                    case 7:
                        // Outbox event for Neo4j sync
                        _a.sent();
                        return [4 /*yield*/, client.query('COMMIT')];
                    case 8:
                        _a.sent();
                        _a.label = 9;
                    case 9:
                        _a.trys.push([9, 11, , 12]);
                        return [4 /*yield*/, this.upsertNeo4jNode({
                                id: entity.id,
                                tenantId: entity.tenant_id,
                                kind: entity.kind,
                                labels: entity.labels,
                                props: entity.props,
                            })];
                    case 10:
                        _a.sent();
                        return [3 /*break*/, 12];
                    case 11:
                        neo4jError_2 = _a.sent();
                        repoLogger.warn({ entityId: input.id, error: neo4jError_2 }, 'Neo4j update failed, will retry via outbox');
                        return [3 /*break*/, 12];
                    case 12: return [2 /*return*/, this.mapRow(entity)];
                    case 13:
                        error_2 = _a.sent();
                        return [4 /*yield*/, client.query('ROLLBACK')];
                    case 14:
                        _a.sent();
                        throw error_2;
                    case 15:
                        client.release();
                        return [7 /*endfinally*/];
                    case 16: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Delete entity with dual-write
     */
    EntityRepo.prototype.delete = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var client, rowCount, neo4jError_3, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.pg.connect()];
                    case 1:
                        client = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 14, 16, 17]);
                        return [4 /*yield*/, client.query('BEGIN')];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, client.query("DELETE FROM entities WHERE id = $1", [id])];
                    case 4:
                        rowCount = (_a.sent()).rowCount;
                        if (!(rowCount && rowCount > 0)) return [3 /*break*/, 11];
                        // Outbox event for Neo4j cleanup
                        return [4 /*yield*/, client.query("INSERT INTO outbox_events (id, topic, payload)\n           VALUES ($1, $2, $3)", [(0, crypto_1.randomUUID)(), 'entity.delete', JSON.stringify({ id: id })])];
                    case 5:
                        // Outbox event for Neo4j cleanup
                        _a.sent();
                        return [4 /*yield*/, client.query('COMMIT')];
                    case 6:
                        _a.sent();
                        _a.label = 7;
                    case 7:
                        _a.trys.push([7, 9, , 10]);
                        return [4 /*yield*/, this.deleteNeo4jNode(id)];
                    case 8:
                        _a.sent();
                        return [3 /*break*/, 10];
                    case 9:
                        neo4jError_3 = _a.sent();
                        repoLogger.warn({ entityId: id, error: neo4jError_3 }, 'Neo4j delete failed, will retry via outbox');
                        return [3 /*break*/, 10];
                    case 10: return [2 /*return*/, true];
                    case 11: return [4 /*yield*/, client.query('ROLLBACK')];
                    case 12:
                        _a.sent();
                        return [2 /*return*/, false];
                    case 13: return [3 /*break*/, 17];
                    case 14:
                        error_3 = _a.sent();
                        return [4 /*yield*/, client.query('ROLLBACK')];
                    case 15:
                        _a.sent();
                        throw error_3;
                    case 16:
                        client.release();
                        return [7 /*endfinally*/];
                    case 17: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Find entity by ID
     */
    EntityRepo.prototype.findById = function (id, tenantId) {
        return __awaiter(this, void 0, void 0, function () {
            var params, query, rows;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        params = [id];
                        query = "SELECT * FROM entities WHERE id = $1";
                        if (tenantId) {
                            query += " AND tenant_id = $2";
                            params.push(tenantId);
                        }
                        return [4 /*yield*/, this.pg.query(query, params)];
                    case 1:
                        rows = (_a.sent()).rows;
                        return [2 /*return*/, rows[0] ? this.mapRow(rows[0]) : null];
                }
            });
        });
    };
    /**
     * Search entities with filters
     */
    EntityRepo.prototype.search = function (_a) {
        return __awaiter(this, arguments, void 0, function (_b) {
            var params, query, paramIndex, rows;
            var tenantId = _b.tenantId, kind = _b.kind, props = _b.props, _c = _b.limit, limit = _c === void 0 ? 100 : _c, _d = _b.offset, offset = _d === void 0 ? 0 : _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        params = [tenantId];
                        query = "SELECT * FROM entities WHERE tenant_id = $1";
                        paramIndex = 2;
                        if (kind) {
                            query += " AND kind = $".concat(paramIndex);
                            params.push(kind);
                            paramIndex++;
                        }
                        if (props) {
                            query += " AND props @> $".concat(paramIndex, "::jsonb");
                            params.push(JSON.stringify(props));
                            paramIndex++;
                        }
                        query += " ORDER BY created_at DESC LIMIT $".concat(paramIndex, " OFFSET $").concat(paramIndex + 1);
                        params.push(Math.min(limit, 1000), offset); // Cap at 1000 for safety
                        return [4 /*yield*/, this.pg.query(query, params)];
                    case 1:
                        rows = (_e.sent()).rows;
                        return [2 /*return*/, rows.map(this.mapRow)];
                }
            });
        });
    };
    /**
     * Batch load entities by IDs (for DataLoader)
     */
    EntityRepo.prototype.batchByIds = function (ids, tenantId) {
        return __awaiter(this, void 0, void 0, function () {
            var params, query, rows, entitiesMap;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (ids.length === 0)
                            return [2 /*return*/, []];
                        params = [ids];
                        query = "SELECT * FROM entities WHERE id = ANY($1)";
                        if (tenantId) {
                            query += " AND tenant_id = $2";
                            params.push(tenantId);
                        }
                        return [4 /*yield*/, this.pg.query(query, params)];
                    case 1:
                        rows = (_a.sent()).rows;
                        entitiesMap = new Map(rows.map(function (row) { return [row.id, _this.mapRow(row)]; }));
                        return [2 /*return*/, ids.map(function (id) { return entitiesMap.get(id) || null; })];
                }
            });
        });
    };
    /**
     * Upsert entity node in Neo4j (idempotent)
     */
    EntityRepo.prototype.upsertNeo4jNode = function (_a) {
        return __awaiter(this, arguments, void 0, function (_b) {
            var session;
            var _this = this;
            var id = _b.id, tenantId = _b.tenantId, kind = _b.kind, labels = _b.labels, props = _b.props;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        session = this.neo4j.session();
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, , 3, 5]);
                        return [4 /*yield*/, session.executeWrite(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, tx.run("MERGE (e:Entity {id: $id})\n           ON CREATE SET e.createdAt = timestamp()\n           SET e.tenantId = $tenantId,\n               e.kind = $kind,\n               e.labels = $labels,\n               e.props = $props,\n               e.updatedAt = timestamp()", { id: id, tenantId: tenantId, kind: kind, labels: labels, props: props })];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                    case 2:
                        _c.sent();
                        return [3 /*break*/, 5];
                    case 3: return [4 /*yield*/, session.close()];
                    case 4:
                        _c.sent();
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Delete entity node from Neo4j
     */
    EntityRepo.prototype.deleteNeo4jNode = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var session;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        session = this.neo4j.session();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, , 3, 5]);
                        return [4 /*yield*/, session.executeWrite(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, tx.run("MATCH (e:Entity {id: $id})\n           DETACH DELETE e", { id: id })];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 3: return [4 /*yield*/, session.close()];
                    case 4:
                        _a.sent();
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Map database row to domain object
     */
    EntityRepo.prototype.mapRow = function (row) {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            kind: row.kind,
            labels: row.labels,
            props: row.props,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            createdBy: row.created_by,
        };
    };
    return EntityRepo;
}());
exports.EntityRepo = EntityRepo;
