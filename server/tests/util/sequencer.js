
const fs = require('fs');
const path = require('path');
const TestSequencer = require('@jest/test-sequencer').default;

const quarantinePath = path.join(__dirname, '../quarantine/list.json');

class CustomSequencer extends TestSequencer {
  constructor() {
    super();
    this.quarantinedTests = new Set();
    try {
      if (fs.existsSync(quarantinePath)) {
        const data = fs.readFileSync(quarantinePath, 'utf8');
        JSON.parse(data).tests.forEach(t => this.quarantinedTests.add(t.id));
      }
    } catch (e) {
      console.warn('Failed to load quarantine list in sequencer:', e.message);
    }
  }

  /**
   * Sort test to determine order of execution
   * Sorting is optional but if we want to skip tests, we can't do it here easily.
   * Jest Sequencer is for ordering, not filtering.
   * Filtering is done via testPathIgnorePatterns or inside tests.
   */
  sort(tests) {
    const copyTests = Array.from(tests);
    return copyTests;
  }
}

module.exports = CustomSequencer;
