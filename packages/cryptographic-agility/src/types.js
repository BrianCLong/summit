"use strict";
/**
 * Cryptographic Agility Types
 * Defines interfaces for algorithm management and migration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlgorithmStatus = exports.CryptoOperation = void 0;
var CryptoOperation;
(function (CryptoOperation) {
    CryptoOperation["KEY_ENCAPSULATION"] = "key-encapsulation";
    CryptoOperation["DIGITAL_SIGNATURE"] = "digital-signature";
    CryptoOperation["ENCRYPTION"] = "encryption";
    CryptoOperation["HASHING"] = "hashing";
    CryptoOperation["KEY_DERIVATION"] = "key-derivation";
})(CryptoOperation || (exports.CryptoOperation = CryptoOperation = {}));
var AlgorithmStatus;
(function (AlgorithmStatus) {
    AlgorithmStatus["APPROVED"] = "approved";
    AlgorithmStatus["DEPRECATED"] = "deprecated";
    AlgorithmStatus["OBSOLETE"] = "obsolete";
    AlgorithmStatus["EXPERIMENTAL"] = "experimental";
})(AlgorithmStatus || (exports.AlgorithmStatus = AlgorithmStatus = {}));
