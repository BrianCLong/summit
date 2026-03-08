"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdapterLifecycleStage = exports.AdapterLifecycleIntent = void 0;
/**
 * Lifecycle enums used to track adapter execution.
 */
var AdapterLifecycleIntent;
(function (AdapterLifecycleIntent) {
    AdapterLifecycleIntent["Prepare"] = "prepare";
    AdapterLifecycleIntent["Preflight"] = "preflight";
    AdapterLifecycleIntent["Execute"] = "execute";
    AdapterLifecycleIntent["Retry"] = "retry";
    AdapterLifecycleIntent["Finalize"] = "finalize";
})(AdapterLifecycleIntent || (exports.AdapterLifecycleIntent = AdapterLifecycleIntent = {}));
var AdapterLifecycleStage;
(function (AdapterLifecycleStage) {
    AdapterLifecycleStage["Registered"] = "registered";
    AdapterLifecycleStage["Warm"] = "warm";
    AdapterLifecycleStage["Ready"] = "ready";
    AdapterLifecycleStage["Executing"] = "executing";
    AdapterLifecycleStage["CoolingDown"] = "cooling-down";
    AdapterLifecycleStage["Completed"] = "completed";
    AdapterLifecycleStage["Failed"] = "failed";
})(AdapterLifecycleStage || (exports.AdapterLifecycleStage = AdapterLifecycleStage = {}));
