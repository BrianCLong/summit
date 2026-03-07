import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { generateReport } from '../../../absorption/narrative-sitrep/report_generator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataset = path.join(__dirname, '../../../GOLDEN/datasets/iran_narratives_persian_mws/seed.json');
const outputDir = __dirname;

generateReport(dataset, outputDir);
