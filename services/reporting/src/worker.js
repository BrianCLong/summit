"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWorker = startWorker;
const bullmq_1 = require("bullmq");
const renderer_js_1 = require("./renderer.js");
const templates_js_1 = require("./templates.js");
const storage_js_1 = require("./storage.js");
const security_js_1 = require("./security.js");
const merger_js_1 = require("./merger.js");
const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};
function startWorker() {
    const worker = new bullmq_1.Worker('report-generation', async (job) => {
        console.log(`Processing job ${job.id}`);
        const { templateId, version, data, options } = job.data;
        const classification = job.data.classification || 'unclassified';
        const template = await (0, templates_js_1.loadTemplate)(templateId, version);
        let finalPdfBuffer;
        // Check for chunking strategy
        if (data.sections && data.sections.length > 10) {
            // Large report: Render sections individually and merge
            console.log(`Job ${job.id}: Large report detected (${data.sections.length} sections). processing chunks.`);
            const pdfSections = [];
            // Render chunks sequentially to save memory
            for (let i = 0; i < data.sections.length; i++) {
                const section = data.sections[i];
                // Create a partial data object for the section
                const sectionData = { ...data, sections: [section], isChunk: true, chunkIndex: i };
                const html = template.render(sectionData);
                const buffer = await (0, renderer_js_1.renderPdf)(html, options);
                pdfSections.push({ buffer, title: section.title || `Section ${i + 1}` });
            }
            finalPdfBuffer = await (0, merger_js_1.mergePdfs)(pdfSections);
        }
        else {
            // Simple report
            const html = template.render(data);
            finalPdfBuffer = await (0, renderer_js_1.renderPdf)(html, options);
        }
        // Generate Provenance & Signature
        const provenance = (0, security_js_1.generateProvenance)(templateId, version, data, finalPdfBuffer);
        // Upload to Storage
        const fileKey = `reports/${job.id}.pdf`;
        const s3Url = await (0, storage_js_1.uploadFile)(fileKey, finalPdfBuffer, 'application/pdf');
        // Generate Download URL
        const downloadUrl = await (0, storage_js_1.getDownloadUrl)(fileKey);
        // Save provenance as sidecar
        await (0, storage_js_1.uploadFile)(`attestations/${job.id}.json`, JSON.stringify(provenance), 'application/json');
        return {
            url: downloadUrl,
            s3Url,
            provenance,
            size: finalPdfBuffer.length
        };
    }, {
        connection,
        concurrency: parseInt(process.env.WORKER_CONCURRENCY || '1'),
    });
    worker.on('completed', (job) => {
        console.log(`Job ${job.id} completed!`);
    });
    worker.on('failed', (job, err) => {
        console.error(`Job ${job?.id} failed`, err);
    });
    return worker;
}
