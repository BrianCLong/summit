"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.federationResolvers = exports.federationTypeDefs = void 0;
const graphql_tag_1 = __importDefault(require("graphql-tag"));
exports.federationTypeDefs = (0, graphql_tag_1.default) `
  type FederatedQuery {
    query: String!
  }

  type Query {
    _federationInfo: String!
  }
`;
exports.federationResolvers = {
    Query: {
        _federationInfo: () => 'federation placeholder',
    },
};
