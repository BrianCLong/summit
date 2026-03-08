"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exporterMap = exports.exporters = void 0;
const csv_exporter_js_1 = require("./csv-exporter.js");
const docx_exporter_js_1 = require("./docx-exporter.js");
const excel_exporter_js_1 = require("./excel-exporter.js");
const json_exporter_js_1 = require("./json-exporter.js");
const pdf_exporter_js_1 = require("./pdf-exporter.js");
const pptx_exporter_js_1 = require("./pptx-exporter.js");
const xml_exporter_js_1 = require("./xml-exporter.js");
exports.exporters = [
    new json_exporter_js_1.JsonExporter(),
    new csv_exporter_js_1.CsvExporter(),
    new pdf_exporter_js_1.PdfExporter(),
    new excel_exporter_js_1.ExcelExporter(),
    new docx_exporter_js_1.DocxExporter(),
    new pptx_exporter_js_1.PptxExporter(),
    new xml_exporter_js_1.XmlExporter(),
];
exports.exporterMap = Object.fromEntries(exports.exporters.map((exp) => [exp.format, exp]));
