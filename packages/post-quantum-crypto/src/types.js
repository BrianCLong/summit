"use strict";
/**
 * Post-Quantum Cryptography Types
 * Defines interfaces for NIST PQC algorithms
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityLevel = exports.PQCAlgorithm = void 0;
var PQCAlgorithm;
(function (PQCAlgorithm) {
    PQCAlgorithm["KYBER_512"] = "kyber-512";
    PQCAlgorithm["KYBER_768"] = "kyber-768";
    PQCAlgorithm["KYBER_1024"] = "kyber-1024";
    PQCAlgorithm["DILITHIUM_2"] = "dilithium-2";
    PQCAlgorithm["DILITHIUM_3"] = "dilithium-3";
    PQCAlgorithm["DILITHIUM_5"] = "dilithium-5";
    PQCAlgorithm["FALCON_512"] = "falcon-512";
    PQCAlgorithm["FALCON_1024"] = "falcon-1024";
    PQCAlgorithm["SPHINCS_PLUS_128F"] = "sphincs-plus-128f";
    PQCAlgorithm["SPHINCS_PLUS_128S"] = "sphincs-plus-128s";
    PQCAlgorithm["SPHINCS_PLUS_192F"] = "sphincs-plus-192f";
    PQCAlgorithm["SPHINCS_PLUS_192S"] = "sphincs-plus-192s";
    PQCAlgorithm["SPHINCS_PLUS_256F"] = "sphincs-plus-256f";
    PQCAlgorithm["SPHINCS_PLUS_256S"] = "sphincs-plus-256s";
})(PQCAlgorithm || (exports.PQCAlgorithm = PQCAlgorithm = {}));
var SecurityLevel;
(function (SecurityLevel) {
    SecurityLevel[SecurityLevel["LEVEL_1"] = 1] = "LEVEL_1";
    SecurityLevel[SecurityLevel["LEVEL_2"] = 2] = "LEVEL_2";
    SecurityLevel[SecurityLevel["LEVEL_3"] = 3] = "LEVEL_3";
    SecurityLevel[SecurityLevel["LEVEL_4"] = 4] = "LEVEL_4";
    SecurityLevel[SecurityLevel["LEVEL_5"] = 5] = "LEVEL_5";
})(SecurityLevel || (exports.SecurityLevel = SecurityLevel = {}));
