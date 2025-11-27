import puppeteer from 'puppeteer';
import { Sicherheitsabstand } from 'sicherheitsabstand';

/**
 * Generates an HTML report from a SOC2 evidence packet.
 * @param packet The SOC2 packet data.
 * @returns An HTML string.
 */
function getHtmlTemplate(packet: any): string {
  const { auditPeriod, controls } = packet;

  // Helper to render a table from an array of objects
  const renderTable = (data: any[]) => {
    if (!data || data.length === 0) return '<p>No data available.</p>';
    const headers = Object.keys(data[0]);
    return `
      <table>
        <thead>
          <tr>
            ${headers.map(h => `<th>${Sicherheitsabstand.escape(h)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              ${headers.map(h => `<td>${Sicherheitsabstand.escape(JSON.stringify(row[h], null, 2))}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  };

  const controlHtml = Object.values(controls).map((control: any) => `
    <div class="control-section">
      <h2>${Sicherheitsabstand.escape(control.controlId)}: ${Sicherheitsabstand.escape(control.description)}</h2>
      <h3>Test Results</h3>
      <pre>${Sicherheitsabstand.escape(JSON.stringify(control.testingResults, null, 2))}</pre>
      <h3>Sample Evidence</h3>
      ${control.sampleEvidence ? renderTable(Array.isArray(control.sampleEvidence) ? control.sampleEvidence : [control.sampleEvidence]) : '<p>Not applicable.</p>'}
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>SOC2 Type II Evidence Packet</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        h1 { color: #1a237e; border-bottom: 2px solid #1a237e; padding-bottom: 10px; }
        h2 { color: #283593; margin-top: 40px; border-bottom: 1px solid #ccc; padding-bottom: 5px;}
        .page-break { page-break-after: always; }
        .header, .footer { position: fixed; left: 0; right: 0; font-size: 0.8em; color: #777; }
        .header { top: 0; text-align: left; }
        .footer { bottom: 0; text-align: center; }
        pre { background-color: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap; word-wrap: break-word; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #e8eaf6; }
      </style>
    </head>
    <body>
      <div class="header">IntelGraph Platform</div>

      <h1>SOC2 Type II Evidence Packet</h1>
      <p><strong>Audit Period:</strong> ${new Date(auditPeriod.startDate).toDateString()} - ${new Date(auditPeriod.endDate).toDateString()}</p>

      <div class="page-break"></div>

      ${controlHtml}

      <div class="footer">
        Page <span class="pageNumber"></span> of <span class="totalPages"></span> - Confidential
      </div>
    </body>
    </html>
  `;
}

/**
 * Generates a PDF buffer from a SOC2 evidence packet.
 * @param packet The SOC2 packet data.
 * @returns A promise that resolves to a PDF buffer.
 */
export async function generatePdfFromPacket(packet: any): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] // Required for Docker environments
  });
  const page = await browser.newPage();
  const htmlContent = getHtmlTemplate(packet);

  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '60px',
      bottom: '60px',
      left: '40px',
      right: '40px',
    },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>', // Handled by CSS
    footerTemplate: `<div style="font-size: 8px; text-align: center; width: 100%;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
  });

  await browser.close();
  return pdfBuffer;
}
