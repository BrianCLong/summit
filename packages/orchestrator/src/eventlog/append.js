"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.appendEvent = appendEvent;
const fs_extra_1 = __importDefault(require("fs-extra"));
async function appendEvent(logPath, evt) {
    const line = JSON.stringify(evt);
    await fs_extra_1.default.appendFile(logPath, line + '\n');
}
