"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// client/src/pages/AlertingPage.tsx
const react_1 = __importDefault(require("react"));
const AlertsDashboard_1 = __importDefault(require("../components/alerts/AlertsDashboard"));
const AlertRuleForm_1 = __importDefault(require("../components/alerts/AlertRuleForm"));
const AlertingPage = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleFormSubmit = (rule) => {
        // In a real implementation, this would trigger a GraphQL mutation
        // eslint-disable-next-line no-console
        console.log('Submitting alert rule:', rule);
        alert('Submitting rule... check console for details.');
    };
    return (<div>
      <h1>Alerting Management</h1>
      <hr />
      <AlertRuleForm_1.default onSubmit={handleFormSubmit}/>
      <hr />
      <AlertsDashboard_1.default />
    </div>);
};
exports.default = AlertingPage;
