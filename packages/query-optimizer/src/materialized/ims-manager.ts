import { SubgraphViewDefinition, ProvenanceManifest } from "../types";
import * as crypto from "crypto";
import { Pool } from "pg";

export class IncrementalSubgraphManager {
  private secretKey: string;

  constructor(private pool: Pool) {
    this.secretKey = process.env.IMS_SECRET_KEY || "default-dev-key";
  }

  async initialize(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ims_views (
        name TEXT PRIMARY KEY,
        definition JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ims_manifests (
        view_name TEXT NOT NULL REFERENCES ims_views(name),
        refresh_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        manifest JSONB NOT NULL,
        signature TEXT NOT NULL,
        PRIMARY KEY (view_name, refresh_timestamp)
      );
    `);
  }

  async registerView(definition: SubgraphViewDefinition): Promise<void> {
    const exists = await this.pool.query("SELECT 1 FROM ims_views WHERE name = $1", [
      definition.name,
    ]);
    if (exists.rowCount && exists.rowCount > 0) {
      throw new Error(`View ${definition.name} already exists`);
    }

    await this.pool.query("INSERT INTO ims_views (name, definition) VALUES ($1, $2)", [
      definition.name,
      JSON.stringify(definition),
    ]);
  }

  async getView(name: string): Promise<SubgraphViewDefinition | undefined> {
    const res = await this.pool.query("SELECT definition FROM ims_views WHERE name = $1", [name]);
    if (res.rowCount === 0) return undefined;
    return res.rows[0].definition;
  }

  async refreshSubgraph(name: string, actorId: string): Promise<ProvenanceManifest> {
    const view = await this.getView(name);
    if (!view) {
      throw new Error(`View ${name} not found`);
    }

    const timestamp = new Date().toISOString();
    const queryHash = crypto.createHash("sha256").update(view.cypherQuery).digest("hex");

    // Simulate input data hashes (e.g., from source tables/nodes)
    const inputHashes = {
      Person: crypto.randomBytes(16).toString("hex"),
      Transaction: crypto.randomBytes(16).toString("hex"),
    };

    const manifest: ProvenanceManifest = {
      viewName: name,
      refreshTimestamp: timestamp,
      inputHashes,
      queryHash,
      actor: actorId,
      signature: "", // To be signed
      policyCompliance: {
        checked: true,
        violations: [],
      },
    };

    // Sign
    manifest.signature = this.signManifest(manifest);

    // Persist manifest
    await this.pool.query(
      "INSERT INTO ims_manifests (view_name, refresh_timestamp, manifest, signature) VALUES ($1, $2, $3, $4)",
      [name, timestamp, JSON.stringify(manifest), manifest.signature]
    );

    return manifest;
  }

  async getHistory(name: string): Promise<ProvenanceManifest[]> {
    const res = await this.pool.query(
      "SELECT manifest FROM ims_manifests WHERE view_name = $1 ORDER BY refresh_timestamp DESC",
      [name]
    );
    return res.rows.map((row) => row.manifest);
  }

  private signManifest(manifest: Partial<ProvenanceManifest>): string {
    const payload = JSON.stringify({ ...manifest, signature: undefined });
    return crypto.createHmac("sha256", this.secretKey).update(payload).digest("hex");
  }
}
