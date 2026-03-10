import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ServerDescriptor = z.object({
  serverId: z.string().min(1),
  tenantVisibility: z.array(z.string()).default([]),
  transport: z.enum(["stdio", "http", "sse"]).optional(),
  authModel: z.enum(["none", "bearer", "oauth2", "mTLS"]).optional(),
  tools: z.array(z.object({
    name: z.string(),
    description: z.string().default(""),
    capabilityTags: z.array(z.string()).default([]),
    riskTags: z.array(z.string()).default([]),
    inputSchemaHash: z.string().optional(),
  })).default([]),
  resources: z.array(z.object({ uri: z.string(), mimeType: z.string().optional() })).default([]),
  prompts: z.array(z.object({ name: z.string() })).default([]),
});

function checkRegistry() {
    console.log("Validating mock registry snapshot...");
    try {
        const snapshotPath = path.join(__dirname, '../../reports/mcp/registry.snapshot.json');
        if (!fs.existsSync(snapshotPath)) {
            console.warn("No snapshot found. Skipping check.");
            process.exit(0);
        }

        const data = fs.readFileSync(snapshotPath, 'utf8');
        const snapshot = JSON.parse(data);

        for (const item of snapshot) {
            ServerDescriptor.parse(item);
        }
        console.log("Registry snapshot validation passed.");
    } catch (e) {
        console.error("Registry validation failed:", e);
        process.exit(1);
    }
}

checkRegistry();
