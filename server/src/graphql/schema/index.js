"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeTypes = exports.schema = exports.typeDefs = void 0;
const graphql_tag_1 = require("graphql-tag");
const schema_core_js_1 = require("../schema.core.js");
const schema_copilot_js_1 = require("../schema.copilot.js");
const schema_graphops_js_1 = require("../schema.graphops.js");
const schema_ai_js_1 = require("../schema.ai.js");
const schema_annotations_js_1 = require("../schema.annotations.js");
const graphragTypes_js_1 = require("../types/graphragTypes.js");
const schema_crystal_js_1 = require("../schema.crystal.js");
const schema_evidence_js_1 = __importDefault(require("../schema.evidence.js"));
const schema_evidenceOk_js_1 = __importDefault(require("../schema.evidenceOk.js"));
const schema_trust_risk_js_1 = __importDefault(require("../schema.trust-risk.js"));
const schema_provenance_js_1 = __importDefault(require("../schema.provenance.js"));
const sprint28_js_1 = require("./sprint28.js");
const ingestion_js_1 = require("./ingestion.js");
const schema_er_js_1 = require("../schema.er.js");
const schema_foundry_js_1 = require("../schema.foundry.js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
// Load EW schema
const ewSchemaPath = path_1.default.join(__dirname, '../schemas/electronic-warfare.graphql');
const ewTypeDefs = fs_1.default.readFileSync(ewSchemaPath, 'utf8');
// Load Collaboration schema
const collabSchemaPath = path_1.default.join(__dirname, './collaboration.graphql');
const collabTypeDefs = fs_1.default.readFileSync(collabSchemaPath, 'utf8');
// Load Cognitive Security schema
const cogSecSchemaPath = path_1.default.join(__dirname, './cognitive-security.graphql');
const cogSecTypeDefs = fs_1.default.readFileSync(cogSecSchemaPath, 'utf8');
// Load Deduplication schema
const dedupSchemaPath = path_1.default.join(__dirname, '../schemas/deduplication.graphql');
const dedupTypeDefs = fs_1.default.readFileSync(dedupSchemaPath, 'utf8');
// Load Voice schema
const voiceSchemaPath = path_1.default.join(__dirname, '../schemas/voice.graphql');
const voiceTypeDefs = fs_1.default.readFileSync(voiceSchemaPath, 'utf8');
const base = (0, graphql_tag_1.gql) `
  scalar JSON
  scalar DateTime

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
    schema_annotations_js_1.annotationsTypeDefs,
    schema_crystal_js_1.crystalTypeDefs,
    schema_evidence_js_1.default,
    schema_evidenceOk_js_1.default,
    schema_trust_risk_js_1.default,
    schema_provenance_js_1.default,
    sprint28_js_1.sprint28TypeDefs,
    ingestion_js_1.ingestionTypeDefs,
    schema_er_js_1.erTypeDefs,
    schema_foundry_js_1.foundryTypeDefs,
    ewTypeDefs,
    collabTypeDefs,
    cogSecTypeDefs,
    dedupTypeDefs,
    voiceTypeDefs,
];
exports.default = exports.typeDefs;
exports.schema = exports.typeDefs;
exports.safeTypes = [];
