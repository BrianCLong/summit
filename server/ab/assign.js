"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bucket = bucket;
const imurmurhash_1 = __importDefault(require("imurmurhash"));
function bucket(userId, exp) {
    const h = (0, imurmurhash_1.default)(userId + ':' + exp).result() % 10000;
    return h / 100 < 10 ? 'B' : 'A'; // 10% to B
}
