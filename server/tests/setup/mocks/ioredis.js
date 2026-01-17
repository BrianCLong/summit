const EventEmitter = require('events');

class MockRedis extends EventEmitter {
  constructor() {
    super();
    this.status = 'ready';
    this.data = new Map();
  }

  connect() {
    this.status = 'ready';
    return Promise.resolve();
  }

  disconnect() {
    this.status = 'end';
    return Promise.resolve();
  }

  quit() {
    this.status = 'end';
    return Promise.resolve();
  }

  on(event, callback) {
    super.on(event, callback);
    return this;
  }

  get(key) {
    return Promise.resolve(this.data.get(key) || null);
  }

  set(key, value) {
    this.data.set(key, value);
    return Promise.resolve('OK');
  }

  del(key) {
    const existed = this.data.delete(key);
    return Promise.resolve(existed ? 1 : 0);
  }

  duplicate() {
    return new MockRedis();
  }

  subscribe() {
    return Promise.resolve();
  }

  psubscribe() {
    return Promise.resolve();
  }

  publish() {
    return Promise.resolve(1);
  }

  // Add other common methods as needed to avoid crashes
  hget() { return Promise.resolve(null); }
  hset() { return Promise.resolve(1); }
  hgetall() { return Promise.resolve({}); }
  expire() { return Promise.resolve(1); }
  exists() { return Promise.resolve(0); }
}

export default MockRedis;
