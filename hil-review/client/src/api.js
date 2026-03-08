"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = void 0;
const axios_1 = __importDefault(require("axios"));
const createClient = (actor) => {
    const instance = axios_1.default.create({
        baseURL: '/api',
        headers: actor
            ? {
                'x-user-id': actor.id,
                'x-user-role': actor.role,
                'x-user-name': actor.name || actor.id
            }
            : undefined
    });
    return instance;
};
exports.createClient = createClient;
