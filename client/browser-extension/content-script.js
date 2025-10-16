import { analyzeText } from './detector.js';

const MODES = {
  PASSIVE: 'passive',
  ALERT: 'alert',
  EDUCATIONAL: 'educational',
};

let mode = MODES.ALERT;

chrome.storage?.sync.get(['psyopsMode'], (data) => {
  if (data.psyopsMode) mode = data.psyopsMode;
  monitor();
});

chrome.runtime?.onMessage.addListener((msg) => {
  if (msg.type === 'SET_MODE') {
    mode = msg.mode;
    monitor();
  }
});

function monitor() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((n) => processNode(n));
}

function processNode(textNode) {
  const text = textNode.textContent || '';
  const result = analyzeText(text);
  if (result.score > 0.5 && mode !== MODES.PASSIVE) {
    const span = document.createElement('span');
    span.textContent = text;
    span.style.backgroundColor = 'rgba(255,0,0,0.2)';
    if (mode === MODES.EDUCATIONAL) {
      span.title = `Potential manipulation: ${result.tags.join(', ')}`;
    }
    span.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'FLAG', text, tags: result.tags });
    });
    textNode.parentNode?.replaceChild(span, textNode);
  }
}
