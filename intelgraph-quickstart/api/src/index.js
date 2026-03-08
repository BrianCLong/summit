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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const server_1 = require("@apollo/server");
const express4_1 = require("@apollo/server/express4");
const schema_1 = require("./schema");
const resolvers_1 = require("./resolvers");
const auth_1 = require("./auth");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
const server = new server_1.ApolloServer({ typeDefs: schema_1.typeDefs, resolvers: resolvers_1.resolvers });
await server.start();
app.use('/graphql', (0, express4_1.expressMiddleware)(server, {
    context: async ({ req }) => (0, auth_1.getContextFromReq)(req),
}));
// test-only Cypher proxy used by k6 load script
app.post('/test/cypher', async (req, res) => {
    if (process.env.NODE_ENV === 'production')
        return res.status(404).end();
    const { getSession } = await Promise.resolve().then(() => __importStar(require('./db/neo4j')));
    const s = getSession();
    try {
        const r = await s.run(req.body.cypher);
        res.json({ records: r.records.length });
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
    finally {
        await s.close();
    }
});
app.listen(4000, () => console.log('API on http://localhost:4000/graphql'));
