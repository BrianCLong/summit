"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const load_js_1 = require("../src/config/load.js");
console.log('Validating configuration...');
try {
    process.env.CONFIG_VALIDATE_ON_START = 'true';
    const config = (0, load_js_1.loadConfig)();
    console.log('✅ Configuration is valid.');
    process.exit(0);
}
catch (error) {
    console.error('❌ Configuration validation failed:', error);
    process.exit(1);
}
