import fs from "node:fs";
import path from "node:path";

// Mock Registry File
const REGISTRY_FILE = "certification_registry.json";

interface RegistryEntry {
  type: string;
  level: string;
  status: "active" | "revoked" | "expired";
  validUntil: string;
  revocationReason?: string;
  revokedAt?: string;
}

interface Registry {
  entities: Record<string, RegistryEntry>;
}

// Helper to load registry
function loadRegistry(): Registry {
  if (!fs.existsSync(REGISTRY_FILE)) {
    return { entities: {} };
  }
  return JSON.parse(fs.readFileSync(REGISTRY_FILE, "utf-8"));
}

// Helper to save registry
function saveRegistry(registry: Registry) {
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2));
}

function revokeCert(id: string, reason: string) {
  const registry = loadRegistry();

  if (!registry.entities[id]) {
    console.error(`Error: Entity ${id} not found in registry.`);
    process.exit(1);
  }

  const entry = registry.entities[id];

  if (entry.status === "revoked") {
    console.log(`Entity ${id} is already revoked.`);
    return;
  }

  entry.status = "revoked";
  entry.revocationReason = reason;
  entry.revokedAt = new Date().toISOString();

  saveRegistry(registry);
  console.log(`Successfully revoked certification for ${id}. Reason: ${reason}`);
}

// CLI Parsing
const args = process.argv.slice(2);
let id = "";
let reason = "unspecified";

args.forEach((arg) => {
  if (arg.startsWith("--id=")) {
    id = arg.split("=")[1];
  } else if (arg.startsWith("--reason=")) {
    reason = arg.split("=")[1];
  }
});

if (!id) {
  console.log(
    "Usage: npx tsx scripts/certification/revoke_cert.ts --id=<entity_id> --reason=<reason>"
  );

  // Create a dummy registry for testing purposes if it doesn't exist
  if (!fs.existsSync(REGISTRY_FILE)) {
    console.log("Creating dummy registry for testing...");
    const dummyRegistry: Registry = {
      entities: {
        "test.plugin": {
          type: "plugin",
          level: "verified",
          status: "active",
          validUntil: "2099-12-31",
        },
      },
    };
    saveRegistry(dummyRegistry);
    console.log(`Created ${REGISTRY_FILE} with test.plugin`);
  }

  process.exit(1);
}

revokeCert(id, reason);
