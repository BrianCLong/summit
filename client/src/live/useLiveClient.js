"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useLiveClient = useLiveClient;
const socket_io_client_1 = __importDefault(require("socket.io-client"));
const jquery_1 = __importDefault(require("jquery"));
/**
 * useLiveClient sets up a Socket.IO client for the "/live" namespace and
 * bridges jQuery DOM events with socket messages. React components can invoke
 * jQuery triggers such as `$(document).trigger('ig:graph:ops', batch)` to send
 * events without directly depending on the socket instance.
 */
function useLiveClient(workspaceId, token) {
    const socket = (0, socket_io_client_1.default)('/live', { auth: { workspaceId, token } });
    // outbound events
    (0, jquery_1.default)(document).on('ig:presence:update', (_e, data) => socket.emit('presence:update', data));
    (0, jquery_1.default)(document).on('ig:graph:ops', (_e, batch) => socket.emit('graph:ops', batch));
    (0, jquery_1.default)(document).on('ig:comment:add', (_e, payload) => socket.emit('comment:add', payload));
    // inbound events
    socket.on('presence:update', (p) => (0, jquery_1.default)(document).trigger('ig:presence:inbound', [p]));
    socket.on('graph:commit', (ops) => (0, jquery_1.default)(document).trigger('ig:graph:commit', [ops]));
    socket.on('comment:new', (c) => (0, jquery_1.default)(document).trigger('ig:comment:inbound', [c]));
    return socket;
}
