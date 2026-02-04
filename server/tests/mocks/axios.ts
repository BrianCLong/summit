import { jest } from '@jest/globals';

const mockAxiosInstance = {
  get: jest.fn().mockResolvedValue({ data: {}, status: 200 }),
  post: jest.fn().mockResolvedValue({ data: {}, status: 200 }),
  put: jest.fn().mockResolvedValue({ data: {}, status: 200 }),
  patch: jest.fn().mockResolvedValue({ data: {}, status: 200 }),
  delete: jest.fn().mockResolvedValue({ data: {}, status: 200 }),
  head: jest.fn().mockResolvedValue({ data: {}, status: 200 }),
  options: jest.fn().mockResolvedValue({ data: {}, status: 200 }),
  request: jest.fn().mockResolvedValue({ data: {}, status: 200 }),
  interceptors: {
    request: { use: jest.fn(), eject: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn() },
  },
  defaults: {
    headers: {
      common: {},
      get: {},
      post: {},
      put: {},
      patch: {},
      delete: {},
    },
  },
};

const axios = {
  ...mockAxiosInstance,
  create: jest.fn(() => mockAxiosInstance),
  isAxiosError: jest.fn(() => false),
  isCancel: jest.fn(() => false),
  CancelToken: {
    source: jest.fn(() => ({
      token: {},
      cancel: jest.fn(),
    })),
  },
  Cancel: jest.fn(),
  Axios: jest.fn(),
  spread: jest.fn(),
  all: jest.fn().mockResolvedValue([]),
};

export default axios;
export const create = axios.create;
export const get = axios.get;
export const post = axios.post;
export const put = axios.put;
export const patch = axios.patch;
const deleteMethod = axios.delete;
export { deleteMethod as delete };
export const head = axios.head;
export const options = axios.options;
export const request = axios.request;
export const isAxiosError = axios.isAxiosError;
export const isCancel = axios.isCancel;
export const CancelToken = axios.CancelToken;
export const Cancel = axios.Cancel;
export const Axios = axios.Axios;
export const spread = axios.spread;
export const all = axios.all;
