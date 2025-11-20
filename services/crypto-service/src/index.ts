/**
 * Crypto Service
 * Provides post-quantum cryptography and agility services
 */

import express from 'express';
import { createKyberKEM } from '@summit/post-quantum-crypto';
import { createDilithiumSignature } from '@summit/post-quantum-crypto';
import { createHybridKEM } from '@summit/post-quantum-crypto';
import { createAlgorithmRegistry, createCryptoInventory, createMigrationPlanner } from '@summit/cryptographic-agility';

const app = express();
app.use(express.json());

// Initialize services
const kyberKEM = createKyberKEM();
const dilithiumSig = createDilithiumSignature();
const hybridKEM = createHybridKEM();
const algorithmRegistry = createAlgorithmRegistry();
const cryptoInventory = createCryptoInventory();
const migrationPlanner = createMigrationPlanner();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'crypto-service', quantum: 'ready' });
});

// Key Generation
app.post('/api/v1/keys/generate', async (req, res) => {
  try {
    const { algorithm, securityLevel } = req.body;

    let keyPair;
    switch (algorithm) {
      case 'kyber':
        keyPair = await kyberKEM.generateKeyPair();
        break;
      case 'dilithium':
        keyPair = await dilithiumSig.generateKeyPair();
        break;
      case 'hybrid':
        keyPair = await hybridKEM.generateKeyPair();
        break;
      default:
        return res.status(400).json({ error: 'Unsupported algorithm' });
    }

    res.json({
      algorithm: keyPair.algorithm,
      publicKey: Buffer.from(keyPair.publicKey).toString('base64'),
      privateKey: Buffer.from(keyPair.privateKey).toString('base64'),
      securityLevel: keyPair.securityLevel,
      createdAt: keyPair.createdAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Key Encapsulation
app.post('/api/v1/kem/encapsulate', async (req, res) => {
  try {
    const { publicKey, algorithm } = req.body;
    const pubKeyBytes = Uint8Array.from(Buffer.from(publicKey, 'base64'));

    const kem = algorithm === 'hybrid' ? hybridKEM : kyberKEM;
    const { ciphertext, sharedSecret } = await kem.encapsulate(pubKeyBytes);

    res.json({
      ciphertext: Buffer.from(ciphertext).toString('base64'),
      sharedSecret: Buffer.from(sharedSecret).toString('base64'),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Key Decapsulation
app.post('/api/v1/kem/decapsulate', async (req, res) => {
  try {
    const { ciphertext, privateKey, algorithm } = req.body;
    const ctBytes = Uint8Array.from(Buffer.from(ciphertext, 'base64'));
    const privKeyBytes = Uint8Array.from(Buffer.from(privateKey, 'base64'));

    const kem = algorithm === 'hybrid' ? hybridKEM : kyberKEM;
    const sharedSecret = await kem.decapsulate(ctBytes, privKeyBytes);

    res.json({
      sharedSecret: Buffer.from(sharedSecret).toString('base64'),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Digital Signature
app.post('/api/v1/signature/sign', async (req, res) => {
  try {
    const { message, privateKey } = req.body;
    const messageBytes = Uint8Array.from(Buffer.from(message, 'base64'));
    const privKeyBytes = Uint8Array.from(Buffer.from(privateKey, 'base64'));

    const sig = await dilithiumSig.sign(messageBytes, privKeyBytes);

    res.json({
      signature: Buffer.from(sig.signature).toString('base64'),
      algorithm: sig.algorithm,
      timestamp: sig.timestamp,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Signature Verification
app.post('/api/v1/signature/verify', async (req, res) => {
  try {
    const { message, signature, publicKey } = req.body;
    const messageBytes = Uint8Array.from(Buffer.from(message, 'base64'));
    const sigBytes = Uint8Array.from(Buffer.from(signature, 'base64'));
    const pubKeyBytes = Uint8Array.from(Buffer.from(publicKey, 'base64'));

    const isValid = await dilithiumSig.verify(messageBytes, sigBytes, pubKeyBytes);

    res.json({ valid: isValid });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Algorithm Registry
app.get('/api/v1/algorithms', (req, res) => {
  const algorithms = algorithmRegistry.list();
  res.json({ algorithms });
});

app.get('/api/v1/algorithms/:id', (req, res) => {
  const algorithm = algorithmRegistry.get(req.params.id);
  if (!algorithm) {
    return res.status(404).json({ error: 'Algorithm not found' });
  }
  res.json({ algorithm });
});

// Crypto Inventory
app.post('/api/v1/inventory/scan', async (req, res) => {
  try {
    const { paths } = req.body;
    const items = await cryptoInventory.scan(paths);
    res.json({ items, count: items.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/inventory', (req, res) => {
  const items = cryptoInventory.getAll();
  res.json({ items, count: items.length });
});

app.get('/api/v1/inventory/high-priority', (req, res) => {
  const items = cryptoInventory.getHighPriority();
  res.json({ items, count: items.length });
});

// Migration Planning
app.post('/api/v1/migration/plan', (req, res) => {
  const { source, target } = req.body;
  const plan = migrationPlanner.createPlan(source, target);
  res.json({ plan });
});

app.get('/api/v1/migration/plans', (req, res) => {
  const { status } = req.query;
  const plans = migrationPlanner.listPlans(status as any);
  res.json({ plans, count: plans.length });
});

app.get('/api/v1/migration/plans/:id', (req, res) => {
  const plan = migrationPlanner.getPlan(req.params.id);
  if (!plan) {
    return res.status(404).json({ error: 'Migration plan not found' });
  }
  res.json({ plan });
});

app.post('/api/v1/migration/plans/:id/validate', async (req, res) => {
  const isValid = await migrationPlanner.validatePlan(req.params.id);
  res.json({ valid: isValid });
});

const PORT = process.env.CRYPTO_SERVICE_PORT || 3001;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Crypto Service listening on port ${PORT}`);
    console.log('Post-Quantum Cryptography: ENABLED');
    console.log('Cryptographic Agility: ENABLED');
  });
}

export default app;
