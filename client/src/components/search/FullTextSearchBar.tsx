import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { gql, useLazyQuery } from '@apollo/client';
import {
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Search as SearchIcon, SavedSearch, Share } from '@mui/icons-material';

type SearchSource = 'GRAPH' | 'INGESTED';

export interface FullTextSearchResult {
  id: string;
  type: string;
  nodeType?: string | null;
  title?: string | null;
  summary?: string | null;
  score?: number | null;
  source: SearchSource;
  tenantId: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface FullTextSearchResponse {
  total: number;
  tookMs: number;
  results: FullTextSearchResult[];
}

interface FullTextSearchBarProps {
  onSearchStart?: (query: string) => void;
  onResults?: (response: FullTextSearchResponse) => void;
  onError?: (message: string) => void;
  tenantId?: string;
}

type TimeRangeOption = 'ALL' | '24H' | '7D' | '30D';

const NODE_TYPE_OPTIONS = ['PERSON', 'ORGANIZATION', 'DOCUMENT', 'EVENT', 'LOCATION', 'IOC'];
const SOURCE_OPTIONS: SearchSource[] = ['GRAPH', 'INGESTED'];

const FULL_TEXT_SEARCH = gql`
  query FullTextSearch($input: FullTextSearchInput!) {
    fullTextSearch(input: $input) {
      total
      tookMs
      results {
        id
        type
        nodeType
        title
        summary
        score
        source
        tenantId
        createdAt
        updatedAt
      }
    }
  }
`;

function computeStartTimestamp(range: TimeRangeOption): string | undefined {
  const now = Date.now();
  switch (range) {
    case '24H':
      return new Date(now - 24 * 60 * 60 * 1000).toISOString();
    case '7D':
      return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    case '30D':
      return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return undefined;
  }
}

const renderSelectedValues = (values: readonly string[]) =>
  values.length ? values.join(', ') : 'All';

const renderSourceChips = (values: SearchSource[]) =>
  values.length
    ? (
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {values.map((value) => (
            <Chip key={value} label={value} size="small" color={value === 'GRAPH' ? 'primary' : 'secondary'} />
          ))}
        </Stack>
      )
    : 'All';

const FullTextSearchBar: React.FC<FullTextSearchBarProps> = ({
  onSearchStart,
  onResults,
  onError,
  tenantId,
}) => {
  const [query, setQuery] = useState('');
  const [nodeTypes, setNodeTypes] = useState<string[]>([]);
  const [sources, setSources] = useState<SearchSource[]>(SOURCE_OPTIONS);
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('ALL');
  const [localError, setLocalError] = useState<string | null>(null);

  const [executeSearch, { loading, data, error }] = useLazyQuery(FULL_TEXT_SEARCH, {
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    if (data?.fullTextSearch) {
      setLocalError(null);
      onResults?.(data.fullTextSearch);
    }
  }, [data, onResults]);

  useEffect(() => {
    if (error) {
      const message = error.message || 'Search failed';
      setLocalError(message);
      onError?.(message);
    }
  }, [error, onError]);

  const handleSearch = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      const message = 'Enter a search query to get results.';
      setLocalError(message);
      onError?.(message);
      return;
    }

    onSearchStart?.(trimmed);
    setLocalError(null);

    const startTimestamp = computeStartTimestamp(timeRange);

    executeSearch({
      variables: {
        input: {
          query: trimmed,
          tenantId,
          nodeTypes: nodeTypes.length ? nodeTypes : undefined,
          sources,
          startTimestamp,
        },
      },
    });
  }, [executeSearch, nodeTypes, onError, onSearchStart, query, sources, tenantId, timeRange]);

  const handleNodeTypeChange = useCallback((event: SelectChangeEvent<string[]>) => {
    const value = event.target.value as string[];
    setNodeTypes(value);
  }, []);

  const handleSourceChange = useCallback((event: SelectChangeEvent<SearchSource[]>) => {
    const value = event.target.value as SearchSource[];
    setSources(value);
  }, []);

  const helperText = useMemo(() => {
    if (localError) {
      return localError;
    }
    if (data?.fullTextSearch) {
      const { total, tookMs } = data.fullTextSearch;
      return `Found ${total} results in ${tookMs}ms.`;
    }
    return undefined;
  }, [data, localError]);

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search entities, documents, relationships..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              handleSearch();
            }
          }}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
          helperText={helperText}
          error={Boolean(localError)}
          data-testid="fulltext-search-input"
        />
        <Button
          variant="contained"
          size="large"
          startIcon={<SearchIcon />}
          onClick={handleSearch}
          disabled={loading}
          data-testid="fulltext-search-button"
        >
          {loading ? 'Searching…' : 'Search'}
        </Button>
        <Button variant="outlined" color="secondary" startIcon={<SavedSearch />} disabled>
          Save
        </Button>
        <Button variant="outlined" color="inherit" startIcon={<Share />} disabled>
          Share
        </Button>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mt={2}>
        <FormControl fullWidth size="small">
          <InputLabel id="search-node-type-label">Node Type</InputLabel>
          <Select
            labelId="search-node-type-label"
            multiple
            value={nodeTypes}
            onChange={handleNodeTypeChange}
            input={<OutlinedInput label="Node Type" />}
            renderValue={(selected) => renderSelectedValues(selected)}
            data-testid="fulltext-filter-nodetype"
          >
            {NODE_TYPE_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel id="search-source-label">Data Source</InputLabel>
          <Select
            labelId="search-source-label"
            multiple
            value={sources}
            onChange={handleSourceChange}
            input={<OutlinedInput label="Data Source" />}
            renderValue={(selected) => renderSourceChips(selected as SearchSource[])}
            data-testid="fulltext-filter-source"
          >
            {SOURCE_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel id="search-time-range-label">Time Range</InputLabel>
          <Select
            labelId="search-time-range-label"
            value={timeRange}
            label="Time Range"
            onChange={(event) => setTimeRange(event.target.value as TimeRangeOption)}
            data-testid="fulltext-filter-time"
          >
            <MenuItem value="ALL">All time</MenuItem>
            <MenuItem value="24H">Last 24 hours</MenuItem>
            <MenuItem value="7D">Last 7 days</MenuItem>
            <MenuItem value="30D">Last 30 days</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {loading && (
        <Typography variant="body2" color="text.secondary" mt={1} data-testid="fulltext-search-status">
          Running federated search…
        </Typography>
      )}
    </Box>
  );
};

export default FullTextSearchBar;
