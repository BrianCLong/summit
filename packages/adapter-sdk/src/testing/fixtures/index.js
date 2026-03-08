"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.basicContext = exports.basicEvent = void 0;
const basic_context_json_1 = __importDefault(require("./basic-context.json"));
const basic_event_json_1 = __importDefault(require("./basic-event.json"));
exports.basicEvent = basic_event_json_1.default;
exports.basicContext = basic_context_json_1.default;
