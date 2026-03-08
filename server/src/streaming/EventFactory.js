"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventFactory = void 0;
const uuid_1 = require("uuid");
class EventFactory {
    static createEvent(type, source, data, subject) {
        return {
            specversion: '1.0',
            type,
            source,
            subject,
            id: (0, uuid_1.v4)(),
            time: new Date().toISOString(),
            datacontenttype: 'application/json',
            data,
        };
    }
}
exports.EventFactory = EventFactory;
