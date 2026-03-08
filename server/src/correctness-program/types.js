"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newIdentifier = void 0;
const crypto_1 = require("crypto");
const newIdentifier = () => (0, crypto_1.randomUUID)();
exports.newIdentifier = newIdentifier;
