export type BuildStatus = 'success' | 'pending' | 'failed' | 'running';
export type TestStatus = 'pass' | 'fail' | 'pending';

export interface BuildEventTests {
  unit?: TestStatus;
  e2e?: TestStatus;
  security?: TestStatus;
}

export interface BuildEventImage {
  server?: string;
  client?: string;
}

export interface BuildEvent {
  pr: number;
  sha: string;
  status: BuildStatus;
  preview?: string;
  sbomUrl?: string;
  signed?: boolean;
  policy?: 'pass' | 'warn' | 'fail';
  timestamp: string;
  author?: string;
  title?: string;
  branch?: string;
  image?: BuildEventImage;
  tests?: BuildEventTests;
}
