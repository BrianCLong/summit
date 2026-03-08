"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncQueueCollection = exports.geointCollection = exports.alertsCollection = exports.investigationsCollection = exports.entitiesCollection = exports.database = void 0;
const watermelondb_1 = require("@nozbe/watermelondb");
const sqlite_1 = __importDefault(require("@nozbe/watermelondb/adapters/sqlite"));
const db_1 = require("@intelgraph/mobile-sdk/db");
const adapter = new sqlite_1.default({
    schema: db_1.schema,
    // (You might want to comment out migrationEvents for production)
    // migrationEvents: !!__DEV__,
    jsi: true, // Enable JSI for faster database operations
    onSetUpError: error => {
        // Database failed to load -- offer the user to reload the app or log out
        console.error('Database failed to load', error);
    }
});
exports.database = new watermelondb_1.Database({
    adapter,
    modelClasses: [
        db_1.Entity,
        db_1.Investigation,
        db_1.Alert,
        db_1.GEOINTFeature,
        db_1.SyncQueueItem,
    ],
});
exports.entitiesCollection = exports.database.get('entities');
exports.investigationsCollection = exports.database.get('investigations');
exports.alertsCollection = exports.database.get('alerts');
exports.geointCollection = exports.database.get('geoint_features');
exports.syncQueueCollection = exports.database.get('sync_queue');
