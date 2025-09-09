const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
(async ()=>{
  const base = process.env.BASE_URL || 'http://localhost:3000';
  const pages = ['/', '/how-to/zip-export', '/releases/v24'];
  const outDir = 'docs/ops/exports/pdf';
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  for (const p of pages){
    await page.goto(base + p, { waitUntil: 'networkidle0');
    await page.addStyleTag({ path: 'docs-site/src/css/print.css' });
    await page.pdf({ path: `${outDir}${p.replace(/\//,'')||'/home'}.pdf`, format: 'A4', printBackground: true });
  }
  await browser.close();
})();