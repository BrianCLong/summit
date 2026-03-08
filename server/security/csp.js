"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.csp = void 0;
const helmet_1 = __importDefault(require("helmet"));
exports.csp = helmet_1.default.contentSecurityPolicy({
    useDefaults: true,
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'strict-dynamic'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        requireTrustedTypesFor: ["'script'"],
    },
});
