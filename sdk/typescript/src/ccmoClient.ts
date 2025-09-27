export type NotificationChannel = 'email' | 'push' | 'in-app';

export interface ConsentPayload {
  subjectId: string;
  topic: string;
  purpose: string;
  allowed: boolean;
  locales?: string[];
}

export interface NotificationPayload {
  subjectId: string;
  topic: string;
  purpose: string;
  channel: NotificationChannel;
  locale: string;
  darkMode?: boolean;
  template: string;
  data?: Record<string, unknown>;
}

export interface NotificationResponse {
  status: string;
  message: string;
  body?: string;
}

export interface AppealEntry {
  subjectId: string;
  topic: string;
  purpose: string;
  channel: string;
  reason: string;
  timestamp: number;
}

export class CCMOClient {
  constructor(private readonly baseUrl: string) {}

  async setConsent(payload: ConsentPayload): Promise<void> {
    await this.request('/consents', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async sendNotification(payload: NotificationPayload): Promise<NotificationResponse> {
    const response = await this.request('/notifications/send', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        darkMode: payload.darkMode ?? false,
      }),
    });
    return (await response.json()) as NotificationResponse;
  }

  async getAppeals(): Promise<AppealEntry[]> {
    const response = await this.request('/appeals', {
      method: 'GET',
    });
    return (await response.json()) as AppealEntry[];
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
      ...init,
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`CCMO request failed: ${response.status} ${message}`);
    }
    return response;
  }
}
