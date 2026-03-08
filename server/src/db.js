"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const pg_js_1 = require("./db/pg.js");
/**
 * Legacy database export for backward compatibility.
 * Many services still expect 'db' to be exported from 'src/db.js'.
 */
exports.db = pg_js_1.pool;
exports.default = exports.db;
