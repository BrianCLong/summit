import { listAllowedN8nFlows } from '../../integrations/n8n-policy.js';

export const integrationsResolvers = {
  Query: {
    n8nAllowed: async () => listAllowedN8nFlows(),
  },
};
