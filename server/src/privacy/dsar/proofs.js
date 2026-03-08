"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDeletionProofs = exports.validateDeletionProofAgainstSnapshot = exports.validateDeletionProof = exports.buildDeletionProof = exports.validateRectificationProof = exports.buildRectificationProof = exports.hashDeterministic = void 0;
const crypto = __importStar(require("crypto"));
const sortObject = (value) => {
    if (Array.isArray(value)) {
        return value.map((item) => sortObject(item));
    }
    if (value && typeof value === 'object') {
        return Object.keys(value)
            .sort()
            .reduce((acc, key) => {
            acc[key] = sortObject(value[key]);
            return acc;
        }, {});
    }
    return value;
};
const hashDeterministic = (value) => {
    const normalized = JSON.stringify(sortObject(value));
    return crypto.createHash('sha256').update(normalized).digest('hex');
};
exports.hashDeterministic = hashDeterministic;
const buildRectificationProof = (requestId, connector, before, after, changes) => ({
    requestId,
    connector,
    beforeHash: (0, exports.hashDeterministic)(before),
    afterHash: (0, exports.hashDeterministic)(after),
    afterSnapshot: after,
    changes,
});
exports.buildRectificationProof = buildRectificationProof;
const validateRectificationProof = (proof) => {
    if (!proof.afterSnapshot) {
        return false;
    }
    const recomputedAfter = (0, exports.hashDeterministic)(proof.afterSnapshot);
    return (recomputedAfter === proof.afterHash && proof.afterHash !== proof.beforeHash);
};
exports.validateRectificationProof = validateRectificationProof;
const buildDeletionProof = (requestId, connector, subjectId, snapshot) => ({
    requestId,
    connector,
    subjectId,
    subjectHash: (0, exports.hashDeterministic)(subjectId),
    remainingSubjectIds: [...snapshot.subjectIds],
    subjectListHash: (0, exports.hashDeterministic)(snapshot.subjectIds),
    dataHash: (0, exports.hashDeterministic)(snapshot.data),
});
exports.buildDeletionProof = buildDeletionProof;
const validateDeletionProof = (proof) => {
    const subjectMissing = !proof.remainingSubjectIds.includes(proof.subjectId);
    const listHashMatches = (0, exports.hashDeterministic)(proof.remainingSubjectIds) === proof.subjectListHash;
    return (subjectMissing &&
        listHashMatches &&
        typeof proof.dataHash === 'string' &&
        proof.dataHash.length === 64);
};
exports.validateDeletionProof = validateDeletionProof;
const validateDeletionProofAgainstSnapshot = (proof, snapshot) => {
    const subjectMissing = !snapshot.subjectIds.includes(proof.subjectId);
    const subjectListHashMatches = (0, exports.hashDeterministic)(snapshot.subjectIds) === proof.subjectListHash;
    const dataHashMatches = (0, exports.hashDeterministic)(snapshot.data) === proof.dataHash;
    return subjectMissing && subjectListHashMatches && dataHashMatches;
};
exports.validateDeletionProofAgainstSnapshot = validateDeletionProofAgainstSnapshot;
const validateDeletionProofs = (proofs, subjectId) => proofs.every((proof) => (0, exports.validateDeletionProof)(proof) && proof.subjectId === subjectId);
exports.validateDeletionProofs = validateDeletionProofs;
