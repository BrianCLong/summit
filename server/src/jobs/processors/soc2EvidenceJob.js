"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JOB_NAME = void 0;
exports.default = handle;
const SOC2ComplianceService_js_1 = require("../../services/SOC2ComplianceService.js");
const SigningService_js_1 = require("../../services/SigningService.js");
const tracer_js_1 = require("../../observability/tracer.js");
const metrics_js_1 = require("../../observability/metrics.js");
const WormStorageService_js_1 = require("../../services/WormStorageService.js");
const pdfGenerator_js_1 = require("../../utils/pdfGenerator.js");
const ComplianceMonitoringService_js_1 = require("../../services/ComplianceMonitoringService.js");
const EventSourcingService_js_1 = require("../../services/EventSourcingService.js");
const UserRepository_js_1 = require("../../data/UserRepository.js");
const database_js_1 = require("../../config/database.js");
exports.JOB_NAME = 'generate-soc2-evidence';
// Instantiate all required services
const pgPool = (0, database_js_1.getPostgresPool)();
const userRepository = new UserRepository_js_1.UserRepository();
const eventSourcingService = new EventSourcingService_js_1.EventSourcingService(pgPool);
const complianceMonitoringService = new ComplianceMonitoringService_js_1.ComplianceMonitoringService(pgPool);
const soc2Service = new SOC2ComplianceService_js_1.SOC2ComplianceService(complianceMonitoringService, eventSourcingService, userRepository);
const signingService = new SigningService_js_1.SigningService();
const storageService = new WormStorageService_js_1.WormStorageService();
/**
 * Handles the automated generation of SOC2 evidence packets.
 * This job is scheduled to run monthly.
 */
async function handle(job) {
    const tracer = (0, tracer_js_1.getTracer)('soc2-evidence-job');
    const parentSpan = tracer.startSpan('generate-soc2-evidence-job');
    const startTime = Date.now();
    console.log(`[JOB: ${exports.JOB_NAME}] Starting SOC2 evidence generation...`);
    const now = new Date();
    const endDate = new Date(now.getFullYear(), now.getMonth(), 0); // End of the previous month
    const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1); // Start of the previous month
    try {
        // 1. Generate the evidence packet
        const packet = await tracer.startActiveSpan('generate-packet', async (span) => {
            const result = await soc2Service.generateSOC2Packet(startDate, endDate);
            span.end();
            return result;
        });
        const jsonPacket = JSON.stringify(packet, null, 2);
        // 2. Generate the PDF report
        const pdfBuffer = await tracer.startActiveSpan('generate-pdf', async (span) => {
            const result = await (0, pdfGenerator_js_1.generatePdfFromPacket)(packet);
            span.end();
            return result;
        });
        // 3. Sign both artifacts
        const { jsonSignature, pdfSignature } = await tracer.startActiveSpan('sign-artifacts', async (span) => {
            const jsonSig = signingService.sign(jsonPacket);
            const pdfSig = signingService.sign(pdfBuffer);
            span.end();
            return { jsonSignature: jsonSig, pdfSignature: pdfSig };
        });
        // 4. Store the artifacts and their signatures
        await tracer.startActiveSpan('store-artifacts', async (span) => {
            const fileSuffix = `${startDate.toISOString()}_${endDate.toISOString()}`;
            await storageService.store(`SOC2_Evidence_${fileSuffix}.json`, Buffer.from(jsonPacket));
            await storageService.store(`SOC2_Evidence_${fileSuffix}.json.sig`, Buffer.from(jsonSignature));
            await storageService.store(`SOC2_Evidence_${fileSuffix}.pdf`, pdfBuffer);
            await storageService.store(`SOC2_Evidence_${fileSuffix}.pdf.sig`, Buffer.from(pdfSignature));
            span.end();
        });
        const duration = Date.now() - startTime;
        metrics_js_1.metrics.soc2JobDuration?.observe(duration);
        metrics_js_1.metrics.soc2JobRuns?.inc({ status: 'success' });
        metrics_js_1.metrics.soc2PacketSize?.observe(jsonPacket.length);
        console.log(`[JOB: ${exports.JOB_NAME}] Successfully generated and stored SOC2 evidence for ${startDate.toDateString()} - ${endDate.toDateString()}`);
    }
    catch (error) {
        const duration = Date.now() - startTime;
        metrics_js_1.metrics.soc2JobDuration?.observe(duration);
        metrics_js_1.metrics.soc2JobRuns?.inc({ status: 'failure' });
        console.error(`[JOB: ${exports.JOB_NAME}] Failed to generate SOC2 evidence:`, error);
        parentSpan.recordException(error);
        parentSpan.setStatus({ code: 2, message: error.message }); // 2 = ERROR
        // The job will be retried by pg-boss based on the default policy
        throw error;
    }
    finally {
        parentSpan.end();
    }
}
