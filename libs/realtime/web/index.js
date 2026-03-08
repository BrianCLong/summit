"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebRealtimeClient = void 0;
const graphql_ws_1 = require("graphql-ws");
class WebRealtimeClient {
    client;
    constructor(url, token) {
        this.client = (0, graphql_ws_1.createClient)({
            url,
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
exports.WebRealtimeClient = WebRealtimeClient;
