"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const ajv_1 = __importDefault(require("ajv"));
const ajv = new ajv_1.default();
const spec = JSON.parse(JSON.stringify(require('js-yaml').load(fs_1.default.readFileSync('.maestro/changespec.schema.yml', 'utf8'))));
const data = require('js-yaml').load(fs_1.default.readFileSync('.changespec.yml', 'utf8'));
if (!ajv.validate(spec, data)) {
    console.error(ajv.errors);
    process.exit(1);
}
console.log('changespec ok');
