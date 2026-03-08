"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthStatus = void 0;
var HealthStatus;
(function (HealthStatus) {
    let status;
    (function (status) {
        status["HEALTHY"] = "healthy";
        status["DEGRADED"] = "degraded";
        status["UNHEALTHY"] = "unhealthy";
    })(status = HealthStatus.status || (HealthStatus.status = {}));
})(HealthStatus || (exports.HealthStatus = HealthStatus = {}));
