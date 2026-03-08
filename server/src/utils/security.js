"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateArtifactId = validateArtifactId;
const path_1 = __importDefault(require("path"));
function validateArtifactId(artifactId) {
    if (!artifactId)
        return true;
    // Ensure it is a simple filename with no path components
    return path_1.default.basename(artifactId) === artifactId;
}
