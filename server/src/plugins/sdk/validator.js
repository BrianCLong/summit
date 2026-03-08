"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManifestValidator = void 0;
const types_js_1 = require("./types.js");
class ManifestValidator {
    static validate(manifest) {
        const result = types_js_1.PluginManifestSchema.safeParse(manifest);
        if (result.success) {
            return { success: true, data: result.data };
        }
        else {
            const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
            return { success: false, errors };
        }
    }
    static validateOrThrow(manifest) {
        const result = this.validate(manifest);
        if (!result.success) {
            throw new Error(`Invalid plugin manifest:\n${result.errors?.join('\n')}`);
        }
        return result.data;
    }
}
exports.ManifestValidator = ManifestValidator;
