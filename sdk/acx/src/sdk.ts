import { ConsentArtifactSigner } from './artifact.js';
import { TemplatePack } from './templatePack.js';
import {
  ConsentArtifact,
  ConsentDecision,
  ConsentRecord,
  ExperimentDefinition,
  PolicyTemplatePack,
  RenderOptions
} from './types.js';

export class AdaptiveConsentSDK {
  private readonly templatePack: TemplatePack;

  constructor(private readonly pack: PolicyTemplatePack) {
    this.templatePack = new TemplatePack(pack);
  }

  public registerExperiment(definition: ExperimentDefinition): void {
    this.templatePack.registerExperiment(definition);
  }

  public render(options: RenderOptions) {
    return this.templatePack.render(options);
  }

  public createConsentRecord(userId: string, decision: ConsentDecision, options: RenderOptions): ConsentRecord {
    return this.templatePack.createConsentRecord(userId, decision, options).record;
  }

  public emitSignedArtifact(
    userId: string,
    decision: ConsentDecision,
    options: RenderOptions,
    privateKeyPem: string
  ): ConsentArtifact {
    const record = this.createConsentRecord(userId, decision, options);
    const signer = new ConsentArtifactSigner(privateKeyPem);
    return signer.sign(record);
  }

  public static verifyArtifact(artifact: ConsentArtifact, publicKeyPem: string): boolean {
    return ConsentArtifactSigner.verify(artifact, publicKeyPem);
  }
}
