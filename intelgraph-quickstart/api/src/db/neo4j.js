"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSession = void 0;
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const driver = neo4j_driver_1.default.driver(process.env.NEO4J_URI, neo4j_driver_1.default.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD));
const getSession = () => driver.session();
exports.getSession = getSession;
exports.default = driver;
