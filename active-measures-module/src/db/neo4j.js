"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.driver = void 0;
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
exports.driver = neo4j_driver_1.default.driver(process.env.NEO4J_URI || 'bolt://localhost:7687', neo4j_driver_1.default.auth.basic('neo4j', 'password'), { disableLosslessIntegers: true });
