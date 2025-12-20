import { Worker, Job } from 'bullmq';
import { renderPdf } from './renderer.js';
import { loadTemplate } from './templates.js';
import { uploadFile, getDownloadUrl } from './storage.js';
import { generateProvenance } from './security.js';
import { mergePdfs, Section } from './merger.js';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

export interface ReportJobData {
  templateId: string;
  version: string;
  data: any;
  options?: any;
  classification?: string;
}

export function startWorker() {
  const worker = new Worker<ReportJobData>(
    'report-generation',
    async (job: Job<ReportJobData>) => {
      console.log(`Processing job ${job.id}`);
      const { templateId, version, data, options } = job.data;
      const classification = job.data.classification || 'unclassified';

      const template = await loadTemplate(templateId, version);

      let finalPdfBuffer: Buffer;

      // Check for chunking strategy
      if (data.sections && data.sections.length > 10) {
        // Large report: Render sections individually and merge
        console.log(`Job ${job.id}: Large report detected (${data.sections.length} sections). processing chunks.`);
        const pdfSections: Section[] = [];

        // Render chunks sequentially to save memory
        for (let i = 0; i < data.sections.length; i++) {
          const section = data.sections[i];
          // Create a partial data object for the section
          const sectionData = { ...data, sections: [section], isChunk: true, chunkIndex: i };
          const html = template.render(sectionData);
          const buffer = await renderPdf(html, options);
          pdfSections.push({ buffer, title: section.title || `Section ${i + 1}` });
        }

        finalPdfBuffer = await mergePdfs(pdfSections);
      } else {
        // Simple report
        const html = template.render(data);
        finalPdfBuffer = await renderPdf(html, options);
      }

      // Generate Provenance & Signature
      const provenance = generateProvenance(templateId, version, data, finalPdfBuffer);

      // Upload to Storage
      const fileKey = `reports/${job.id}.pdf`;
      const s3Url = await uploadFile(fileKey, finalPdfBuffer, 'application/pdf');

      // Generate Download URL
      const downloadUrl = await getDownloadUrl(fileKey);

      // Save provenance as sidecar
      await uploadFile(`attestations/${job.id}.json`, JSON.stringify(provenance), 'application/json');

      return {
        url: downloadUrl,
        s3Url,
        provenance,
        size: finalPdfBuffer.length
      };
    },
    {
      connection,
      concurrency: parseInt(process.env.WORKER_CONCURRENCY || '1'),
    }
  );

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed!`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed`, err);
  });

  return worker;
}
