import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  FingerprintOutlined,
  PersonOutline,
  LockOutlined,
  VerifiedUser,
} from '@mui/icons-material';
import { format } from 'date-fns';
import type { Evidence, TransformStep } from '../types';
import { ProvenanceLedgerClient } from '../api/client';

interface ChainOfCustodyViewerProps {
  evidenceId: string;
  client: ProvenanceLedgerClient;
}

export const ChainOfCustodyViewer: React.FC<ChainOfCustodyViewerProps> = ({
  evidenceId,
  client,
}) => {
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEvidence();
  }, [evidenceId]);

  const loadEvidence = async () => {
    try {
      setLoading(true);
      setError(null);

      const evidenceData = await client.getEvidence(evidenceId);
      setEvidence(evidenceData);
    } catch (err: any) {
      setError(err.message || 'Failed to load evidence');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!evidence) {
    return <Alert severity="warning">Evidence not found</Alert>;
  }

  const getTransformIcon = (transformType: string) => {
    if (transformType.toLowerCase().includes('encrypt')) return <LockOutlined />;
    if (transformType.toLowerCase().includes('sign')) return <VerifiedUser />;
    if (transformType.toLowerCase().includes('hash')) return <FingerprintOutlined />;
    return <PersonOutline />;
  };

  return (
    <Box>
      {/* Evidence Header */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Chain of Custody
          </Typography>

          <Box mb={2}>
            <Typography variant="body2" color="text.secondary">
              Evidence ID: {evidence.id}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Source: {evidence.sourceRef}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Checksum ({evidence.checksumAlgorithm}): <code>{evidence.checksum}</code>
            </Typography>
            {evidence.fileSize && (
              <Typography variant="body2" color="text.secondary">
                Size: {(evidence.fileSize / 1024).toFixed(2)} KB
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              Registered: {format(new Date(evidence.created_at), 'PPpp')}
            </Typography>
            {evidence.authorityId && (
              <Typography variant="body2" color="text.secondary">
                Authority: {evidence.authorityId}
              </Typography>
            )}
          </Box>

          {/* Policy Labels */}
          {evidence.policyLabels.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Policy Labels:
              </Typography>
              <Box mt={0.5}>
                {evidence.policyLabels.map((label) => (
                  <Chip
                    key={label}
                    label={label}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ mr: 0.5, mb: 0.5 }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Transformation Chain */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Transformation History
          </Typography>

          {evidence.transformChain.length > 0 ? (
            <Timeline position="alternate">
              {/* Initial State */}
              <TimelineItem>
                <TimelineOppositeContent color="text.secondary">
                  {format(new Date(evidence.created_at), 'PPpp')}
                </TimelineOppositeContent>
                <TimelineSeparator>
                  <TimelineDot color="primary">
                    <FingerprintOutlined />
                  </TimelineDot>
                  <TimelineConnector />
                </TimelineSeparator>
                <TimelineContent>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2">Evidence Registered</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Initial checksum: {evidence.checksum.slice(0, 16)}...
                      </Typography>
                      {evidence.authorityId && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          By: {evidence.authorityId}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </TimelineContent>
              </TimelineItem>

              {/* Transformations */}
              {evidence.transformChain.map((transform: TransformStep, index: number) => (
                <TimelineItem key={index}>
                  <TimelineOppositeContent color="text.secondary">
                    {format(new Date(transform.timestamp), 'PPpp')}
                  </TimelineOppositeContent>
                  <TimelineSeparator>
                    <TimelineDot color="secondary">
                      {getTransformIcon(transform.transformType)}
                    </TimelineDot>
                    {index < evidence.transformChain.length - 1 && <TimelineConnector />}
                  </TimelineSeparator>
                  <TimelineContent>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2">{transform.transformType}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Actor: {transform.actorId}
                        </Typography>
                        {transform.config && Object.keys(transform.config).length > 0 && (
                          <Box
                            component="pre"
                            sx={{
                              mt: 1,
                              fontSize: '0.7rem',
                              bgcolor: 'grey.100',
                              p: 1,
                              borderRadius: 1,
                              overflow: 'auto',
                              maxHeight: 100,
                            }}
                          >
                            {JSON.stringify(transform.config, null, 2)}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </TimelineContent>
                </TimelineItem>
              ))}
            </Timeline>
          ) : (
            <Alert severity="info">No transformations recorded for this evidence.</Alert>
          )}

          {/* Metadata */}
          {evidence.metadata && Object.keys(evidence.metadata).length > 0 && (
            <Box mt={3}>
              <Typography variant="subtitle2" gutterBottom>
                Additional Metadata
              </Typography>
              <Box
                component="pre"
                sx={{
                  fontSize: '0.75rem',
                  bgcolor: 'grey.100',
                  p: 2,
                  borderRadius: 1,
                  overflow: 'auto',
                  maxHeight: 200,
                }}
              >
                {JSON.stringify(evidence.metadata, null, 2)}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
