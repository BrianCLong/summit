import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface Section {
  buffer: Buffer;
  title: string;
}

export async function mergePdfs(sections: Section[] | Buffer[]): Promise<Buffer> {
  const mergedPdf = await PDFDocument.create();

  // Normalize input
  const inputs: Section[] = sections.map(s => Buffer.isBuffer(s) ? { buffer: s, title: 'Section' } : s);

  // TOC Data
  const tocEntries: { title: string; page: number }[] = [];
  let currentPageOffset = 0;

  // We will insert TOC at the beginning, so we might need to reserve pages or create it last and insert at 0.
  // Creating it last is easier.

  for (const section of inputs) {
    const pdf = await PDFDocument.load(section.buffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());

    // Record start page for this section (1-based index)
    // Add 1 because we will insert TOC later (assuming TOC is 1 page)
    // Actually, let's just track relative for now and adjust later.
    tocEntries.push({ title: section.title, page: currentPageOffset + 1 });

    copiedPages.forEach((page) => mergedPdf.addPage(page));
    currentPageOffset += copiedPages.length;
  }

  // Create TOC Page
  if (tocEntries.length > 0) {
    const tocPage = mergedPdf.insertPage(0);
    const font = await mergedPdf.embedFont(StandardFonts.Helvetica);
    const titleFont = await mergedPdf.embedFont(StandardFonts.HelveticaBold);

    tocPage.drawText('Table of Contents', {
      x: 50,
      y: tocPage.getHeight() - 50,
      size: 20,
      font: titleFont,
      color: rgb(0, 0, 0),
    });

    let y = tocPage.getHeight() - 100;
    for (const entry of tocEntries) {
      // Adjust page number by +1 because of TOC page
      // (This assumes TOC fits on one page)
      tocPage.drawText(entry.title, {
        x: 50,
        y,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });

      tocPage.drawText((entry.page + 1).toString(), {
        x: 500,
        y,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });

      y -= 20;
    }
  }

  const mergedBytes = await mergedPdf.save();
  return Buffer.from(mergedBytes);
}
