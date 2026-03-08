"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.receiptSchema = exports.RECEIPT_SCHEMA_VERSION = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Load schema from local package or fallback gracefully
let schema = {};
try {
    const schemaPath = path_1.default.resolve(__dirname, '../schema/receipt.schema.json');
    schema = JSON.parse(fs_1.default.readFileSync(schemaPath, 'utf-8'));
}
catch {
    // Schema loading is optional for runtime type definitions
    schema = { type: 'object' };
}
exports.RECEIPT_SCHEMA_VERSION = '0.1';
exports.receiptSchema = schema;
