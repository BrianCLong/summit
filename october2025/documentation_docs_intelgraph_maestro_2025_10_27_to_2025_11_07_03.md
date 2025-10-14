---
title: "Docs Workstream — Sprint 03 Plan (IntelGraph + Maestro)"
summary: "Scale docs from ‘green & governed’ to ‘discoverable, localizable, and testable’. Adds site search, i18n, executable examples, and UX polish."
owner: "Documentation Expert (Doc IG)"
version: "v0.1"
lastUpdated: "2025-09-30"
sprintWindow: "2025-10-27 → 2025-11-07 (America/Denver)"
status: "Planned — ready to start"
---

# Docs Workstream — Sprint 03 Plan & Export Pack

> **Objective:** Build on Sprints 01–02 to improve *findability* (site search + redirects), *global readiness* (i18n scaffolding), and *trust* (executable examples + perf budgets). Deliver a polished, fast, and testable docs surface for IntelGraph + Maestro.

## 0) Carryover & Dependencies
- **From Sprint 02**: schema docs auto‑gen; error catalog v2; role guides; governance dashboard.
- **Dependencies**: Docs site framework (MkDocs, Docusaurus, or VitePress) confirmed; read‑only API keys for search (optional); CI runners with Node + Playwright.

## 1) Sprint Goals (what ships)
1) **Site Search** with analytics (Algolia DocSearch or Lunr fallback) + search KPIs.
2) **i18n scaffolding**: extract strings, language switcher, English baseline locked.
3) **Executable Examples**: test runner validates code blocks in docs on CI (Node + bash) to prevent rot.
4) **Navigation & Redirects**: 3‑click rule enforced; redirect map for moved pages; 404 reporter.
5) **Performance & A11y polish**: Lighthouse budgets, print styles, dark/light diagram themes.
6) **PDF export** (one‑click) for release notes and operator manuals.

### Acceptance Criteria
- Search works offline (Lunr) and optionally online (Algolia) with ≥90% coverage of pages; top queries logged.
- `ci:docs:examples` job passes, executing ≥20 key code blocks; failures block merge.
- i18n directory exists with extractor output and language switcher; English is source of truth.
- Redirects configured; 404 dashboard < 0.5% of page views; broken internal links = 0 in weekly report.
- Lighthouse performance ≥ 90 on desktop/mobile; a11y ≥ 95. Diagrams readable in dark & light.
- PDF export job produces artifacts for release notes and operator manual.

## 2) Work Breakdown Structure (WBS)

### Week 1 (Oct 27–Oct 31)
- **W1‑A**: Wire search (Algolia if keys provided; Lunr/Straightforward index as fallback). Add search analytics panel.
- **W1‑B**: Implement **example‑runner** for code fences (` ```bash`, ` ```sh`, ` ```js`) with allowlist paths.
- **W1‑C**: Create i18n extractor + language switcher; externalize nav labels; seed glossary.
- **W1‑D**: Redirect map + 404 telemetry collector.

### Week 2 (Nov 3–Nov 7)
- **W2‑A**: Lighthouse perf budgets + CI gate; print stylesheet + PDF export via Puppeteer.
- **W2‑B**: Diagram theme audit; enforce `.mmd/.puml` dual palettes (dark/light) + alt text.
- **W2‑C**: Polish: breadcrumbs, Related/Next‑steps blocks across top 30 pages; sitewide glossary callouts.
- **W2‑D**: Cut Sprint 03 release notes; update governance dashboard KPIs with search & 404 stats.

## 3) Deliverables (to merge)
- `/docs/site/search/` (index + analytics)
- `/i18n/en/ …` (baseline; add `/i18n/es/` placeholder)
- `.ci/scripts/examples-runner.mjs`
- `.ci/scripts/redirect-check.mjs`
- `.github/workflows/docs-examples.yml`
- `.github/workflows/docs-lighthouse.yml`
- `docs/_assets/styles/print.css`
- `scripts/export-pdf.mjs`
- `docs/_data/redirects.json`
- Diagram palette stubs under `docs/**/diagrams/*.(mmd|puml)`

## 4) CI & Automation (ready to copy)

### 4.1 Executable Examples — `.github/workflows/docs-examples.yml`
```yaml
name: docs-examples
on:
  pull_request:
    paths: ["docs/**", "scripts/**", ".ci/**"]

jobs:
  run-examples:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - name: Install playwright (for later PDF export tests)
        run: npx playwright install --with-deps chromium
      - name: Run code-fence tests
        run: node .ci/scripts/examples-runner.mjs
```

### 4.2 Example Runner — `.ci/scripts/examples-runner.mjs`
```js
import fs from 'node:fs';
import globby from 'globby';
import { execa } from 'execa';

const files = await globby(['docs/**/*.md']);
const allow = new Set(['bash','sh','js','javascript']);
let failures = 0, ran = 0;

for (const f of files) {
  const txt = fs.readFileSync(f,'utf8');
  const blocks = [...txt.matchAll(/```(\w+)\n([\s\S]*?)```/g)];
  for (const [,lang,code] of blocks) {
    if (!allow.has(lang)) continue;
    ran++;
    try {
      if (lang === 'bash' || lang === 'sh') {
        // Safe mode: no destructive commands
        if (/rm -rf|shutdown|mkfs|drop database/i.test(code)) throw new Error('Unsafe command');
        await execa('bash',['-lc',code],{stdio:'inherit',env:{CI:'1'}});
      } else if (lang === 'js' || lang === 'javascript') {
        await execa('node',['-e',code],{stdio:'inherit',env:{CI:'1'}});
      }
    } catch (e) {
      console.log(`❌ Example failed in ${f}: ${e.message}`);
      failures++;
    }
  }
}
if (ran < 20) { console.log('Need ≥20 runnable examples'); failures++; }
if (failures) process.exit(1);
console.log(`✅ Executed ${ran} code examples successfully`);
```

### 4.3 Lighthouse & Budgets — `.github/workflows/docs-lighthouse.yml`
```yaml
name: docs-lighthouse
on:
  pull_request:
    paths: ["docs/**", "website/**"]

jobs:
  lhci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with: { node-version: 20 }
      - name: Install LHCI
        run: npm i -g @lhci/cli@0.x
      - name: Build docs site
        run: npm run docs:build
      - name: Run Lighthouse CI
        run: |
          lhci autorun --collect.staticDistDir=./dist --assert.assertions.performance=90 --assert.assertions.accessibility=95
```

### 4.4 Redirects & 404 Reporter — `.ci/scripts/redirect-check.mjs`
```js
import fs from 'node:fs';
import globby from 'globby';
const redirects = JSON.parse(fs.readFileSync('docs/_data/redirects.json','utf8'));
const files = await globby(['docs/**/*.md']);
let missing = [];
for (const [from,to] of Object.entries(redirects)) {
  const exists = fs.existsSync(to) || files.some(f=>f.endsWith(to));
  if (!exists) missing.push({from,to});
}
if (missing.length) {
  console.log('Broken redirects:', missing);
  process.exit(1);
}
console.log('✅ Redirect map valid');
```

### 4.5 PDF Export — `scripts/export-pdf.mjs`
```js
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const pages = [
  'docs/latest/release-notes/2025-11-07.md',
  'docs/latest/operations/runbooks/operator-manual.md'
];

const browser = await puppeteer.launch({args:['--no-sandbox']});
const page = await browser.newPage();
for (const mdPath of pages) {
  const html = mdPath.replace(/\.md$/, '.html');
  const url = 'file://' + path.resolve('dist', html);
  await page.goto(url, {waitUntil: 'networkidle0'});
  const out = path.basename(mdPath, '.md') + '.pdf';
  await page.pdf({path: `dist/pdf/${out}`, printBackground: true, format: 'Letter'});
}
await browser.close();
```

## 5) i18n Scaffolding

### 5.1 Directory Structure
```
/i18n/
  en/
    translations.json
  es/
    translations.json (placeholder)
```

### 5.2 Extractor — `.ci/scripts/i18n-extract.mjs`
```js
import fs from 'node:fs';
import globby from 'globby';
const files = await globby(['docs/**/*.md']);
const terms = new Set();
for (const f of files) {
  const s = fs.readFileSync(f,'utf8');
  // Collect headings to translate
  for (const m of s.matchAll(/^##?\s+(.+)$/gm)) terms.add(m[1].trim());
}
fs.writeFileSync('i18n/en/translations.json', JSON.stringify([...terms], null, 2));
console.log(`Extracted ${terms.size} strings`);
```

### 5.3 Language Switcher (site stub)
```tsx
// components/LanguageSwitcher.tsx
export default function LanguageSwitcher(){
  return (
    <div className="flex gap-2">
      <a href="/en/" aria-label="English">EN</a>
      <a href="/es/" aria-label="Español">ES</a>
    </div>
  );
}
```

## 6) Navigation & Findability
- Add **breadcrumbs** to all pages.
- Enforce **Related / Next steps** blocks (lint rule: missing → CI fail for top sections).
- Generate **sitemap.xml** and **search-index.json** on build.

## 7) Performance & A11y Polish
- `print.css` for clean exports.
- Dark/light **diagram palettes**: use `classDef dark …` in Mermaid; duplicate theme in PlantUML.
- Ensure all media has alt text and captions; heading hierarchy lint.

## 8) Page Stubs

### 8.1 `docs/latest/get-started/search-tips.md`
```markdown
---
title: "Search Tips"
summary: "Find what you need fast."
owner: "Docs"
version: "1.0"
lastUpdated: "2025-10-27"
---

- Use quotes for exact phrases.
- Filter by tag: `tag:ingest`.
- Try role guides for task flows.
```

### 8.2 `docs/latest/operations/runbooks/operator-manual.md`
```markdown
---
title: "Operator Manual"
summary: "Day‑2 operations guide for IntelGraph + Maestro."
owner: "Platform Ops"
version: "1.0"
lastUpdated: "2025-11-07"
---

## Daily Checks
- Dashboards green, error budget burn < 2%.

## Playbooks
- API latency breach → scale; profile; roll back.
- Ingest failure spike → retry; credential rotate; upstream status.
```

## 9) KPIs & Reporting (added to governance)
- **Search CTR**: ≥ 35% on top queries.
- **Zero broken links** weekly.
- **Executable examples**: pass rate ≥ 95%.
- **Perf budgets**: Lighthouse ≥ 90.
- **A11y**: alt‑text coverage 100% on touched pages.

## 10) Risks & Mitigations
- **No Algolia keys** → Lunr fallback; later swap without URL changes.
- **Flaky example execution** → run in sandbox; mark long‑running examples as `<!-- no-run -->`.
- **PDF rendering quirks** → ship print.css; keep layouts simple; include regression sample PDFs in artifacts.

## 11) Definition of Done (Sprint 03)
- Search, i18n scaffolding, examples runner, redirects, perf/a11y, and PDF export **all merged and green**.
- Updated release notes and governance dashboard include new KPIs.
- Stakeholders can locate any concept or task in ≤3 clicks or via search.

---

### Ready to Execute
Kickoff Oct 27. This sprint elevates docs UX and reliability: fast to search, safe to copy‑paste, and ready for localization.

