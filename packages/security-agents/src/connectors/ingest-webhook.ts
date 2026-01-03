export interface IngestEnvelope<TPayload> {
  tenantId: string;
  source: string;
  receivedAt: string;
  payload: TPayload;
}

export interface AlertPayload {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  resource?: string;
}

export const buildWebhookIngestHandler = <TPayload>(
  validator: (payload: unknown) => TPayload,
  onMessage: (envelope: IngestEnvelope<TPayload>) => Promise<void>
) => {
  return async (tenantId: string, source: string, body: unknown) => {
    const payload = validator(body);
    const envelope: IngestEnvelope<TPayload> = {
      tenantId,
      source,
      receivedAt: new Date().toISOString(),
      payload
    };
    await onMessage(envelope);
    return envelope;
  };
};
