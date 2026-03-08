"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fast_check_1 = __importDefault(require("fast-check"));
const strings_1 = require("../lib/strings");
test('normalize is idempotent', () => {
    fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.string(), (s) => (0, strings_1.normalize)((0, strings_1.normalize)(s)) === (0, strings_1.normalize)(s)));
});
