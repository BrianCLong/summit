/**
 * HTTP operator for making HTTP requests
 */

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Operator, ExecutionContext } from '@summit/dag-engine';

export interface HttpOperatorConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  data?: any;
  params?: Record<string, any>;
  timeout?: number;
  auth?: {
    username: string;
    password: string;
  };
  validateStatus?: (status: number) => boolean;
}

export class HttpOperator implements Operator {
  private config: HttpOperatorConfig;

  constructor(config: HttpOperatorConfig) {
    this.config = {
      method: 'GET',
      timeout: 30000,
      ...config,
    };
  }

  async execute(context: ExecutionContext): Promise<any> {
    const { url, method, headers, data, params, timeout, auth, validateStatus } =
      this.config;

    const requestConfig: AxiosRequestConfig = {
      url,
      method,
      headers,
      data,
      params,
      timeout,
      auth,
      validateStatus: validateStatus || ((status) => status >= 200 && status < 300),
    };

    try {
      const response: AxiosResponse = await axios(requestConfig);

      return {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
      };
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `HTTP request failed: ${error.response.status} ${error.response.statusText}\n` +
            `Response: ${JSON.stringify(error.response.data)}`
        );
      } else if (error.request) {
        throw new Error(`HTTP request failed: No response received`);
      } else {
        throw new Error(`HTTP request failed: ${error.message}`);
      }
    }
  }
}
