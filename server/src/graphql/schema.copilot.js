"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.copilotTypeDefs = void 0;
const graphql_tag_1 = __importDefault(require("graphql-tag"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const gql = graphql_tag_1.default.default || graphql_tag_1.default;
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
const sdl = (0, fs_1.readFileSync)(path_1.default.join(__dirname, 'schema.copilot.gql'), 'utf8');
exports.copilotTypeDefs = gql(sdl);
