"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeSandbox = executeSandbox;
// @ts-nocheck
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const database_js_1 = require("../config/database.js");
async function executeSandbox(cypher, rowLimit = 10) {
    if (/(CREATE|MERGE|DELETE|SET|DROP|REMOVE|CALL|LOAD)/i.test(cypher)) {
        throw new Error('Mutations are not allowed');
    }
    const driver = (0, database_js_1.getNeo4jDriver)();
    const session = driver.session({ defaultAccessMode: neo4j_driver_1.default.session.READ });
    try {
        const result = await session.run(`${cypher} LIMIT ${Math.floor(Number(rowLimit))}`);
        return result.records.map((r) => r.toObject());
    }
    finally {
        await session.close();
    }
}
