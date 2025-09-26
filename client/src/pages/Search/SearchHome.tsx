import React, { useMemo, useState } from 'react';
import {
  Tabs,
  Tab,
  Box,
  Stack,
  Typography,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slider,
  Switch,
  FormControlLabel,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
} from '@mui/material';
import {
  Search,
  FilterList,
  History,
  SavedSearch,
  ExpandMore,
  AccountTree,
  Timeline,
  Place,
} from '@mui/icons-material';
import ResultList from './components/ResultList';
import FullTextSearchBar, { type FullTextSearchResponse } from '../../components/search/FullTextSearchBar';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index} id={`search-tab-${index}`}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

interface SearchResult {
  id: string;
  type: 'PERSON' | 'ORGANIZATION' | 'DOCUMENT' | 'EVENT' | 'LOCATION' | 'IOC';
  title: string;
  description: string;
  score: number;
  tags: string[];
  lastUpdated: string;
}

export default function SearchHome() {
  const [selectedTab, setSelectedTab] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [lastQuery, setLastQuery] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResponse, setSearchResponse] = useState<FullTextSearchResponse | null>(null);
  const [savedSearches] = useState<string[]>([
    'APT29 related entities',
    'Financial transactions > $10,000',
    'Suspicious network traffic',
    'Email communications - Executive',
  ]);
  const uiResults = useMemo<SearchResult[]>(() => {
    if (!searchResponse) {
      return [];
    }

    const allowedTypes: SearchResult['type'][] = [
      'PERSON',
      'ORGANIZATION',
      'DOCUMENT',
      'EVENT',
      'LOCATION',
      'IOC',
    ];

    return searchResponse.results.map((result) => {
      const rawType = (result.nodeType || result.type || 'DOCUMENT').toUpperCase();
      const normalizedType = (allowedTypes.includes(rawType as SearchResult['type'])
        ? rawType
        : 'DOCUMENT') as SearchResult['type'];

      const lastUpdated = result.updatedAt ?? result.createdAt ?? new Date().toISOString();
      const tags: string[] = [
        result.source,
        result.nodeType ? result.nodeType.toUpperCase() : null,
      ].filter(Boolean) as string[];

      return {
        id: result.id,
        type: normalizedType,
        title: result.title || result.nodeType || 'Untitled Result',
        description: result.summary || 'No summary provided.',
        score: typeof result.score === 'number' ? result.score : 0.5,
        tags,
        lastUpdated,
      };
    });
  }, [searchResponse]);

  const entityTypes = ['Person', 'Organization', 'Document', 'Event', 'Location', 'IOC'];
  const timeRanges = ['Last 24 hours', 'Last 7 days', 'Last 30 days', 'Last 90 days', 'All time'];

  return (
    <Box sx={{ m: 2 }}>
      {/* Search Header */}
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
            IntelGraph Search
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            Advanced intelligence search across entities, documents, and relationships
          </Typography>

          <FullTextSearchBar
            onSearchStart={(query) => {
              setIsSearching(true);
              setSearchError(null);
              setLastQuery(query);
            }}
            onResults={(response) => {
              setIsSearching(false);
              setSearchResponse(response);
              setSearchError(null);
            }}
            onError={(message) => {
              setIsSearching(false);
              setSearchError(message);
            }}
          />

          {searchError && (
            <Alert severity="error" sx={{ mt: 2 }} data-testid="fulltext-search-error">
              {searchError}
            </Alert>
          )}

          {searchResponse && !searchError && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 2 }}
              data-testid="fulltext-search-summary"
            >
              Showing {searchResponse.results.length} of {searchResponse.total} results for "{lastQuery}" (took{' '}
              {searchResponse.tookMs}ms)
            </Typography>
          )}
        </CardContent>
      </Card>

      <Box sx={{ width: '100%' }}>
        <Tabs
          value={selectedTab}
          onChange={(_, v) => setSelectedTab(v)}
          aria-label="Search tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<Search />} label="Simple Search" />
          <Tab icon={<FilterList />} label="Advanced Filters" />
          <Tab icon={<AccountTree />} label="Graph Search" />
          <Tab icon={<Timeline />} label="Temporal Search" />
          <Tab icon={<Place />} label="Geospatial" />
        </Tabs>

        {/* Simple Search Tab */}
        <TabPanel value={selectedTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <Card sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Search Filters
                  </Typography>

                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Entity Type</InputLabel>
                    <Select label="Entity Type" defaultValue="">
                      <MenuItem value="">All Types</MenuItem>
                      {entityTypes.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Time Range</InputLabel>
                    <Select label="Time Range" defaultValue="All time">
                      {timeRanges.map((range) => (
                        <MenuItem key={range} value={range}>
                          {range}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Typography gutterBottom>Confidence Score</Typography>
                  <Slider
                    defaultValue={[0, 100]}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${value}%`}
                    sx={{ mb: 2 }}
                  />

                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                    Saved Searches
                  </Typography>
                  <List dense>
                    {savedSearches.map((search, index) => (
                      <ListItem key={index} sx={{ pl: 0 }}>
                        <ListItemIcon>
                          <SavedSearch fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={search}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={9}>
              {uiResults.length > 0 ? (
                <ResultList results={uiResults} loading={isSearching} />
              ) : isSearching ? (
                <Card sx={{ borderRadius: 3 }}>
                  <CardContent sx={{ textAlign: 'center', py: 6 }}>
                    <Typography variant="h6" gutterBottom>
                      Searching for "{lastQuery}"…
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Gathering results across graph metadata and ingested datasets.
                    </Typography>
                  </CardContent>
                </Card>
              ) : lastQuery ? (
                <Card sx={{ borderRadius: 3 }}>
                  <CardContent sx={{ textAlign: 'center', py: 6 }}>
                    <Search sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      No results for "{lastQuery}"
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Try adjusting filters or broadening your search terms.
                    </Typography>
                  </CardContent>
                </Card>
              ) : (
                <Card sx={{ borderRadius: 3 }}>
                  <CardContent sx={{ textAlign: 'center', py: 6 }}>
                    <Search sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Start Searching
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Enter a search term to find entities, documents, and relationships
                    </Typography>
                  </CardContent>
                </Card>
              )}
            </Grid>
          </Grid>
        </TabPanel>

        {/* Advanced Filters Tab */}
        <TabPanel value={selectedTab} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 3 }}>
                Use advanced filters to create precise queries across multiple entity types and
                attributes.
              </Alert>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Entity Filters
                  </Typography>

                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography>Person Attributes</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={2}>
                        <TextField label="Name" size="small" />
                        <TextField label="Email" size="small" />
                        <TextField label="Phone" size="small" />
                        <FormControlLabel control={<Switch />} label="High-risk individual" />
                      </Stack>
                    </AccordionDetails>
                  </Accordion>

                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography>Organization Attributes</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={2}>
                        <TextField label="Company Name" size="small" />
                        <TextField label="Industry" size="small" />
                        <TextField label="Location" size="small" />
                        <FormControlLabel control={<Switch />} label="Shell company indicators" />
                      </Stack>
                    </AccordionDetails>
                  </Accordion>

                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography>Document Attributes</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={2}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Document Type</InputLabel>
                          <Select label="Document Type">
                            <MenuItem value="contract">Contract</MenuItem>
                            <MenuItem value="email">Email</MenuItem>
                            <MenuItem value="report">Report</MenuItem>
                            <MenuItem value="transaction">Transaction</MenuItem>
                          </Select>
                        </FormControl>
                        <TextField label="Keywords" size="small" />
                        <FormControlLabel control={<Switch />} label="Classified documents only" />
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Relationship Filters
                  </Typography>

                  <Stack spacing={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Relationship Type</InputLabel>
                      <Select label="Relationship Type">
                        <MenuItem value="owns">Owns</MenuItem>
                        <MenuItem value="works_for">Works For</MenuItem>
                        <MenuItem value="communicates_with">Communicates With</MenuItem>
                        <MenuItem value="transacts_with">Transacts With</MenuItem>
                        <MenuItem value="associated_with">Associated With</MenuItem>
                      </Select>
                    </FormControl>

                    <Typography gutterBottom>Relationship Strength</Typography>
                    <Slider
                      defaultValue={50}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(value) => `${value}%`}
                    />

                    <FormControlLabel control={<Switch />} label="Direct relationships only" />

                    <FormControlLabel
                      control={<Switch />}
                      label="Include historical relationships"
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Graph Search Tab */}
        <TabPanel value={selectedTab} index={2}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Graph Pattern Search
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Search for complex patterns and relationships within the intelligence graph.
              </Typography>

              <Alert severity="info" sx={{ mb: 3 }}>
                Graph search allows you to find entities connected through specific relationship
                patterns.
              </Alert>

              <Stack spacing={3}>
                <TextField
                  fullWidth
                  label="Cypher Query"
                  multiline
                  rows={4}
                  placeholder="MATCH (p:Person)-[:WORKS_FOR]->(c:Company) WHERE p.risk_score > 0.7 RETURN p, c"
                  sx={{ fontFamily: 'monospace' }}
                />

                <Stack direction="row" spacing={2}>
                  <Button variant="contained" startIcon={<Search />}>
                    Execute Query
                  </Button>
                  <Button variant="outlined">Query Builder</Button>
                  <Button variant="outlined" startIcon={<History />}>
                    Query History
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </TabPanel>

        {/* Temporal Search Tab */}
        <TabPanel value={selectedTab} index={3}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Temporal Analysis
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Search and analyze entities and relationships over time.
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Stack spacing={2}>
                    <Typography variant="subtitle2">Time Range</Typography>
                    <Stack direction="row" spacing={2}>
                      <TextField
                        label="Start Date"
                        type="date"
                        size="small"
                        InputLabelProps={{ shrink: true }}
                      />
                      <TextField
                        label="End Date"
                        type="date"
                        size="small"
                        InputLabelProps={{ shrink: true }}
                      />
                    </Stack>
                  </Stack>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Stack spacing={2}>
                    <Typography variant="subtitle2">Analysis Type</Typography>
                    <FormControl fullWidth size="small">
                      <InputLabel>Analysis Type</InputLabel>
                      <Select label="Analysis Type">
                        <MenuItem value="timeline">Timeline Analysis</MenuItem>
                        <MenuItem value="pattern">Pattern Detection</MenuItem>
                        <MenuItem value="anomaly">Anomaly Detection</MenuItem>
                        <MenuItem value="trend">Trend Analysis</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>
                </Grid>
              </Grid>

              <Button variant="contained" sx={{ mt: 3 }} startIcon={<Timeline />}>
                Run Temporal Analysis
              </Button>
            </CardContent>
          </Card>
        </TabPanel>

        {/* Geospatial Search Tab */}
        <TabPanel value={selectedTab} index={4}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Geospatial Intelligence
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Search entities by geographic location and spatial relationships.
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Stack spacing={2}>
                    <TextField
                      label="Location"
                      placeholder="Enter city, country, or coordinates"
                      size="small"
                    />

                    <Typography gutterBottom>Search Radius (km)</Typography>
                    <Slider
                      defaultValue={10}
                      min={1}
                      max={1000}
                      valueLabelDisplay="auto"
                      scale={(value) => value}
                    />

                    <FormControlLabel control={<Switch />} label="Include movement patterns" />
                  </Stack>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper
                    variant="outlined"
                    sx={{
                      height: 200,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'grey.50',
                    }}
                  >
                    <Stack alignItems="center">
                      <Place sx={{ fontSize: 48, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        Interactive Map View
                      </Typography>
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>

              <Button variant="contained" sx={{ mt: 3 }} startIcon={<Place />}>
                Search by Location
              </Button>
            </CardContent>
          </Card>
        </TabPanel>
      </Box>
    </Box>
  );
}
