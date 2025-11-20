// @ip-family: N/A (tooling)
/**
 * IP Console Page
 *
 * Provides a unified view of all IP families in the Summit/IntelGraph platform.
 * Displays families from docs/ip/ip-registry.yaml with filtering, search, and detail views.
 *
 * TODO: Wire up to backend API once registry is served via GraphQL.
 * For now, import registry statically from build artifact.
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Button,
  Stack,
  Tabs,
  Tab,
  LinearProgress,
  Alert,
  Link,
} from '@mui/material';
import {
  Search as SearchIcon,
  Code as CodeIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';

// ============================================================================
// Types (matching ip-registry.yaml schema)
// ============================================================================

interface IPFamily {
  family_id: string;
  name: string;
  summary: string;
  status: 'idea' | 'partial' | 'mvp' | 'v1' | 'v2+';
  owner: string;
  modules: string[];
  capabilities: string[];
  horizons: {
    h0_hardening: string[];
    h1_mvp: string[];
    h2_v1: string[];
    h3_moonshot: string[];
  };
  risks: string[];
  dependencies: string[];
  tags: string[];
}

// ============================================================================
// Mock Data (TODO: Replace with API call)
// ============================================================================

const MOCK_FAMILIES: IPFamily[] = [
  {
    family_id: 'F1',
    name: 'Provenance-First Multi-LLM Orchestration for Investigation Graphs',
    summary: 'Unified orchestration layer that routes investigative queries across multiple LLM providers while maintaining immutable provenance logs.',
    status: 'mvp',
    owner: 'unassigned',
    modules: [
      'client/src/services/orchestrator/',
      'server/orchestrator/',
      'packages/prov-ledger/',
    ],
    capabilities: [
      'Multi-provider LLM routing with failover',
      'Provenance ledger for all AI operations',
      'Policy-based model selection',
    ],
    horizons: {
      h0_hardening: ['Add stronger typing', 'Improve test coverage'],
      h1_mvp: ['Expose orchestrator as GraphQL API', 'Build UX for provenance viewer'],
      h2_v1: ['Multi-tenant orchestrator', 'Advanced routing algorithms'],
      h3_moonshot: ['Self-tuning orchestrator', 'Cross-investigation learning'],
    },
    risks: ['LLM provider API changes', 'Provenance ledger performance at scale'],
    dependencies: ['Neo4j', 'Redis', 'External LLM APIs'],
    tags: ['provenance', 'multi-llm', 'orchestration', 'audit'],
  },
  // Add more families as needed (F2-F10)
];

// ============================================================================
// Utility Functions
// ============================================================================

function getStatusColor(status: IPFamily['status']): 'default' | 'primary' | 'secondary' | 'success' | 'warning' {
  switch (status) {
    case 'idea': return 'default';
    case 'partial': return 'warning';
    case 'mvp': return 'primary';
    case 'v1': return 'success';
    case 'v2+': return 'secondary';
    default: return 'default';
  }
}

function getStatusLabel(status: IPFamily['status']): string {
  switch (status) {
    case 'idea': return 'Idea';
    case 'partial': return 'Partial';
    case 'mvp': return 'MVP';
    case 'v1': return 'v1.0';
    case 'v2+': return 'v2.0+';
    default: return status;
  }
}

function calculateCompletionPct(family: IPFamily): number {
  // Simple heuristic: % of H0 + H1 completed (assumed based on status)
  switch (family.status) {
    case 'idea': return 5;
    case 'partial': return 35;
    case 'mvp': return 65;
    case 'v1': return 90;
    case 'v2+': return 100;
    default: return 0;
  }
}

// ============================================================================
// Components
// ============================================================================

interface FamilyCardProps {
  family: IPFamily;
  onViewDetails: (family: IPFamily) => void;
}

const FamilyCard: React.FC<FamilyCardProps> = ({ family, onViewDetails }) => {
  const completionPct = calculateCompletionPct(family);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          <Chip label={family.family_id} size="small" color="primary" variant="outlined" />
          <Chip label={getStatusLabel(family.status)} size="small" color={getStatusColor(family.status)} />
        </Stack>

        <Typography variant="h6" gutterBottom>
          {family.name}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {family.summary}
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Completion: {completionPct}%
          </Typography>
          <LinearProgress variant="determinate" value={completionPct} sx={{ mt: 0.5 }} />
        </Box>

        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
          {family.tags.slice(0, 3).map((tag) => (
            <Chip key={tag} label={tag} size="small" variant="outlined" />
          ))}
          {family.tags.length > 3 && (
            <Chip label={`+${family.tags.length - 3}`} size="small" variant="outlined" />
          )}
        </Stack>
      </CardContent>

      <CardActions>
        <Button
          size="small"
          startIcon={<ViewIcon />}
          onClick={() => onViewDetails(family)}
        >
          View Details
        </Button>
        <Button
          size="small"
          startIcon={<CodeIcon />}
          component={Link}
          href={`https://github.com/BrianCLong/summit/tree/main/${family.modules[0]}`}
          target="_blank"
          rel="noopener"
        >
          View Code
        </Button>
      </CardActions>
    </Card>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const IPConsolePage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedFamily, setSelectedFamily] = useState<IPFamily | null>(null);

  // Filter families by search term and tab
  const filteredFamilies = useMemo(() => {
    let filtered = MOCK_FAMILIES;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (f) =>
          f.family_id.toLowerCase().includes(term) ||
          f.name.toLowerCase().includes(term) ||
          f.summary.toLowerCase().includes(term) ||
          f.tags.some((t) => t.toLowerCase().includes(term))
      );
    }

    // Tab filter (status)
    if (selectedTab === 1) {
      filtered = filtered.filter((f) => f.status === 'idea' || f.status === 'partial');
    } else if (selectedTab === 2) {
      filtered = filtered.filter((f) => f.status === 'mvp');
    } else if (selectedTab === 3) {
      filtered = filtered.filter((f) => f.status === 'v1' || f.status === 'v2+');
    }

    return filtered;
  }, [searchTerm, selectedTab]);

  const handleViewDetails = (family: IPFamily) => {
    setSelectedFamily(family);
    // TODO: Open modal or navigate to detail page
    console.log('View details for:', family.family_id);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" gutterBottom>
          IP Console
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Unified view of all IP families in Summit/IntelGraph. Track status, coverage, and roadmap progress.
        </Typography>
      </Box>

      {/* Alert for MVP status */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>MVP Status:</strong> This console currently displays static data from the IP registry.
        Future versions will integrate with backend APIs for real-time metrics and editing capabilities.
        See <Link href="/docs/ip/PLATFORM_OVERVIEW.md" target="_blank">IP Platform Overview</Link> for more details.
      </Alert>

      {/* Search Bar */}
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search by family ID, name, tags..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
        }}
        sx={{ mb: 3 }}
      />

      {/* Filter Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={selectedTab} onChange={(_, value) => setSelectedTab(value)}>
          <Tab label={`All (${MOCK_FAMILIES.length})`} />
          <Tab label="In Development" />
          <Tab label="MVP" />
          <Tab label="Shipped" />
        </Tabs>
      </Box>

      {/* Family Grid */}
      {filteredFamilies.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            No IP families found matching your criteria
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredFamilies.map((family) => (
            <Grid item xs={12} sm={6} md={4} key={family.family_id}>
              <FamilyCard family={family} onViewDetails={handleViewDetails} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Stats Footer */}
      <Box sx={{ mt: 6, p: 3, bgcolor: 'background.paper', borderRadius: 1 }}>
        <Typography variant="h6" gutterBottom>
          Platform Summary
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <Typography variant="h4" color="primary">
              {MOCK_FAMILIES.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Families
            </Typography>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Typography variant="h4" color="success.main">
              {MOCK_FAMILIES.filter((f) => f.status === 'mvp' || f.status === 'v1' || f.status === 'v2+').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Shipped (MVP+)
            </Typography>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Typography variant="h4" color="warning.main">
              {MOCK_FAMILIES.filter((f) => f.status === 'partial').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              In Development
            </Typography>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Typography variant="h4">
              {Math.round(
                MOCK_FAMILIES.reduce((sum, f) => sum + calculateCompletionPct(f), 0) / MOCK_FAMILIES.length
              )}
              %
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Avg Completion
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default IPConsolePage;
