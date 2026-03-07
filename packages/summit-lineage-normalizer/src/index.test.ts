import { normalizeDataset, validateOpenLineageEvent, normalizeDuration } from "./index.js";

describe("summit-lineage-normalizer", () => {
  it("normalizes postgresql attributes", () => {
    const dataset = normalizeDataset({
      "db.system": "postgresql",
      "server.address": "orders-prod",
      "db.name": "public",
      "db.sql.table": "line_items"
    });
    expect(dataset.namespace).toBe("postgresql://orders-prod/public");
    expect(dataset.name).toBe("line_items");
  });

  it("normalizes new semantic conventions for database", () => {
    const dataset = normalizeDataset({
      "db.system": "mongodb",
      "server.address": "mongo-prod",
      "db.namespace": "admin",
      "db.collection.name": "users"
    });
    expect(dataset.namespace).toBe("mongodb://mongo-prod/admin");
    expect(dataset.name).toBe("users");
  });

  it("normalizes kafka attributes", () => {
    const dataset = normalizeDataset({
      "messaging.system": "kafka",
      "net.peer.name": "use1",
      "messaging.destination": "orders_topic"
    });
    expect(dataset.namespace).toBe("kafka://use1");
    expect(dataset.name).toBe("orders_topic");
  });

  it("normalizes new semantic conventions for messaging", () => {
    const dataset = normalizeDataset({
      "messaging.system": "kafka",
      "server.address": "use1",
      "messaging.destination.name": "events_topic"
    });
    expect(dataset.namespace).toBe("kafka://use1");
    expect(dataset.name).toBe("events_topic");
  });

  it("normalizes s3 attributes", () => {
    const dataset = normalizeDataset({
      "file.path": "s3://bucket/key/path"
    });
    expect(dataset.namespace).toBe("s3://bucket");
    expect(dataset.name).toBe("key/path");
  });

  it("normalizes duration metrics in seconds to milliseconds", () => {
    const attrs = {
      "http.server.request.duration": 0.05, // 50ms
      "rpc.server.duration": 1.25 // 1250ms
    };
    normalizeDuration(attrs);

    expect(attrs["http.server.request.duration_ms"]).toBe(50);
    expect(attrs["http.server.duration"]).toBe(50); // Legacy fallback

    expect(attrs["rpc.server.duration_ms"]).toBe(1250);
  });

  it("validates valid open lineage event", () => {
    const validEvent = {
      "eventType": "START",
      "run": { "runId": "123e4567-e89b-12d3-a456-426614174000", "facets": { "nominalTime": {} } },
      "job":  { "namespace": "svc-namespace", "name": "job-name" },
      "inputs":  [{ "namespace": "pg://test", "name": "t1" , "facets": { "version": { "datasetVersion": "hash1" } } }],
      "outputs": [{ "namespace": "pg://test", "name": "t2" , "facets": { "version": { "datasetVersion": "hash2" } } }],
      "producer": "urn:svc:summit.switchboard@1.0.0"
    };
    expect(validateOpenLineageEvent(validEvent)).toBe(true);
  });

  it("rejects invalid open lineage event - missing version output", () => {
    const invalidEvent = {
      "eventType": "COMPLETE",
      "run": { "runId": "123e4567-e89b-12d3-a456-426614174000", "facets": { "nominalTime": {} } },
      "job":  { "namespace": "svc-namespace", "name": "job-name" },
      "inputs":  [{ "namespace": "pg://test", "name": "t1" }],
      "outputs": [{ "namespace": "pg://test", "name": "t2" }], // Missing version
      "producer": "urn:svc:summit.switchboard@1.0.0"
    };
    expect(validateOpenLineageEvent(invalidEvent)).toBe(false);
  });
});
