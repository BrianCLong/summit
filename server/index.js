"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_js_1 = __importDefault(require("./server.js"));
const PORT = process.env.PORT || 8080;
server_js_1.default.listen(PORT, () => {
    console.log(`Maestro server listening on port ${PORT}`);
});
