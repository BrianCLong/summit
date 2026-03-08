import { runScopedTemplate } from '../../../../graphrag/intelgraph/engine/run';
import { TemplateRegistry, IntelGraphTemplate } from '../../../../graphrag/intelgraph/template/template-registry';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// Mock registry instance
const registry = new TemplateRegistry();

// Initialize registry with templates
try {
  // Try to load templates from the monorepo root
  const templateDir = path.resolve(__dirname, '../../../../../../intelgraph/templates');
  if (fs.existsSync(templateDir)) {
    const files = fs.readdirSync(templateDir);
    for (const file of files) {
      if (file.endsWith('.yaml') || file.endsWith('.yml')) {
        const fileContents = fs.readFileSync(path.join(templateDir, file), 'utf8');
        const template = yaml.load(fileContents) as IntelGraphTemplate;
        registry.register(template);
      }
    }
  }
} catch (e) {
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

export const resolvers = {
  Query: {
    runPattern: async (_: any, args: { name: string, params: string, scope: { tenantId: string, workspaceId: string } }, context: any) => {
      const template = registry.get(args.name);
      if (!template) {
        throw new Error(`Template ${args.name} not found`);
      }

      const parsedParams = args.params ? JSON.parse(args.params) : {};

      return await runScopedTemplate(context, template, parsedParams, args.scope);
    },
    getTemplate: async (_: any, args: { name: string }) => {
      const template = registry.get(args.name);
      return template ? JSON.stringify(template) : null;
    }
  }
};
