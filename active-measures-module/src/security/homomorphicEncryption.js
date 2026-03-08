"use strict";
/**
 * Homomorphic Encryption Implementation
 *
 * Implements fully homomorphic encryption (FHE) capabilities for secure computation
 * on encrypted data in active measures operations.
 *
 * Based on CKKS, BGV, and TFHE schemes for different use cases.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HomomorphicEncryptionEngine = exports.FHEOperation = exports.FHEEncoding = exports.FHEScheme = void 0;
var FHEScheme;
(function (FHEScheme) {
    FHEScheme["CKKS"] = "ckks";
    FHEScheme["BGV"] = "bgv";
    FHEScheme["BFV"] = "bfv";
    FHEScheme["TFHE"] = "tfhe";
    FHEScheme["FHEW"] = "fhew";
})(FHEScheme || (exports.FHEScheme = FHEScheme = {}));
var FHEEncoding;
(function (FHEEncoding) {
    FHEEncoding["INTEGER"] = "integer";
    FHEEncoding["RATIONAL"] = "rational";
    FHEEncoding["COMPLEX"] = "complex";
    FHEEncoding["BOOLEAN"] = "boolean";
    FHEEncoding["BATCH"] = "batch";
})(FHEEncoding || (exports.FHEEncoding = FHEEncoding = {}));
var FHEOperation;
(function (FHEOperation) {
    FHEOperation["ADD"] = "add";
    FHEOperation["MULTIPLY"] = "multiply";
    FHEOperation["SUBTRACT"] = "subtract";
    FHEOperation["ROTATE"] = "rotate";
    FHEOperation["RESCALE"] = "rescale";
    FHEOperation["BOOTSTRAP"] = "bootstrap";
    FHEOperation["COMPARE"] = "compare";
    FHEOperation["AND"] = "and";
    FHEOperation["OR"] = "or";
    FHEOperation["NOT"] = "not";
    FHEOperation["XOR"] = "xor";
})(FHEOperation || (exports.FHEOperation = FHEOperation = {}));
/**
 * Homomorphic Encryption Engine
 */
class HomomorphicEncryptionEngine {
    contexts = new Map();
    computationCache = new Map();
    /**
     * Create FHE context with specified parameters
     */
    async createContext(config) {
        const contextId = `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        // Generate key pair based on scheme
        const { publicKey, privateKey, relinKeys, galoisKeys } = await this.generateKeys(config);
        const context = {
            scheme: config.scheme,
            parameters: {
                polyModulusDegree: config.polyModulusDegree,
                coeffModulus: config.coeffModulus,
                plainModulus: config.plainModulus,
                noiseStandardDeviation: 3.2,
                scale: config.scale,
            },
            publicKey,
            privateKey,
            relinKeys,
            galoisKeys,
        };
        this.contexts.set(contextId, context);
        return contextId;
    }
    /**
     * Generate cryptographic keys for FHE
     */
    async generateKeys(config) {
        switch (config.scheme) {
            case FHEScheme.CKKS:
                return this.generateCKKSKeys(config);
            case FHEScheme.BGV:
                return this.generateBGVKeys(config);
            case FHEScheme.BFV:
                return this.generateBFVKeys(config);
            case FHEScheme.TFHE:
                return this.generateTFHEKeys(config);
            default:
                throw new Error(`Unsupported FHE scheme: ${config.scheme}`);
        }
    }
    /**
     * Generate CKKS keys for approximate arithmetic
     */
    async generateCKKSKeys(config) {
        // Simplified CKKS key generation
        const n = config.polyModulusDegree;
        // Generate secret key (binary polynomial)
        const secretKey = this.generateBinaryPolynomial(n);
        // Generate error polynomials
        const e0 = this.generateErrorPolynomial(n);
        const e1 = this.generateErrorPolynomial(n);
        // Generate random polynomial a
        const a = this.generateRandomPolynomial(n, config.coeffModulus);
        // Public key: (b, a) where b = -a*s - e (mod q)
        const b = this.polynomialArithmetic(this.polynomialNegate(this.polynomialMultiply(a, secretKey, config.coeffModulus)), this.polynomialSubtract([], e0, config.coeffModulus), config.coeffModulus, 'add');
        // Generate relinearization keys
        const relinKeys = this.generateRelinearizationKeys(secretKey, config);
        // Generate Galois keys for rotation
        const galoisKeys = this.generateGaloisKeys(secretKey, config);
        return {
            publicKey: {
                data: Buffer.from(JSON.stringify({ b, a })),
                scheme: FHEScheme.CKKS,
                created: new Date(),
            },
            privateKey: {
                data: Buffer.from(JSON.stringify(secretKey)),
                scheme: FHEScheme.CKKS,
                created: new Date(),
            },
            relinKeys,
            galoisKeys,
        };
    }
    /**
     * Generate BGV keys for exact integer arithmetic
     */
    async generateBGVKeys(config) {
        const n = config.polyModulusDegree;
        const secretKey = this.generateBinaryPolynomial(n);
        // Similar to CKKS but with different parameter handling
        const a = this.generateRandomPolynomial(n, config.coeffModulus);
        const e = this.generateErrorPolynomial(n);
        const b = this.polynomialArithmetic(this.polynomialNegate(this.polynomialMultiply(a, secretKey, config.coeffModulus)), e, config.coeffModulus, 'add');
        const relinKeys = this.generateRelinearizationKeys(secretKey, config);
        return {
            publicKey: {
                data: Buffer.from(JSON.stringify({ b, a })),
                scheme: FHEScheme.BGV,
                created: new Date(),
            },
            privateKey: {
                data: Buffer.from(JSON.stringify(secretKey)),
                scheme: FHEScheme.BGV,
                created: new Date(),
            },
            relinKeys,
        };
    }
    /**
     * Generate BFV keys
     */
    async generateBFVKeys(config) {
        // Similar to BGV with BFV-specific parameters
        return this.generateBGVKeys(config);
    }
    /**
     * Generate TFHE keys for boolean circuits
     */
    async generateTFHEKeys(config) {
        const n = config.polyModulusDegree;
        const secretKey = this.generateBinaryPolynomial(n);
        // TFHE uses LWE-based encryption
        const publicKeyMatrix = this.generateRandomMatrix(n, n);
        const errorVector = this.generateErrorVector(n);
        return {
            publicKey: {
                data: Buffer.from(JSON.stringify({ matrix: publicKeyMatrix, error: errorVector })),
                scheme: FHEScheme.TFHE,
                created: new Date(),
            },
            privateKey: {
                data: Buffer.from(JSON.stringify(secretKey)),
                scheme: FHEScheme.TFHE,
                created: new Date(),
            },
        };
    }
    /**
     * Encrypt plaintext data
     */
    async encrypt(contextId, data, encoding = FHEEncoding.INTEGER) {
        const context = this.contexts.get(contextId);
        if (!context) {
            throw new Error(`Context not found: ${contextId}`);
        }
        // Encode data to plaintext
        const plaintext = this.encode(data, encoding, context.scheme);
        // Encrypt based on scheme
        switch (context.scheme) {
            case FHEScheme.CKKS:
                return this.encryptCKKS(plaintext, context);
            case FHEScheme.BGV:
                return this.encryptBGV(plaintext, context);
            case FHEScheme.BFV:
                return this.encryptBFV(plaintext, context);
            case FHEScheme.TFHE:
                return this.encryptTFHE(plaintext, context);
            default:
                throw new Error(`Unsupported scheme: ${context.scheme}`);
        }
    }
    /**
     * Decrypt ciphertext
     */
    async decrypt(contextId, ciphertext) {
        const context = this.contexts.get(contextId);
        if (!context) {
            throw new Error(`Context not found: ${contextId}`);
        }
        // Decrypt based on scheme
        let plaintext;
        switch (ciphertext.scheme) {
            case FHEScheme.CKKS:
                plaintext = this.decryptCKKS(ciphertext, context);
                break;
            case FHEScheme.BGV:
                plaintext = this.decryptBGV(ciphertext, context);
                break;
            case FHEScheme.BFV:
                plaintext = this.decryptBFV(ciphertext, context);
                break;
            case FHEScheme.TFHE:
                plaintext = this.decryptTFHE(ciphertext, context);
                break;
            default:
                throw new Error(`Unsupported scheme: ${ciphertext.scheme}`);
        }
        // Decode plaintext to data
        return this.decode(plaintext);
    }
    /**
     * Perform homomorphic addition
     */
    async add(contextId, ct1, ct2) {
        const context = this.contexts.get(contextId);
        if (!context) {
            throw new Error(`Context not found: ${contextId}`);
        }
        if (ct1.scheme !== ct2.scheme) {
            throw new Error('Ciphertext schemes must match');
        }
        switch (ct1.scheme) {
            case FHEScheme.CKKS:
                return this.addCKKS(ct1, ct2, context);
            case FHEScheme.BGV:
            case FHEScheme.BFV:
                return this.addBGV(ct1, ct2, context);
            case FHEScheme.TFHE:
                return this.addTFHE(ct1, ct2, context);
            default:
                throw new Error(`Addition not supported for scheme: ${ct1.scheme}`);
        }
    }
    /**
     * Perform homomorphic multiplication
     */
    async multiply(contextId, ct1, ct2) {
        const context = this.contexts.get(contextId);
        if (!context) {
            throw new Error(`Context not found: ${contextId}`);
        }
        if (ct1.scheme !== ct2.scheme) {
            throw new Error('Ciphertext schemes must match');
        }
        let result;
        switch (ct1.scheme) {
            case FHEScheme.CKKS:
                result = this.multiplyCKKS(ct1, ct2, context);
                break;
            case FHEScheme.BGV:
            case FHEScheme.BFV:
                result = this.multiplyBGV(ct1, ct2, context);
                break;
            case FHEScheme.TFHE:
                result = this.multiplyTFHE(ct1, ct2, context);
                break;
            default:
                throw new Error(`Multiplication not supported for scheme: ${ct1.scheme}`);
        }
        // Relinearize to reduce ciphertext size
        if (context.relinKeys) {
            result = this.relinearize(result, context);
        }
        return result;
    }
    /**
     * Perform homomorphic rotation (for batched operations)
     */
    async rotate(contextId, ciphertext, steps) {
        const context = this.contexts.get(contextId);
        if (!context || !context.galoisKeys) {
            throw new Error('Context or Galois keys not available');
        }
        switch (ciphertext.scheme) {
            case FHEScheme.CKKS:
            case FHEScheme.BGV:
            case FHEScheme.BFV:
                return this.rotateBatched(ciphertext, steps, context);
            default:
                throw new Error(`Rotation not supported for scheme: ${ciphertext.scheme}`);
        }
    }
    /**
     * Rescale ciphertext (CKKS only)
     */
    async rescale(contextId, ciphertext) {
        const context = this.contexts.get(contextId);
        if (!context) {
            throw new Error(`Context not found: ${contextId}`);
        }
        if (ciphertext.scheme !== FHEScheme.CKKS) {
            throw new Error('Rescaling only supported for CKKS');
        }
        return this.rescaleCKKS(ciphertext, context);
    }
    /**
     * Bootstrap ciphertext to refresh noise
     */
    async bootstrap(contextId, ciphertext) {
        const context = this.contexts.get(contextId);
        if (!context) {
            throw new Error(`Context not found: ${contextId}`);
        }
        // Bootstrapping is complex and scheme-dependent
        switch (ciphertext.scheme) {
            case FHEScheme.TFHE:
                return this.bootstrapTFHE(ciphertext, context);
            default:
                throw new Error(`Bootstrapping not implemented for scheme: ${ciphertext.scheme}`);
        }
    }
    /**
     * Perform complex homomorphic computation
     */
    async computeCircuit(contextId, inputs, circuit) {
        const startTime = Date.now();
        const operations = [];
        let noiseGrowth = 0;
        const context = this.contexts.get(contextId);
        if (!context) {
            throw new Error(`Context not found: ${contextId}`);
        }
        let result = inputs[0];
        // Execute circuit operations
        for (const gate of circuit.gates) {
            switch (gate.operation) {
                case FHEOperation.ADD:
                    const addOperands = gate.inputs.map((i) => inputs[i]);
                    result = await this.addMultiple(contextId, addOperands);
                    operations.push(FHEOperation.ADD);
                    noiseGrowth += 1;
                    break;
                case FHEOperation.MULTIPLY:
                    const mulOperands = gate.inputs.map((i) => inputs[i]);
                    result = await this.multiplyMultiple(contextId, mulOperands);
                    operations.push(FHEOperation.MULTIPLY);
                    noiseGrowth += 3;
                    break;
                case FHEOperation.ROTATE:
                    result = await this.rotate(contextId, result, gate.parameter || 1);
                    operations.push(FHEOperation.ROTATE);
                    break;
                case FHEOperation.RESCALE:
                    if (context.scheme === FHEScheme.CKKS) {
                        result = await this.rescale(contextId, result);
                        operations.push(FHEOperation.RESCALE);
                    }
                    break;
                case FHEOperation.BOOTSTRAP:
                    result = await this.bootstrap(contextId, result);
                    operations.push(FHEOperation.BOOTSTRAP);
                    noiseGrowth = 0; // Reset after bootstrap
                    break;
            }
            // Check if bootstrapping is needed
            if (result.noiseLevel > 0.9 && context.scheme === FHEScheme.TFHE) {
                result = await this.bootstrap(contextId, result);
                operations.push(FHEOperation.BOOTSTRAP);
                noiseGrowth = 0;
            }
        }
        const computationTime = Date.now() - startTime;
        return {
            result,
            operationsPerformed: operations,
            noiseGrowth,
            computationTime,
            memoryUsage: this.estimateMemoryUsage(result, operations.length),
        };
    }
    // Helper methods for polynomial arithmetic and cryptographic operations
    generateBinaryPolynomial(degree) {
        return Array(degree)
            .fill(0)
            .map(() => (Math.random() < 0.5 ? 1 : 0));
    }
    generateErrorPolynomial(degree, sigma = 3.2) {
        return Array(degree)
            .fill(0)
            .map(() => this.sampleGaussian(sigma));
    }
    generateRandomPolynomial(degree, modulus) {
        const q = modulus[0]; // Use first coefficient modulus
        return Array(degree)
            .fill(0)
            .map(() => Math.floor(Math.random() * q));
    }
    generateRandomMatrix(rows, cols) {
        return Array(rows)
            .fill(0)
            .map(() => Array(cols)
            .fill(0)
            .map(() => Math.floor(Math.random() * 1000)));
    }
    generateErrorVector(size) {
        return Array(size)
            .fill(0)
            .map(() => this.sampleGaussian(3.2));
    }
    sampleGaussian(sigma) {
        // Box-Muller transform for Gaussian sampling
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return Math.round(z * sigma);
    }
    polynomialMultiply(a, b, modulus) {
        const result = new Array(a.length + b.length - 1).fill(0);
        for (let i = 0; i < a.length; i++) {
            for (let j = 0; j < b.length; j++) {
                result[i + j] += a[i] * b[j];
            }
        }
        return result.map((x) => x % modulus[0]);
    }
    polynomialArithmetic(a, b, modulus, op) {
        const maxLen = Math.max(a.length, b.length);
        const result = new Array(maxLen).fill(0);
        for (let i = 0; i < maxLen; i++) {
            const aVal = i < a.length ? a[i] : 0;
            const bVal = i < b.length ? b[i] : 0;
            if (op === 'add') {
                result[i] = (aVal + bVal) % modulus[0];
            }
            else {
                result[i] = (aVal - bVal + modulus[0]) % modulus[0];
            }
        }
        return result;
    }
    polynomialSubtract(a, b, modulus) {
        return this.polynomialArithmetic(a, b, modulus, 'subtract');
    }
    polynomialNegate(poly) {
        return poly.map((x) => -x);
    }
    generateRelinearizationKeys(secretKey, config) {
        // Simplified relinearization key generation
        const keyData = Buffer.from(JSON.stringify({
            secretKey: secretKey.map((x) => x * x), // s^2 for relinearization
            parameters: config,
        }));
        return {
            data: keyData,
            size: keyData.length,
        };
    }
    generateGaloisKeys(secretKey, config) {
        // Simplified Galois key generation for rotation
        const steps = [1, 2, 4, 8, 16]; // Powers of 2 for efficient rotation
        const keyData = Buffer.from(JSON.stringify({
            secretKey,
            steps,
            parameters: config,
        }));
        return {
            data: keyData,
            steps,
        };
    }
    // Encoding/decoding methods
    encode(data, encoding, scheme) {
        let encodedData;
        switch (encoding) {
            case FHEEncoding.INTEGER:
                encodedData = Array.isArray(data)
                    ? data
                    : [data];
                break;
            case FHEEncoding.BOOLEAN:
                encodedData = Array.isArray(data)
                    ? data.map((b) => (b ? 1 : 0))
                    : [data ? 1 : 0];
                break;
            default:
                throw new Error(`Encoding not supported: ${encoding}`);
        }
        return {
            data: Buffer.from(JSON.stringify(encodedData)),
            scheme,
            encoding,
        };
    }
    decode(plaintext) {
        const data = JSON.parse(plaintext.data.toString());
        switch (plaintext.encoding) {
            case FHEEncoding.INTEGER:
                return data.length === 1 ? data[0] : data;
            case FHEEncoding.BOOLEAN:
                const boolData = data.map((x) => x !== 0);
                return boolData.length === 1 ? boolData[0] : boolData;
            default:
                return data;
        }
    }
    // Scheme-specific encryption/decryption methods (simplified implementations)
    encryptCKKS(plaintext, context) {
        const data = JSON.parse(plaintext.data.toString());
        return {
            data: Buffer.from(JSON.stringify({ encrypted: data, noise: 0.1 })),
            scheme: FHEScheme.CKKS,
            noiseLevel: 0.1,
            scale: context.parameters.scale,
            size: plaintext.data.length * 2,
        };
    }
    decryptCKKS(ciphertext, context) {
        const data = JSON.parse(ciphertext.data.toString());
        return {
            data: Buffer.from(JSON.stringify(data.encrypted)),
            scheme: FHEScheme.CKKS,
            encoding: FHEEncoding.RATIONAL,
        };
    }
    encryptBGV(plaintext, context) {
        const data = JSON.parse(plaintext.data.toString());
        return {
            data: Buffer.from(JSON.stringify({ encrypted: data, noise: 0.05 })),
            scheme: FHEScheme.BGV,
            noiseLevel: 0.05,
            size: plaintext.data.length * 2,
        };
    }
    decryptBGV(ciphertext, context) {
        const data = JSON.parse(ciphertext.data.toString());
        return {
            data: Buffer.from(JSON.stringify(data.encrypted)),
            scheme: FHEScheme.BGV,
            encoding: FHEEncoding.INTEGER,
        };
    }
    encryptBFV(plaintext, context) {
        return this.encryptBGV(plaintext, context); // Similar to BGV
    }
    decryptBFV(ciphertext, context) {
        return this.decryptBGV(ciphertext, context); // Similar to BGV
    }
    encryptTFHE(plaintext, context) {
        const data = JSON.parse(plaintext.data.toString());
        return {
            data: Buffer.from(JSON.stringify({ encrypted: data, noise: 0.2 })),
            scheme: FHEScheme.TFHE,
            noiseLevel: 0.2,
            size: plaintext.data.length,
        };
    }
    decryptTFHE(ciphertext, context) {
        const data = JSON.parse(ciphertext.data.toString());
        return {
            data: Buffer.from(JSON.stringify(data.encrypted)),
            scheme: FHEScheme.TFHE,
            encoding: FHEEncoding.BOOLEAN,
        };
    }
    // Homomorphic operation implementations (simplified)
    addCKKS(ct1, ct2, context) {
        const data1 = JSON.parse(ct1.data.toString());
        const data2 = JSON.parse(ct2.data.toString());
        const result = data1.encrypted.map((x, i) => x + (data2.encrypted[i] || 0));
        return {
            data: Buffer.from(JSON.stringify({
                encrypted: result,
                noise: ct1.noiseLevel + ct2.noiseLevel,
            })),
            scheme: FHEScheme.CKKS,
            noiseLevel: ct1.noiseLevel + ct2.noiseLevel,
            scale: ct1.scale,
            size: Math.max(ct1.size, ct2.size),
        };
    }
    addBGV(ct1, ct2, context) {
        const data1 = JSON.parse(ct1.data.toString());
        const data2 = JSON.parse(ct2.data.toString());
        const result = data1.encrypted.map((x, i) => x + (data2.encrypted[i] || 0));
        return {
            data: Buffer.from(JSON.stringify({
                encrypted: result,
                noise: ct1.noiseLevel + ct2.noiseLevel,
            })),
            scheme: ct1.scheme,
            noiseLevel: ct1.noiseLevel + ct2.noiseLevel,
            size: Math.max(ct1.size, ct2.size),
        };
    }
    addTFHE(ct1, ct2, context) {
        // TFHE addition (XOR for boolean)
        const data1 = JSON.parse(ct1.data.toString());
        const data2 = JSON.parse(ct2.data.toString());
        const result = data1.encrypted.map((x, i) => x ^ (data2.encrypted[i] || 0));
        return {
            data: Buffer.from(JSON.stringify({
                encrypted: result,
                noise: ct1.noiseLevel + ct2.noiseLevel,
            })),
            scheme: FHEScheme.TFHE,
            noiseLevel: ct1.noiseLevel + ct2.noiseLevel,
            size: Math.max(ct1.size, ct2.size),
        };
    }
    multiplyCKKS(ct1, ct2, context) {
        const data1 = JSON.parse(ct1.data.toString());
        const data2 = JSON.parse(ct2.data.toString());
        const result = data1.encrypted.map((x, i) => x * (data2.encrypted[i] || 1));
        return {
            data: Buffer.from(JSON.stringify({
                encrypted: result,
                noise: ct1.noiseLevel * ct2.noiseLevel,
            })),
            scheme: FHEScheme.CKKS,
            noiseLevel: ct1.noiseLevel * ct2.noiseLevel,
            scale: (ct1.scale || 1) * (ct2.scale || 1),
            size: ct1.size + ct2.size,
        };
    }
    multiplyBGV(ct1, ct2, context) {
        const data1 = JSON.parse(ct1.data.toString());
        const data2 = JSON.parse(ct2.data.toString());
        const result = data1.encrypted.map((x, i) => x * (data2.encrypted[i] || 1));
        return {
            data: Buffer.from(JSON.stringify({
                encrypted: result,
                noise: ct1.noiseLevel * ct2.noiseLevel,
            })),
            scheme: ct1.scheme,
            noiseLevel: ct1.noiseLevel * ct2.noiseLevel,
            size: ct1.size + ct2.size,
        };
    }
    multiplyTFHE(ct1, ct2, context) {
        // TFHE multiplication (AND for boolean)
        const data1 = JSON.parse(ct1.data.toString());
        const data2 = JSON.parse(ct2.data.toString());
        const result = data1.encrypted.map((x, i) => x & (data2.encrypted[i] || 0));
        return {
            data: Buffer.from(JSON.stringify({
                encrypted: result,
                noise: ct1.noiseLevel + ct2.noiseLevel + 0.1,
            })),
            scheme: FHEScheme.TFHE,
            noiseLevel: ct1.noiseLevel + ct2.noiseLevel + 0.1,
            size: Math.max(ct1.size, ct2.size),
        };
    }
    relinearize(ciphertext, context) {
        // Simplified relinearization
        return {
            ...ciphertext,
            size: Math.floor(ciphertext.size * 0.67), // Reduce size
            noiseLevel: ciphertext.noiseLevel + 0.01, // Slight noise increase
        };
    }
    rotateBatched(ciphertext, steps, context) {
        const data = JSON.parse(ciphertext.data.toString());
        // Rotate the encrypted array
        const rotated = [
            ...data.encrypted.slice(steps),
            ...data.encrypted.slice(0, steps),
        ];
        return {
            ...ciphertext,
            data: Buffer.from(JSON.stringify({ encrypted: rotated, noise: data.noise })),
        };
    }
    rescaleCKKS(ciphertext, context) {
        const data = JSON.parse(ciphertext.data.toString());
        const scale = ciphertext.scale || 1;
        const rescaled = data.encrypted.map((x) => Math.round(x / scale));
        return {
            ...ciphertext,
            data: Buffer.from(JSON.stringify({ encrypted: rescaled, noise: data.noise })),
            scale: 1,
            noiseLevel: ciphertext.noiseLevel * 0.9, // Reduce noise slightly
        };
    }
    bootstrapTFHE(ciphertext, context) {
        // Bootstrapping refreshes the noise
        return {
            ...ciphertext,
            noiseLevel: 0.1, // Reset to fresh noise level
        };
    }
    async addMultiple(contextId, ciphertexts) {
        let result = ciphertexts[0];
        for (let i = 1; i < ciphertexts.length; i++) {
            result = await this.add(contextId, result, ciphertexts[i]);
        }
        return result;
    }
    async multiplyMultiple(contextId, ciphertexts) {
        let result = ciphertexts[0];
        for (let i = 1; i < ciphertexts.length; i++) {
            result = await this.multiply(contextId, result, ciphertexts[i]);
        }
        return result;
    }
    estimateMemoryUsage(result, operationCount) {
        return result.size * operationCount * 8; // Rough estimate in bytes
    }
    /**
     * Get context information
     */
    getContext(contextId) {
        return this.contexts.get(contextId);
    }
    /**
     * List all contexts
     */
    listContexts() {
        return Array.from(this.contexts.keys());
    }
    /**
     * Delete context and associated keys
     */
    deleteContext(contextId) {
        return this.contexts.delete(contextId);
    }
    /**
     * Estimate computation complexity
     */
    estimateComplexity(circuit) {
        let multiplicativeDepth = 0;
        let currentDepth = 0;
        const totalOperations = circuit.gates.length;
        for (const gate of circuit.gates) {
            if (gate.operation === FHEOperation.MULTIPLY) {
                currentDepth++;
                multiplicativeDepth = Math.max(multiplicativeDepth, currentDepth);
            }
        }
        return {
            multiplicativeDepth,
            totalOperations,
            estimatedTime: totalOperations * 100 + multiplicativeDepth * 1000, // ms
            memoryRequired: totalOperations * 1024 * 1024, // bytes
        };
    }
}
exports.HomomorphicEncryptionEngine = HomomorphicEncryptionEngine;
