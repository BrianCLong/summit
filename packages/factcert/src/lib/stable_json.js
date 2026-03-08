"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stableJson = stableJson;
const fast_json_stable_stringify_1 = __importDefault(require("fast-json-stable-stringify"));
/**
 * Deterministically stringify a JSON object.
 * Keys are sorted.
 * @param data The data to stringify.
 * @returns The stable JSON string.
 */
function stableJson(data) {
    if (data === undefined) {
        return ''; // Or throw error? For now empty string seems safe for hashing empty.
    }
    return (0, fast_json_stable_stringify_1.default)(data);
}
