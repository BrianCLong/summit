"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const connector_js_1 = require("@intelgraph/connector-js");
class RestConnector extends connector_js_1.BaseConnector {
    url;
    constructor(url) {
        super();
        this.url = url;
    }
    async run(ctx) {
        const res = await fetch(this.url);
        const data = await res.json();
        for (const item of data) {
            ctx.emit(item);
        }
    }
}
const connector = new RestConnector(process.argv[2]);
const emit = (0, connector_js_1.createEmitter)(process.stdout);
connector.run({ emit });
