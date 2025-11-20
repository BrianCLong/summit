/**
 * MISP Platform Integration
 * Malware Information Sharing Platform (MISP) client
 */

import axios, { AxiosInstance } from 'axios';

export interface MispConfig {
  url: string;
  apiKey: string;
  verifySsl?: boolean;
  timeout?: number;
}

export interface MispEvent {
  id: string;
  orgc_id: string;
  org_id: string;
  date: string;
  threat_level_id: string;
  info: string;
  published: boolean;
  uuid: string;
  analysis: string;
  timestamp: string;
  distribution: string;
  sharing_group_id?: string;
  proposal_email_lock: boolean;
  locked: boolean;
  publish_timestamp: string;
  event_creator_email: string;
  Attribute: MispAttribute[];
  Object?: MispObject[];
  Tag?: MispTag[];
  Galaxy?: MispGalaxy[];
}

export interface MispAttribute {
  id: string;
  event_id: string;
  object_id: string;
  object_relation?: string;
  category: string;
  type: string;
  value1: string;
  value2?: string;
  to_ids: boolean;
  uuid: string;
  timestamp: string;
  distribution: string;
  sharing_group_id?: string;
  comment?: string;
  deleted: boolean;
  disable_correlation: boolean;
  first_seen?: string;
  last_seen?: string;
  Tag?: MispTag[];
}

export interface MispObject {
  id: string;
  name: string;
  meta_category: string;
  description: string;
  template_uuid: string;
  template_version: string;
  event_id: string;
  uuid: string;
  timestamp: string;
  distribution: string;
  sharing_group_id?: string;
  comment?: string;
  deleted: boolean;
  first_seen?: string;
  last_seen?: string;
  Attribute: MispAttribute[];
}

export interface MispTag {
  id: string;
  name: string;
  colour: string;
  exportable: boolean;
  org_id?: string;
  user_id?: string;
  hide_tag?: boolean;
  numerical_value?: number;
}

export interface MispGalaxy {
  id: string;
  uuid: string;
  name: string;
  type: string;
  description: string;
  version: string;
  GalaxyCluster: MispGalaxyCluster[];
}

export interface MispGalaxyCluster {
  id: string;
  uuid: string;
  collection_uuid: string;
  type: string;
  value: string;
  tag_name: string;
  description: string;
  galaxy_id: string;
  source: string;
  authors?: string[];
  version: string;
  distribution: string;
  sharing_group_id?: string;
  default: boolean;
}

export interface MispSearchParams {
  eventid?: string | string[];
  tags?: string | string[];
  from?: string;
  to?: string;
  last?: string;
  eventinfo?: string;
  threatLevel?: string | string[];
  published?: boolean;
  org?: string | string[];
  category?: string | string[];
  type?: string | string[];
  value?: string;
  quickFilter?: string;
  limit?: number;
  page?: number;
  enforceWarninglist?: boolean;
  to_ids?: boolean;
}

export class MispClient {
  private client: AxiosInstance;
  private config: MispConfig;

  constructor(config: MispConfig) {
    this.config = config;

    this.client = axios.create({
      baseURL: config.url,
      timeout: config.timeout || 30000,
      headers: {
        'Authorization': config.apiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      httpsAgent: config.verifySsl === false ? { rejectUnauthorized: false } : undefined,
    });
  }

  /**
   * Get version information
   */
  async getVersion(): Promise<any> {
    const response = await this.client.get('/servers/getVersion');
    return response.data;
  }

  /**
   * Search for events
   */
  async searchEvents(params: MispSearchParams = {}): Promise<MispEvent[]> {
    const response = await this.client.post('/events/restSearch', params);
    return response.data.response || [];
  }

  /**
   * Get a specific event
   */
  async getEvent(eventId: string): Promise<MispEvent> {
    const response = await this.client.get(`/events/${eventId}`);
    return response.data.Event;
  }

  /**
   * Search for attributes
   */
  async searchAttributes(params: MispSearchParams = {}): Promise<MispAttribute[]> {
    const response = await this.client.post('/attributes/restSearch', params);
    return response.data.response?.Attribute || [];
  }

  /**
   * Get recently published events
   */
  async getRecentEvents(hours: number = 24): Promise<MispEvent[]> {
    const from = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString().split('T')[0];
    return this.searchEvents({
      from,
      published: true,
    });
  }

  /**
   * Get indicators of compromise
   */
  async getIoCs(params: MispSearchParams = {}): Promise<MispAttribute[]> {
    return this.searchAttributes({
      ...params,
      to_ids: true,
    });
  }

  /**
   * Get attributes by type
   */
  async getAttributesByType(type: string, params: MispSearchParams = {}): Promise<MispAttribute[]> {
    return this.searchAttributes({
      ...params,
      type,
    });
  }

  /**
   * Get events by tag
   */
  async getEventsByTag(tag: string, params: MispSearchParams = {}): Promise<MispEvent[]> {
    return this.searchEvents({
      ...params,
      tags: tag,
    });
  }

  /**
   * Export as STIX
   */
  async exportStix(eventId: string): Promise<any> {
    const response = await this.client.get(`/events/stix2/download/${eventId}.json`);
    return response.data;
  }

  /**
   * Export multiple events as STIX
   */
  async exportStixBatch(params: MispSearchParams = {}): Promise<any> {
    const response = await this.client.post('/events/stix2/restSearch', params);
    return response.data;
  }

  /**
   * Add event
   */
  async addEvent(event: Partial<MispEvent>): Promise<MispEvent> {
    const response = await this.client.post('/events/add', event);
    return response.data.Event;
  }

  /**
   * Add attribute to event
   */
  async addAttribute(eventId: string, attribute: Partial<MispAttribute>): Promise<MispAttribute> {
    const response = await this.client.post(`/attributes/add/${eventId}`, attribute);
    return response.data.Attribute;
  }

  /**
   * Get all tags
   */
  async getTags(): Promise<MispTag[]> {
    const response = await this.client.get('/tags');
    return response.data.Tag || [];
  }

  /**
   * Get all galaxies
   */
  async getGalaxies(): Promise<MispGalaxy[]> {
    const response = await this.client.get('/galaxies');
    return response.data.Galaxy || [];
  }

  /**
   * Get galaxy by ID
   */
  async getGalaxy(galaxyId: string): Promise<MispGalaxy> {
    const response = await this.client.get(`/galaxies/view/${galaxyId}`);
    return response.data.Galaxy;
  }

  /**
   * Get threat actors from galaxy
   */
  async getThreatActors(): Promise<MispGalaxyCluster[]> {
    const galaxies = await this.getGalaxies();
    const threatActorGalaxy = galaxies.find(g => g.type === 'threat-actor');
    if (threatActorGalaxy) {
      const fullGalaxy = await this.getGalaxy(threatActorGalaxy.id);
      return fullGalaxy.GalaxyCluster;
    }
    return [];
  }

  /**
   * Get malware families from galaxy
   */
  async getMalwareFamilies(): Promise<MispGalaxyCluster[]> {
    const galaxies = await this.getGalaxies();
    const malwareGalaxy = galaxies.find(g => g.type === 'malware');
    if (malwareGalaxy) {
      const fullGalaxy = await this.getGalaxy(malwareGalaxy.id);
      return fullGalaxy.GalaxyCluster;
    }
    return [];
  }

  /**
   * Poll for new/updated events
   */
  async poll(since?: string): Promise<MispEvent[]> {
    const params: MispSearchParams = {
      published: true,
      limit: 100,
    };

    if (since) {
      params.from = since;
    } else {
      // Default to last 24 hours
      params.last = '1d';
    }

    return this.searchEvents(params);
  }

  /**
   * Start polling for new events
   */
  startPolling(
    callback: (events: MispEvent[]) => void | Promise<void>,
    intervalMs: number = 300000, // 5 minutes
    errorCallback?: (error: Error) => void
  ): NodeJS.Timeout {
    let lastPoll = new Date().toISOString().split('T')[0];

    const pollTask = async () => {
      try {
        const events = await this.poll(lastPoll);
        if (events.length > 0) {
          await callback(events);
          lastPoll = new Date().toISOString().split('T')[0];
        }
      } catch (error) {
        if (errorCallback) {
          errorCallback(error as Error);
        } else {
          console.error('MISP polling error:', error);
        }
      }
    };

    // Initial poll
    pollTask();

    // Set up interval
    return setInterval(pollTask, intervalMs);
  }
}

/**
 * Create a MISP client instance
 */
export function createMispClient(config: MispConfig): MispClient {
  return new MispClient(config);
}
