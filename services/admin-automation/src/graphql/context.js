"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContext = createContext;
const citizen_profile_aggregator_js_1 = require("../citizen-profile-aggregator.js");
const form_autocomplete_js_1 = require("../form-autocomplete.js");
const proactive_service_resolver_js_1 = require("../proactive-service-resolver.js");
const workflow_automation_js_1 = require("../workflow-automation.js");
const metrics_js_1 = require("../metrics.js");
// Singleton instances
const profileAggregator = new citizen_profile_aggregator_js_1.CitizenProfileAggregator();
const formAutocomplete = new form_autocomplete_js_1.FormAutocomplete(profileAggregator);
const proactiveResolver = new proactive_service_resolver_js_1.ProactiveServiceResolver(profileAggregator);
const workflow = new workflow_automation_js_1.WorkflowAutomation(profileAggregator, formAutocomplete, proactiveResolver);
const metrics = new metrics_js_1.AutomationMetrics();
async function createContext({ req, res, }) {
    return {
        req,
        res,
        services: {
            profileAggregator,
            formAutocomplete,
            proactiveResolver,
            workflow,
            metrics,
        },
    };
}
