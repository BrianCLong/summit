const QueueBot = require('../index');
const path = require('path');

const rulesPath = path.join(__dirname, '../rules.json');

test('isP0Candidate identifies valid candidates', () => {
  const bot = new QueueBot(rulesPath);

  expect(bot.isP0Candidate({ title: 'A bug', body: '', labels: ['P0-candidate'] })).toBe(true);
  expect(bot.isP0Candidate({ title: 'GA blocker issue', body: '', labels: [] })).toBe(true);
  expect(bot.isP0Candidate({ title: 'Normal bug', body: 'Just a normal bug', labels: ['bug'] })).toBe(false);
});

test('calculateScore accurately calculates scores based on rules', () => {
  const bot = new QueueBot(rulesPath);

  // +40 for prio:P0
  expect(bot.calculateScore({ title: 'Bug', body: '', labels: ['prio:P0'] })).toBe(40);

  // +30 for text keyword
  expect(bot.calculateScore({ title: 'GA blocker', body: '', labels: [] })).toBe(30);

  // +20 for label
  expect(bot.calculateScore({ title: 'Bug', body: '', labels: ['ga:blocker'] })).toBe(20);

  // Combine all 3: 40 + 30 + 20 = 90
  expect(bot.calculateScore({ title: 'GA blocker', body: '', labels: ['prio:P0', 'ga:blocker'] })).toBe(90);
});

test('getConfidence maps scores correctly', () => {
  const bot = new QueueBot(rulesPath);

  expect(bot.getConfidence(75)).toBe('high');
  expect(bot.getConfidence(60)).toBe('medium');
  expect(bot.getConfidence(40)).toBe('low');
});

test('processIssue generates expected payload', () => {
  const bot = new QueueBot(rulesPath);

  const issue = {
    number: 123,
    title: 'GA blocker and manifest error',
    body: 'Workflow failed',
    labels: ['prio:P0']
  };

  const existingComments = [];

  const result = bot.processIssue(issue, existingComments);

  expect(result.action).toBe('comment_and_label');
  expect(result.payload.category).toBe('integrity');
  expect(result.payload.score).toBe(70); // 40 (label) + 30 (GA blocker text)
  expect(result.payload.confidence).toBe('high');
  expect(result.payload.queue_order).toBe(123);
  expect(result.payload.applied_labels).toContain('prio:P0');
  expect(result.payload.applied_labels).toContain('ga:blocker');
});
