import { v4 as uuidv4 } from "uuid";
import { APIRequestContext } from "@playwright/test";

/**
 * A canary marker is a hidden piece of data that should only appear in search
 * results for a specific tenant.
 */
interface CanaryMarker {
  tenantId: string;
  canary: string;
}

/**
 * Represents a document to be indexed for a tenant.
 */
export interface TenantDocument {
  id: string;
  tenantId: string;
  title: string;
  text: string;
  canary: string; // Hidden canary marker
}

/**
 * Generates a canary marker for a tenant.
 * @param tenantId The ID of the tenant.
 * @returns A canary marker object.
 */
function createCanaryMarker(tenantId: string): CanaryMarker {
  return {
    tenantId,
    canary: `canary_${tenantId}_${uuidv4()}`,
  };
}

/**
 * Generates a set of nearly identical documents for two tenants, each with a
 * unique canary marker.
 *
 * @param tenant1Id The ID of the first tenant.
 * @param tenant2Id The ID of the second tenant.
 * @returns An array of documents for both tenants.
 */
export function generateSeedDocuments(tenant1Id: string, tenant2Id: string): TenantDocument[] {
  const canary1 = createCanaryMarker(tenant1Id);
  const canary2 = createCanaryMarker(tenant2Id);

  return [
    {
      id: `doc-1-${tenant1Id}`,
      tenantId: tenant1Id,
      title: "Graph security analytics pipeline",
      text: "Building resilient graph analytics for intelligence teams.",
      canary: canary1.canary,
    },
    {
      id: `doc-1-${tenant2Id}`,
      tenantId: tenant2Id,
      title: "Graph security analytics pipeline",
      text: "Building resilient graph analytics for intelligence teams.",
      canary: canary2.canary,
    },
    {
      id: `doc-2-${tenant1Id}`,
      tenantId: tenant1Id,
      title: "AI copilot suggestions for analysts",
      text: "Predictive query suggestions and behavioral analytics.",
      canary: canary1.canary,
    },
    {
      id: `doc-2-${tenant2Id}`,
      tenantId: tenant2Id,
      title: "AI copilot suggestions for analysts",
      text: "Predictive query suggestions and behavioral analytics.",
      canary: canary2.canary,
    },
  ];
}

/**
 * Seeds the generated documents into the search index.
 * @param request The Playwright request context.
 * @param documents The documents to seed.
 */
export async function seedSearchData(
  request: APIRequestContext,
  documents: TenantDocument[]
): Promise<void> {
  const events = documents.map((doc, i) => ({
    sequence: i + 1,
    action: "upsert",
    document: doc,
  }));

  const response = await request.post("http://localhost:8000/search/reindex/events", {
    data: { events },
  });

  if (!response.ok()) {
    throw new Error(`Failed to seed search data: ${await response.text()}`);
  }
}
