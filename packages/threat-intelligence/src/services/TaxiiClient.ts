/**
 * TAXII 2.1 Client Implementation
 * Provides connectivity to TAXII servers for threat intelligence exchange
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  TaxiiServerConfig,
  TaxiiDiscovery,
  TaxiiApiRoot,
  TaxiiCollections,
  TaxiiCollection,
  TaxiiManifest,
  TaxiiEnvelope,
  TaxiiStatus,
  TaxiiQueryParams,
  TaxiiError,
} from '../types/taxii.js';

export class TaxiiClient {
  private client: AxiosInstance;
  private config: TaxiiServerConfig;

  constructor(config: TaxiiServerConfig) {
    this.config = config;

    const axiosConfig: AxiosRequestConfig = {
      timeout: 30000,
      headers: {
        'Accept': 'application/taxii+json;version=2.1',
        'Content-Type': 'application/taxii+json;version=2.1',
      },
    };

    // Configure authentication
    if (config.auth.type === 'basic' && config.auth.credentials.username && config.auth.credentials.password) {
      axiosConfig.auth = {
        username: config.auth.credentials.username,
        password: config.auth.credentials.password,
      };
    } else if (config.auth.type === 'bearer' && config.auth.credentials.token) {
      axiosConfig.headers = {
        ...axiosConfig.headers,
        'Authorization': `Bearer ${config.auth.credentials.token}`,
      };
    } else if (config.auth.type === 'api-key' && config.auth.credentials.apiKey) {
      axiosConfig.headers = {
        ...axiosConfig.headers,
        'X-API-Key': config.auth.credentials.apiKey,
      };
    }

    this.client = axios.create(axiosConfig);
  }

  /**
   * Discover available TAXII services
   */
  async discover(): Promise<TaxiiDiscovery> {
    try {
      const response = await this.client.get<TaxiiDiscovery>(this.config.discoveryUrl);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to discover TAXII services');
    }
  }

  /**
   * Get API Root information
   */
  async getApiRoot(apiRootUrl?: string): Promise<TaxiiApiRoot> {
    const url = apiRootUrl || this.config.apiRootUrl;
    try {
      const response = await this.client.get<TaxiiApiRoot>(url);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get API root');
    }
  }

  /**
   * Get all collections from an API root
   */
  async getCollections(apiRootUrl?: string): Promise<TaxiiCollections> {
    const url = apiRootUrl || this.config.apiRootUrl;
    try {
      const response = await this.client.get<TaxiiCollections>(`${url}/collections/`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get collections');
    }
  }

  /**
   * Get a specific collection
   */
  async getCollection(collectionId: string, apiRootUrl?: string): Promise<TaxiiCollection> {
    const url = apiRootUrl || this.config.apiRootUrl;
    try {
      const response = await this.client.get<TaxiiCollection>(
        `${url}/collections/${collectionId}/`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, `Failed to get collection ${collectionId}`);
    }
  }

  /**
   * Get manifest of objects in a collection
   */
  async getManifest(
    collectionId: string,
    params?: TaxiiQueryParams,
    apiRootUrl?: string
  ): Promise<TaxiiManifest> {
    const url = apiRootUrl || this.config.apiRootUrl;
    try {
      const response = await this.client.get<TaxiiManifest>(
        `${url}/collections/${collectionId}/manifest/`,
        { params: this.buildQueryParams(params) }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, `Failed to get manifest for collection ${collectionId}`);
    }
  }

  /**
   * Get objects from a collection
   */
  async getObjects(
    collectionId: string,
    params?: TaxiiQueryParams,
    apiRootUrl?: string
  ): Promise<TaxiiEnvelope> {
    const url = apiRootUrl || this.config.apiRootUrl;
    try {
      const response = await this.client.get<TaxiiEnvelope>(
        `${url}/collections/${collectionId}/objects/`,
        { params: this.buildQueryParams(params) }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, `Failed to get objects from collection ${collectionId}`);
    }
  }

  /**
   * Get all objects from a collection (handles pagination)
   */
  async getAllObjects(
    collectionId: string,
    params?: TaxiiQueryParams,
    apiRootUrl?: string
  ): Promise<any[]> {
    const allObjects: any[] = [];
    let more = true;
    let nextParams = params;

    while (more) {
      const envelope = await this.getObjects(collectionId, nextParams, apiRootUrl);
      allObjects.push(...envelope.objects);

      if (envelope.more && envelope.next) {
        nextParams = { ...nextParams, next: envelope.next };
      } else {
        more = false;
      }
    }

    return allObjects;
  }

  /**
   * Get a specific object by ID
   */
  async getObject(
    collectionId: string,
    objectId: string,
    apiRootUrl?: string
  ): Promise<any> {
    const url = apiRootUrl || this.config.apiRootUrl;
    try {
      const response = await this.client.get(
        `${url}/collections/${collectionId}/objects/${objectId}/`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, `Failed to get object ${objectId}`);
    }
  }

  /**
   * Add objects to a collection
   */
  async addObjects(
    collectionId: string,
    objects: any[],
    apiRootUrl?: string
  ): Promise<TaxiiStatus> {
    const url = apiRootUrl || this.config.apiRootUrl;
    try {
      const envelope = {
        objects,
      };
      const response = await this.client.post<TaxiiStatus>(
        `${url}/collections/${collectionId}/objects/`,
        envelope
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, `Failed to add objects to collection ${collectionId}`);
    }
  }

  /**
   * Get status of a previous request
   */
  async getStatus(statusId: string, apiRootUrl?: string): Promise<TaxiiStatus> {
    const url = apiRootUrl || this.config.apiRootUrl;
    try {
      const response = await this.client.get<TaxiiStatus>(
        `${url}/status/${statusId}/`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, `Failed to get status ${statusId}`);
    }
  }

  /**
   * Poll a collection for new objects
   */
  async poll(
    collectionId: string,
    since?: string,
    limit?: number
  ): Promise<any[]> {
    const params: TaxiiQueryParams = {
      limit: limit || this.config.batchSize || 100,
    };

    if (since) {
      params.added_after = since;
    }

    return this.getAllObjects(collectionId, params);
  }

  /**
   * Start polling a collection at intervals
   */
  startPolling(
    collectionId: string,
    callback: (objects: any[]) => void | Promise<void>,
    errorCallback?: (error: Error) => void
  ): NodeJS.Timeout {
    let lastPoll = new Date().toISOString();

    const pollInterval = this.config.pollInterval || 300000; // 5 minutes default

    const pollTask = async () => {
      try {
        const objects = await this.poll(collectionId, lastPoll);
        if (objects.length > 0) {
          await callback(objects);
          lastPoll = new Date().toISOString();
        }
      } catch (error) {
        if (errorCallback) {
          errorCallback(error as Error);
        } else {
          console.error('TAXII polling error:', error);
        }
      }
    };

    // Initial poll
    pollTask();

    // Set up interval
    return setInterval(pollTask, pollInterval);
  }

  /**
   * Build query parameters for TAXII requests
   */
  private buildQueryParams(params?: TaxiiQueryParams): Record<string, string> {
    if (!params) return {};

    const queryParams: Record<string, string> = {};

    if (params.added_after) {
      queryParams.added_after = params.added_after;
    }

    if (params.limit) {
      queryParams.limit = params.limit.toString();
    }

    if (params.next) {
      queryParams.next = params.next;
    }

    if (params.match) {
      if (params.match.id) {
        queryParams['match[id]'] = params.match.id.join(',');
      }
      if (params.match.type) {
        queryParams['match[type]'] = params.match.type.join(',');
      }
      if (params.match.version) {
        queryParams['match[version]'] = params.match.version.join(',');
      }
      if (params.match.spec_version) {
        queryParams['match[spec_version]'] = params.match.spec_version.join(',');
      }
    }

    return queryParams;
  }

  /**
   * Handle and format errors
   */
  private handleError(error: any, message: string): Error {
    if (axios.isAxiosError(error)) {
      if (error.response?.data) {
        const taxiiError = error.response.data as TaxiiError;
        const errorMessage = `${message}: ${taxiiError.title || error.message}`;
        if (taxiiError.description) {
          return new Error(`${errorMessage} - ${taxiiError.description}`);
        }
        return new Error(errorMessage);
      }
      return new Error(`${message}: ${error.message}`);
    }
    return new Error(`${message}: ${error}`);
  }
}

/**
 * Create a TAXII client instance
 */
export function createTaxiiClient(config: TaxiiServerConfig): TaxiiClient {
  return new TaxiiClient(config);
}
