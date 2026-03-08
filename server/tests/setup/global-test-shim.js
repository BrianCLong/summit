"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Globally expose test functions for tsx execution
global.test = globals_1.test;
global.expect = globals_1.expect;
global.describe = globals_1.describe;
global.beforeEach = globals_1.beforeEach;
global.afterEach = globals_1.afterEach;
