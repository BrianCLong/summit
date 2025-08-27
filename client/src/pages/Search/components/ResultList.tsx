import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  IconButton,
  Avatar,
  LinearProgress,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem as SelectMenuItem,
  Alert,
  ChipProps
} from '@mui/material';
import {
  Person,
  Business,
  Description,
  Event,
  Place,
  Security,
  MoreVert,
  Share,
  OpenInNew,
  Add,
  Timeline,
  Visibility,
  Star,
  StarBorder
} from '@mui/icons-material';

interface SearchResult {
  id: string;
  type: 'PERSON' | 'ORGANIZATION' | 'DOCUMENT' | 'EVENT' | 'LOCATION' | 'IOC';
  title: string;
  description: string;
  score: number;
  tags: string[];
  lastUpdated: string;
  metadata?: Record<string, unknown>;
}

interface ResultListProps {
  results: SearchResult[];
  loading?: boolean;
}

const getEntityIcon = (type: SearchResult['type']) => {
  switch (type) {
    case 'PERSON': return <Person />;
    case 'ORGANIZATION': return <Business />;
    case 'DOCUMENT': return <Description />;
    case 'EVENT': return <Event />;
    case 'LOCATION': return <Place />;
    case 'IOC': return <Security />;
    default: return <Description />;
  }
};

const getEntityColor = (type: SearchResult['type']): ChipProps['color'] => {
  switch (type) {
    case 'PERSON': return 'primary';
    case 'ORGANIZATION': return 'secondary';
    case 'DOCUMENT': return 'info';
    case 'EVENT': return 'warning';
    case 'LOCATION': return 'success';
    case 'IOC': return 'error';
    default: return 'default';
  }
};

const getScoreColor = (score: number): ChipProps['color'] => {
  if (score >= 0.8) return 'success';
  if (score >= 0.6) return 'warning';
  return 'error';
};

export default function ResultList({ results, loading = false }: ResultListProps) {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('relevance');
  const [menuAnchor, setMenuAnchor] = useState<{ [key: string]: HTMLElement | null }>({});
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());

  const resultsPerPage = 10;
  
  const sortedResults = [...results].sort((a, b) => {
    switch (sortBy) {
      case 'relevance': return b.score - a.score;
      case 'date': return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
      case 'title': return a.title.localeCompare(b.title);
      case 'type': return a.type.localeCompare(b.type);
      default: return 0;
    }
  });

  const startIndex = (page - 1) * resultsPerPage;
  const paginatedResults = sortedResults.slice(startIndex, startIndex + resultsPerPage);

  const handleMenuOpen = (resultId: string, event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor({ ...menuAnchor, [resultId]: event.currentTarget });
  };

  const handleMenuClose = (resultId: string) => {
    setMenuAnchor({ ...menuAnchor, [resultId]: null });
  };

  const toggleBookmark = (resultId: string) => {
    const newBookmarked = new Set(bookmarked);
    if (newBookmarked.has(resultId)) {
      newBookmarked.delete(resultId);
    } else {
      newBookmarked.add(resultId);
    }
    setBookmarked(newBookmarked);
  };

  if (loading) {
    return (
      <Box>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          Searching intelligence database...
        </Typography>
      </Box>
    );
  }

  if (results.length === 0) {
    return (
      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" gutterBottom>
            No Results Found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your search terms or filters
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* Results Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h6">
          {results.length.toLocaleString()} results found
        </Typography>
        
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Sort by</InputLabel>
            <Select
              value={sortBy}
              label="Sort by"
              onChange={(e) => setSortBy(e.target.value)}
            >
              <SelectMenuItem value="relevance">Relevance</SelectMenuItem>
              <SelectMenuItem value="date">Date</SelectMenuItem>
              <SelectMenuItem value="title">Title</SelectMenuItem>
              <SelectMenuItem value="type">Type</SelectMenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Stack>

      {/* Results List */}
      <Stack spacing={2}>
        {paginatedResults.map((result) => (
          <Card key={result.id} sx={{ borderRadius: 3, '&:hover': { boxShadow: 4 } }}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Avatar 
                  sx={{ 
                    bgcolor: `${getEntityColor(result.type)}.main`,
                    width: 48,
                    height: 48
                  }}
                >
                  {getEntityIcon(result.type)}
                </Avatar>

                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                    <Box sx={{ flex: 1 }}>
                      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            '&:hover': { color: 'primary.main' }
                          }}
                          onClick={() => { /* TODO: Navigate to detail page */ }}
                        >
                          {result.title}
                        </Typography>
                        
                        <Chip 
                          label={result.type} 
                          size="small" 
                          color={getEntityColor(result.type)}
                          variant="outlined"
                        />
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Relevance:
                          </Typography>
                          <Chip 
                            label={`${Math.round(result.score * 100)}%`}
                            size="small"
                            color={getScoreColor(result.score)}
                            variant="filled"
                          />
                        </Box>
                      </Stack>

                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        paragraph
                        sx={{ mb: 2 }}
                      >
                        {result.description}
                      </Typography>

                      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          Last updated: {new Date(result.lastUpdated).toLocaleDateString()}
                        </Typography>
                      </Stack>

                      {/* Tags */}
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {result.tags.slice(0, 4).map((tag) => (
                          <Chip 
                            key={tag} 
                            label={tag} 
                            size="small" 
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: 24 }}
                            onClick={() => { /* TODO: Filter by tag */ }}
                          />
                        ))}
                        {result.tags.length > 4 && (
                          <Chip 
                            label={`+${result.tags.length - 4} more`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: 24 }}
                          />
                        )}
                      </Stack>
                    </Box>

                    {/* Actions */}
                    <Stack direction="row" spacing={1}>
                      <Tooltip title={bookmarked.has(result.id) ? "Remove bookmark" : "Bookmark"}>
                        <IconButton 
                          size="small"
                          onClick={() => toggleBookmark(result.id)}
                        >
                          {bookmarked.has(result.id) ? <Star color="warning" /> : <StarBorder />}
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="View details">
                        <IconButton size="small">
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Add to investigation">
                        <IconButton size="small">
                          <Add />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="More actions">
                        <IconButton 
                          size="small"
                          onClick={(e) => handleMenuOpen(result.id, e)}
                        >
                          <MoreVert />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </Box>
              </Stack>

              {/* Additional metadata based on entity type */}
              {result.metadata && (
                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderTopColor: 'divider' }}>
                  <Stack direction="row" spacing={4}>
                    {result.type === 'PERSON' && result.metadata.organization && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">Organization</Typography>
                        <Typography variant="body2">{result.metadata.organization as string}</Typography>
                      </Box>
                    )}
                    {result.type === 'ORGANIZATION' && result.metadata.industry && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">Industry</Typography>
                        <Typography variant="body2">{result.metadata.industry as string}</Typography>
                      </Box>
                    )}
                    {result.type === 'IOC' && result.metadata.threatType && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">Threat Type</Typography>
                        <Typography variant="body2">{result.metadata.threatType as string}</Typography>
                      </Box>
                    )}
                    {result.metadata.riskScore && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">Risk Score</Typography>
                        <LinearProgress
                          variant="determinate"
                          value={result.metadata.riskScore as number}
                          color={result.metadata.riskScore > 70 ? 'error' : result.metadata.riskScore > 40 ? 'warning' : 'success'}
                          sx={{ width: 60, height: 6, borderRadius: 3, mt: 0.5 }}
                        />
                      </Box>
                    )}
                  </Stack>
                </Box>
              )}

              {/* Context Menu */}
              <Menu
                anchorEl={menuAnchor[result.id]}
                open={Boolean(menuAnchor[result.id])}
                onClose={() => handleMenuClose(result.id)}
                PaperProps={{
                  sx: { width: 200 }
                }}
              >
                <MenuItem onClick={() => handleMenuClose(result.id)}>
                  <ListItemIcon>
                    <OpenInNew />
                  </ListItemIcon>
                  <ListItemText primary="Open in new tab" />
                </MenuItem>
                <MenuItem onClick={() => handleMenuClose(result.id)}>
                  <ListItemIcon>
                    <Share />
                  </ListItemIcon>
                  <ListItemText primary="Share" />
                </MenuItem>
                <MenuItem onClick={() => handleMenuClose(result.id)}>
                  <ListItemIcon>
                    <Timeline />
                  </ListItemIcon>
                  <ListItemText primary="View relationships" />
                </MenuItem>
                <MenuItem onClick={() => handleMenuClose(result.id)}>
                  <ListItemIcon>
                    <Add />
                  </ListItemIcon>
                  <ListItemText primary="Add to investigation" />
                </MenuItem>
              </Menu>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Pagination */}
      {results.length > resultsPerPage && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={Math.ceil(results.length / resultsPerPage)}
            page={page}
            onChange={(_, newPage) => setPage(newPage)}
            color="primary"
            size="large"
          />
        </Box>
      )}

      {/* Results Summary */}
      {results.length > 0 && (
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            Showing {startIndex + 1}-{Math.min(startIndex + resultsPerPage, results.length)} of {results.length} results. 
            Results are sorted by {sortBy} and filtered based on your search criteria.
          </Typography>
        </Alert>
      )}
    </Box>
  );
}