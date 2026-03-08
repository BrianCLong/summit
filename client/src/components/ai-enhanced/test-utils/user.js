"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withUser = withUser;
const user_event_1 = __importDefault(require("@testing-library/user-event"));
async function withUser(fn) {
    const u = user_event_1.default.setup();
    await fn(u);
}
