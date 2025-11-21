/**
 * Axios type declarations
 */

declare module 'axios' {
  export interface AxiosRequestConfig {
    url?: string;
    method?: string;
    baseURL?: string;
    headers?: Record<string, string>;
    params?: any;
    data?: any;
    timeout?: number;
    auth?: {
      username: string;
      password: string;
    };
    responseType?: string;
    validateStatus?: (status: number) => boolean;
  }

  export interface AxiosResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
    headers: Record<string, string>;
    config: AxiosRequestConfig;
    request?: any;
  }

  export interface AxiosError extends Error {
    config: AxiosRequestConfig;
    code?: string;
    request?: any;
    response?: AxiosResponse;
  }

  function axios(config: AxiosRequestConfig): Promise<AxiosResponse>;
  function axios(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse>;

  namespace axios {
    function get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    function post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    function put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    function delete_<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    function patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  }

  export default axios;
}
