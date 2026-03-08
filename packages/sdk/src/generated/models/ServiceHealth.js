"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceHealth = void 0;
var ServiceHealth;
(function (ServiceHealth) {
    let status;
    (function (status) {
        status["HEALTHY"] = "healthy";
        status["UNHEALTHY"] = "unhealthy";
    })(status = ServiceHealth.status || (ServiceHealth.status = {}));
})(ServiceHealth || (exports.ServiceHealth = ServiceHealth = {}));
