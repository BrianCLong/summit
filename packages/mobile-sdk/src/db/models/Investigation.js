"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Investigation = void 0;
const watermelondb_1 = require("@nozbe/watermelondb");
const decorators_1 = require("@nozbe/watermelondb/decorators");
class Investigation extends watermelondb_1.Model {
    static table = 'investigations';
    @(0, decorators_1.field)('title')
    title;
    @(0, decorators_1.field)('status')
    status;
    @(0, decorators_1.field)('priority')
    priority;
    @(0, decorators_1.field)('description')
    description;
    @(0, decorators_1.date)('created_at')
    createdAt;
    @(0, decorators_1.date)('updated_at')
    updatedAt;
    @(0, decorators_1.field)('assigned_to')
    assignedTo;
}
exports.Investigation = Investigation;
