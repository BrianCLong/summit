"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsdom_1 = require("jsdom");
const axe_core_1 = __importDefault(require("axe-core"));
async function main() {
    const dom = new jsdom_1.JSDOM(samplePage);
    const results = await axe_core_1.default.run(dom.window.document, {
        runOnly: ['wcag2a', 'wcag2aa'],
        resultTypes: ['violations'],
    });
    const critical = results.violations.filter((violation) => violation.impact === 'critical');
    if (critical.length > 0) {
        console.error('Critical accessibility issues detected:');
        console.error(critical.map((item) => `${item.id}: ${item.description}`).join('\n'));
        process.exitCode = 1;
    }
    else {
        console.log('axe-core gate passed with zero critical violations');
    }
}
main().catch((error) => {
    console.error('axe-core gate failed', error);
    process.exitCode = 1;
});
const samplePage = `
  <main id="main" aria-label="A11y lab sample page">
    <h1>Sample page</h1>
    <p>Used for automated axe-core and focus order checks.</p>
    <a href="#" aria-label="Skip to filters">Skip link</a>
    <form aria-label="filters">
      <label for="search">Search</label>
      <input id="search" name="search" type="text" />
      <button type="submit">Search</button>
    </form>
    <button type="button" aria-label="Launch audit">Launch audit</button>
    <button type="button" aria-label="Export">Export</button>
    <button type="button" aria-label="Download">Download</button>
    <footer>
      <a href="#terms">Terms</a>
      <a href="#privacy">Privacy</a>
    </footer>
  </main>
`;
