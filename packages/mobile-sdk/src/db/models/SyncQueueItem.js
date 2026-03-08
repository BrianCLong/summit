"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncQueueItem = void 0;
const watermelondb_1 = require("@nozbe/watermelondb");
const decorators_1 = require("@nozbe/watermelondb/decorators");
class SyncQueueItem extends watermelondb_1.Model {
    static table = 'sync_queue';
    @(0, decorators_1.field)('operation')
    operation;
    @(0, decorators_1.field)('variables_json')
    variablesJson;
    @(0, decorators_1.field)('status')
    status;
    @(0, decorators_1.field)('error')
    error;
    @(0, decorators_1.field)('retry_count')
    retryCount;
    @(0, decorators_1.date)('created_at')
    createdAt;
    get variables() {
        return JSON.parse(this.variablesJson);
    }
    set variables(value) {
        this.variablesJson = JSON.stringify(value);
    }
}
exports.SyncQueueItem = SyncQueueItem;
