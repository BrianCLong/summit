"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initAgentScaffold = initAgentScaffold;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const DEFAULT_MANIFEST = (name) => `schema_version: s-adk/v1
name: ${name}
description: Summit S-ADK scaffold
tools: []
connections: []
knowledge_base:
  sources: []
policy:
  allow_tools: []
  allow_network: false
`;
const DEFAULT_FIXTURE = `{
  "name": "minimal",
  "inputs": {
    "prompt": "Hello Summit ADK"
  },
  "tool_calls": []
}
`;
async function initAgentScaffold(agentName, cwd) {
    const agentDir = node_path_1.default.resolve(cwd, agentName);
    const manifestPath = node_path_1.default.join(agentDir, 'agent.yaml');
    const fixtureDir = node_path_1.default.join(agentDir, 'fixtures');
    const fixturePath = node_path_1.default.join(fixtureDir, 'minimal.json');
    await promises_1.default.mkdir(agentDir, { recursive: false });
    await promises_1.default.mkdir(fixtureDir, { recursive: true });
    await promises_1.default.writeFile(manifestPath, DEFAULT_MANIFEST(agentName), 'utf-8');
    await promises_1.default.writeFile(fixturePath, DEFAULT_FIXTURE, 'utf-8');
    return { manifestPath };
}
