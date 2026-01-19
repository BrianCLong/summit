import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// Types (simplified from Schema)
interface Question {
  id: string;
  question: string;
  answer: string;
  comment?: string;
  evidence_ref?: string;
}

interface Section {
  title: string;
  questions: Question[];
}

interface Questionnaire {
  title: string;
  version: string;
  sections: Section[];
}

const SOURCE_DIR = 'docs/customer-security/questionnaires';
const OUTPUT_DIR = 'artifacts/customer-security/latest/questionnaire-pack';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function generateMarkdown(data: Questionnaire, filename: string): void {
  let md = `# ${data.title}\n\n`;
  md += `**Version:** ${data.version}\n`;
  md += `**Generated Date:** ${new Date().toISOString().split('T')[0]}\n\n`;

  md += `> This document is auto-generated from the Summit Security Policy and Evidence Bundle. \n`;
  md += `> For verification, refer to the linked evidence artifacts.\n\n`;

  data.sections.forEach(section => {
    md += `## ${section.title}\n\n`;
    md += `| ID | Question | Answer | Comment | Evidence |\n`;
    md += `|--- |--- |--- |--- |--- |\n`;

    section.questions.forEach(q => {
      const evidence = q.evidence_ref ? `[Link](${q.evidence_ref})` : "N/A";
      md += `| ${q.id} | ${q.question} | **${q.answer}** | ${q.comment || ""} | ${evidence} |\n`;
    });
    md += `\n`;
  });

  const outputPath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(outputPath, md);
  console.log(`Generated: ${outputPath}`);
}

function main() {
  const files = fs.readdirSync(SOURCE_DIR);

  files.forEach(file => {
    if (file.endsWith('.yaml') || file.endsWith('.yml')) {
      const content = fs.readFileSync(path.join(SOURCE_DIR, file), 'utf8');
      const data = yaml.load(content) as Questionnaire;
      const outputName = file.replace('.yaml', '.md').replace('.yml', '.md');
      generateMarkdown(data, outputName);
    }
  });
}

main();
