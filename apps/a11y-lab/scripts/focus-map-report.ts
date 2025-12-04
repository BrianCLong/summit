import { JSDOM } from 'jsdom';
import { computeFocusOrder } from '../src/scripts/focusOrder';

async function main() {
  const dom = new JSDOM(samplePage);
  const steps = computeFocusOrder(dom.window.document);
  console.log('Focus order map:');
  console.table(steps);
}

main().catch((error) => {
  console.error('Unable to build focus map', error);
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
