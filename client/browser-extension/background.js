const MODES = ['passive', 'alert', 'educational'];

chrome.action.onClicked.addListener(async () => {
  const { psyopsMode = 'alert' } = await chrome.storage.sync.get('psyopsMode');
  const next = MODES[(MODES.indexOf(psyopsMode) + 1) % MODES.length];
  await chrome.storage.sync.set({ psyopsMode: next });
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'SET_MODE', mode: next });
    }
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'FLAG') {
    // Optional: send flagged content to a central service
    fetch('https://example.com/flags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg),
    }).catch(() => {});
  }
});
