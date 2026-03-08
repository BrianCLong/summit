"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authDirectiveTypeDefs = void 0;
exports.authDirectiveTransformer = authDirectiveTransformer;
// @ts-nocheck
const graphql_1 = require("graphql");
const utils_1 = require("@graphql-tools/utils");
exports.authDirectiveTypeDefs = `directive @authz on FIELD_DEFINITION`;
function authDirectiveTransformer(schema) {
    return (0, utils_1.mapSchema)(schema, {
        [utils_1.MapperKind.OBJECT_FIELD]: (fieldConfig) => {
            const authz = (0, utils_1.getDirective)(schema, fieldConfig, 'authz');
            if (authz) {
                const { resolve = graphql_1.defaultFieldResolver } = fieldConfig;
                fieldConfig.resolve = async function (source, args, context, info) {
                    // Authorization logic handled by Team 6
                    return resolve.call(this, source, args, context, info);
                };
                return fieldConfig;
            }
        },
    });
}
