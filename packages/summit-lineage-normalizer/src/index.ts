export interface OpenLineageDataset {
  namespace: string;
  name: string;
  facets?: Record<string, any>;
}

export interface OTelSpanAttributes {
  [key: string]: any;
}

/**
 * Normalizes OpenTelemetry span attributes into OpenLineage Dataset namespace and name.
 * Adheres to standard mapping as per canonical guidelines.
 */
export function normalizeDataset(attrs: OTelSpanAttributes): OpenLineageDataset {
  let namespace = "";
  let name = "";

  // Database mapping
  if (attrs["db.system"]) {
    // Construct namespace
    const host = attrs["net.peer.name"] || attrs["server.address"] || attrs["db.connection_string"] || "localhost";
    const dbName = attrs["db.name"] ? `/${attrs["db.name"]}` : "";

    // In many OTel setups, connection string might be full, but for simplicity let's build from pieces
    if (attrs["db.connection_string"] && !attrs["net.peer.name"] && !attrs["server.address"]) {
      // Very basic URL parsing or raw connection string usage if desired, but typically we want a clean URI
      namespace = `${attrs["db.system"]}://${attrs["db.connection_string"]}`;
    } else {
      namespace = `${attrs["db.system"]}://${host}${dbName}`;
    }

    // Determine name
    name = attrs["db.sql.table"] || attrs["db.cassandra.table"] || attrs["db.mongodb.collection"] || attrs["db.redis.database_index"] || attrs["db.namespace"] || "unknown_table";

  }
  // Messaging mapping
  else if (attrs["messaging.system"]) {
    const system = attrs["messaging.system"];
    const url = attrs["messaging.url"] || attrs["net.peer.name"] || attrs["server.address"] || "unknown_broker";
    namespace = `${system}://${url}`;

    name = attrs["messaging.destination"] || attrs["messaging.destination.name"] || "unknown_topic";
  }
  // File mapping (S3 / generic file)
  else if (attrs["file.path"]) {
    const path = attrs["file.path"];
    if (path.startsWith("s3://") || path.startsWith("gs://") || path.startsWith("abs://")) {
      try {
        const url = new URL(path);
        namespace = `${url.protocol}//${url.hostname}`;
        name = url.pathname.replace(/^\/+/, "");
      } catch (e) {
        namespace = "file://";
        name = path;
      }
    } else {
      namespace = "file://localhost";
      name = path;
    }
  } else {
    throw new Error("Cannot normalize dataset: Missing required OTel semantic attributes for db, messaging, or file.");
  }

  // Final sanitization to prevent empties or spaces
  namespace = namespace.trim();
  name = name.trim();

  if (!namespace || namespace.includes(" ")) {
    throw new Error(`Invalid namespace derived: '${namespace}'`);
  }
  if (!name || name.includes(" ")) {
    throw new Error(`Invalid name derived: '${name}'`);
  }

  return { namespace, name };
}

/**
 * Validates the core OpenLineage event shape to ensure CI gates pass.
 */
export function validateOpenLineageEvent(event: any): boolean {
  if (!event || typeof event !== "object") return false;

  const validTypes = ["START", "COMPLETE", "FAIL"];
  if (!validTypes.includes(event.eventType)) return false;

  // Run Correlation Check
  if (!event.run || !event.run.runId) return false;
  // Basic UUID format check
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(event.run.runId)) return false;

  // Producer / Agent attribution Check
  if (!event.producer || typeof event.producer !== "string") return false;

  const hasJobNameAndNamespace = event.job && typeof event.job.namespace === "string" && typeof event.job.name === "string";
  if (!hasJobNameAndNamespace) return false;

  // Version facet check for write/produce (assume write if outputs exist)
  if (Array.isArray(event.outputs) && event.outputs.length > 0) {
      for (const output of event.outputs) {
          if (!output.facets?.version?.datasetVersion) {
              return false;
          }
      }
  }

  return true;
}
