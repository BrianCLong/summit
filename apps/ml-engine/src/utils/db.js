"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPgPool = getPgPool;
exports.closePgPool = closePgPool;
const pg_1 = require("pg");
const config_js_1 = require("../config.js");
let pool;
function getPgPool() {
    if (!pool) {
        pool = new pg_1.Pool(config_js_1.config.database.postgres);
    }
    return pool;
}
async function closePgPool() {
    if (pool) {
        await pool.end();
        pool = undefined;
    }
}
