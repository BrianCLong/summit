import {
  assembleReceiptBundle,
  type BundleAssemblyInput,
} from '../../../../../prov-ledger-service/src/export';

export interface RequestLike {
  body?: BundleAssemblyInput;
}

export interface ResponseLike {
  status(code: number): this;
  setHeader(name: string, value: string): this | void;
  json(body: unknown): void;
  send(body: unknown): void;
}

function validatePayload(body?: BundleAssemblyInput): asserts body is BundleAssemblyInput {
  if (!body || !Array.isArray(body.receipts) || body.receipts.length === 0) {
    throw new Error('At least one receipt is required for export');
  }
  if (!Array.isArray(body.policyDecisions)) {
    throw new Error('policyDecisions must be an array');
  }
}

export function buildReceiptExportHandler(
  deps = { assembleBundle: assembleReceiptBundle },
) {
  return async function exportReceipts(req: RequestLike, res: ResponseLike) {
    try {
      validatePayload(req.body);

      const assembly = await deps.assembleBundle(req.body);

      res.setHeader?.('Content-Type', 'application/gzip');
      res.setHeader?.(
        'Content-Disposition',
        'attachment; filename="receipts-export.tgz"',
      );
      res.setHeader?.('X-Manifest-Id', assembly.manifest.id);

      res.status(200);
      res.send(assembly.bundle);

      return assembly.manifest;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Export generation failed';
      res.status(message.includes('required') ? 400 : 500);

      if ('json' in res && typeof res.json === 'function') {
        res.json({
          error: 'Failed to generate receipt export',
          detail: message,
        });
      } else {
        res.send({
          error: 'Failed to generate receipt export',
          detail: message,
        });
      }
      return null;
    }
  };
}

export const exportReceiptsHandler = buildReceiptExportHandler();
