"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiptSchema = exports.Ledger = void 0;
const ledger_js_1 = require("./ledger.js");
Object.defineProperty(exports, "Ledger", { enumerable: true, get: function () { return ledger_js_1.Ledger; } });
const receipt_v0_1_json_1 = __importDefault(require("./schema/receipt.v0.1.json"));
exports.ReceiptSchema = receipt_v0_1_json_1.default;
