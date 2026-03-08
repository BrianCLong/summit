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
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const node_test_1 = require("node:test");
const assert = __importStar(require("node:assert"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.join(__dirname, '../../config/ontology/ai-influence-campaign/ontology.schema.json');
(0, node_test_1.describe)('Ontology Schema validation', () => {
    (0, node_test_1.it)('schema file exists', () => {
        assert.strictEqual(fs.existsSync(schemaPath), true);
    });
    (0, node_test_1.it)('schema has correct structure', () => {
        const schemaContent = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
        assert.strictEqual(schemaContent.$id, 'summit.ai-influence-campaign.ontology.v0');
        assert.strictEqual(schemaContent.type, 'object');
        assert.ok(schemaContent.required.includes('campaign_id'));
        assert.ok(schemaContent.required.includes('actor_ids'));
        assert.ok(schemaContent.required.includes('objectives'));
        assert.ok(schemaContent.required.includes('tactics'));
        assert.ok(schemaContent.required.includes('evidence'));
    });
});
