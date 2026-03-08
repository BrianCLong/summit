"use strict";
/**
 * Adversarial AI and ML Security Package
 *
 * Comprehensive adversarial machine learning capabilities including:
 * - White-box attacks (FGSM, PGD, C&W, DeepFool)
 * - Black-box attacks (ZOO, Boundary, Score-based)
 * - Model extraction and inversion
 * - Membership inference
 * - Robustness testing
 * - Defense evaluation
 * - Backdoor and poisoning detection
 */
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RobustnessTester = exports.ModelExtractionAttack = exports.MembershipInferenceAttack = exports.ModelInversionAttack = exports.BlackBoxAttack = exports.UniversalPerturbationAttack = exports.DeepFoolAttack = exports.CarliniWagnerAttack = exports.PGDAttack = exports.FGSMAttack = void 0;
// Types
__exportStar(require("./types.js"), exports);
// Attack implementations
var fgsm_js_1 = require("./attacks/fgsm.js");
Object.defineProperty(exports, "FGSMAttack", { enumerable: true, get: function () { return fgsm_js_1.FGSMAttack; } });
var pgd_js_1 = require("./attacks/pgd.js");
Object.defineProperty(exports, "PGDAttack", { enumerable: true, get: function () { return pgd_js_1.PGDAttack; } });
var cw_js_1 = require("./attacks/cw.js");
Object.defineProperty(exports, "CarliniWagnerAttack", { enumerable: true, get: function () { return cw_js_1.CarliniWagnerAttack; } });
var deepfool_js_1 = require("./attacks/deepfool.js");
Object.defineProperty(exports, "DeepFoolAttack", { enumerable: true, get: function () { return deepfool_js_1.DeepFoolAttack; } });
var universal_js_1 = require("./attacks/universal.js");
Object.defineProperty(exports, "UniversalPerturbationAttack", { enumerable: true, get: function () { return universal_js_1.UniversalPerturbationAttack; } });
var black_box_js_1 = require("./attacks/black-box.js");
Object.defineProperty(exports, "BlackBoxAttack", { enumerable: true, get: function () { return black_box_js_1.BlackBoxAttack; } });
var model_inversion_js_1 = require("./attacks/model-inversion.js");
Object.defineProperty(exports, "ModelInversionAttack", { enumerable: true, get: function () { return model_inversion_js_1.ModelInversionAttack; } });
Object.defineProperty(exports, "MembershipInferenceAttack", { enumerable: true, get: function () { return model_inversion_js_1.MembershipInferenceAttack; } });
Object.defineProperty(exports, "ModelExtractionAttack", { enumerable: true, get: function () { return model_inversion_js_1.ModelExtractionAttack; } });
// Robustness testing
var robustness_tester_js_1 = require("./robustness/robustness-tester.js");
Object.defineProperty(exports, "RobustnessTester", { enumerable: true, get: function () { return robustness_tester_js_1.RobustnessTester; } });
