import { PDFDocument, StandardFonts } from 'pdf-lib';

function htmlToText(html: string) {
  const normalized = html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/p\s*>/gi, '\n')
    .replace(/<\s*p\s*>/gi, '')
    .replace(/<\s*\/h[1-6]\s*>/gi, '\n')
    .replace(/<\s*h[1-6][^>]*>/gi, '');
  const withoutTags = normalized.replace(/<[^>]+>/g, '');
  return withoutTags
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

function wrapLines(text: string, widthLimit: number, font: any, fontSize: number) {
  const lines: string[] = [];
  for (const paragraph of text.split(/\n+/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let current = '';
    for (const word of words) {
      const tentative = current ? `${current} ${word}` : word;
      const textWidth = font.widthOfTextAtSize(tentative, fontSize);
      if (textWidth <= widthLimit) {
        current = tentative;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    if (!words.length) lines.push('');
  }
  return lines;
}

export async function htmlToPdf(html: string): Promise<Buffer> {
  if (!html || !html.trim()) throw new Error('html_required');
  const text = htmlToText(html);
  if (!text) throw new Error('html_empty');

  const doc = await PDFDocument.create();
  const page = doc.addPage();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontSize = 12;
  const margin = 48;
  const pageSize = page.getSize();
  const maxWidth = pageSize.width - margin * 2;
  const lineHeight = fontSize + 4;

  let cursorY = pageSize.height - margin;
  let currentPage = page;

  for (const line of wrapLines(text, maxWidth, font, fontSize)) {
    if (cursorY < margin) {
      currentPage = doc.addPage();
      cursorY = currentPage.getSize().height - margin;
    }
    currentPage.drawText(line, { x: margin, y: cursorY, size: fontSize, font });
    cursorY -= lineHeight;
  }

  const pdfBytes = await doc.save({ useObjectStreams: false });
  return Buffer.from(pdfBytes);
}

export { htmlToText, wrapLines };
