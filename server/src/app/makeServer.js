"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeGraphServer = makeGraphServer;
const server_1 = require("@apollo/server");
const schema_1 = require("@graphql-tools/schema");
const index_js_1 = require("../graphql/schema/index.js");
const index_js_2 = __importDefault(require("../graphql/resolvers/index.js"));
const authDirective_js_1 = require("../graphql/authDirective.js");
const auth_js_1 = require("../lib/auth.js");
async function makeGraphServer(opts = {}) {
    let schema = (0, schema_1.makeExecutableSchema)({
        typeDefs: index_js_1.typeDefs,
        resolvers: index_js_2.default,
    });
    schema = (0, authDirective_js_1.authDirectiveTransformer)(schema);
    const server = new server_1.ApolloServer({
        schema,
        introspection: true,
    });
    await server.start();
    return {
        server,
        createContext: async (_reqRes) => {
            // Base context via application auth
            const base = await (0, auth_js_1.getContext)({
                req: { headers: {} },
            });
            // Inject test user if provided
            const injectedUser = opts.user ??
                (opts.tenant || opts.role || opts.scopes
                    ? {
                        id: 'test-user',
                        email: 'test@intelgraph.local',
                        role: opts.role ?? 'ADMIN',
                        tenant: opts.tenant ?? 'test-tenant',
                        scopes: opts.scopes ?? ['*'],
                    }
                    : null);
            const withUser = injectedUser
                ? {
                    ...base,
                    user: injectedUser,
                    isAuthenticated: true,
                    tenantId: injectedUser.tenant,
                }
                : base;
            // Merge/override additional context
            if (opts.context) {
                const extra = typeof opts.context === 'function'
                    ? await opts.context(withUser)
                    : opts.context;
                return { ...withUser, ...extra };
            }
            return withUser;
        },
        async stop() {
            await server.stop();
        },
    };
}
