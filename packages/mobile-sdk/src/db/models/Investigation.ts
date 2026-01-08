import { Model } from "@nozbe/watermelondb";
import { field, date } from "@nozbe/watermelondb/decorators";

export class Investigation extends Model {
  static table = "investigations";

  @field("title") title!: string;
  @field("status") status!: string;
  @field("priority") priority!: string;
  @field("description") description?: string;
  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;
  @field("assigned_to") assignedTo?: string;
}
