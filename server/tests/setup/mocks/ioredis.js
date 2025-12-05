const EventEmitter = require('events');
class MockRedis extends EventEmitter {
  constructor() {
    super();
    this.status = 'ready';
  }
  connect() {}
  disconnect() {}
  quit() {}
  on() { return this; }
  get() { return Promise.resolve(null); }
  set() { return Promise.resolve('OK'); }
  del() { return Promise.resolve(1); }
  duplicate() { return new MockRedis(); }
}
module.exports = MockRedis;
