"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeHorizon = exports.ForecastType = void 0;
var ForecastType;
(function (ForecastType) {
    ForecastType["COST_GROWTH"] = "COST_GROWTH";
    ForecastType["AGENT_LOAD"] = "AGENT_LOAD";
    ForecastType["INCIDENT_LIKELIHOOD"] = "INCIDENT_LIKELIHOOD";
    ForecastType["GOVERNANCE_PRESSURE"] = "GOVERNANCE_PRESSURE";
})(ForecastType || (exports.ForecastType = ForecastType = {}));
var TimeHorizon;
(function (TimeHorizon) {
    TimeHorizon[TimeHorizon["DAYS_30"] = 30] = "DAYS_30";
    TimeHorizon[TimeHorizon["DAYS_90"] = 90] = "DAYS_90";
    TimeHorizon[TimeHorizon["DAYS_180"] = 180] = "DAYS_180";
})(TimeHorizon || (exports.TimeHorizon = TimeHorizon = {}));
