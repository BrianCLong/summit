"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertBroker = void 0;
const events_1 = require("events");
class AlertBroker {
    emitter = new events_1.EventEmitter();
    publish(alert) {
        this.emitter.emit('alert', alert);
    }
    subscribe(handler) {
        this.emitter.on('alert', handler);
        return () => this.emitter.off('alert', handler);
    }
}
exports.AlertBroker = AlertBroker;
