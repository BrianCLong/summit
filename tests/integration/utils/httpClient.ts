import request from 'supertest';

export function http(app?: any) {
  // Explicit guard: ensure we have either an app instance or a base URL
  if (!app && !process.env.TEST_BASE_URL) {
    throw new Error('httpClient: provide app instance or set TEST_BASE_URL for external mode');
  }
  
  if (app) return request(app);                              // in-process app
  
  const base = process.env.TEST_BASE_URL;                   // external server (opt-in)
  if (!base) throw new Error('No app provided and TEST_BASE_URL is not set');
  return request(base);
}