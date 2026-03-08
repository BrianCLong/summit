"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DoclingBuildPipeline = void 0;
const crypto_1 = require("crypto");
const DoclingService_js_1 = require("../../services/DoclingService.js");
class DoclingBuildPipeline {
    service;
    constructor(service = DoclingService_js_1.doclingService) {
        this.service = service;
    }
    async execute(input) {
        const requestId = input.requestId ?? (0, crypto_1.randomUUID)();
        const failure = await this.service.summarizeBuildFailure({
            tenantId: input.tenantId,
            buildId: input.buildId,
            requestId: `${requestId}-failure`,
            logText: input.logText,
            retention: input.retention,
            purpose: input.purpose,
        });
        let compliance;
        if (input.sbomText) {
            compliance = await this.service.extractLicenses({
                tenantId: input.tenantId,
                requestId: `${requestId}-sbom`,
                text: input.sbomText,
                retention: input.retention,
                purpose: input.purpose,
                sourceType: 'SBOM',
            });
        }
        let releaseNotes;
        if (input.diffText) {
            releaseNotes = await this.service.generateReleaseNotes({
                tenantId: input.tenantId,
                requestId: `${requestId}-release`,
                diffText: input.diffText,
                retention: input.retention,
                purpose: input.purpose,
            });
        }
        return {
            failure,
            compliance,
            releaseNotes,
        };
    }
}
exports.DoclingBuildPipeline = DoclingBuildPipeline;
