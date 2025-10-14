const mockPage = {
  goto: jest.fn(() => Promise.resolve()),
  waitForSelector: jest.fn(() => Promise.resolve()),
  click: jest.fn(() => Promise.resolve()),
  type: jest.fn(() => Promise.resolve()),
  screenshot: jest.fn(() => Promise.resolve(Buffer.from(''))),
  evaluate: jest.fn(() => Promise.resolve()),
  content: jest.fn(() => Promise.resolve('<html></html>')),
  close: jest.fn(() => Promise.resolve()),
  on: jest.fn(),
  off: jest.fn(),
  setViewport: jest.fn(() => Promise.resolve()),
  waitForTimeout: jest.fn(() => Promise.resolve()),
  waitForFunction: jest.fn(() => Promise.resolve()),
  $: jest.fn(() => Promise.resolve(null)),
  $$: jest.fn(() => Promise.resolve([])),
  $eval: jest.fn(() => Promise.resolve()),
  $$eval: jest.fn(() => Promise.resolve([])),
};

const mockBrowser = {
  newPage: jest.fn(() => Promise.resolve(mockPage)),
  close: jest.fn(() => Promise.resolve()),
  pages: jest.fn(() => Promise.resolve([mockPage])),
  on: jest.fn(),
  off: jest.fn(),
};

const puppeteer = {
  launch: jest.fn(() => Promise.resolve(mockBrowser)),
  connect: jest.fn(() => Promise.resolve(mockBrowser)),
  executablePath: jest.fn(() => '/usr/bin/chromium'),
  defaultArgs: jest.fn(() => []),
};

module.exports = puppeteer;
module.exports.default = puppeteer;