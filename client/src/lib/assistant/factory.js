"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeAssistantTransport = makeAssistantTransport;
const transport_1 = require("./transport");
function makeAssistantTransport(mode, opts) {
    if (mode === 'sse')
        return (0, transport_1.createSseTransport)(opts);
    if (mode === 'socket')
        return (0, transport_1.createSocketIoTransport)(opts);
    return (0, transport_1.createFetchStreamTransport)(opts);
}
