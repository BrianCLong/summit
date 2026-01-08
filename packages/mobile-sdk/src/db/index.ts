import { Database } from "@nozbe/watermelondb";
import { schema } from "./schema";
import { Entity, Investigation, Alert, GEOINTFeature, SyncQueueItem } from "./models";

// Export schema and models for consumption by apps
export { schema } from "./schema";
export * from "./models";

// Database setup helper
export const createDatabase = (adapter: any) => {
  return new Database({
    adapter,
    modelClasses: [Entity, Investigation, Alert, GEOINTFeature, SyncQueueItem],
  });
};
