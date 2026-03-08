"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_js_1 = require("./app.js");
const start = async () => {
    const app = await (0, app_js_1.buildApp)();
    app.log.level = 'info';
    try {
        await app.listen({ port: 8081, host: '0.0.0.0' });
    }
    catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};
start();
