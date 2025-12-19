import { Worker, Job } from 'bullmq';
import { renderPdf } from './renderer.js';
import { loadTemplate } from './templates.js';
import fs from 'fs-extra';
import path from 'path';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

export interface ReportJobData {
  templateId: string;
  version: string;
  data: any;
  options?: any;
}

export function startWorker() {
  const worker = new Worker<ReportJobData>(
    'report-generation',
    async (job: Job<ReportJobData>) => {
      console.log(`Processing job ${job.id}`);
      const { templateId, version, data, options } = job.data;

      const template = await loadTemplate(templateId, version);
      const html = template.render(data);

      const pdf = await renderPdf(html, options);

      // Save to disk or upload (mocking save to /tmp)
      const outputPath = path.join('/tmp', `report-${job.id}.pdf`);
      await fs.writeFile(outputPath, pdf);

      return { path: outputPath, size: pdf.length };
    },
    { connection }
  );

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed!`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed`, err);
  });

  return worker;
}
