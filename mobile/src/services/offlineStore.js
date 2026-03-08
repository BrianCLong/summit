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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureOfflineStore = ensureOfflineStore;
exports.enqueuePayload = enqueuePayload;
exports.readOldest = readOldest;
exports.deleteRecords = deleteRecords;
exports.countQueue = countQueue;
const SQLite = __importStar(require("expo-sqlite"));
const encryption_1 = require("./encryption");
const db = SQLite.openDatabase('summit-intel.db');
async function ensureOfflineStore() {
    await runTx(tx => tx.executeSql(`CREATE TABLE IF NOT EXISTS outbound_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payload TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s','now')),
        attempts INTEGER DEFAULT 0
      )`));
}
async function enqueuePayload(payload) {
    const serialized = JSON.stringify(payload);
    const encrypted = await (0, encryption_1.encryptData)(serialized);
    await runTx(tx => tx.executeSql('INSERT INTO outbound_queue (payload) VALUES (?)', [encrypted]));
}
async function readOldest(limit = 50) {
    // 1. Fetch raw encrypted rows
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawRows = await new Promise((resolve, reject) => {
        db.readTransaction(tx => {
            tx.executeSql('SELECT id, payload, created_at as createdAt FROM outbound_queue ORDER BY id ASC LIMIT ?', [limit], (_, rs) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const rows = [];
                for (let i = 0; i < rs.rows.length; i++) {
                    rows.push(rs.rows.item(i));
                }
                resolve(rows);
            }, (_tx, error) => {
                reject(error);
                return true;
            });
        }, reject);
    });
    // 2. Decrypt asynchronously outside the transaction
    const results = [];
    for (const row of rawRows) {
        try {
            const decrypted = await (0, encryption_1.decryptData)(row.payload);
            results.push({
                id: row.id,
                payload: JSON.parse(decrypted),
                createdAt: row.createdAt
            });
        }
        catch (e) {
            console.error('Failed to decrypt record', row.id, e);
            // Skip corrupted records or handle error
        }
    }
    return results;
}
async function deleteRecords(ids) {
    if (!ids.length)
        return;
    const placeholders = ids.map(() => '?').join(',');
    await runTx(tx => tx.executeSql(`DELETE FROM outbound_queue WHERE id IN (${placeholders})`, ids));
}
async function countQueue() {
    return new Promise((resolve, reject) => {
        db.readTransaction(tx => {
            tx.executeSql('SELECT COUNT(*) as total FROM outbound_queue', [], (_, rs) => {
                resolve(rs.rows.item(0).total ?? 0);
            }, (_tx, error) => {
                reject(error);
                return true;
            });
        }, reject);
    });
}
function runTx(fn) {
    return new Promise((resolve, reject) => {
        db.transaction(fn, reject, resolve);
    });
}
