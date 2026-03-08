"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authDirectiveTransformer = authDirectiveTransformer;
exports.scopeDirectiveTransformer = scopeDirectiveTransformer;
// @ts-nocheck
const utils_1 = require("@graphql-tools/utils");
const graphql_1 = require("graphql");
const AuthService_js_1 = __importDefault(require("../services/AuthService.js"));
const scopeGuard_js_1 = require("../api/scopeGuard.js");
const authService = new AuthService_js_1.default();
function authDirectiveTransformer(schema, directiveName = 'auth') {
    return (0, utils_1.mapSchema)(schema, {
        [utils_1.MapperKind.OBJECT_FIELD]: (fieldConfig) => {
            const authDirective = (0, utils_1.getDirective)(schema, fieldConfig, directiveName)?.[0];
            if (authDirective) {
                const { requires } = authDirective;
                if (requires) {
                    const { resolve = graphql_1.defaultFieldResolver } = fieldConfig;
                    fieldConfig.resolve = async function (source, args, context, info) {
                        const user = context.user;
                        if (!user) {
                            throw new graphql_1.GraphQLError('Not authenticated', {
                                extensions: { code: 'UNAUTHENTICATED' },
                            });
                        }
                        // Check permission
                        // user object from context matches AuthService User interface
                        if (!authService.hasPermission(user, requires)) {
                            throw new graphql_1.GraphQLError(`Not authorized. Requires permission: ${requires}`, {
                                extensions: { code: 'FORBIDDEN' },
                            });
                        }
                        return resolve(source, args, context, info);
                    };
                    return fieldConfig;
                }
            }
            return fieldConfig;
        },
    });
}
function scopeDirectiveTransformer(schema, directiveName = 'scope') {
    return (0, utils_1.mapSchema)(schema, {
        [utils_1.MapperKind.OBJECT_FIELD]: (fieldConfig) => {
            const scopeDirective = (0, utils_1.getDirective)(schema, fieldConfig, directiveName)?.[0];
            if (scopeDirective) {
                const { requires } = scopeDirective;
                if (requires) {
                    const { resolve = graphql_1.defaultFieldResolver } = fieldConfig;
                    fieldConfig.resolve = async function (source, args, context, info) {
                        const user = context.user;
                        if (!user) {
                            throw new graphql_1.GraphQLError('Not authenticated', {
                                extensions: { code: 'UNAUTHENTICATED' },
                            });
                        }
                        // Check scope
                        const scopes = Array.isArray(requires) ? requires : [requires];
                        for (const scope of scopes) {
                            if (!(0, scopeGuard_js_1.checkScope)(user.scopes || [], scope)) {
                                throw new graphql_1.GraphQLError(`Not authorized. Requires scope: ${scope}`, {
                                    extensions: { code: 'SCOPE_DENIED' },
                                });
                            }
                        }
                        return resolve(source, args, context, info);
                    };
                    return fieldConfig;
                }
            }
            return fieldConfig;
        },
    });
}
