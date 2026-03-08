"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
const server_1 = __importDefault(require("../../server/server")); // Import the actual app instance
async function createServer() {
    return server_1.default; // Return the actual app instance
}
