import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ReportService = require('../services/ReportService.js');
const path = require('path');

const mockLogger = { info: (msg, meta) => console.log(msg, meta) };
const service = new ReportService(mockLogger);

async function run() {
  console.log('Generating ESG Report...');
  try {
    const res = await service.generateESGReport({
      title: 'Summit ESG Report',
      period: 'Q4 2025',
      environmental: {
        'Carbon Footprint': { value: '120', unit: 'tons' },
        'Renewable Energy': { value: '45', unit: '%' }
      },
      social: {
        'Diversity Score': { value: '8.5', unit: '/10' },
        'Employee Churn': { value: '4', unit: '%' }
      },
      governance: {
        'Board Independence': { value: '60', unit: '%' },
        'Audit Committee': 'Established'
      },
      metadata: {
        author: 'Summit OS Automation',
        version: '1.0'
      },
      format: 'html'
    });
    console.log('Result:', res);
  } catch (err) {
    console.error('Error generating report:', err);
    process.exit(1);
  }
}

run();
