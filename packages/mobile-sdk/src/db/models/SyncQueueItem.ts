import { Model } from "@nozbe/watermelondb";
import { field, date } from "@nozbe/watermelondb/decorators";

export class SyncQueueItem extends Model {
  static table = "sync_queue";

  @field("operation") operation!: string;
  @field("variables_json") variablesJson!: string;
  @field("status") status!: "pending" | "syncing" | "failed";
  @field("error") error?: string;
  @field("retry_count") retryCount!: number;
  @date("created_at") createdAt!: Date;

  get variables() {
    return JSON.parse(this.variablesJson);
  }

  set variables(value: any) {
    this.variablesJson = JSON.stringify(value);
  }
}
