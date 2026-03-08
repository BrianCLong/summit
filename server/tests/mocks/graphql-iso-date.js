"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphQLDateTime = void 0;
class GraphQLDateTime {
    serialize(value) {
        return value;
    }
    parseValue(value) {
        return value;
    }
    parseLiteral(ast) {
        return ast?.value;
    }
}
exports.GraphQLDateTime = GraphQLDateTime;
