"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.previewStreamHub = void 0;
const events_1 = require("events");
class PreviewStreamHub {
    emitter = new events_1.EventEmitter();
    constructor() {
        this.emitter.setMaxListeners(100);
    }
    publish(previewId, payload) {
        this.emitter.emit(previewId, payload);
    }
    subscribe(previewId, listener) {
        this.emitter.on(previewId, listener);
        return () => {
            this.emitter.off(previewId, listener);
        };
    }
}
exports.previewStreamHub = new PreviewStreamHub();
