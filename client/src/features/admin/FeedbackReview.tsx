import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import { useQuery, useMutation } from '@apollo/client';
import {
  FEEDBACK_SUBMISSIONS_QUERY,
  UPDATE_FEEDBACK_STATUS_MUTATION,
} from '../../graphql/feedback';
import { useToastHelpers } from '../../components/ToastContainer';

type FeedbackStatus = 'NEW' | 'IN_REVIEW' | 'RESOLVED' | 'ARCHIVED';
type FeedbackCategory = 'BUG' | 'FEATURE' | 'OTHER';

type FeedbackItem = {
  id: string;
  category: FeedbackCategory;
  title: string;
  description?: string | null;
  status: FeedbackStatus;
  userEmail?: string | null;
  userId?: string | null;
  createdAt: string;
  metadata?: Record<string, any> | null;
};

const statusOptions: { value: FeedbackStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'NEW', label: 'New' },
  { value: 'IN_REVIEW', label: 'In review' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const categoryLabels: Record<FeedbackCategory, string> = {
  BUG: 'Bug',
  FEATURE: 'Feature request',
  OTHER: 'Other',
};

const statusLabels: Record<FeedbackStatus, string> = {
  NEW: 'New',
  IN_REVIEW: 'In review',
  RESOLVED: 'Resolved',
  ARCHIVED: 'Archived',
};

const statusColors: Record<FeedbackStatus, 'default' | 'primary' | 'success' | 'warning' | 'info'> = {
  NEW: 'warning',
  IN_REVIEW: 'info',
  RESOLVED: 'success',
  ARCHIVED: 'default',
};

const formatDateTime = (value: string) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

export const FeedbackReview: React.FC = () => {
  const toast = useToastHelpers();
  const [statusFilter, setStatusFilter] = React.useState<FeedbackStatus | 'ALL'>('NEW');

  const { data, loading, error, refetch } = useQuery(FEEDBACK_SUBMISSIONS_QUERY, {
    variables: {
      filter: {
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        limit: 50,
      },
    },
    fetchPolicy: 'cache-and-network',
  });

  const [updateStatus, { loading: updating }] = useMutation(UPDATE_FEEDBACK_STATUS_MUTATION);

  const submissions: FeedbackItem[] = data?.feedbackSubmissions?.items ?? [];
  const total = data?.feedbackSubmissions?.total ?? 0;

  const onRefresh = React.useCallback(() => {
    refetch();
  }, [refetch]);

  const handleStatusChange = async (id: string, status: FeedbackStatus) => {
    try {
      await updateStatus({ variables: { input: { id, status } } });
      toast.success('Feedback updated', `Marked submission as ${statusLabels[status]}.`);
      await refetch();
    } catch (err: any) {
      toast.error('Update failed', err?.message || 'Could not update feedback status.');
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} mb={3}>
          <Box>
            <Typography variant="h5" gutterBottom>
              User feedback inbox
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Review feature requests and bug reports submitted from the dashboard.
            </Typography>
          </Box>
          <Stack direction="row" spacing={2} alignItems="flex-end">
            <FormControl size="small">
              <InputLabel id="feedback-status-filter">Status</InputLabel>
              <Select
                labelId="feedback-status-filter"
                label="Status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as FeedbackStatus | 'ALL')}
              >
                {statusOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Tooltip title="Refresh">
              <span>
                <IconButton onClick={onRefresh} disabled={loading} aria-label="Refresh feedback list">
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to load feedback: {error.message}
          </Alert>
        )}

        <TableContainer>
          <Table size="small" aria-label="Feedback submissions">
            <TableHead>
              <TableRow>
                <TableCell>Category</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Submitted by</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {submissions.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No feedback found for this filter.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                submissions.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Chip label={categoryLabels[item.category]} size="small" />
                    </TableCell>
                    <TableCell width="20%">
                      <Typography variant="subtitle2">{item.title}</Typography>
                      {item.metadata?.contact && (
                        <Typography variant="caption" color="text.secondary">
                          Contact: {item.metadata.contact}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                        {item.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {item.userEmail || item.userId || 'Anonymous'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDateTime(item.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                        <Chip label={statusLabels[item.status]} color={statusColors[item.status]} size="small" />
                        <Tooltip title="Mark in review">
                          <span>
                            <IconButton
                              aria-label="Mark in review"
                              size="small"
                              onClick={() => handleStatusChange(item.id, 'IN_REVIEW')}
                              disabled={updating || item.status === 'IN_REVIEW'}
                            >
                              <PendingActionsIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Mark resolved">
                          <span>
                            <IconButton
                              aria-label="Mark resolved"
                              size="small"
                              onClick={() => handleStatusChange(item.id, 'RESOLVED')}
                              disabled={updating || item.status === 'RESOLVED'}
                            >
                              <DoneAllIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2}>
          <Typography variant="caption" color="text.secondary">
            Showing {submissions.length} of {total} submissions.
          </Typography>
          {loading && <CircularProgress size={20} aria-label="Loading feedback" />}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default FeedbackReview;
