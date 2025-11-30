import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import { AccountTree, Verified, Warning } from '@mui/icons-material';
import { format } from 'date-fns';
import type { ProvenanceChain, Claim } from '../types';
import { ProvenanceLedgerClient } from '../api/client';

interface ProvenanceChainViewerProps {
  claimId: string;
  client: ProvenanceLedgerClient;
  onVerify?: (valid: boolean) => void;
}

export const ProvenanceChainViewer: React.FC<ProvenanceChainViewerProps> = ({
  claimId,
  client,
  onVerify,
}) => {
  const [chain, setChain] = useState<ProvenanceChain[]>([]);
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState<boolean | null>(null);

  useEffect(() => {
    loadProvenanceChain();
  }, [claimId]);

  const loadProvenanceChain = async () => {
    try {
      setLoading(true);
      setError(null);

      const [chainData, claimData] = await Promise.all([
        client.getProvenanceChain(claimId),
        client.getClaim(claimId),
      ]);

      setChain(chainData);
      setClaim(claimData);

      // Verify hash
      const verification = await client.verifyHash(claimData.content, claimData.hash);
      setVerified(verification.valid);
      onVerify?.(verification.valid);
    } catch (err: any) {
      setError(err.message || 'Failed to load provenance chain');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!claim) {
    return <Alert severity="warning">Claim not found</Alert>;
  }

  return (
    <Box>
      {/* Claim Header */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" display="flex" alignItems="center" gap={1}>
              <AccountTree />
              Provenance Chain
            </Typography>
            {verified !== null && (
              <Chip
                icon={verified ? <Verified /> : <Warning />}
                label={verified ? 'Verified' : 'Integrity Issue'}
                color={verified ? 'success' : 'error'}
                size="small"
              />
            )}
          </Box>

          <Typography variant="body2" color="text.secondary" gutterBottom>
            Claim ID: {claim.id}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Hash: <code>{claim.hash}</code>
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Created: {format(new Date(claim.created_at), 'PPpp')}
          </Typography>

          {claim.policyLabels.length > 0 && (
            <Box mt={2}>
              {claim.policyLabels.map((label) => (
                <Chip key={label} label={label} size="small" sx={{ mr: 0.5 }} />
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Provenance Chain Steps */}
      {chain.length > 0 ? (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Transformation History
            </Typography>
            <Stepper orientation="vertical">
              {chain.map((entry, index) => (
                <Step key={entry.id} active completed>
                  <StepLabel>
                    <Typography variant="subtitle2">
                      Provenance Entry {index + 1}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(entry.created_at), 'PPpp')}
                    </Typography>
                  </StepLabel>
                  <StepContent>
                    <Box ml={2}>
                      {/* Transforms */}
                      {entry.transforms.length > 0 && (
                        <Box mb={1}>
                          <Typography variant="caption" color="text.secondary">
                            Transforms:
                          </Typography>
                          {entry.transforms.map((transform, i) => (
                            <Chip
                              key={i}
                              label={transform}
                              size="small"
                              variant="outlined"
                              sx={{ ml: 0.5 }}
                            />
                          ))}
                        </Box>
                      )}

                      {/* Sources */}
                      {entry.sources.length > 0 && (
                        <Box mb={1}>
                          <Typography variant="caption" color="text.secondary">
                            Sources:
                          </Typography>
                          {entry.sources.map((source, i) => (
                            <Typography key={i} variant="body2" component="div">
                              • {source}
                            </Typography>
                          ))}
                        </Box>
                      )}

                      {/* Lineage */}
                      {Object.keys(entry.lineage).length > 0 && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Lineage:
                          </Typography>
                          <Box
                            component="pre"
                            sx={{
                              fontSize: '0.75rem',
                              bgcolor: 'grey.100',
                              p: 1,
                              borderRadius: 1,
                              overflow: 'auto',
                              maxHeight: 200,
                            }}
                          >
                            {JSON.stringify(entry.lineage, null, 2)}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </StepContent>
                </Step>
              ))}
            </Stepper>
          </CardContent>
        </Card>
      ) : (
        <Alert severity="info">No provenance chain entries found for this claim.</Alert>
      )}
    </Box>
  );
};
