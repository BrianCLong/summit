import { appSchema, tableSchema } from "@nozbe/watermelondb";

export enum TableName {
  ENTITIES = "entities",
  INVESTIGATIONS = "investigations",
  ALERTS = "alerts",
  GEOINT_FEATURES = "geoint_features",
  SYNC_QUEUE = "sync_queue",
}

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: TableName.ENTITIES,
      columns: [
        { name: "name", type: "string" },
        { name: "type", type: "string" },
        { name: "description", type: "string", isOptional: true },
        { name: "properties_json", type: "string" },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
        { name: "last_seen", type: "number", isOptional: true },
        { name: "is_target", type: "boolean" },
      ],
    }),
    tableSchema({
      name: TableName.INVESTIGATIONS,
      columns: [
        { name: "title", type: "string" },
        { name: "status", type: "string" },
        { name: "priority", type: "string" },
        { name: "description", type: "string", isOptional: true },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
        { name: "assigned_to", type: "string", isOptional: true },
      ],
    }),
    tableSchema({
      name: TableName.ALERTS,
      columns: [
        { name: "title", type: "string" },
        { name: "description", type: "string" },
        { name: "type", type: "string" },
        { name: "priority", type: "string" },
        { name: "source", type: "string" },
        { name: "is_read", type: "boolean" },
        { name: "timestamp", type: "number" },
        { name: "metadata_json", type: "string", isOptional: true },
      ],
    }),
    tableSchema({
      name: TableName.GEOINT_FEATURES,
      columns: [
        { name: "type", type: "string" },
        { name: "geometry_json", type: "string" },
        { name: "properties_json", type: "string" },
        { name: "timestamp", type: "number" },
      ],
    }),
    tableSchema({
      name: TableName.SYNC_QUEUE,
      columns: [
        { name: "operation", type: "string" },
        { name: "variables_json", type: "string" },
        { name: "status", type: "string" },
        { name: "error", type: "string", isOptional: true },
        { name: "retry_count", type: "number" },
        { name: "created_at", type: "number" },
      ],
    }),
  ],
});
