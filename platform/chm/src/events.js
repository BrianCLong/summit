"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitEvent = exports.bus = exports.ChmEventBus = void 0;
const eventemitter3_1 = __importDefault(require("eventemitter3"));
class ChmEventBus extends eventemitter3_1.default {
    emitTagApplied(tag) {
        this.emit('chm.tag.applied', tag);
    }
    emitTagDowngraded(previous, downgraded, approvers) {
        this.emit('chm.tag.downgraded', { previous, downgraded, approvers });
    }
    emitViolation(tag, context, message) {
        this.emit('chm.tag.violated', { tag, context, message });
    }
}
exports.ChmEventBus = ChmEventBus;
exports.bus = new ChmEventBus();
const emitEvent = (event, payload) => {
    // @ts-ignore
    exports.bus.emit(event, payload);
};
exports.emitEvent = emitEvent;
