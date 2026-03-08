"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeClient = void 0;
const graphql_ws_1 = require("graphql-ws");
const ws_1 = __importDefault(require("ws"));
class RealtimeClient {
    client;
    constructor(url, token) {
        this.client = (0, graphql_ws_1.createClient)({
            url,
            webSocketImpl: ws_1.default,
            connectionParams: {
                Authorization: `Bearer ${token}`,
            },
        });
    }
    subscribe(query, variables, onNext, onError) {
        return this.client.subscribe({ query, variables }, {
            next: onNext,
            error: onError,
            complete: () => { },
        });
    }
}
exports.RealtimeClient = RealtimeClient;
