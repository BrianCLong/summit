import { IncidentWebhookPayload, WebhookDispatcher } from './types';

type FetchFn = typeof fetch;

export class HttpWebhookDispatcher implements WebhookDispatcher {
  private readonly fetchImpl: FetchFn;

  constructor(private readonly endpoint: string, fetchImpl?: FetchFn) {
    this.fetchImpl = fetchImpl ?? globalThis.fetch;
    if (!this.fetchImpl) {
      throw new Error('Fetch API is not available in this runtime');
    }
  }

  async dispatch(payload: IncidentWebhookPayload): Promise<void> {
    const response = await this.fetchImpl(this.endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to dispatch webhook (${response.status}): ${body}`);
    }
  }
}

type Listener = (payload: IncidentWebhookPayload) => void | Promise<void>;

export class InMemoryWebhookDispatcher implements WebhookDispatcher {
  private readonly listeners: Listener[] = [];

  addListener(listener: Listener): void {
    this.listeners.push(listener);
  }

  async dispatch(payload: IncidentWebhookPayload): Promise<void> {
    for (const listener of this.listeners) {
      await listener(payload);
    }
  }
}
