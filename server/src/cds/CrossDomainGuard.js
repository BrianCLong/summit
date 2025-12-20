"use strict";
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrossDomainGuard = void 0;
var ABACEngine_js_1 = require("./ABACEngine.js");
var ContentInspector_js_1 = require("./ContentInspector.js");
var HardwareEmulator_js_1 = require("./HardwareEmulator.js");
var logger_js_1 = require("../config/logger.js");
var crypto_1 = require("crypto");
var guardLogger = logger_js_1.default.child({ module: 'CrossDomainGuard' });
var CrossDomainGuard = /** @class */ (function () {
    function CrossDomainGuard(entityRepo) {
        // Define domains configuration (could be dynamic/DB-backed)
        this.domains = {
            'high-side': { id: 'high-side', name: 'High Side', classification: 'TOP_SECRET' },
            'low-side': { id: 'low-side', name: 'Low Side', classification: 'UNCLASSIFIED' },
        };
        this.abac = new ABACEngine_js_1.ABACEngine();
        this.inspector = new ContentInspector_js_1.ContentInspector();
        this.diode = new HardwareEmulator_js_1.HardwareEmulator();
        this.entityRepo = entityRepo;
    }
    CrossDomainGuard.prototype.processTransfer = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var entityId, sourceDomainId, targetDomainId, userContext, justification, transferId, sourceDomain, targetDomain, entity, entityLabel, decision, inspection, _a, payload, id, inputData, newProps;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        entityId = request.entityId, sourceDomainId = request.sourceDomainId, targetDomainId = request.targetDomainId, userContext = request.userContext, justification = request.justification;
                        transferId = (0, crypto_1.randomUUID)();
                        guardLogger.info({ transferId: transferId, user: userContext.userId, source: sourceDomainId, target: targetDomainId }, 'Initiating Cross-Domain Transfer');
                        sourceDomain = this.domains[sourceDomainId];
                        targetDomain = this.domains[targetDomainId];
                        if (!sourceDomain || !targetDomain) {
                            return [2 /*return*/, { success: false, timestamp: new Date(), error: 'Invalid source or target domain' }];
                        }
                        return [4 /*yield*/, this.entityRepo.findById(entityId)];
                    case 1:
                        entity = _b.sent();
                        if (!entity) {
                            return [2 /*return*/, { success: false, timestamp: new Date(), error: 'Entity not found' }];
                        }
                        entityLabel = {
                            classification: entity.props.classification || sourceDomain.classification,
                            releasability: entity.props.releasability || [],
                            compartments: entity.props.compartments || [],
                        };
                        decision = this.abac.canTransfer(userContext, entityLabel, sourceDomain, targetDomain);
                        if (!decision.allowed) {
                            guardLogger.warn({ transferId: transferId, reason: decision.reason }, 'Transfer denied by ABAC policy');
                            return [2 /*return*/, { success: false, timestamp: new Date(), error: "Access Denied: ".concat(decision.reason) }];
                        }
                        inspection = this.inspector.inspect(entity, targetDomain.classification);
                        if (!inspection.passed) {
                            guardLogger.warn({ transferId: transferId, issues: inspection.issues }, 'Transfer blocked by Content Inspection');
                            return [2 /*return*/, { success: false, timestamp: new Date(), error: "Content Inspection Failed: ".concat(inspection.issues.join(', ')) }];
                        }
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 7, , 8]);
                        if (!(sourceDomain.classification === 'TOP_SECRET' && targetDomain.classification !== 'TOP_SECRET')) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.diode.sendHighToLow(entity)];
                    case 3:
                        _b.sent();
                        return [3 /*break*/, 6];
                    case 4: return [4 /*yield*/, this.diode.sendLowToHigh(entity)];
                    case 5:
                        _b.sent();
                        _b.label = 6;
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        _a = _b.sent();
                        return [2 /*return*/, { success: false, timestamp: new Date(), error: 'Hardware Diode Fault' }];
                    case 8:
                        payload = (sourceDomain.classification === 'TOP_SECRET')
                            ? this.diode.readHighToLow()
                            : this.diode.readLowToHigh();
                        if (!payload) return [3 /*break*/, 10];
                        id = payload.id, inputData = __rest(payload, ["id"]);
                        newProps = __assign(__assign({}, inputData.props), { _cds_provenance: {
                                originalId: id,
                                sourceDomain: sourceDomainId,
                                transferId: transferId,
                                transferredBy: userContext.userId,
                                justification: justification,
                                timestamp: new Date().toISOString()
                            } });
                        return [4 /*yield*/, this.entityRepo.create({
                                tenantId: targetDomainId, // Using Domain ID as Tenant ID for simulation
                                kind: inputData.kind,
                                labels: inputData.labels,
                                props: newProps
                            }, userContext.userId)];
                    case 9:
                        _b.sent();
                        guardLogger.info({ transferId: transferId }, 'Cross-Domain Transfer Successful');
                        return [2 /*return*/, { success: true, transferId: transferId, timestamp: new Date() }];
                    case 10: return [2 /*return*/, { success: false, timestamp: new Date(), error: 'Transfer simulation failed' }];
                }
            });
        });
    };
    return CrossDomainGuard;
}());
exports.CrossDomainGuard = CrossDomainGuard;
