"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSocket = createSocket;
const socket_io_client_1 = require("socket.io-client");
function createSocket() {
    // Stub without real connection
    return (0, socket_io_client_1.io)('', { autoConnect: false });
}
