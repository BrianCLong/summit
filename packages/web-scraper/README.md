# Web Scraper

Advanced web scraping package with JavaScript rendering, change detection, and intelligent content extraction.

## Features

- **JavaScript Rendering**: Full support for dynamic content using Playwright
- **Static Scraping**: Fast HTML-only scraping for static pages
- **Archive Support**: Integration with Wayback Machine
- **Change Detection**: Monitor pages for changes
- **Content Extraction**: Clean text, markdown, and article extraction
- **Technology Detection**: Identify technologies used on websites
- **Link Analysis**: Extract and analyze page relationships
- **Metadata Extraction**: Extract emails, phones, social media handles, crypto addresses
- **Browser Pool**: Efficient browser management for concurrent scraping
- **Robots.txt Compliance**: Respectful crawling

## Installation

```bash
pnpm install @intelgraph/web-scraper
```

## Usage

### Basic Static Scraping

```typescript
import { ScraperEngine } from '@intelgraph/web-scraper';

const engine = new ScraperEngine();
await engine.initialize();

const result = await engine.scrape({
  id: 'task-1',
  url: 'https://example.com',
  method: 'static',
  options: {
    extractLinks: true,
    extractImages: true,
    extractMetadata: true
  }
});

console.log(result.content.title);
console.log(result.links.length);
```

### Dynamic Scraping (JavaScript Rendering)

```typescript
const result = await engine.scrape({
  id: 'task-2',
  url: 'https://spa-app.com',
  method: 'dynamic',
  options: {
    renderJavaScript: true,
    waitForSelector: '.content-loaded',
    screenshot: true
  }
});
```

### Change Detection

```typescript
import { ChangeDetector } from '@intelgraph/web-scraper';

const detector = new ChangeDetector();

const changes = await detector.detectChanges(url, newContent);
if (changes.changed) {
  console.log('Page changed!');
  console.log('Added lines:', changes.diff.added.length);
  console.log('Removed lines:', changes.diff.removed.length);
}
```

### Archive Scraping

```typescript
const result = await engine.scrape({
  id: 'task-3',
  url: 'https://old-site.com',
  method: 'archive'
});

// Get all snapshots
const archiveScraper = new ArchiveScraper();
const snapshots = await archiveScraper.getSnapshots(url);
```

### Technology Detection

```typescript
import { TechnologyDetector } from '@intelgraph/web-scraper';

const detector = new TechnologyDetector();
const technologies = detector.detect(html, headers);

technologies.forEach(tech => {
  console.log(`${tech.name} (${tech.category}): ${tech.confidence}`);
});
```

### Link Analysis

```typescript
import { LinkAnalyzer } from '@intelgraph/web-scraper';

const analyzer = new LinkAnalyzer();
const analysis = analyzer.analyze(result.links);

console.log(`Total: ${analysis.totalLinks}`);
console.log(`Internal: ${analysis.internalLinks}`);
console.log(`External: ${analysis.externalLinks}`);
console.log(`Domains: ${analysis.uniqueDomains.join(', ')}`);
```

### Metadata Extraction

```typescript
import { MetadataExtractor } from '@intelgraph/web-scraper';

const extractor = new MetadataExtractor();
const contact = extractor.extractContactInfo(text, html);

console.log('Emails:', contact.emails);
console.log('Phones:', contact.phones);
console.log('Social Media:', contact.socialMedia);

const crypto = extractor.extractCryptoAddresses(text);
console.log('Bitcoin addresses:', crypto.bitcoin);
console.log('Ethereum addresses:', crypto.ethereum);
```

## API Reference

### ScraperEngine

Main scraping orchestrator.

**Methods:**
- `initialize()`: Initialize browser pool
- `scrape(task)`: Scrape a single URL
- `scrapeBatch(urls, options)`: Scrape multiple URLs
- `shutdown()`: Cleanup resources

### BrowserPool

Manages Playwright browser instances.

**Methods:**
- `acquire()`: Get a browser from pool
- `release(browser)`: Return browser to pool
- `createPage()`: Create a new page
- `closePage(browser, page)`: Close page

### ChangeDetector

Detects changes in web pages.

**Methods:**
- `detectChanges(url, content)`: Check for changes
- `clear()`: Clear all tracked pages
- `remove(url)`: Remove specific URL

## License

MIT
