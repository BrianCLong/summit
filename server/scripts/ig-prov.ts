import { provLedgerClient } from '../src/lib/prov-ledger.js';

const command = process.argv[2];
const args = process.argv.slice(3);

function getArg(name: string): string | undefined {
  const index = args.indexOf(`--${name}`);
  if (index !== -1 && args[index + 1]) {
    return args[index + 1];
  }
  return undefined;
}

async function main() {
  try {
    switch (command) {
      case 'init':
        console.log('Initializing Provenance Ledger Interface...');
        try {
          const health = await provLedgerClient.healthCheck();
          console.log('Service Health:', health);
        } catch (err: any) {
          console.error('Failed to connect to ledger service:', err.message);
          process.exit(1);
        }
        break;

      case 'attach': {
        const filePath = getArg('file');
        const claimJson = getArg('claim');

        if (!claimJson && !filePath) {
          console.error('Usage: attach --claim <json_string> OR --file <path>');
          process.exit(1);
        }

        let content: any = {};
        if (claimJson) {
            try {
                content = JSON.parse(claimJson);
            } catch (e) {
                console.error('Invalid JSON in --claim');
                process.exit(1);
            }
        }

        // If file provided, we could hash it or read it. For now, let's just use metadata.
        const metadata: any = {
            timestamp: new Date().toISOString()
        };
        if (filePath) {
            metadata.filePath = filePath;
        }

        const claim = await provLedgerClient.createClaim({
          content,
          metadata
        });
        console.log('Claim created:', JSON.stringify(claim, null, 2));
        break;
      }

      case 'verify': {
        const id = getArg('id');
        if (!id) {
          console.error('Usage: verify --id <claimId>');
          process.exit(1);
        }
        const claim = await provLedgerClient.getClaim(id);
        console.log('Claim verified:', JSON.stringify(claim, null, 2));
        break;
      }

      case 'export': {
        const manifest = await provLedgerClient.getExportManifest();
        console.log(JSON.stringify(manifest, null, 2));
        break;
      }

      default:
        console.log('Usage: ig-prov <init|attach|verify|export> [options]');
        break;
    }
  } catch (err: any) {
    console.error('Error executing command:', err.message || err);
    process.exit(1);
  }
}

main();
