// Mock for pg (node-postgres)
export class Pool {
  private connected = false;

  async connect() {
    this.connected = true;
    return {
      query: async () => ({ rows: [], rowCount: 0 }),
      release: () => {},
    };
  }

  async query(_text: string, _values?: any[]) {
    return { rows: [], rowCount: 0 };
  }

  async end() {
    this.connected = false;
  }

  on(_event: string, _callback: (...args: any[]) => void) {
    return this;
  }
}

export class Client {
  async connect() {}
  async query(_text: string, _values?: any[]) {
    return { rows: [], rowCount: 0 };
  }
  async end() {}
  on(_event: string, _callback: (...args: any[]) => void) {
    return this;
  }
}

export const types = {
  setTypeParser: (_oid: number, _parser: (val: string) => any) => {},
  getTypeParser: (_oid: number) => (val: string) => val,
};

export default { Pool, Client, types };
