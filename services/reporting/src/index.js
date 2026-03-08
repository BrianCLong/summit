"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const worker_js_1 = require("./worker.js");
const server_js_1 = require("./server.js");
const renderer_js_1 = require("./renderer.js");
async function main() {
    const worker = (0, worker_js_1.startWorker)();
    (0, server_js_1.startServer)();
    const shutdown = async () => {
        console.log('Shutting down...');
        await worker.close();
        await (0, renderer_js_1.closeBrowser)();
        process.exit(0);
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}
main().catch(console.error);
