import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Box, Button, TextField, Tooltip, Typography } from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineDot,
  TimelineConnector,
  TimelineContent,
} from '@mui/lab';
import { GET_AUDIT_TRACE } from '../../graphql/audit.gql';

type FilterState = {
  userId: string;
  entityType: string;
  from: string;
  to: string;
};

interface AuditTraceViewerProps {
  investigationId: string;
}

const AuditTraceViewer: React.FC<AuditTraceViewerProps> = ({
  investigationId,
}) => {
  const [filters, setFilters] = useState<FilterState>({
    userId: '',
    entityType: '',
    from: '',
    to: '',
  });

  const { data, loading, error, refetch } = useQuery(GET_AUDIT_TRACE, {
    variables: { investigationId },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const applyFilters = () => {
    const filter: any = {};
    if (filters.userId) filter.userId = filters.userId;
    if (filters.entityType) filter.entityType = filters.entityType;
    if (filters.from) filter.from = new Date(filters.from).toISOString();
    if (filters.to) filter.to = new Date(filters.to).toISOString();
    refetch({ investigationId, filter });
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading audit trace</div>;

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <TextField
          label="User ID"
          name="userId"
          value={filters.userId}
          onChange={handleChange}
          size="small"
        />
        <TextField
          label="Entity Type"
          name="entityType"
          value={filters.entityType}
          onChange={handleChange}
          size="small"
        />
        <TextField
          label="From"
          name="from"
          type="datetime-local"
          value={filters.from}
          onChange={handleChange}
          InputLabelProps={{ shrink: true }}
          size="small"
        />
        <TextField
          label="To"
          name="to"
          type="datetime-local"
          value={filters.to}
          onChange={handleChange}
          InputLabelProps={{ shrink: true }}
          size="small"
        />
        <Button variant="contained" onClick={applyFilters}>
          Apply
        </Button>
      </Box>
      <Timeline>
        {data?.auditTrace.map((log: any) => (
          <TimelineItem key={log.id}>
            <TimelineSeparator>
              <TimelineDot />
              <TimelineConnector />
            </TimelineSeparator>
            <TimelineContent>
              <Tooltip title={log.action}>
                <Typography variant="body2">
                  {new Date(log.createdAt).toLocaleString()} -{' '}
                  {log.resourceType}
                </Typography>
              </Tooltip>
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
    </Box>
  );
};

export default AuditTraceViewer;
