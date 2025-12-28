import { StoryManager, Story } from '../narrative/story.js';
import { StoryExportService } from '../services/StoryExportService.js';
import { strict as assert } from 'assert';

async function testStoryBuilder() {
  console.log('Testing Storybuilder...');

  const story = await StoryManager.create('case-123', 'Investigation Report 001');
  assert.equal(story.title, 'Investigation Report 001');
  assert.equal(story.events.length, 0);

  const event = await StoryManager.addEvent(story.id, {
    timestamp: Date.now(),
    description: 'Suspicious login detected',
    source: 'graph',
    entityId: 'user-1'
  });
  assert.equal(story.events.length, 1);
  assert.equal(story.events[0].description, 'Suspicious login detected');

  const block = await StoryManager.addBlock(story.id, {
    type: 'markdown',
    content: 'The user **user-1** accessed the system from an unusual IP.',
    citations: ['user-1', 'ip-1']
  });
  assert.equal(story.blocks.length, 1);
  assert.equal(story.blocks[0].citations.length, 2);

  const exporter = new StoryExportService();
  const html = await exporter.exportToHtml(story);

  assert(html.includes('Investigation Report 001'));
  assert(html.includes('Suspicious login detected'));
  assert(html.includes('<strong>user-1</strong>'));

  console.log('Storybuilder tests passed!');
}

testStoryBuilder().catch(err => {
  console.error(err);
  process.exit(1);
});
