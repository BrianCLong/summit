import { ExecutionReceipt } from '@intelgraph/provenance';
import { ReceiptSignerService } from './signerService';

export interface PipelineContext {
  receipt: ExecutionReceipt;
}

export interface ExecutionPipeline {
  use(
    stage: 'pre-export' | 'post-execution',
    handler: (ctx: PipelineContext) => Promise<void>,
  ): void;
}

export function attachReceiptSigning(
  pipeline: ExecutionPipeline,
  signer: ReceiptSignerService,
): void {
  pipeline.use('post-execution', async (ctx) => {
    ctx.receipt = await signer.sign(ctx.receipt);
  });
}
