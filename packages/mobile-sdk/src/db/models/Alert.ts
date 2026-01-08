import { Model } from "@nozbe/watermelondb";
import { field, date } from "@nozbe/watermelondb/decorators";

export class Alert extends Model {
  static table = "alerts";

  @field("title") title!: string;
  @field("description") description!: string;
  @field("type") type!: string;
  @field("priority") priority!: string;
  @field("source") source!: string;
  @field("is_read") isRead!: boolean;
  @date("timestamp") timestamp!: Date;
  @field("metadata_json") metadataJson?: string;

  get metadata() {
    return this.metadataJson ? JSON.parse(this.metadataJson) : null;
  }

  set metadata(value: any) {
    this.metadataJson = JSON.stringify(value);
  }
}
