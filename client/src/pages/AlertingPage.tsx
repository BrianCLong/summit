// client/src/pages/AlertingPage.tsx
import React from "react";
import AlertsDashboard from "../components/alerts/AlertsDashboard";
import AlertRuleForm from "../components/alerts/AlertRuleForm";

const AlertingPage: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleFormSubmit = (rule: any) => {
    // In a real implementation, this would trigger a GraphQL mutation
    // eslint-disable-next-line no-console
    console.log("Submitting alert rule:", rule);
    alert("Submitting rule... check console for details.");
  };

  return (
    <div>
      <h1>Alerting Management</h1>
      <hr />
      <AlertRuleForm onSubmit={handleFormSubmit} />
      <hr />
      <AlertsDashboard />
    </div>
  );
};

export default AlertingPage;
