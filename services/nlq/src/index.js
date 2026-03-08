"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = __importDefault(require("express"));
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const index_js_1 = require("../../../packages/sdk/nlq-js/src/index.js");
const router = express_1.default.Router();
exports.router = router;
router.post('/nlq/compile', (req, res) => {
    const { nl } = req.body;
    const result = (0, index_js_1.compile)(nl);
    res.json(result);
});
const driver = neo4j_driver_1.default.driver(process.env.NEO4J_URI || 'neo4j://localhost', neo4j_driver_1.default.auth.basic(process.env.NEO4J_USER || 'readonly', process.env.NEO4J_PASSWORD || ''), { disableLosslessIntegers: true });
router.post('/nlq/execute-sandbox', async (req, res, next) => {
    try {
        const { cypher, params } = req.body;
        const result = await (0, index_js_1.executeSandbox)(driver, cypher, params);
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
