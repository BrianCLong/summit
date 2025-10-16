import { randomUUID } from 'crypto';
import { doclingService } from '../../services/DoclingService.js';

export interface DoclingPipelineInput {
  tenantId: string;
  buildId: string;
  requestId?: string;
  logText: string;
  sbomText?: string;
  diffText?: string;
  retention: 'short' | 'standard';
  purpose: string;
}

export interface DoclingPipelineResult {
  failure: Awaited<ReturnType<typeof doclingService.summarizeBuildFailure>>;
  compliance?: Awaited<ReturnType<typeof doclingService.extractLicenses>>;
  releaseNotes?: Awaited<
    ReturnType<typeof doclingService.generateReleaseNotes>
  >;
}

export class DoclingBuildPipeline {
  constructor(private service = doclingService) {}

  async execute(input: DoclingPipelineInput): Promise<DoclingPipelineResult> {
    const requestId = input.requestId ?? randomUUID();
    const failure = await this.service.summarizeBuildFailure({
      tenantId: input.tenantId,
      buildId: input.buildId,
      requestId: `${requestId}-failure`,
      logText: input.logText,
      retention: input.retention,
      purpose: input.purpose,
    });

    let compliance;
    if (input.sbomText) {
      compliance = await this.service.extractLicenses({
        tenantId: input.tenantId,
        requestId: `${requestId}-sbom`,
        text: input.sbomText,
        retention: input.retention,
        purpose: input.purpose,
        sourceType: 'SBOM',
      });
    }

    let releaseNotes;
    if (input.diffText) {
      releaseNotes = await this.service.generateReleaseNotes({
        tenantId: input.tenantId,
        requestId: `${requestId}-release`,
        diffText: input.diffText,
        retention: input.retention,
        purpose: input.purpose,
      });
    }

    return {
      failure,
      compliance,
      releaseNotes,
    };
  }
}
