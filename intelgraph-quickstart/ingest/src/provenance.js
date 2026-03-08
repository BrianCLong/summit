"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashRow = void 0;
const sha256_1 = __importDefault(require("crypto-js/sha256"));
const hashRow = (row) => (0, sha256_1.default)(JSON.stringify(row)).toString();
exports.hashRow = hashRow;
