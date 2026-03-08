"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalize = canonicalize;
exports.sha256 = sha256;
const fast_json_stable_stringify_1 = __importDefault(require("fast-json-stable-stringify"));
const crypto_1 = __importDefault(require("crypto"));
function canonicalize(obj) {
    return (0, fast_json_stable_stringify_1.default)(obj);
}
function sha256(data) {
    return crypto_1.default.createHash('sha256').update(data).digest('hex');
}
