import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  LinearProgress,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  Chip,
} from '@mui/material';
import { useQuery } from '@apollo/client';
import { format } from 'date-fns';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { USER_ACTIVITY_DASHBOARD_QUERY } from '../../graphql/userActivity.gql';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

type RangePreset = '7d' | '30d' | '90d';

const RANGE_TO_DAYS: Record<RangePreset, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

export interface UserActivityDashboardProps {
  tenantId: string;
}

function formatDateLabel(value: string) {
  try {
    return format(new Date(value), 'MMM d');
  } catch (_error) {
    return value;
  }
}

export function UserActivityDashboard({ tenantId }: UserActivityDashboardProps) {
  const [rangePreset, setRangePreset] = React.useState<RangePreset>('30d');

  const rangeEndIso = React.useMemo(() => new Date().toISOString(), [rangePreset, tenantId]);
  const rangeStartIso = React.useMemo(() => {
    const days = RANGE_TO_DAYS[rangePreset];
    const end = new Date(rangeEndIso);
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    return start.toISOString();
  }, [rangePreset, rangeEndIso]);

  const { data, loading, error, refetch } = useQuery(USER_ACTIVITY_DASHBOARD_QUERY, {
    variables: {
      tenantId: tenantId || null,
      rangeStart: rangeStartIso,
      rangeEnd: rangeEndIso,
      limit: 25,
    },
    fetchPolicy: 'cache-first',
  });

  const summary = data?.userActivitySummary;
  const events = data?.recentUserActivity ?? [];

  const lineChartData = React.useMemo(() => {
    const labels = summary?.activeUsersByDay?.map((point: any) => formatDateLabel(point.date)) ?? [];
    return {
      labels,
      datasets: [
        {
          label: 'Logins',
          data: summary?.activeUsersByDay?.map((point: any) => point.loginCount) ?? [],
          borderColor: '#1976d2',
          backgroundColor: 'rgba(25, 118, 210, 0.2)',
          tension: 0.3,
          fill: true,
        },
        {
          label: 'Queries',
          data: summary?.activeUsersByDay?.map((point: any) => point.queryCount) ?? [],
          borderColor: '#9c27b0',
          backgroundColor: 'rgba(156, 39, 176, 0.2)',
          tension: 0.3,
          fill: true,
        },
      ],
    };
  }, [summary]);

  const barChartData = React.useMemo(() => {
    const topUsers = summary?.topUsers ?? [];
    return {
      labels: topUsers.map((user: any) => user.userId ?? 'unknown'),
      datasets: [
        {
          label: 'Logins',
          backgroundColor: '#42a5f5',
          data: topUsers.map((user: any) => user.loginCount),
        },
        {
          label: 'Queries',
          backgroundColor: '#ab47bc',
          data: topUsers.map((user: any) => user.queryCount),
        },
      ],
    };
  }, [summary]);

  const chartOptions = React.useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
        },
      },
      scales: {
        x: {
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
          },
        },
      },
    }),
    [],
  );

  return (
    <Stack spacing={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" gutterBottom>
            User Activity Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitor logins and Copilot query usage trends for tenant {tenantId || 'all tenants'}.
          </Typography>
        </Box>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={rangePreset}
          onChange={(_event, value: RangePreset | null) => {
            if (value) {
              setRangePreset(value);
              void refetch({
                tenantId: tenantId || null,
                rangeStart: new Date(
                  new Date(rangeEndIso).getTime() - RANGE_TO_DAYS[value] * 24 * 60 * 60 * 1000,
                ).toISOString(),
                rangeEnd: new Date().toISOString(),
                limit: 25,
              });
            }
          }}
          aria-label="Date range preset"
        >
          <ToggleButton value="7d">7 days</ToggleButton>
          <ToggleButton value="30d">30 days</ToggleButton>
          <ToggleButton value="90d">90 days</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {loading && <LinearProgress aria-label="Loading user activity" />}
      {error && (
        <Alert severity="error" role="alert">
          Failed to load analytics data: {error.message}
        </Alert>
      )}

      {summary && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Logins
                </Typography>
                <Typography variant="h4" data-testid="total-logins">
                  {summary.totalLogins.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Queries
                </Typography>
                <Typography variant="h4" data-testid="total-queries">
                  {summary.totalQueries.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Unique Users
                </Typography>
                <Typography variant="h4" data-testid="unique-users">
                  {summary.uniqueUsers.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {summary?.activeUsersByDay?.length ? (
        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <Card sx={{ height: 360 }}>
              <CardContent sx={{ height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Activity Over Time
                </Typography>
                <Box sx={{ height: 280 }}>
                  <Line options={chartOptions} data={lineChartData} aria-label="User activity trend" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} lg={4}>
            <Card sx={{ height: 360 }}>
              <CardContent sx={{ height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Top Users
                </Typography>
                {summary.topUsers.length ? (
                  <Box sx={{ height: 280 }}>
                    <Bar options={chartOptions} data={barChartData} aria-label="Top user activity" />
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No top user data available for this range.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : (
        !loading && (
          <Alert severity="info">No user activity found for the selected range.</Alert>
        )
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Users Detail
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell align="right">Logins</TableCell>
                    <TableCell align="right">Queries</TableCell>
                    <TableCell>Last Active</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summary?.topUsers?.map((user: any) => (
                    <TableRow key={user.userId}>
                      <TableCell>{user.userId}</TableCell>
                      <TableCell align="right">{user.loginCount}</TableCell>
                      <TableCell align="right">{user.queryCount}</TableCell>
                      <TableCell>
                        {user.lastActiveAt
                          ? format(new Date(user.lastActiveAt), 'MMM d, yyyy HH:mm')
                          : '—'}
                      </TableCell>
                    </TableRow>
                  )) || (
                    <TableRow>
                      <TableCell colSpan={4}>No users available.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activity
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Metadata</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {events.length ? (
                    events.map((event: any, index: number) => (
                      <TableRow key={`${event.timestamp}-${index}`}>
                        <TableCell>{format(new Date(event.timestamp), 'MMM d, yyyy HH:mm')}</TableCell>
                        <TableCell>
                          <Chip label={event.type} size="small" color="primary" variant="outlined" />
                        </TableCell>
                        <TableCell>{event.userId ?? '—'}</TableCell>
                        <TableCell sx={{ maxWidth: 220 }}>
                          <Typography variant="body2" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {event.metadata ? JSON.stringify(event.metadata) : '—'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4}>No recent events.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}

export default UserActivityDashboard;
