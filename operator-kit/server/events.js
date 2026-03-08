"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventsRouter = exports.opsBus = void 0;
exports.emit = emit;
const express_1 = __importDefault(require("express"));
const events_1 = require("events");
exports.opsBus = new events_1.EventEmitter();
exports.eventsRouter = express_1.default.Router();
exports.eventsRouter.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    const onEvt = (evt) => {
        res.write(`event:${evt.type}\n`);
        res.write(`data:${JSON.stringify(evt)}\n\n`);
    };
    exports.opsBus.on('event', onEvt);
    const emit = (e) => exports.opsBus.emit('event', e);
    // Send a hello
    emit({ type: 'policy.update', policy_hash: 'init', at: Date.now() });
    req.on('close', () => {
        exports.opsBus.off('event', onEvt);
        res.end();
    });
});
function emit(evt) {
    exports.opsBus.emit('event', evt);
}
