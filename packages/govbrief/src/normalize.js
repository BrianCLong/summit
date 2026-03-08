"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractArticleRecord = extractArticleRecord;
const node_html_parser_1 = require("node-html-parser");
const utils_js_1 = require("./utils.js");
function findArticleRoot(documentRoot) {
    const main = documentRoot.querySelector('main');
    if (!main) {
        return documentRoot.querySelector('article');
    }
    const article = main.querySelector('article');
    return article ?? main;
}
function extractTitle(articleRoot) {
    const heading = articleRoot.querySelector('h1');
    return heading?.text.trim() ?? '';
}
function extractPublisher(documentRoot) {
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
function extractDate(articleRoot) {
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
function extractAuthors(articleRoot) {
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
function isContentNode(node) {
    if (node.nodeType !== 1) {
        return false;
    }
    const element = node;
    const tag = element.tagName;
    return ['P', 'UL', 'OL', 'BLOCKQUOTE'].includes(tag);
}
function gatherSectionText(nodes) {
    return nodes
        .filter((node) => isContentNode(node))
        .map((node) => node.innerText.trim())
        .filter(Boolean)
        .join('\n\n');
}
function extractArticleRecord(html, url, archiveUrl) {
    const documentRoot = (0, node_html_parser_1.parse)(html);
    const articleRoot = findArticleRoot(documentRoot);
    if (!articleRoot) {
        throw new Error('Unable to locate article content in the HTML payload.');
    }
    const title = extractTitle(articleRoot);
    const publisher = extractPublisher(documentRoot);
    const rawDate = extractDate(articleRoot);
    const datePublished = (0, utils_js_1.ensureIsoDate)(rawDate) || rawDate;
    const authors = extractAuthors(articleRoot);
    const sections = [];
    let currentHeading = 'Overview';
    let buffer = [];
    let lineCounter = 1;
    const children = articleRoot.childNodes;
    for (const child of children) {
        if (child.nodeType === 1) {
            const element = child;
            if (/^H[2-4]$/.test(element.tagName)) {
                const sectionText = gatherSectionText(buffer);
                if (sectionText.length > 0) {
                    const id = (0, utils_js_1.createSlug)(currentHeading || 'section');
                    sections.push({
                        id,
                        title: currentHeading,
                        text: sectionText,
                        startLine: lineCounter,
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
        const id = (0, utils_js_1.createSlug)(currentHeading || 'section');
        sections.push({
            id,
            title: currentHeading,
            text: trailing,
            startLine: lineCounter,
        });
    }
    return {
        url,
        archiveUrl,
        publisher,
        title,
        datePublished,
        authors,
        sections,
    };
}
