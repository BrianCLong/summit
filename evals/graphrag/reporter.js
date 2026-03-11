import * as fs from 'fs';
import * as path from 'path';

function generateMarkdownReport(report) {
  let markdown = `# GraphRAG Evaluation Report\n\n`;
  markdown += `**Timestamp:** ${report.timestamp}\n`;
  markdown += `**Overall Quality Score:** ${(report.overall_quality_score * 100).toFixed(2)}%\n`;
  markdown += `**Total Test Cases:** ${report.total_cases}\n\n`;

  markdown += `## Performance Summary\n\n`;
  markdown += `| Metric | Average Score |\n`;
  markdown += `| --- | --- |\n`;

  const avgCompleteness = report.results.reduce((acc, curr) => acc + curr.scores.completeness, 0) / report.total_cases;
  const avgCitationAccuracy = report.results.reduce((acc, curr) => acc + curr.scores.citation_accuracy, 0) / report.total_cases;
  const avgRelevance = report.results.reduce((acc, curr) => acc + curr.scores.relevance, 0) / report.total_cases;
  const avgConfidence = report.results.reduce((acc, curr) => acc + curr.scores.confidence_calibration, 0) / report.total_cases;

  markdown += `| Completeness | ${(avgCompleteness * 100).toFixed(2)}% |\n`;
  markdown += `| Citation Accuracy | ${(avgCitationAccuracy * 100).toFixed(2)}% |\n`;
  markdown += `| Relevance | ${(avgRelevance * 100).toFixed(2)}% |\n`;
  markdown += `| Confidence Calibration | ${(avgConfidence * 100).toFixed(2)}% |\n\n`;

  markdown += `## Detailed Results\n\n`;
  markdown += `| Case ID | Overall Score | Completeness | Citation Accuracy | Relevance | Confidence Calibration |\n`;
  markdown += `| --- | --- | --- | --- | --- | --- |\n`;

  for (const res of report.results) {
    markdown += `| ${res.case_id} | ${(res.overall * 100).toFixed(2)}% | ${(res.scores.completeness * 100).toFixed(2)}% | ${(res.scores.citation_accuracy * 100).toFixed(2)}% | ${(res.scores.relevance * 100).toFixed(2)}% | ${(res.scores.confidence_calibration * 100).toFixed(2)}% |\n`;
  }

  return markdown;
}

const reportPath = path.join(process.cwd(), 'evals/graphrag/eval_report.json');
if (fs.existsSync(reportPath)) {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const markdown = generateMarkdownReport(report);
  const markdownPath = path.join(process.cwd(), 'evals/graphrag/eval_report.md');
  fs.writeFileSync(markdownPath, markdown);
  console.log(`Markdown report generated at: ${markdownPath}`);
} else {
  console.log(`JSON report not found at: ${reportPath}. Run the evaluator first.`);
}
