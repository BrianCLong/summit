#!/usr/bin/env ts-node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const flags = JSON.parse(JSON.stringify(require('../feature-flags/flags.yaml')));
const [name, value] = process.argv.slice(2);
if (!flags.features[name])
    throw new Error('Unknown flag');
flags.features[name].default = value === 'true';
fs_1.default.writeFileSync('feature-flags/flags.yaml', flags);
console.log(`Set ${name}=${value}`);
