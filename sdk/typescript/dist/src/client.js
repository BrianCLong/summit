"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = void 0;
const generated_1 = require("../sdk/ts/src/generated");
const axios_1 = __importDefault(require("axios"));
const createClient = (baseURL, token) => {
    // Configure the default axios instance
    axios_1.default.defaults.baseURL = baseURL;
    if (token) {
        axios_1.default.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    else {
        delete axios_1.default.defaults.headers.common['Authorization'];
    }
    // Return the generated API functions
    return (0, generated_1.getMaestroOrchestrationAPI)();
};
exports.createClient = createClient;
