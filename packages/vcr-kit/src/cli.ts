#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { mkdirSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import { Command } from 'commander';
import bs58 from 'bs58';
import { getPublicKey } from '@noble/ed25519';
import { issueConsentReceipt } from './issuer.js';
import { verifyConsentReceipt } from './verifier.js';
import { InMemoryDidResolver } from './dids.js';
import { FileRevocationRegistry, InMemoryRevocationRegistry } from './revocation.js';
import {
  ConsentReceiptClaims,
  ConsentPurpose,
  ConsentScope,
  ConsentSubject,
  DidDocument,
  VerifiableConsentReceipt,
} from './types.js';

const program = new Command();
program
  .name('vcr-kit')
  .description('Verifiable consent receipt issuing and verification toolkit')
  .version('0.1.0');

program
  .command('issue')
  .description('Issue a verifiable consent receipt credential')
  .requiredOption('--issuer-did <did>', 'Issuer DID (did:key or did:web)')
  .requiredOption('--issuer-key <secret>', 'Issuer private key (hex or base58)')
  .requiredOption('--subject <did>', 'Subject DID')
  .requiredOption('--tenant <tenant>', 'Tenant identifier')
  .requiredOption('--retention-policy <uri>', 'Retention policy URI')
  .requiredOption('--retention-expires <iso>', 'Retention expiry ISO-8601 timestamp')
  .option(
    '--purpose <id[:description]>',
    'Purpose identifier optionally with description',
    collectValues,
    [],
  )
  .option(
    '--scope <resource:action1,action2>',
    'Scope resource and actions',
    collectValues,
    [],
  )
  .option('--lawful-basis <basis>', 'Lawful basis for processing')
  .option('--policy-uri <uri>', 'Additional policy URI')
  .option('--expires <iso>', 'Credential expiry ISO timestamp')
  .option('--output <file>', 'Write credential to file (defaults to stdout)')
  .option('--revocation-list <uri>', 'Revocation list credential URI')
  .action(async (opts) => {
    const rawKey = parsePrivateKey(opts.issuerKey);
    const privateKey = normalizeEd25519Secret(rawKey);
    validateKeyMatchesDid(opts.issuerDid, privateKey);

    const purposes: ConsentPurpose[] = (opts.purpose ?? []).map(parsePurpose);
    const scopes: ConsentScope[] = (opts.scope ?? []).map(parseScope);
    if (scopes.length === 0) {
      throw new Error('At least one scope is required');
    }
    const claims: ConsentReceiptClaims = {
      purpose: purposes,
      scope: scopes,
      retention: {
        policyUri: opts.retentionPolicy,
        expiresAt: opts.retentionExpires,
      },
      tenant: opts.tenant,
      lawfulBasis: opts.lawfulBasis,
      policyUri: opts.policyUri,
    };

    const subject: ConsentSubject = { id: opts.subject };
    const credential = await issueConsentReceipt({
      issuerDid: opts.issuerDid,
      issuerPrivateKey: privateKey,
      subject,
      claims,
      expirationDate: opts.expires,
      revocationListCredential: opts.revocationList,
    });

    const serialized = JSON.stringify(credential, null, 2);
    if (opts.output) {
      mkdirSync(dirname(opts.output), { recursive: true });
      writeFileSync(opts.output, serialized, 'utf8');
    } else {
      process.stdout.write(`${serialized}\n`);
    }
  });

program
  .command('verify')
  .description('Verify a consent receipt credential offline')
  .argument('<credential>', 'Path to credential JSON file or - for stdin')
  .option('--revocations <file>', 'Path to revocation registry JSON file')
  .option(
    '--did-doc <did=path>',
    'Preload DID document for did:web issuers',
    collectValues,
    [],
  )
  .option('--at <iso>', 'Verification time ISO timestamp')
  .action(async (credentialPath, opts) => {
    const credential = loadCredential(credentialPath);
    const resolver = new InMemoryDidResolver(loadDidDocs(opts.didDoc ?? []));
    const registry = opts.revocations
      ? new FileRevocationRegistry(resolvePath(opts.revocations))
      : new InMemoryRevocationRegistry();
    const result = await verifyConsentReceipt(credential, {
      resolver,
      revocationRegistry: registry,
      atTime: opts.at,
    });
    if (!result.verified) {
      process.stderr.write(`❌ ${result.reason ?? 'Verification failed'}\n`);
      process.exitCode = 1;
      return;
    }
    process.stdout.write('✅ Receipt verified\n');
  });

program
  .command('revoke')
  .description('Add a credential ID to a revocation list file')
  .argument('<credentialId>', 'Credential identifier to revoke')
  .requiredOption('--revocations <file>', 'Path to revocation registry JSON file')
  .action(async (credentialId, opts) => {
    const registry = new FileRevocationRegistry(resolvePath(opts.revocations));
    await registry.revoke(credentialId);
    process.stdout.write(`Revoked ${credentialId}\n`);
  });

program.parseAsync(process.argv).catch((error) => {
  process.stderr.write(`Error: ${error.message}\n`);
  process.exit(1);
});

function collectValues(value: string, previous: string[] = []): string[] {
  return [...previous, value];
}

function parsePurpose(value: string): ConsentPurpose {
  const [purposeIdRaw, description] = value.split(':', 2);
  const purposeId = purposeIdRaw.trim();
  if (!purposeId) {
    throw new Error('Purpose identifier cannot be empty');
  }
  return { purposeId, description: description?.trim() || undefined };
}

function parseScope(value: string): ConsentScope {
  const [resourceRaw, actionPart] = value.split(':', 2);
  const resource = resourceRaw?.trim();
  const actions = actionPart
    ? actionPart
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean)
    : [];
  if (!resource || actions.length === 0) {
    throw new Error('Scope must be formatted as resource:action1,action2');
  }
  return { resource, actions };
}

function parsePrivateKey(value: string): Uint8Array {
  const normalized = value.trim();
  if (normalized.startsWith('base58:')) {
    return bs58.decode(normalized.slice('base58:'.length));
  }
  if (/^[0-9a-fA-F]+$/.test(normalized)) {
    return new Uint8Array(Buffer.from(normalized, 'hex'));
  }
  return bs58.decode(normalized);
}

function normalizeEd25519Secret(secret: Uint8Array): Uint8Array {
  if (secret.length === 32) {
    return secret;
  }
  if (secret.length === 64) {
    return secret.slice(0, 32);
  }
  throw new Error(`Unsupported Ed25519 secret key length: ${secret.length}`);
}

function validateKeyMatchesDid(did: string, secretKey: Uint8Array): void {
  if (!did.startsWith('did:key:')) {
    return;
  }
  const publicKey = getPublicKey(secretKey);
  const multicodec = Buffer.concat([
    Buffer.from([0xed, 0x01]),
    Buffer.from(publicKey),
  ]);
  const expectedDid = `did:key:z${bs58.encode(multicodec)}`;
  if (expectedDid !== did) {
    throw new Error('Issuer private key does not match issuer did:key');
  }
}

function loadCredential(path: string): VerifiableConsentReceipt {
  const contents =
    path === '-' ? readFileSync(0, 'utf8') : readFileSync(resolvePath(path), 'utf8');
  return JSON.parse(contents) as VerifiableConsentReceipt;
}

function loadDidDocs(entries: string[]): DidDocument[] {
  return entries.map((entry) => {
    const [did, path] = entry.split('=');
    if (!did || !path) {
      throw new Error(`Invalid DID document mapping: ${entry}`);
    }
    const doc = JSON.parse(readFileSync(resolvePath(path), 'utf8')) as DidDocument;
    return doc;
  });
}
