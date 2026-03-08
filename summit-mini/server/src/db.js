"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openDb = openDb;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
function openDb(path = "summit-mini.sqlite") {
    const db = new better_sqlite3_1.default(path);
    db.pragma("journal_mode = WAL");
    db.exec(`
    CREATE TABLE IF NOT EXISTS docs (
      id TEXT PRIMARY KEY,
      source TEXT,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      kind TEXT NOT NULL,
      score REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS edges (
      id TEXT PRIMARY KEY,
      src TEXT NOT NULL,
      dst TEXT NOT NULL,
      kind TEXT NOT NULL,
      weight REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS receipts (
      id TEXT PRIMARY KEY,
      ts TEXT NOT NULL,
      json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS decisions (
      id TEXT PRIMARY KEY,
      ts TEXT NOT NULL,
      json TEXT NOT NULL
    );
  `);
    return db;
}
