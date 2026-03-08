"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setEmitter = setEmitter;
exports.emit = emit;
let emitter = null;
function setEmitter(handler) {
    emitter = handler;
}
async function emit(topic, msg) {
    if (!emitter) {
        return;
    }
    await emitter.emit(topic, msg);
}
