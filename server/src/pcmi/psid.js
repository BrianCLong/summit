"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computePolicyScopeId = exports.normalizeSubjectBucket = void 0;
const crypto_1 = require("crypto");
const serializeAttributes = (attributes) => {
    return Object.keys(attributes)
        .sort()
        .map((key) => `${key}:${String(attributes[key])}`)
        .join('|');
};
const normalizeSubjectBucket = (subjectBucket) => {
    const roles = [...subjectBucket.roles].sort((a, b) => a.localeCompare(b));
    const attributes = {};
    Object.keys(subjectBucket.attributes)
        .sort()
        .forEach((key) => {
        attributes[key] = subjectBucket.attributes[key];
    });
    return { roles, attributes };
};
exports.normalizeSubjectBucket = normalizeSubjectBucket;
const computePolicyScopeId = (scope) => {
    const normalizedScope = {
        ...scope,
        subjectBucket: (0, exports.normalizeSubjectBucket)(scope.subjectBucket),
    };
    const scopeString = [
        normalizedScope.tenant,
        normalizedScope.purpose,
        normalizedScope.subjectBucket.roles.join(','),
        serializeAttributes(normalizedScope.subjectBucket.attributes),
        normalizedScope.policyVersion,
        normalizedScope.schemaVersion,
    ].join('::');
    return (0, crypto_1.createHash)('sha256').update(scopeString).digest('hex');
};
exports.computePolicyScopeId = computePolicyScopeId;
