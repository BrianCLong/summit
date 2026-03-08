"use strict";
/**
 * PDF Report Exporter
 * Exports reports to PDF format using Puppeteer
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PDFExporter = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
const fs_1 = require("fs");
const path = __importStar(require("path"));
const IReportExporter_js_1 = require("./IReportExporter.js");
const HTMLRenderer_js_1 = require("../utils/HTMLRenderer.js");
class PDFExporter extends IReportExporter_js_1.BaseReportExporter {
    renderer;
    puppeteerOptions;
    format = 'PDF';
    mimeType = 'application/pdf';
    extension = 'pdf';
    supports = ['text', 'images', 'charts', 'tables', 'styling'];
    constructor(renderer = new HTMLRenderer_js_1.HTMLRenderer(), puppeteerOptions = { headless: true }) {
        super();
        this.renderer = renderer;
        this.puppeteerOptions = puppeteerOptions;
    }
    async export(report, template) {
        const browser = await puppeteer_1.default.launch(this.puppeteerOptions);
        try {
            const page = await browser.newPage();
            // Generate HTML content
            const htmlContent = this.renderer.render(report, template);
            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
            // Add PDF-specific styles
            await page.addStyleTag({
                content: this.getPDFStyles(),
            });
            // Generate PDF
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '1in',
                    bottom: '1in',
                    left: '0.75in',
                    right: '0.75in',
                },
                displayHeaderFooter: true,
                headerTemplate: '<div></div>',
                footerTemplate: `
          <div style="font-size: 10px; text-align: center; width: 100%; color: #666;">
            <span class="pageNumber"></span> / <span class="totalPages"></span>
          </div>
        `,
            });
            const filename = this.generateFilename(report);
            const filepath = path.join('/tmp', filename);
            await fs_1.promises.writeFile(filepath, pdfBuffer);
            return {
                format: this.format.toLowerCase(),
                path: filepath,
                size: pdfBuffer.length,
                mimeType: this.mimeType,
                filename,
                buffer: Buffer.from(pdfBuffer),
            };
        }
        finally {
            await browser.close();
        }
    }
    /**
     * Get PDF-specific styles
     */
    getPDFStyles() {
        return `
      @page {
        margin: 1in 0.75in;
        size: A4;
      }

      body {
        font-size: 11pt;
      }

      .report-section {
        page-break-inside: avoid;
        page-break-after: auto;
      }

      h1 {
        page-break-after: avoid;
      }

      h2 {
        page-break-after: avoid;
      }

      table {
        page-break-inside: avoid;
      }

      @media print {
        .no-print {
          display: none;
        }
      }
    `;
    }
}
exports.PDFExporter = PDFExporter;
