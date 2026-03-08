"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ol = void 0;
exports.emitRun = emitRun;
const openlineage_client_1 = require("openlineage-client");
const olUrl = process.env.OL_URL;
const olToken = process.env.OL_TOKEN;
if (!olUrl) {
    throw new Error('OL_URL environment variable is required');
}
if (!olToken) {
    throw new Error('OL_TOKEN environment variable is required');
}
exports.ol = new openlineage_client_1.OpenLineageClient({
    url: olUrl,
    apiKey: olToken,
});
function emitRun(_job, _inputs, _outputs) {
    /* emit start/complete with datasets */
}
