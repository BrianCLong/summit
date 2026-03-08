"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const db = new better_sqlite3_1.default('repograph.db');
const app = (0, express_1.default)();
app.get('/api/repograph/impacted', (req, res) => {
    const files = String(req.query.files || '')
        .split(',')
        .filter(Boolean);
    const rows = db
        .prepare(`SELECT DISTINCT dst FROM edges WHERE src IN (${files.map(() => '?').join(',')})`)
        .all(...files);
    res.json({ impacted: rows.map((r) => r.dst) });
});
app.listen(process.env.PORT || 4030);
