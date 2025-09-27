import { getMaestroOrchestrationAPI } from './generated';
import axios, { AxiosRequestConfig } from 'axios'; // Import AxiosRequestConfig

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

  // Wrap API calls with retry logic while preserving generated types
  const retriedApi = Object.fromEntries(
    Object.entries(api).map(([key, value]) => {
      if (typeof value === 'function') {
        const wrapped = ((...args: unknown[]) =>
          retry(() => (value as (...innerArgs: unknown[]) => Promise<unknown>)(...args))) as typeof value;
        return [key, wrapped];
      }
      return [key, value];
    }),
  ) as typeof api;

  // Return the wrapped API functions
  return retriedApi;
};
