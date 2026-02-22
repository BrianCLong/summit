import { EventEmitter } from 'events';

type Operation = { type: string; args: any[] };

class MockArchive extends EventEmitter {
  operations: Operation[] = [];

  pipe() {
    return this;
  }

  append(...args: any[]) {
    this.operations.push({ type: 'append', args });
    return this;
  }

  file(...args: any[]) {
    this.operations.push({ type: 'file', args });
    return this;
  }

  directory(...args: any[]) {
    this.operations.push({ type: 'directory', args });
    return this;
  }

  async finalize() {
    setImmediate(() => this.emit('finish'));
  }
}

export default function createArchiver() {
  return new MockArchive();
}
