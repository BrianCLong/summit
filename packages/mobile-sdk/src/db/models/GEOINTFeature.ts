import { Model } from "@nozbe/watermelondb";
import { field, date } from "@nozbe/watermelondb/decorators";

export class GEOINTFeature extends Model {
  static table = "geoint_features";

  @field("type") type!: string;
  @field("geometry_json") geometryJson!: string;
  @field("properties_json") propertiesJson!: string;
  @date("timestamp") timestamp!: Date;

  get geometry() {
    return JSON.parse(this.geometryJson);
  }

  set geometry(value: any) {
    this.geometryJson = JSON.stringify(value);
  }

  get properties() {
    return JSON.parse(this.propertiesJson);
  }

  set properties(value: any) {
    this.propertiesJson = JSON.stringify(value);
  }
}
