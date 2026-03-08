"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Alert = void 0;
const watermelondb_1 = require("@nozbe/watermelondb");
const decorators_1 = require("@nozbe/watermelondb/decorators");
class Alert extends watermelondb_1.Model {
    static table = 'alerts';
    @(0, decorators_1.field)('title')
    title;
    @(0, decorators_1.field)('description')
    description;
    @(0, decorators_1.field)('type')
    type;
    @(0, decorators_1.field)('priority')
    priority;
    @(0, decorators_1.field)('source')
    source;
    @(0, decorators_1.field)('is_read')
    isRead;
    @(0, decorators_1.date)('timestamp')
    timestamp;
    @(0, decorators_1.field)('metadata_json')
    metadataJson;
    get metadata() {
        return this.metadataJson ? JSON.parse(this.metadataJson) : null;
    }
    set metadata(value) {
        this.metadataJson = JSON.stringify(value);
    }
}
exports.Alert = Alert;
