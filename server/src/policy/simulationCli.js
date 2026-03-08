"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tenantBundle_js_1 = require("./tenantBundle.js");
(0, tenantBundle_js_1.runPolicySimulationCli)().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
