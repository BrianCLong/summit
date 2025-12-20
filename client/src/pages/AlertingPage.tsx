// client/src/pages/AlertingPage.tsx
import React from 'react';
import AlertsDashboard from '../components/alerts/AlertsDashboard';
import AlertRuleForm from '../components/alerts/AlertRuleForm';

const AlertingPage: React.FC = () => {
  const handleFormSubmit = (rule: any) => {
    // In a real implementation, this would trigger a GraphQL mutation
    console.log('Submitting alert rule:', rule);
    alert('Submitting rule... check console for details.');
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
