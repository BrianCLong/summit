"use strict";
/**
 * Deployment Model
 * Represents deployment events tracked in CompanyOS
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthCheckStatus = exports.DeploymentType = exports.DeploymentStatus = exports.DeploymentEnvironment = void 0;
var DeploymentEnvironment;
(function (DeploymentEnvironment) {
    DeploymentEnvironment["DEV"] = "dev";
    DeploymentEnvironment["STAGING"] = "staging";
    DeploymentEnvironment["PREVIEW"] = "preview";
    DeploymentEnvironment["PRODUCTION"] = "production";
    DeploymentEnvironment["CANARY"] = "canary";
})(DeploymentEnvironment || (exports.DeploymentEnvironment = DeploymentEnvironment = {}));
var DeploymentStatus;
(function (DeploymentStatus) {
    DeploymentStatus["PENDING"] = "pending";
    DeploymentStatus["IN_PROGRESS"] = "in_progress";
    DeploymentStatus["SUCCEEDED"] = "succeeded";
    DeploymentStatus["FAILED"] = "failed";
    DeploymentStatus["ROLLED_BACK"] = "rolled_back";
    DeploymentStatus["CANCELLED"] = "cancelled";
})(DeploymentStatus || (exports.DeploymentStatus = DeploymentStatus = {}));
var DeploymentType;
(function (DeploymentType) {
    DeploymentType["STANDARD"] = "standard";
    DeploymentType["CANARY"] = "canary";
    DeploymentType["BLUE_GREEN"] = "blue_green";
    DeploymentType["ROLLING"] = "rolling";
    DeploymentType["HOTFIX"] = "hotfix";
})(DeploymentType || (exports.DeploymentType = DeploymentType = {}));
var HealthCheckStatus;
(function (HealthCheckStatus) {
    HealthCheckStatus["PASSED"] = "passed";
    HealthCheckStatus["FAILED"] = "failed";
    HealthCheckStatus["SKIPPED"] = "skipped";
})(HealthCheckStatus || (exports.HealthCheckStatus = HealthCheckStatus = {}));
