import { AuditBus } from "../audit/bus";
import { randomUUID } from "crypto";

export interface Secret {
  id: string;
  name: string;
  value: string;
  version: number;
  created_at: string;
  expires_at: string | null;
}

export class DepotService {
  private static instance: DepotService;
  private secrets: Map<string, Secret[]> = new Map();
  private auditBus = AuditBus.getInstance();

  private constructor() {}

  public static getInstance(): DepotService {
    if (!DepotService.instance) {
      DepotService.instance = new DepotService();
    }
    return DepotService.instance;
  }

  public async issueSecret(tenantId: string, name: string, value: string): Promise<Secret> {
    const secret: Secret = {
      id: randomUUID(),
      name,
      value,
      version: 1,
      created_at: new Date().toISOString(),
      expires_at: null,
    };

    const versions = this.secrets.get(`${tenantId}:${name}`) || [];
    versions.push(secret);
    this.secrets.set(`${tenantId}:${name}`, versions);

    await this.auditBus.publish({
      tenant_id: tenantId,
      type: "secret.issued",
      actor: { id: "system", type: "service" },
      action: "issue",
      resource: { type: "secret", id: secret.id },
      payload: { name },
    });

    return secret;
  }

  public async getSecret(tenantId: string, name: string): Promise<Secret | undefined> {
    const versions = this.secrets.get(`${tenantId}:${name}`);
    const secret = versions ? versions[versions.length - 1] : undefined;

    if (secret) {
      await this.auditBus.publish({
        tenant_id: tenantId,
        type: "secret.accessed",
        actor: { id: "system", type: "service" },
        action: "access",
        resource: { type: "secret", id: secret.id },
        payload: { name },
      });
    }

    return secret;
  }

  public async rotateSecret(tenantId: string, name: string, newValue: string): Promise<Secret> {
    const versions = this.secrets.get(`${tenantId}:${name}`) || [];
    const latest = versions[versions.length - 1];

    const newSecret: Secret = {
      id: randomUUID(),
      name,
      value: newValue,
      version: latest ? latest.version + 1 : 1,
      created_at: new Date().toISOString(),
      expires_at: null,
    };

    versions.push(newSecret);
    this.secrets.set(`${tenantId}:${name}`, versions);

    await this.auditBus.publish({
      tenant_id: tenantId,
      type: "secret.rotated",
      actor: { id: "system", type: "service" },
      action: "rotate",
      resource: { type: "secret", id: newSecret.id },
      payload: { name, version: newSecret.version },
    });

    return newSecret;
  }
}
