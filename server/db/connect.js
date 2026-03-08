"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConn = getConn;
const iam_js_1 = require("./iam.js");
async function getConn() {
    if (process.env.DB_AUTH_MODE === 'iam') {
        const token = await (0, iam_js_1.buildRdsAuthToken)(process.env.DB_HOST, process.env.DB_USER);
        return new Client({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: token,
            ssl: true,
        });
    }
}
