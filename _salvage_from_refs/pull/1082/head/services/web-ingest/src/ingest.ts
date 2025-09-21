import { chromium } from 'playwright';
import robotsParser from 'robots-parser';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import crypto from 'crypto';
import * as http from 'node:http';

async function allowedByRobots(targetUrl: string): Promise<boolean> {
  const robotsUrl = new URL('/robots.txt', targetUrl).toString();
  return new Promise<boolean>((resolve) => {
    http.get(robotsUrl, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          const parser = robotsParser(robotsUrl, data);
          resolve(parser.isAllowed(targetUrl, 'IntelGraph-Symphony/1.0'));
        } catch {
          resolve(true); // be permissive if robots.txt is malformed
        }
      });
    }).on('error', () => resolve(true));
  });
}

export async function snapshot(url: string) {
  if (!(await allowedByRobots(url))) throw new Error('robots.txt disallows');
  const b = await chromium.launch();
  const p = await b.newPage({ userAgent: 'IntelGraph-Symphony/1.0 (+contact@example.com)' });
  await p.goto(url, { waitUntil: 'networkidle' });
  const html = await p.content();
  const dom = new JSDOM(html, { url });
  const article = new Readability(dom.window.document).parse();
  await b.close();
  const hash = crypto.createHash('sha256').update(html).digest('hex');
  return { url, title: article?.title, text: article?.textContent, html, sha256: hash, fetchedAt: new Date().toISOString() };
}
