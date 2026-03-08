"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SearchHome;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const Grid_1 = __importDefault(require("@mui/material/Grid"));
const icons_material_1 = require("@mui/icons-material");
const ResultList_1 = __importDefault(require("./components/ResultList"));
const useSafeQuery_1 = require("../../hooks/useSafeQuery");
const react_router_dom_1 = require("react-router-dom");
function TabPanel({ children, value, index }) {
    return (<div role="tabpanel" hidden={value !== index} id={`search-tab-${index}`}>
      {value === index && <material_1.Box sx={{ py: 3 }}>{children}</material_1.Box>}
    </div>);
}
function SearchHome() {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const [selectedTab, setSelectedTab] = (0, react_1.useState)(0);
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [isSearching, setIsSearching] = (0, react_1.useState)(false);
    const [tagFilter, setTagFilter] = (0, react_1.useState)(null);
    const [savedSearches] = (0, react_1.useState)([
        'APT29 related entities',
        'Financial transactions > $10,000',
        'Suspicious network traffic',
        'Email communications - Executive',
    ]);
    const { data: searchResults } = (0, useSafeQuery_1.useSafeQuery)({
        queryKey: `search_results_${searchQuery}`,
        mock: searchQuery
            ? [
                {
                    id: 'result1',
                    type: 'PERSON',
                    title: 'John Smith',
                    description: 'CEO at TechCorp, involved in multiple financial transactions',
                    score: 0.95,
                    tags: ['Executive', 'High-Value', 'Finance'],
                    lastUpdated: '2025-08-27T02:30:00Z',
                },
                {
                    id: 'result2',
                    type: 'ORGANIZATION',
                    title: 'Suspicious Shell Company LLC',
                    description: 'Recently incorporated entity with unclear beneficial ownership',
                    score: 0.88,
                    tags: ['Shell Company', 'Investigation', 'Finance'],
                    lastUpdated: '2025-08-26T15:45:00Z',
                },
                {
                    id: 'result3',
                    type: 'DOCUMENT',
                    title: 'Wire Transfer Authorization #WT-2025-4821',
                    description: 'Large wire transfer to offshore account flagged by compliance',
                    score: 0.82,
                    tags: ['Wire Transfer', 'Compliance', 'Offshore'],
                    lastUpdated: '2025-08-25T09:20:00Z',
                },
            ]
            : [],
        deps: [searchQuery],
    });
    const filteredResults = (0, react_1.useMemo)(() => {
        if (!searchResults)
            return [];
        if (!tagFilter)
            return searchResults;
        const normalized = tagFilter.toLowerCase();
        return searchResults.filter((result) => result.tags.some((tag) => tag.toLowerCase() === normalized));
    }, [searchResults, tagFilter]);
    const handleSearch = () => {
        setIsSearching(true);
        // Simulate search delay
        setTimeout(() => setIsSearching(false), 1000);
    };
    const entityTypes = [
        'Person',
        'Organization',
        'Document',
        'Event',
        'Location',
        'IOC',
    ];
    const timeRanges = [
        'Last 24 hours',
        'Last 7 days',
        'Last 30 days',
        'Last 90 days',
        'All time',
    ];
    return (<material_1.Box sx={{ m: 2 }}>
      {/* Search Header */}
      <material_1.Card sx={{ mb: 3, borderRadius: 3 }}>
        <material_1.CardContent>
          <material_1.Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
            IntelGraph Search
          </material_1.Typography>
          <material_1.Typography variant="subtitle1" color="text.secondary" gutterBottom>
            Advanced intelligence search across entities, documents, and
            relationships
          </material_1.Typography>

          <material_1.Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
            <material_1.TextField fullWidth variant="outlined" placeholder="Search entities, documents, relationships..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSearch()} InputProps={{
            startAdornment: (<icons_material_1.Search sx={{ mr: 1, color: 'text.secondary' }}/>),
        }} sx={{ maxWidth: 600 }}/>
            <material_1.Button variant="contained" size="large" onClick={handleSearch} disabled={isSearching} startIcon={<icons_material_1.Search />}>
              Search
            </material_1.Button>
            <material_1.Tooltip title="Save Search">
              <material_1.IconButton>
                <icons_material_1.SavedSearch />
              </material_1.IconButton>
            </material_1.Tooltip>
            <material_1.Tooltip title="Share Query">
              <material_1.IconButton>
                <icons_material_1.Share />
              </material_1.IconButton>
            </material_1.Tooltip>
          </material_1.Stack>
        </material_1.CardContent>
      </material_1.Card>

      <material_1.Box sx={{ width: '100%' }}>
        <material_1.Tabs value={selectedTab} onChange={(_, v) => setSelectedTab(v)} aria-label="Search tabs" variant="scrollable" scrollButtons="auto">
          <material_1.Tab icon={<icons_material_1.Search />} label="Simple Search"/>
          <material_1.Tab icon={<icons_material_1.FilterList />} label="Advanced Filters"/>
          <material_1.Tab icon={<icons_material_1.AccountTree />} label="Graph Search"/>
          <material_1.Tab icon={<icons_material_1.Timeline />} label="Temporal Search"/>
          <material_1.Tab icon={<icons_material_1.Place />} label="Geospatial"/>
        </material_1.Tabs>

        {/* Simple Search Tab */}
        <TabPanel value={selectedTab} index={0}>
          <Grid_1.default container spacing={3}>
            <Grid_1.default xs={12} md={3}>
              <material_1.Card sx={{ borderRadius: 3 }}>
                <material_1.CardContent>
                  <material_1.Typography variant="h6" gutterBottom>
                    Search Filters
                  </material_1.Typography>

                  <material_1.FormControl fullWidth sx={{ mb: 2 }}>
                    <material_1.InputLabel>Entity Type</material_1.InputLabel>
                    <material_1.Select label="Entity Type" defaultValue="">
                      <material_1.MenuItem value="">All Types</material_1.MenuItem>
                      {entityTypes.map((type) => (<material_1.MenuItem key={type} value={type}>
                          {type}
                        </material_1.MenuItem>))}
                    </material_1.Select>
                  </material_1.FormControl>

                  <material_1.FormControl fullWidth sx={{ mb: 2 }}>
                    <material_1.InputLabel>Time Range</material_1.InputLabel>
                    <material_1.Select label="Time Range" defaultValue="All time">
                      {timeRanges.map((range) => (<material_1.MenuItem key={range} value={range}>
                          {range}
                        </material_1.MenuItem>))}
                    </material_1.Select>
                  </material_1.FormControl>

                  <material_1.Typography gutterBottom>Confidence Score</material_1.Typography>
                  <material_1.Slider defaultValue={[0, 100]} valueLabelDisplay="auto" valueLabelFormat={(value) => `${value}%`} sx={{ mb: 2 }}/>

                  <material_1.Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                    Saved Searches
                  </material_1.Typography>
                  <material_1.List dense>
                    {savedSearches.map((search, index) => (<material_1.ListItem key={index} sx={{ pl: 0 }}>
                        <material_1.ListItemIcon>
                          <icons_material_1.SavedSearch fontSize="small"/>
                        </material_1.ListItemIcon>
                        <material_1.ListItemText primary={search} primaryTypographyProps={{ variant: 'body2' }}/>
                      </material_1.ListItem>))}
                  </material_1.List>
                </material_1.CardContent>
              </material_1.Card>
            </Grid_1.default>

            <Grid_1.default xs={12} md={9}>
              {searchQuery ? (<>
                  {tagFilter && (<material_1.Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                      <material_1.Chip label={`Tag: ${tagFilter}`} onDelete={() => setTagFilter(null)} variant="outlined" color="primary"/>
                    </material_1.Stack>)}
                  <ResultList_1.default results={filteredResults} loading={isSearching} onResultSelect={(result) => {
                const href = result.type === 'IOC'
                    ? `/ioc/${result.id}`
                    : `/search/results/${result.id}?type=${result.type}`;
                navigate(href);
            }} onTagSelect={(tag) => setTagFilter(tag)} getResultHref={(result) => result.type === 'IOC'
                ? `/ioc/${result.id}`
                : `/search/results/${result.id}?type=${result.type}`}/>
                </>) : (<material_1.Card sx={{ borderRadius: 3 }}>
                  <material_1.CardContent sx={{ textAlign: 'center', py: 6 }}>
                    <icons_material_1.Search sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }}/>
                    <material_1.Typography variant="h6" gutterBottom>
                      Start Searching
                    </material_1.Typography>
                    <material_1.Typography variant="body2" color="text.secondary">
                      Enter a search term to find entities, documents, and
                      relationships
                    </material_1.Typography>
                  </material_1.CardContent>
                </material_1.Card>)}
            </Grid_1.default>
          </Grid_1.default>
        </TabPanel>

        {/* Advanced Filters Tab */}
        <TabPanel value={selectedTab} index={1}>
          <Grid_1.default container spacing={3}>
            <Grid_1.default xs={12}>
              <material_1.Alert severity="info" sx={{ mb: 3 }}>
                Use advanced filters to create precise queries across multiple
                entity types and attributes.
              </material_1.Alert>
            </Grid_1.default>

            <Grid_1.default xs={12} md={6}>
              <material_1.Card sx={{ borderRadius: 3 }}>
                <material_1.CardContent>
                  <material_1.Typography variant="h6" gutterBottom>
                    Entity Filters
                  </material_1.Typography>

                  <material_1.Accordion>
                    <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />}>
                      <material_1.Typography>Person Attributes</material_1.Typography>
                    </material_1.AccordionSummary>
                    <material_1.AccordionDetails>
                      <material_1.Stack spacing={2}>
                        <material_1.TextField label="Name" size="small"/>
                        <material_1.TextField label="Email" size="small"/>
                        <material_1.TextField label="Phone" size="small"/>
                        <material_1.FormControlLabel control={<material_1.Switch />} label="High-risk individual"/>
                      </material_1.Stack>
                    </material_1.AccordionDetails>
                  </material_1.Accordion>

                  <material_1.Accordion>
                    <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />}>
                      <material_1.Typography>Organization Attributes</material_1.Typography>
                    </material_1.AccordionSummary>
                    <material_1.AccordionDetails>
                      <material_1.Stack spacing={2}>
                        <material_1.TextField label="Company Name" size="small"/>
                        <material_1.TextField label="Industry" size="small"/>
                        <material_1.TextField label="Location" size="small"/>
                        <material_1.FormControlLabel control={<material_1.Switch />} label="Shell company indicators"/>
                      </material_1.Stack>
                    </material_1.AccordionDetails>
                  </material_1.Accordion>

                  <material_1.Accordion>
                    <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />}>
                      <material_1.Typography>Document Attributes</material_1.Typography>
                    </material_1.AccordionSummary>
                    <material_1.AccordionDetails>
                      <material_1.Stack spacing={2}>
                        <material_1.FormControl fullWidth size="small">
                          <material_1.InputLabel>Document Type</material_1.InputLabel>
                          <material_1.Select label="Document Type">
                            <material_1.MenuItem value="contract">Contract</material_1.MenuItem>
                            <material_1.MenuItem value="email">Email</material_1.MenuItem>
                            <material_1.MenuItem value="report">Report</material_1.MenuItem>
                            <material_1.MenuItem value="transaction">Transaction</material_1.MenuItem>
                          </material_1.Select>
                        </material_1.FormControl>
                        <material_1.TextField label="Keywords" size="small"/>
                        <material_1.FormControlLabel control={<material_1.Switch />} label="Classified documents only"/>
                      </material_1.Stack>
                    </material_1.AccordionDetails>
                  </material_1.Accordion>
                </material_1.CardContent>
              </material_1.Card>
            </Grid_1.default>

            <Grid_1.default xs={12} md={6}>
              <material_1.Card sx={{ borderRadius: 3 }}>
                <material_1.CardContent>
                  <material_1.Typography variant="h6" gutterBottom>
                    Relationship Filters
                  </material_1.Typography>

                  <material_1.Stack spacing={2}>
                    <material_1.FormControl fullWidth size="small">
                      <material_1.InputLabel>Relationship Type</material_1.InputLabel>
                      <material_1.Select label="Relationship Type">
                        <material_1.MenuItem value="owns">Owns</material_1.MenuItem>
                        <material_1.MenuItem value="works_for">Works For</material_1.MenuItem>
                        <material_1.MenuItem value="communicates_with">
                          Communicates With
                        </material_1.MenuItem>
                        <material_1.MenuItem value="transacts_with">
                          Transacts With
                        </material_1.MenuItem>
                        <material_1.MenuItem value="associated_with">
                          Associated With
                        </material_1.MenuItem>
                      </material_1.Select>
                    </material_1.FormControl>

                    <material_1.Typography gutterBottom>Relationship Strength</material_1.Typography>
                    <material_1.Slider defaultValue={50} valueLabelDisplay="auto" valueLabelFormat={(value) => `${value}%`}/>

                    <material_1.FormControlLabel control={<material_1.Switch />} label="Direct relationships only"/>

                    <material_1.FormControlLabel control={<material_1.Switch />} label="Include historical relationships"/>
                  </material_1.Stack>
                </material_1.CardContent>
              </material_1.Card>
            </Grid_1.default>
          </Grid_1.default>
        </TabPanel>

        {/* Graph Search Tab */}
        <TabPanel value={selectedTab} index={2}>
          <material_1.Card sx={{ borderRadius: 3 }}>
            <material_1.CardContent>
              <material_1.Typography variant="h6" gutterBottom>
                Graph Pattern Search
              </material_1.Typography>
              <material_1.Typography variant="body2" color="text.secondary" paragraph>
                Search for complex patterns and relationships within the
                intelligence graph.
              </material_1.Typography>

              <material_1.Alert severity="info" sx={{ mb: 3 }}>
                Graph search allows you to find entities connected through
                specific relationship patterns.
              </material_1.Alert>

              <material_1.Stack spacing={3}>
                <material_1.TextField fullWidth label="Cypher Query" multiline rows={4} placeholder="MATCH (p:Person)-[:WORKS_FOR]->(c:Company) WHERE p.risk_score > 0.7 RETURN p, c" sx={{ fontFamily: 'monospace' }}/>

                <material_1.Stack direction="row" spacing={2}>
                  <material_1.Button variant="contained" startIcon={<icons_material_1.Search />}>
                    Execute Query
                  </material_1.Button>
                  <material_1.Button variant="outlined">Query Builder</material_1.Button>
                  <material_1.Button variant="outlined" startIcon={<icons_material_1.History />}>
                    Query History
                  </material_1.Button>
                </material_1.Stack>
              </material_1.Stack>
            </material_1.CardContent>
          </material_1.Card>
        </TabPanel>

        {/* Temporal Search Tab */}
        <TabPanel value={selectedTab} index={3}>
          <material_1.Card sx={{ borderRadius: 3 }}>
            <material_1.CardContent>
              <material_1.Typography variant="h6" gutterBottom>
                Temporal Analysis
              </material_1.Typography>
              <material_1.Typography variant="body2" color="text.secondary" paragraph>
                Search and analyze entities and relationships over time.
              </material_1.Typography>

              <Grid_1.default container spacing={3}>
                <Grid_1.default xs={12} md={6}>
                  <material_1.Stack spacing={2}>
                    <material_1.Typography variant="subtitle2">Time Range</material_1.Typography>
                    <material_1.Stack direction="row" spacing={2}>
                      <material_1.TextField label="Start Date" type="date" size="small" InputLabelProps={{ shrink: true }}/>
                      <material_1.TextField label="End Date" type="date" size="small" InputLabelProps={{ shrink: true }}/>
                    </material_1.Stack>
                  </material_1.Stack>
                </Grid_1.default>

                <Grid_1.default xs={12} md={6}>
                  <material_1.Stack spacing={2}>
                    <material_1.Typography variant="subtitle2">Analysis Type</material_1.Typography>
                    <material_1.FormControl fullWidth size="small">
                      <material_1.InputLabel>Analysis Type</material_1.InputLabel>
                      <material_1.Select label="Analysis Type">
                        <material_1.MenuItem value="timeline">Timeline Analysis</material_1.MenuItem>
                        <material_1.MenuItem value="pattern">Pattern Detection</material_1.MenuItem>
                        <material_1.MenuItem value="anomaly">Anomaly Detection</material_1.MenuItem>
                        <material_1.MenuItem value="trend">Trend Analysis</material_1.MenuItem>
                      </material_1.Select>
                    </material_1.FormControl>
                  </material_1.Stack>
                </Grid_1.default>
              </Grid_1.default>

              <material_1.Button variant="contained" sx={{ mt: 3 }} startIcon={<icons_material_1.Timeline />}>
                Run Temporal Analysis
              </material_1.Button>
            </material_1.CardContent>
          </material_1.Card>
        </TabPanel>

        {/* Geospatial Search Tab */}
        <TabPanel value={selectedTab} index={4}>
          <material_1.Card sx={{ borderRadius: 3 }}>
            <material_1.CardContent>
              <material_1.Typography variant="h6" gutterBottom>
                Geospatial Intelligence
              </material_1.Typography>
              <material_1.Typography variant="body2" color="text.secondary" paragraph>
                Search entities by geographic location and spatial
                relationships.
              </material_1.Typography>

              <Grid_1.default container spacing={3}>
                <Grid_1.default xs={12} md={6}>
                  <material_1.Stack spacing={2}>
                    <material_1.TextField label="Location" placeholder="Enter city, country, or coordinates" size="small"/>

                    <material_1.Typography gutterBottom>Search Radius (km)</material_1.Typography>
                    <material_1.Slider defaultValue={10} min={1} max={1000} valueLabelDisplay="auto" scale={(value) => value}/>

                    <material_1.FormControlLabel control={<material_1.Switch />} label="Include movement patterns"/>
                  </material_1.Stack>
                </Grid_1.default>

                <Grid_1.default xs={12} md={6}>
                  <material_1.Paper variant="outlined" sx={{
            height: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'grey.50',
        }}>
                    <material_1.Stack alignItems="center">
                      <icons_material_1.Place sx={{ fontSize: 48, color: 'text.secondary' }}/>
                      <material_1.Typography variant="body2" color="text.secondary">
                        Interactive Map View
                      </material_1.Typography>
                    </material_1.Stack>
                  </material_1.Paper>
                </Grid_1.default>
              </Grid_1.default>

              <material_1.Button variant="contained" sx={{ mt: 3 }} startIcon={<icons_material_1.Place />}>
                Search by Location
              </material_1.Button>
            </material_1.CardContent>
          </material_1.Card>
        </TabPanel>
      </material_1.Box>
    </material_1.Box>);
}
