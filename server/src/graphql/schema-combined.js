"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeDefs = void 0;
const apollo_server_express_1 = require("apollo-server-express");
const fs_1 = require("fs");
const path_1 = require("path");
const schema_copilot_js_1 = require("./schema.copilot.js");
const schema_graphops_js_1 = require("./schema.graphops.js");
const schema_ai_js_1 = require("./schema.ai.js");
const graphragTypes_js_1 = require("./types/graphragTypes.js");
const schema_core_js_1 = require("./schema.core.js");
const activity_js_1 = require("./schema/activity.js");
const schema_document_js_1 = require("./schema.document.js");
const schema_threat_actor_js_1 = require("./schema.threat-actor.js");
// Load v0.4.0 Transcendent Intelligence schema
const v040Schema = (0, apollo_server_express_1.gql)((0, fs_1.readFileSync)((0, path_1.join)(__dirname, '../../../graphql/v040/mc-admin.v040.graphql'), 'utf8'));
const base = (0, apollo_server_express_1.gql) `
  scalar JSON

  type Query {
    _empty: String
  }
  type Mutation {
    _empty: String
  }
  type Subscription {
    _empty: String
  }
`;
exports.typeDefs = [
    base,
    schema_core_js_1.coreTypeDefs,
    schema_copilot_js_1.copilotTypeDefs,
    schema_graphops_js_1.graphTypeDefs,
    graphragTypes_js_1.graphragTypes,
    schema_ai_js_1.aiTypeDefs,
    v040Schema,
    activity_js_1.activityTypeDefs,
    schema_document_js_1.documentTypeDefs,
    schema_threat_actor_js_1.threatActorTypeDefs,
];
