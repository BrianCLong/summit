import { parse, HTMLElement, Node } from 'node-html-parser';

import { ArticleRecord, ArticleSection } from './types.js';
import { createSlug, ensureIsoDate } from './utils.js';

function findArticleRoot(documentRoot: HTMLElement): HTMLElement | null {
  const main = documentRoot.querySelector('main');
  if (!main) {
    return documentRoot.querySelector('article');
  }
  const article = main.querySelector('article');
  return article ?? main;
}

function extractTitle(articleRoot: HTMLElement): string {
  const heading = articleRoot.querySelector('h1');
  return heading?.text.trim() ?? '';
}

function extractPublisher(documentRoot: HTMLElement): string {
  const siteName = documentRoot.querySelector('meta[property="og:site_name"]');
  if (siteName) {
    const value = siteName.getAttribute('content');
    if (value) {
      return value.trim();
    }
  }
  const publisherMeta = documentRoot.querySelector('meta[name="dcterms.publisher"]');
  if (publisherMeta) {
    const value = publisherMeta.getAttribute('content');
    if (value) {
      return value.trim();
    }
  }
  return 'Unknown Publisher';
}

function extractDate(articleRoot: HTMLElement): string {
  const dateField = articleRoot.querySelector('.field--name-field-date-published .field__item');
  if (dateField) {
    return dateField.text.trim();
  }
  const timeElement = articleRoot.querySelector('time');
  if (timeElement) {
    const dateTime = timeElement.getAttribute('datetime');
    if (dateTime) {
      return dateTime;
    }
    return timeElement.text.trim();
  }
  return '';
}

function extractAuthors(articleRoot: HTMLElement): string[] {
  const authorFields = articleRoot.querySelectorAll('.field--name-field-ref-authors .field__item');
  if (authorFields.length > 0) {
    return authorFields.map((node) => node.text.trim()).filter(Boolean);
  }
  const fallback = articleRoot.querySelectorAll('[rel="author"], .author, .byline a');
  if (fallback.length > 0) {
    return fallback.map((node) => node.text.trim()).filter(Boolean);
  }
  return [];
}

function isContentNode(node: Node): boolean {
  if (node.nodeType !== 1) {
    return false;
  }
  const element = node as HTMLElement;
  const tag = element.tagName;
  return ['P', 'UL', 'OL', 'BLOCKQUOTE'].includes(tag);
}

function gatherSectionText(nodes: Node[]): string {
  return nodes
    .filter((node) => isContentNode(node))
    .map((node) => (node as HTMLElement).innerText.trim())
    .filter(Boolean)
    .join('\n\n');
}

export function extractArticleRecord(html: string, url: string, archiveUrl?: string): ArticleRecord {
  const documentRoot = parse(html);
  const articleRoot = findArticleRoot(documentRoot);
  if (!articleRoot) {
    throw new Error('Unable to locate article content in the HTML payload.');
  }

  const title = extractTitle(articleRoot);
  const publisher = extractPublisher(documentRoot);
  const rawDate = extractDate(articleRoot);
  const datePublished = ensureIsoDate(rawDate) || rawDate;
  const authors = extractAuthors(articleRoot);

  const sections: ArticleSection[] = [];
  let currentHeading = 'Overview';
  let buffer: Node[] = [];
  let lineCounter = 1;

  const children = articleRoot.childNodes;
  for (const child of children) {
    if (child.nodeType === 1) {
      const element = child as HTMLElement;
      if (/^H[2-4]$/.test(element.tagName)) {
        const sectionText = gatherSectionText(buffer);
        if (sectionText.length > 0) {
          const id = createSlug(currentHeading || 'section');
          sections.push({
            id,
            title: currentHeading,
            text: sectionText,
            startLine: lineCounter
          });
          lineCounter += sectionText.split(/\n/).length;
        }
        currentHeading = element.innerText.trim();
        buffer = [];
        continue;
      }
    }
    buffer.push(child);
  }

  const trailing = gatherSectionText(buffer);
  if (trailing.length > 0) {
    const id = createSlug(currentHeading || 'section');
    sections.push({
      id,
      title: currentHeading,
      text: trailing,
      startLine: lineCounter
    });
  }

  return {
    url,
    archiveUrl,
    publisher,
    title,
    datePublished,
    authors,
    sections
  };
}
