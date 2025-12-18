/**
 * Cases Page
 * Shows user's assigned cases with offline support
 */
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  Skeleton,
  IconButton,
  TextField,
  InputAdornment,
  Avatar,
  AvatarGroup,
} from '@mui/material';
import {
  Folder,
  Search,
  Refresh,
  AccessTime,
  Person,
  LocationOn,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useCases } from '@/hooks/useCases';
import { getPriorityColor } from '@/theme';
import type { Case, CaseStatus } from '@/types';

// Status badge colors
const statusColors: Record<CaseStatus, string> = {
  open: '#22c55e',
  in_progress: '#3b82f6',
  pending_review: '#f59e0b',
  closed: '#64748b',
};

// Case card component
interface CaseCardProps {
  caseData: Case;
  onClick: () => void;
}

function CaseCard({ caseData, onClick }: CaseCardProps) {
  return (
    <Card
      sx={{
        mb: 2,
        borderLeft: `4px solid ${getPriorityColor(caseData.priority)}`,
      }}
    >
      <CardActionArea onClick={onClick}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box flex={1}>
              <Typography variant="h6" fontWeight={600} gutterBottom noWrap>
                {caseData.title}
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                <Chip
                  label={caseData.status.replace('_', ' ')}
                  size="small"
                  sx={{
                    bgcolor: statusColors[caseData.status],
                    color: 'white',
                    fontSize: '0.7rem',
                    height: 22,
                  }}
                />
                <Chip
                  label={caseData.priority}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', height: 22 }}
                />
              </Box>
            </Box>
            <Folder sx={{ color: 'text.secondary' }} />
          </Box>

          {caseData.summary && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                mb: 2,
              }}
            >
              {caseData.summary}
            </Typography>
          )}

          {/* Key entities preview */}
          {caseData.keyEntities && caseData.keyEntities.length > 0 && (
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 28, height: 28, fontSize: '0.75rem' } }}>
                {caseData.keyEntities.map((entity) => (
                  <Avatar
                    key={entity.id}
                    src={entity.thumbnailUrl}
                    alt={entity.name}
                  >
                    {entity.name.charAt(0)}
                  </Avatar>
                ))}
              </AvatarGroup>
              <Typography variant="caption" color="text.secondary">
                {caseData.entityCount} entities
              </Typography>
            </Box>
          )}

          {/* Stats row */}
          <Box display="flex" gap={2} alignItems="center">
            <Box display="flex" alignItems="center" gap={0.5}>
              <AccessTime sx={{ fontSize: 14, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.disabled">
                {new Date(caseData.lastUpdated).toLocaleDateString()}
              </Typography>
            </Box>
            {caseData.alertCount > 0 && (
              <Chip
                label={`${caseData.alertCount} alerts`}
                size="small"
                color="error"
                sx={{ fontSize: '0.65rem', height: 18 }}
              />
            )}
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

// Main Cases Page
export function CasesPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { cases, isLoading, refresh } = useCases();

  // Filter cases by search query
  const filteredCases = cases.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.summary?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box sx={{ pb: 8 }}>
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="h5" fontWeight={600}>
          Cases
        </Typography>
        <IconButton onClick={refresh} disabled={isLoading}>
          <Refresh />
        </IconButton>
      </Box>

      {/* Search */}
      <Box sx={{ px: 2, mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Search cases..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          size="small"
        />
      </Box>

      {/* Cases list */}
      <Box sx={{ px: 2 }}>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              height={160}
              sx={{ mb: 2, borderRadius: 2 }}
            />
          ))
        ) : filteredCases.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Folder sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">
              {searchQuery ? 'No cases match your search' : 'No assigned cases'}
            </Typography>
          </Box>
        ) : (
          filteredCases.map((caseData) => (
            <CaseCard
              key={caseData.id}
              caseData={caseData}
              onClick={() => navigate(`/cases/${caseData.id}`)}
            />
          ))
        )}
      </Box>
    </Box>
  );
}

export default CasesPage;
