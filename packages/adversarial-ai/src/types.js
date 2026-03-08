"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefenseMechanism = exports.AdversarialAttackType = void 0;
/**
 * Adversarial Attack Types
 */
var AdversarialAttackType;
(function (AdversarialAttackType) {
    AdversarialAttackType["FGSM"] = "FGSM";
    AdversarialAttackType["PGD"] = "PGD";
    AdversarialAttackType["CW"] = "CW";
    AdversarialAttackType["DEEPFOOL"] = "DEEPFOOL";
    AdversarialAttackType["UNIVERSAL"] = "UNIVERSAL";
    AdversarialAttackType["BLACK_BOX"] = "BLACK_BOX";
    AdversarialAttackType["MODEL_INVERSION"] = "MODEL_INVERSION";
    AdversarialAttackType["MEMBERSHIP_INFERENCE"] = "MEMBERSHIP_INFERENCE";
    AdversarialAttackType["MODEL_EXTRACTION"] = "MODEL_EXTRACTION";
})(AdversarialAttackType || (exports.AdversarialAttackType = AdversarialAttackType = {}));
/**
 * Defense Mechanism
 */
var DefenseMechanism;
(function (DefenseMechanism) {
    DefenseMechanism["ADVERSARIAL_TRAINING"] = "ADVERSARIAL_TRAINING";
    DefenseMechanism["GRADIENT_MASKING"] = "GRADIENT_MASKING";
    DefenseMechanism["INPUT_TRANSFORMATION"] = "INPUT_TRANSFORMATION";
    DefenseMechanism["DETECTION_NETWORK"] = "DETECTION_NETWORK";
    DefenseMechanism["CERTIFIED_DEFENSE"] = "CERTIFIED_DEFENSE";
    DefenseMechanism["ENSEMBLE"] = "ENSEMBLE";
    DefenseMechanism["DISTILLATION"] = "DISTILLATION";
})(DefenseMechanism || (exports.DefenseMechanism = DefenseMechanism = {}));
