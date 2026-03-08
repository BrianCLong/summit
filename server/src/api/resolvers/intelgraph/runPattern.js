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
exports.resolvers = void 0;
const run_1 = require("../../../../graphrag/intelgraph/engine/run");
const template_registry_1 = require("../../../../graphrag/intelgraph/template/template-registry");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
// Mock registry instance
const registry = new template_registry_1.TemplateRegistry();
// Initialize registry with templates
try {
    // Try to load templates from the monorepo root
    const templateDir = path.resolve(__dirname, '../../../../../../intelgraph/templates');
    if (fs.existsSync(templateDir)) {
        const files = fs.readdirSync(templateDir);
        for (const file of files) {
            if (file.endsWith('.yaml') || file.endsWith('.yml')) {
                const fileContents = fs.readFileSync(path.join(templateDir, file), 'utf8');
                const template = yaml.load(fileContents);
                registry.register(template);
            }
        }
    }
}
catch (e) {
    console.error('Failed to load templates into registry:', e);
}
// Ensure at least one mock template exists if file loading fails
if (registry.list().length === 0) {
    registry.register({
        id: 'intelgraph.identity.shared-email-domain',
        version: '1.0.0',
        category: 'identity',
        title: 'Shared Email Domain',
        description: 'Find scoped account clusters sharing an email domain.',
        parameters: { domain: { type: 'string', required: true } },
        scope: { required: ['tenantId', 'workspaceId'] },
        returns: { nodes: 'Account[]', edges: 'HAS_EMAIL[]', matches: { type: 'cluster' } },
        provenance: { requiredFields: ['sourceIds'] },
        risk: { abusePotential: 'medium', notes: 'Analyst use only.' },
        budgets: { p95Ms: 1200, maxDbHits: 50000, maxRows: 5000 },
        cypher: { entrypoint: 'shared_email_domain_v1' },
        evidence: { idPattern: 'IG-EVID-######' }
    });
}
exports.resolvers = {
    Query: {
        runPattern: async (_, args, context) => {
            const template = registry.get(args.name);
            if (!template) {
                throw new Error(`Template ${args.name} not found`);
            }
            const parsedParams = args.params ? JSON.parse(args.params) : {};
            return await (0, run_1.runScopedTemplate)(context, template, parsedParams, args.scope);
        },
        getTemplate: async (_, args) => {
            const template = registry.get(args.name);
            return template ? JSON.stringify(template) : null;
        }
    }
};
