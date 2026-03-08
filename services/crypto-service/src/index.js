"use strict";
/**
 * Crypto Service
 * Provides post-quantum cryptography and agility services
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const post_quantum_crypto_1 = require("@intelgraph/post-quantum-crypto");
const post_quantum_crypto_2 = require("@intelgraph/post-quantum-crypto");
const post_quantum_crypto_3 = require("@intelgraph/post-quantum-crypto");
const cryptographic_agility_1 = require("@intelgraph/cryptographic-agility");
const app = (0, express_1.default)();
app.use(express_1.default.json());
// Initialize services
const kyberKEM = (0, post_quantum_crypto_1.createKyberKEM)();
const dilithiumSig = (0, post_quantum_crypto_2.createDilithiumSignature)();
const hybridKEM = (0, post_quantum_crypto_3.createHybridKEM)();
const algorithmRegistry = (0, cryptographic_agility_1.createAlgorithmRegistry)();
const cryptoInventory = (0, cryptographic_agility_1.createCryptoInventory)();
const migrationPlanner = (0, cryptographic_agility_1.createMigrationPlanner)();
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
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
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
    const plans = migrationPlanner.listPlans(status);
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
exports.default = app;
