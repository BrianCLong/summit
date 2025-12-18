import { defineTask } from '@summit/maestro-sdk';
import fs from 'node:fs';
import path from 'node:path';
import archiver from 'archiver';
import { sha256 } from '../util/hash.js';

interface ClassificationMarking {
  level: string;
  caveats?: string[];
  disseminationControls?: string[];
  owner?: string;
}

interface EvidenceFile {
  path: string;
  classification: ClassificationMarking;
  recipients?: string[];
  description?: string;
}

interface RedactionRule {
  id: string;
  pattern: string;
  replacement: string;
  description?: string;
  appliesTo?: string[];
  paths?: string[];
}

interface RecipientFileView {
  originalPath: string;
  packagedAs: string;
  sha256: string;
  classification: ClassificationMarking;
  appliedRedactions: string[];
  recipients: string[];
  description?: string;
}

interface RecipientView {
  recipient: string;
  files: RecipientFileView[];
  appliedRedactions: string[];
}

interface DisclosureManifest {
  generatedAt: string;
  classification: ClassificationMarking;
  banner?: string;
  recipients: string[];
  files: Array<{
    path: string;
    sha256: string;
    classification: ClassificationMarking;
    recipients: string[];
    description?: string;
  }>;
  redactionRules: Array<Omit<RedactionRule, 'pattern'>>;
  views: RecipientView[];
}

interface In {
  evidence: EvidenceFile[];
  recipients: string[];
  outPath: string;
  classification: ClassificationMarking;
  redactions?: RedactionRule[];
  banner?: string;
}

function applyRedactions(
  content: Buffer,
  rules: RedactionRule[],
  recipient: string,
  sourcePath: string,
): { content: Buffer; applied: string[] } {
  const applied: string[] = [];
  let current = content.toString('utf8');
  for (const rule of rules) {
    if (rule.appliesTo && !rule.appliesTo.includes(recipient)) {
      continue;
    }
    if (rule.paths && !rule.paths.includes(sourcePath)) {
      continue;
    }
    const before = current;
    current = current.replace(new RegExp(rule.pattern, 'g'), rule.replacement);
    if (before !== current) {
      applied.push(rule.id);
    }
  }
  return { content: Buffer.from(current, 'utf8'), applied };
}

export default defineTask<In, { bundle: string; manifest: DisclosureManifest }>({
  async execute(_ctx, { payload }) {
    const redactions = payload.redactions ?? [];
    const filesManifest = payload.evidence.map((file) => ({
      path: file.path,
      sha256: sha256(fs.readFileSync(file.path)),
      classification: file.classification,
      recipients: file.recipients ?? payload.recipients,
      description: file.description,
    }));

    const manifest: DisclosureManifest = {
      generatedAt: new Date().toISOString(),
      classification: payload.classification,
      banner: payload.banner,
      recipients: payload.recipients,
      files: filesManifest,
      redactionRules: redactions.map((rule) => ({
        id: rule.id,
        replacement: rule.replacement,
        description: rule.description,
        appliesTo: rule.appliesTo,
        paths: rule.paths,
      })),
      views: [],
    };

    const out = fs.createWriteStream(payload.outPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(out);

    for (const recipient of payload.recipients) {
      const viewFiles: RecipientFileView[] = [];
      for (const file of payload.evidence) {
        const allowedRecipients = file.recipients ?? payload.recipients;
        if (!allowedRecipients.includes(recipient)) {
          continue;
        }
        const rawContent = fs.readFileSync(file.path);
        const { content, applied } = applyRedactions(
          rawContent,
          redactions,
          recipient,
          file.path,
        );
        const packagedAs = path.posix.join('views', recipient, path.basename(file.path));
        archive.append(content, { name: packagedAs });
        viewFiles.push({
          originalPath: file.path,
          packagedAs,
          sha256: sha256(content),
          classification: file.classification,
          appliedRedactions: applied,
          recipients: allowedRecipients,
          description: file.description,
        });
      }
      manifest.views.push({
        recipient,
        files: viewFiles,
        appliedRedactions: Array.from(new Set(viewFiles.flatMap((f) => f.appliedRedactions))),
      });
    }

    archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

    await archive.finalize();

    return { payload: { bundle: payload.outPath, manifest } };
  },
});
