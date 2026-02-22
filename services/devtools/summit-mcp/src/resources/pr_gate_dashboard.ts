// Stub for PR Gate UI resource
export const getPrGateDashboard = async (prId: string) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>PR Gate Dashboard</title>
</head>
<body>
  <h1>PR Gate Status: ${prId}</h1>
  <div class="status">PASS</div>
</body>
</html>
  `;
};
