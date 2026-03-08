"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAccess = void 0;
const axios_1 = __importDefault(require("axios"));
const logging_js_1 = require("./middleware/logging.js");
const config_js_1 = require("./config.js");
const checkAccess = async (user, resource, action, context) => {
    try {
        const response = await axios_1.default.post(config_js_1.config.policyEndpoint, { input: { user, resource, action, context } });
        return {
            allow: Boolean(response.data?.result?.allow),
            stepUpRequired: Boolean(response.data?.result?.step_up_required),
            reason: response.data?.result?.reason
        };
    }
    catch (error) {
        logging_js_1.logger.error({ err: error }, 'policy check failed');
        return { allow: false, reason: 'policy_evaluation_error' };
    }
};
exports.checkAccess = checkAccess;
