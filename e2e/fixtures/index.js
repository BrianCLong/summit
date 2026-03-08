"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expect = exports.test = void 0;
const test_1 = require("@playwright/test");
Object.defineProperty(exports, "expect", { enumerable: true, get: function () { return test_1.expect; } });
const auth_1 = require("./auth");
const osint_fixtures_1 = require("./osint-fixtures");
// Combine fixtures
// We explicitly type the extended test so consumers get proper types
exports.test = test_1.test.extend({
    ...auth_1.authFixtures,
    ...osint_fixtures_1.osintFixtures,
});
