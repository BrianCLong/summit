import { ServerDescriptor } from '../model/serverDescriptor';
import { RegistryStore } from './listServers';

export interface ListToolsRequest {
  tenantId: string;
}

export interface ToolDescriptor {
  serverId: string;
  name: string;
  description: string;
  capabilityTags: string[];
  riskTags: string[];
  inputSchemaHash?: string;
}

export interface ListToolsResponse {
  tools: ToolDescriptor[];
  evidenceId: string;
}

export class ToolDiscovery {
  constructor(private store: RegistryStore) {}

  listTools(req: ListToolsRequest): ListToolsResponse {
    const response = this.store.listServers({ tenantId: req.tenantId });
    const tools: ToolDescriptor[] = [];

    for (const server of response.servers) {
      for (const tool of server.tools) {
        tools.push({
          serverId: server.serverId,
          ...tool,
        });
      }
    }

    // Sort deterministically
    tools.sort((a, b) => {
        if (a.serverId !== b.serverId) return a.serverId.localeCompare(b.serverId);
        return a.name.localeCompare(b.name);
    });

    return {
      tools,
      evidenceId: `EID:MCP:registry:listTools:tenant:${req.tenantId}`,
    };
  }
}
