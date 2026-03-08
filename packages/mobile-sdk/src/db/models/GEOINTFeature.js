"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GEOINTFeature = void 0;
const watermelondb_1 = require("@nozbe/watermelondb");
const decorators_1 = require("@nozbe/watermelondb/decorators");
class GEOINTFeature extends watermelondb_1.Model {
    static table = 'geoint_features';
    @(0, decorators_1.field)('type')
    type;
    @(0, decorators_1.field)('geometry_json')
    geometryJson;
    @(0, decorators_1.field)('properties_json')
    propertiesJson;
    @(0, decorators_1.date)('timestamp')
    timestamp;
    get geometry() {
        return JSON.parse(this.geometryJson);
    }
    set geometry(value) {
        this.geometryJson = JSON.stringify(value);
    }
    get properties() {
        return JSON.parse(this.propertiesJson);
    }
    set properties(value) {
        this.propertiesJson = JSON.stringify(value);
    }
}
exports.GEOINTFeature = GEOINTFeature;
