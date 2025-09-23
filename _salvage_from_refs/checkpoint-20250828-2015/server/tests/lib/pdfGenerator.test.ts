import { generatePdf } from '../../src/lib/pdfGenerator';

describe('PDF Generator', () => {
  test('generates a PDF from HTML with title and sections', async () => {
    const htmlContent = `
      <html>
        <head>
          <title>Test Report</title>
        </head>
        <body>
          <h1>My Test Case</h1>
          <p>This is a summary.</p>
          <h2>Evidence</h2>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </body>
      </html>
    `;

    const pdfBuffer = await generatePdf(htmlContent);

    // Basic check: ensure a buffer is returned and it's not empty
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);

    // More advanced checks would involve parsing the PDF, which is complex.
    // For now, we rely on Puppeteer's reliability and visual inspection during development.
  }, 30000); // Increase timeout for Puppeteer
});
