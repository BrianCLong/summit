import { applyConnectorRedactions } from './redaction';
import {
  buildDeletionProof,
  buildRectificationProof,
  hashDeterministic,
} from './proofs';
import type {
  DataSubjectFulfillmentOptions,
  DSARConnector,
  DSARRequest,
  DSARResponse,
  DSARResponseMeta,
  ExportConnectorRecord,
  ExportManifest,
  IdentityVerification,
} from './types';

const cloneResponse = (response: DSARResponse): DSARResponse =>
  JSON.parse(JSON.stringify(response)) as DSARResponse;

export class DataSubjectFulfillmentEngine {
  private readonly connectors: Map<string, DSARConnector> = new Map();
  private readonly cache: Map<string, DSARResponse> = new Map();

  constructor(private readonly options: DataSubjectFulfillmentOptions) {
    options.connectors.forEach((connector) => {
      if (this.connectors.has(connector.name)) {
        throw new Error(`Duplicate connector registered: ${connector.name}`);
      }
      this.connectors.set(connector.name, connector);
    });
  }

  async execute(request: DSARRequest): Promise<DSARResponse> {
    const verification = await this.options.identityVerifier.verify(request);
    if (!verification.verified) {
      throw new Error(
        `Identity verification failed: ${verification.reason ?? 'unknown reason'}`,
      );
    }
    const cacheKey = request.replayKey ?? request.requestId;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      const cloned = cloneResponse(cached);
      return {
        ...cloned,
        meta: this.buildMeta(true, verification),
      };
    }

    let response: DSARResponse;
    switch (request.operation) {
      case 'export':
        response = await this.handleExport(request, verification);
        break;
      case 'rectify':
        response = await this.handleRectify(request, verification);
        break;
      case 'delete':
        response = await this.handleDelete(request, verification);
        break;
      default:
        throw new Error(`Unsupported DSAR operation: ${request.operation}`);
    }

    this.cache.set(cacheKey, response);
    return response;
  }

  private buildMeta(
    idempotentReplay: boolean,
    verification: IdentityVerification,
  ): DSARResponseMeta {
    return {
      idempotentReplay,
      identityVerification: verification,
    };
  }

  private async handleExport(
    request: DSARRequest,
    verification: IdentityVerification,
  ): Promise<DSARResponse> {
    const connectorPayloads: {
      name: string;
      data: unknown;
      applied: string[];
      hash: string;
    }[] = [];
    for (const connector of this.connectors.values()) {
      const collected = await connector.collect(
        request.subjectId,
        request.tenantId,
      );
      const { data, applied } = applyConnectorRedactions(
        connector.name,
        collected,
        this.options.redactionRules,
      );
      connectorPayloads.push({
        name: connector.name,
        data,
        applied,
        hash: hashDeterministic(data),
      });
    }

    const generatedAt = new Date().toISOString();
    const manifest: ExportManifest = {
      requestId: request.requestId,
      subjectId: request.subjectId,
      tenantId: request.tenantId,
      generatedAt,
      connectors: connectorPayloads
        .map<ExportConnectorRecord>((entry) => ({
          name: entry.name,
          itemCount: Array.isArray(entry.data)
            ? entry.data.length
            : entry.data && typeof entry.data === 'object'
              ? Object.keys(entry.data as Record<string, unknown>).length
              : 1,
          hash: entry.hash,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      redactionsApplied: Array.from(
        new Set(connectorPayloads.flatMap((entry) => entry.applied)),
      ).sort(),
    };

    const connectorsPayload = connectorPayloads
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .reduce<Record<string, unknown>>((acc, entry) => {
        acc[entry.name] = entry.data;
        return acc;
      }, {});

    const payload = JSON.stringify({
      requestId: request.requestId,
      subjectId: request.subjectId,
      tenantId: request.tenantId,
      generatedAt,
      connectors: connectorsPayload,
    });

    const signedPack = this.options.signer.sign(payload, manifest);
    const objectKey = `${request.tenantId}/${request.requestId}.json`;
    const location = await this.options.storage.putObject(
      objectKey,
      JSON.stringify(signedPack),
    );

    await this.options.kafka.publish('dsar.fulfillment', {
      requestId: request.requestId,
      operation: 'export',
      subjectId: request.subjectId,
      tenantId: request.tenantId,
      location,
    });

    const response: DSARResponse = {
      type: 'export',
      result: {
        location,
        pack: signedPack,
      },
      meta: this.buildMeta(false, verification),
    };

    return response;
  }

  private async handleRectify(
    request: DSARRequest,
    verification: IdentityVerification,
  ): Promise<DSARResponse> {
    const payload = (request.payload as Record<string, unknown>) ?? {};
    const proofs = [];
    for (const connector of this.connectors.values()) {
      if (typeof connector.rectify !== 'function') {
        continue;
      }
      const connectorPatch = payload[connector.name] as
        | Record<string, unknown>
        | undefined;
      if (!connectorPatch || Object.keys(connectorPatch).length === 0) {
        continue;
      }
      const before = await connector.snapshot();
      await connector.rectify(
        request.subjectId,
        request.tenantId,
        connectorPatch,
      );
      const after = await connector.snapshot();
      proofs.push(
        buildRectificationProof(
          request.requestId,
          connector.name,
          before,
          after,
          connectorPatch,
        ),
      );
      await this.options.kafka.publish('dsar.fulfillment', {
        requestId: request.requestId,
        operation: 'rectify',
        subjectId: request.subjectId,
        tenantId: request.tenantId,
        connector: connector.name,
      });
    }

    return {
      type: 'rectify',
      result: { proofs },
      meta: this.buildMeta(false, verification),
    };
  }

  private async handleDelete(
    request: DSARRequest,
    verification: IdentityVerification,
  ): Promise<DSARResponse> {
    const proofs = [];
    for (const connector of this.connectors.values()) {
      if (typeof connector.delete !== 'function') {
        continue;
      }
      await connector.delete(request.subjectId, request.tenantId);
      const snapshot = await connector.snapshot();
      proofs.push(
        buildDeletionProof(
          request.requestId,
          connector.name,
          request.subjectId,
          snapshot,
        ),
      );
      await this.options.kafka.publish('dsar.fulfillment', {
        requestId: request.requestId,
        operation: 'delete',
        subjectId: request.subjectId,
        tenantId: request.tenantId,
        connector: connector.name,
      });
    }

    return {
      type: 'delete',
      result: { proofs },
      meta: this.buildMeta(false, verification),
    };
  }
}

export const registerConnector = (
  engine: DataSubjectFulfillmentEngine,
  connector: DSARConnector,
): void => {
  const map = (engine as unknown as { connectors: Map<string, DSARConnector> })
    .connectors;
  if (map.has(connector.name)) {
    throw new Error(`Connector ${connector.name} already registered`);
  }
  map.set(connector.name, connector);
};
