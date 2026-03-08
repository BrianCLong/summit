"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = void 0;
const express_1 = __importDefault(require("express"));
const exec_js_1 = require("./handlers/exec.js");
const artifact_js_1 = require("./handlers/artifact.js");
const service_js_1 = require("./handlers/service.js");
const stream_js_1 = require("./handlers/stream.js");
const attestation_js_1 = require("./handlers/attestation.js");
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use(express_1.default.json());
app.post('/exec', exec_js_1.execHandler);
app.get('/artifacts/:path', artifact_js_1.getArtifactHandler);
app.put('/artifacts/:path', artifact_js_1.putArtifactHandler);
app.post('/service', service_js_1.exposeServiceHandler);
app.get('/stream', stream_js_1.streamEventsHandler);
app.get('/attestation', attestation_js_1.getAttestationHandler);
exports.server = app.listen(port, () => {
    console.log(`SSEL listening at http://localhost:${port}`);
});
