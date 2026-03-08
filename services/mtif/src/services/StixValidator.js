"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stixValidator = exports.StixValidator = void 0;
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const stix21_bundle_json_1 = __importDefault(require("../schema/stix21-bundle.json"));
class StixValidator {
    validator;
    constructor() {
        const ajv = new ajv_1.default({
            strict: false,
            allErrors: true,
            allowUnionTypes: true
        });
        (0, ajv_formats_1.default)(ajv);
        this.validator = ajv.compile(stix21_bundle_json_1.default);
    }
    validateBundle(bundle) {
        const valid = this.validator(bundle);
        if (!valid) {
            const errors = this.validator.errors?.map((error) => `${error.instancePath || '/'} ${error.message ?? ''}`.trim());
            throw new Error(`STIX bundle validation failed: ${errors?.join('; ') ?? 'unknown error'}`);
        }
    }
}
exports.StixValidator = StixValidator;
exports.stixValidator = new StixValidator();
