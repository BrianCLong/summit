import { jest } from '@jest/globals';

export class PythonShell {
  static run = jest.fn((script: string, options: any, callback: any) => {
    if (callback) callback(null, ['0.95']);
    return {
      on: jest.fn(),
      end: jest.fn(),
    };
  });

  static runString = jest.fn((code: string, options: any, callback: any) => {
    if (callback) callback(null, ['0.95']);
  });

  on = jest.fn();
  end = jest.fn();
  send = jest.fn();
  constructor(script: string, options: any) {}
}

export default { PythonShell };
