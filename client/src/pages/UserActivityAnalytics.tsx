import React from 'react';
import { Container, Stack, TextField, Button } from '@mui/material';
import UserActivityDashboard from '../components/analytics/UserActivityDashboard';
import { useAuth } from '../context/AuthContext.jsx';

const DEFAULT_TENANT = 'default';

const UserActivityAnalyticsPage: React.FC = () => {
  const { user } = useAuth() ?? { user: null };
  const initialTenant = (user as any)?.tenantId || DEFAULT_TENANT;
  const [tenantInput, setTenantInput] = React.useState<string>(initialTenant);
  const [activeTenant, setActiveTenant] = React.useState<string>(initialTenant);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <TextField
            label="Tenant ID"
            value={tenantInput}
            onChange={(event) => setTenantInput(event.target.value)}
            helperText="Enter a tenant identifier to scope analytics"
            size="small"
            sx={{ maxWidth: 320 }}
          />
          <Button
            variant="contained"
            onClick={() => setActiveTenant(tenantInput.trim() || DEFAULT_TENANT)}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            Load Analytics
          </Button>
        </Stack>

        <UserActivityDashboard tenantId={activeTenant} />
      </Stack>
    </Container>
  );
};

export default UserActivityAnalyticsPage;
