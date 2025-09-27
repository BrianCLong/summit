import { getMaestroOrchestrationAPI } from '../sdk/ts/src/generated';
import axios from 'axios';

// Simple retry function
async function retry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      console.warn(`Retrying after error: ${error}. Retries left: ${retries}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retry(fn, retries - 1, delay * 2); // Exponential backoff
    }
    throw error;
  }
}

export const createClient = (baseURL: string, token?: string) => {
  // Configure the default axios instance
  axios.defaults.baseURL = baseURL;
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }

  const api = getMaestroOrchestrationAPI();

  // Wrap API calls with retry logic
  const retriedApi: typeof api = {} as typeof api;
  const keys = Object.keys(api) as Array<keyof typeof api>;
  for (const key of keys) {
    const candidate = api[key];
    if (typeof candidate === 'function') {
      (retriedApi as Record<string, any>)[key as string] = ((...args: any[]) =>
        retry(() => (candidate as Function)(...args))) as typeof candidate;
    }
  }

  // Return the wrapped API functions
  return retriedApi;
};
