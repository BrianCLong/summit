// @ts-nocheck
import { Job } from 'pg-boss';
import { SOC2ComplianceService } from '../../services/SOC2ComplianceService.js';
import { SigningService } from '../../services/SigningService.js';
import { getTracer } from '../../observability/tracer.js';
import { metrics } from '../../observability/metrics.js';
import { WormStorageService } from '../../services/WormStorageService.js';
import { generatePdfFromPacket } from '../../utils/pdfGenerator.js';
import { ComplianceMonitoringService } from '../../services/ComplianceMonitoringService.js';
import { EventSourcingService } from '../../services/EventSourcingService.js';
import { UserRepository } from '../../data/UserRepository.js';
import { getPostgresPool } from '../../config/database.js';

interface SOC2JobPayload {
  [key: string]: unknown;
}

export const JOB_NAME = 'generate-soc2-evidence';

// Instantiate all required services
const pgPool = getPostgresPool();
const userRepository = new UserRepository();
const eventSourcingService = new EventSourcingService(pgPool);
const complianceMonitoringService = new ComplianceMonitoringService(pgPool);
const soc2Service = new SOC2ComplianceService(complianceMonitoringService, eventSourcingService, userRepository);
const signingService = new SigningService();
const storageService = new WormStorageService();

/**
 * Handles the automated generation of SOC2 evidence packets.
 * This job is scheduled to run monthly.
 */
export default async function handle(job: Job<SOC2JobPayload>) {
  const tracer = getTracer('soc2-evidence-job');
  const parentSpan = tracer.startSpan('generate-soc2-evidence-job');

  const startTime = Date.now();

  console.log(`[JOB: ${JOB_NAME}] Starting SOC2 evidence generation...`);

  const now = new Date();
  const endDate = new Date(now.getFullYear(), now.getMonth(), 0); // End of the previous month
  const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1); // Start of the previous month

  try {
    // 1. Generate the evidence packet
    const packet = await (tracer as any).startActiveSpan('generate-packet', async (span: any) => {
      const result = await soc2Service.generateSOC2Packet(startDate, endDate);
      span.end();
      return result;
    });
    const jsonPacket = JSON.stringify(packet, null, 2);

    // 2. Generate the PDF report
    const pdfBuffer = await (tracer as any).startActiveSpan('generate-pdf', async (span: any) => {
        const result = await generatePdfFromPacket(packet);
        span.end();
        return result;
    });

    // 3. Sign both artifacts
    const { jsonSignature, pdfSignature } = await (tracer as any).startActiveSpan('sign-artifacts', async (span: any) => {
        const jsonSig = signingService.sign(jsonPacket);
        const pdfSig = signingService.sign(pdfBuffer);
        span.end();
        return { jsonSignature: jsonSig, pdfSignature: pdfSig };
    });

    // 4. Store the artifacts and their signatures
    await (tracer as any).startActiveSpan('store-artifacts', async (span: any) => {
        const fileSuffix = `${startDate.toISOString()}_${endDate.toISOString()}`;
        await storageService.store(`SOC2_Evidence_${fileSuffix}.json`, Buffer.from(jsonPacket));
        await storageService.store(`SOC2_Evidence_${fileSuffix}.json.sig`, Buffer.from(jsonSignature));
        await storageService.store(`SOC2_Evidence_${fileSuffix}.pdf`, pdfBuffer);
        await storageService.store(`SOC2_Evidence_${fileSuffix}.pdf.sig`, Buffer.from(pdfSignature));
        span.end();
    });

    const duration = Date.now() - startTime;
    (metrics as any).soc2JobDuration?.observe(duration);
    (metrics as any).soc2JobRuns?.inc({ status: 'success' });
    (metrics as any).soc2PacketSize?.observe(jsonPacket.length);

    console.log(`[JOB: ${JOB_NAME}] Successfully generated and stored SOC2 evidence for ${startDate.toDateString()} - ${endDate.toDateString()}`);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    (metrics as any).soc2JobDuration?.observe(duration);
    (metrics as any).soc2JobRuns?.inc({ status: 'failure' });

    console.error(`[JOB: ${JOB_NAME}] Failed to generate SOC2 evidence:`, error);
    parentSpan.recordException(error as Error);
    parentSpan.setStatus({ code: 2, message: (error as Error).message }); // 2 = ERROR

    // The job will be retried by pg-boss based on the default policy
    throw error;
  } finally {
    parentSpan.end();
  }
}
