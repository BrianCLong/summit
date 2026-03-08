"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Entity = void 0;
const watermelondb_1 = require("@nozbe/watermelondb");
const decorators_1 = require("@nozbe/watermelondb/decorators");
class Entity extends watermelondb_1.Model {
    static table = 'entities';
    @(0, decorators_1.field)('name')
    name;
    @(0, decorators_1.field)('type')
    type;
    @(0, decorators_1.field)('description')
    description;
    @(0, decorators_1.field)('properties_json')
    propertiesJson;
    @(0, decorators_1.date)('created_at')
    createdAt;
    @(0, decorators_1.date)('updated_at')
    updatedAt;
    @(0, decorators_1.date)('last_seen')
    lastSeen;
    @(0, decorators_1.field)('is_target')
    isTarget;
    get properties() {
        return JSON.parse(this.propertiesJson);
    }
    set properties(value) {
        this.propertiesJson = JSON.stringify(value);
    }
}
exports.Entity = Entity;
