import { ServerDescriptor } from '../model/serverDescriptor';

export interface ListServersRequest {
  tenantId: string;
}

export interface ListServersResponse {
  servers: ServerDescriptor[];
  evidenceId: string;
}

export class RegistryStore {
  private servers: Map<string, ServerDescriptor> = new Map();

  register(server: ServerDescriptor): void {
    const validated = ServerDescriptor.parse(server);
    this.servers.set(validated.serverId, validated);
  }

  listServers(req: ListServersRequest): ListServersResponse {
    const visibleServers: ServerDescriptor[] = [];

    // Deterministic ordering by serverId
    const sortedServerIds = Array.from(this.servers.keys()).sort();

    for (const id of sortedServerIds) {
      const server = this.servers.get(id)!;
      // If tenantVisibility is empty, it's open to all tenants, else must include tenantId
      if (server.tenantVisibility.length === 0 || server.tenantVisibility.includes(req.tenantId)) {
        visibleServers.push(server);
      }
    }

    return {
      servers: visibleServers,
      // Generating a deterministic evidence ID using an assumption-safe pattern
      evidenceId: `EID:MCP:registry:listServers:tenant:${req.tenantId}`,
    };
  }

  getSnapshot(): ServerDescriptor[] {
      return Array.from(this.servers.values()).sort((a,b) => a.serverId.localeCompare(b.serverId));
  }
}
