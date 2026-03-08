"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDatabase = exports.schema = void 0;
const watermelondb_1 = require("@nozbe/watermelondb");
const models_1 = require("./models");
// Export schema and models for consumption by apps
var schema_1 = require("./schema");
Object.defineProperty(exports, "schema", { enumerable: true, get: function () { return schema_1.schema; } });
__exportStar(require("./models"), exports);
// Database setup helper
const createDatabase = (adapter) => {
    return new watermelondb_1.Database({
        adapter,
        modelClasses: [
            models_1.Entity,
            models_1.Investigation,
            models_1.Alert,
            models_1.GEOINTFeature,
            models_1.SyncQueueItem,
        ],
    });
};
exports.createDatabase = createDatabase;
