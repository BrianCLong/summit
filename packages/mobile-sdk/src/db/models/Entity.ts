import { Model } from "@nozbe/watermelondb";
import { field, date, json, readonly } from "@nozbe/watermelondb/decorators";

export class Entity extends Model {
  static table = "entities";

  @field("name") name!: string;
  @field("type") type!: string;
  @field("description") description?: string;
  @field("properties_json") propertiesJson!: string;
  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;
  @date("last_seen") lastSeen?: Date;
  @field("is_target") isTarget!: boolean;

  get properties() {
    return JSON.parse(this.propertiesJson);
  }

  set properties(value: any) {
    this.propertiesJson = JSON.stringify(value);
  }
}
