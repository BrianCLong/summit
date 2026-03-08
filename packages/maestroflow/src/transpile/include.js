"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.includeComponent = includeComponent;
const fs_1 = __importDefault(require("fs"));
function includeComponent(pathOrRef) {
    const j = JSON.parse(fs_1.default.readFileSync(pathOrRef, 'utf8'));
    return j.jobs; // caller merges into GH/Tekton/Argo
}
