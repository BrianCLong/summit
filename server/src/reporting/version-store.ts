import crypto from 'crypto';
import { ReportArtifact, ReportTemplate, ReportVersion } from './types';

export class VersionStore {
  private readonly versionsByTemplate = new Map<string, ReportVersion[]>();

  record(template: ReportTemplate, artifact: ReportArtifact, createdBy: string): ReportVersion {
    const checksum = crypto.createHash('sha256').update(artifact.buffer).digest('hex');
    const version: ReportVersion = {
      id: crypto.randomUUID(),
      templateId: template.id,
      checksum,
      createdAt: new Date(),
      createdBy,
      metadata: { mimeType: artifact.mimeType, format: artifact.format },
    };
    const versions = this.versionsByTemplate.get(template.id) || [];
    versions.push(version);
    this.versionsByTemplate.set(template.id, versions);
    return version;
  }

  history(templateId: string): ReportVersion[] {
    return [...(this.versionsByTemplate.get(templateId) || [])].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }
}
