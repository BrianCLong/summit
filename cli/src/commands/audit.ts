import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { AuditExporter, verifyChain, verifySignature } from '../lib/audit-exporter.js';
import { success, error } from '../utils/output.js';

export function registerAuditCommands(program: Command): void {
  const audit = program.command('audit').description('Audit trail export and verification');
  const exporter = new AuditExporter();

  audit
    .command('export')
    .description('Export audit events to a signed manifest')
    .requiredOption('-c, --customer <customer>', 'Customer/tenant id to filter events')
    .option('--from <from>', 'ISO-8601 start timestamp')
    .option('--to <to>', 'ISO-8601 end timestamp')
    .option('--store <path>', 'Path to append-only audit store')
    .option('-o, --output <dir>', 'Output directory for exports')
    .option('--signing-key <path>', 'Path to Ed25519 private key for signing manifest')
    .action(async (opts) => {
      try {
        const { manifest, directory } = await exporter.export({
          customer: opts.customer,
          from: opts.from,
          to: opts.to,
          storePath: opts.store,
          outputDir: opts.output,
          signingKeyPath: opts.signingKey,
        });

        success('Audit export completed');
        console.log(`Directory: ${directory}`);
        console.log(`Events file: ${manifest.events_file}`);
        console.log(`Event count: ${manifest.event_count}`);
        console.log(`Hash chain valid: ${manifest.hash_chain.valid}`);
        console.log(`Signature present: ${!!manifest.signature}`);
      } catch (err: any) {
        error(err.message ?? 'Audit export failed');
        process.exit(1);
      }
    });

  audit
    .command('verify <manifest>')
    .description('Verify a signed audit manifest and the exported hash chain')
    .option('--public-key <path>', 'Optional path to public key for signature verification')
    .option('--events <path>', 'Optional path to exported events file')
    .action(async (manifestPath: string, opts) => {
      try {
        const manifest = JSON.parse(await fs.promises.readFile(manifestPath, 'utf8'));
        const publicKey = opts.publicKey
          ? await fs.promises.readFile(opts.publicKey, 'utf8')
          : undefined;
        const signatureOk = verifySignature(manifest, publicKey);

        const manifestDir = manifestPath.endsWith('.json')
          ? path.dirname(manifestPath)
          : process.cwd();
        const eventsPath = opts.events
          ? opts.events
          : manifest.events_file
          ? path.resolve(manifestDir || '.', manifest.events_file)
          : undefined;

        const chainRecords = eventsPath
          ? (await fs.promises
              .readFile(eventsPath, 'utf8'))
              .split('\n')
              .filter(Boolean)
              .map((line) => JSON.parse(line))
          : [];
        const chainOk = chainRecords.length
          ? verifyChain(chainRecords, manifest.hash_chain?.start ?? 'GENESIS')
          : false;

        if (signatureOk && chainOk) {
          success('Manifest signature and chain verified');
        } else {
          error('Verification failed');
          console.log(` signature valid: ${signatureOk}`);
          console.log(` hash chain valid: ${chainOk}`);
          process.exit(1);
        }
      } catch (err: any) {
        error(err.message ?? 'Verification failed');
        process.exit(1);
      }
    });
}
