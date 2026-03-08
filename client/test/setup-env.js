"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Optional DOM matchers if @testing-library is present
try {
    require('@testing-library/jest-dom');
}
catch { }
// TextEncoder/Decoder shim (mostly redundant on Node 20 but safe)
const util_1 = require("util");
global.TextEncoder ??= util_1.TextEncoder;
global.TextDecoder ??= util_1.TextDecoder;
