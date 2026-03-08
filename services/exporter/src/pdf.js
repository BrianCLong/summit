"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPdf = void 0;
const pdf_lib_1 = require("pdf-lib");
const createPdf = async (entitiesLen, edgesLen) => {
    const pdfDoc = await pdf_lib_1.PDFDocument.create();
    const fixedDate = new Date('2000-01-01T00:00:00Z');
    pdfDoc.setCreationDate(fixedDate);
    pdfDoc.setModificationDate(fixedDate);
    const id = pdfDoc.context.obj([
        pdf_lib_1.PDFHexString.fromText('0000000000000000'),
        pdf_lib_1.PDFHexString.fromText('0000000000000000'),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdfDoc.context.trailerInfo.ID = id;
    const page = pdfDoc.addPage();
    const font = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
    const { height } = page.getSize();
    const text = `Graph Snapshot\nEntities: ${entitiesLen}\nEdges: ${edgesLen}`;
    page.drawText(text, {
        x: 50,
        y: height - 50,
        size: 12,
        font,
        color: (0, pdf_lib_1.rgb)(0, 0, 0),
    });
    const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
    return Buffer.from(pdfBytes);
};
exports.createPdf = createPdf;
