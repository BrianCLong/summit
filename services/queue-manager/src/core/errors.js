"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFatalError = exports.FatalJobError = exports.LeaseExpiredError = exports.LeaseAcquisitionError = void 0;
class LeaseAcquisitionError extends Error {
    key;
    constructor(key) {
        super(`lease already held for ${key}`);
        this.key = key;
        this.name = 'LeaseAcquisitionError';
    }
}
exports.LeaseAcquisitionError = LeaseAcquisitionError;
class LeaseExpiredError extends Error {
    key;
    constructor(key) {
        super(`lease expired for ${key}`);
        this.key = key;
        this.name = 'LeaseExpiredError';
    }
}
exports.LeaseExpiredError = LeaseExpiredError;
class FatalJobError extends Error {
    constructor(message) {
        super(message);
        this.name = 'FatalJobError';
    }
}
exports.FatalJobError = FatalJobError;
const isFatalError = (error) => error instanceof FatalJobError || error?.fatal === true;
exports.isFatalError = isFatalError;
