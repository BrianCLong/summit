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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ResultList;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const getEntityIcon = (type) => {
    switch (type) {
        case 'PERSON':
            return <icons_material_1.Person />;
        case 'ORGANIZATION':
            return <icons_material_1.Business />;
        case 'DOCUMENT':
            return <icons_material_1.Description />;
        case 'EVENT':
            return <icons_material_1.Event />;
        case 'LOCATION':
            return <icons_material_1.Place />;
        case 'IOC':
            return <icons_material_1.Security />;
        default:
            return <icons_material_1.Description />;
    }
};
const getEntityColor = (type) => {
    switch (type) {
        case 'PERSON':
            return 'primary';
        case 'ORGANIZATION':
            return 'secondary';
        case 'DOCUMENT':
            return 'info';
        case 'EVENT':
            return 'warning';
        case 'LOCATION':
            return 'success';
        case 'IOC':
            return 'error';
        default:
            return 'default';
    }
};
const getScoreColor = (score) => {
    if (score >= 0.8)
        return 'success';
    if (score >= 0.6)
        return 'warning';
    return 'error';
};
function ResultList({ results, loading = false, onResultSelect, onTagSelect, getResultHref, }) {
    const [page, setPage] = (0, react_1.useState)(1);
    const [sortBy, setSortBy] = (0, react_1.useState)('relevance');
    const [menuAnchor, setMenuAnchor] = (0, react_1.useState)({});
    const [bookmarked, setBookmarked] = (0, react_1.useState)(new Set());
    const resultsPerPage = 10;
    const sortedResults = [...results].sort((a, b) => {
        switch (sortBy) {
            case 'relevance':
                return b.score - a.score;
            case 'date':
                return (new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
            case 'title':
                return a.title.localeCompare(b.title);
            case 'type':
                return a.type.localeCompare(b.type);
            default:
                return 0;
        }
    });
    const startIndex = (page - 1) * resultsPerPage;
    const paginatedResults = sortedResults.slice(startIndex, startIndex + resultsPerPage);
    const handleMenuOpen = (resultId, event) => {
        setMenuAnchor({ ...menuAnchor, [resultId]: event.currentTarget });
    };
    const handleMenuClose = (resultId) => {
        setMenuAnchor({ ...menuAnchor, [resultId]: null });
    };
    const toggleBookmark = (resultId) => {
        const newBookmarked = new Set(bookmarked);
        if (newBookmarked.has(resultId)) {
            newBookmarked.delete(resultId);
        }
        else {
            newBookmarked.add(resultId);
        }
        setBookmarked(newBookmarked);
    };
    const handleSelectResult = (result) => {
        if (onResultSelect)
            onResultSelect(result);
    };
    const openInNewTab = (result) => {
        const href = getResultHref ? getResultHref(result) : null;
        if (href) {
            window.open(href, '_blank', 'noopener,noreferrer');
            return;
        }
        handleSelectResult(result);
    };
    if (loading) {
        return (<material_1.Box>
        <material_1.LinearProgress sx={{ mb: 2 }}/>
        <material_1.Typography variant="body2" color="text.secondary">
          Searching intelligence database...
        </material_1.Typography>
      </material_1.Box>);
    }
    if (results.length === 0) {
        return (<material_1.Card sx={{ borderRadius: 3 }}>
        <material_1.CardContent sx={{ textAlign: 'center', py: 6 }}>
          <material_1.Typography variant="h6" gutterBottom>
            No Results Found
          </material_1.Typography>
          <material_1.Typography variant="body2" color="text.secondary">
            Try adjusting your search terms or filters
          </material_1.Typography>
        </material_1.CardContent>
      </material_1.Card>);
    }
    return (<material_1.Box>
      {/* Results Header */}
      <material_1.Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <material_1.Typography variant="h6">
          {results.length.toLocaleString()} results found
        </material_1.Typography>

        <material_1.Stack direction="row" spacing={2} alignItems="center">
          <material_1.FormControl size="small" sx={{ minWidth: 120 }}>
            <material_1.InputLabel>Sort by</material_1.InputLabel>
            <material_1.Select value={sortBy} label="Sort by" onChange={(e) => setSortBy(e.target.value)}>
              <material_1.MenuItem value="relevance">Relevance</material_1.MenuItem>
              <material_1.MenuItem value="date">Date</material_1.MenuItem>
              <material_1.MenuItem value="title">Title</material_1.MenuItem>
              <material_1.MenuItem value="type">Type</material_1.MenuItem>
            </material_1.Select>
          </material_1.FormControl>
        </material_1.Stack>
      </material_1.Stack>

      {/* Results List */}
      <material_1.Stack spacing={2}>
        {paginatedResults.map((result) => (<material_1.Card key={result.id} sx={{ borderRadius: 3, '&:hover': { boxShadow: 4 } }}>
            <material_1.CardContent>
              <material_1.Stack direction="row" spacing={2} alignItems="flex-start">
                <material_1.Avatar sx={{
                bgcolor: `${getEntityColor(result.type)}.main`,
                width: 48,
                height: 48,
            }}>
                  {getEntityIcon(result.type)}
                </material_1.Avatar>

                <material_1.Box sx={{ flex: 1 }}>
                  <material_1.Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                    <material_1.Box sx={{ flex: 1 }}>
                      <material_1.Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                        <material_1.Typography variant="h6" sx={{
                fontWeight: 'bold',
                cursor: 'pointer',
                '&:hover': { color: 'primary.main' },
            }} onClick={() => handleSelectResult(result)}>
                          {result.title}
                        </material_1.Typography>

                        <material_1.Chip label={result.type} size="small" color={getEntityColor(result.type)} variant="outlined"/>

                        <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <material_1.Typography variant="caption" color="text.secondary">
                            Relevance:
                          </material_1.Typography>
                          <material_1.Chip label={`${Math.round(result.score * 100)}%`} size="small" color={getScoreColor(result.score)} variant="filled"/>
                        </material_1.Box>
                      </material_1.Stack>

                      <material_1.Typography variant="body2" color="text.secondary" paragraph sx={{ mb: 2 }}>
                        {result.description}
                      </material_1.Typography>

                      <material_1.Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                        <material_1.Typography variant="caption" color="text.secondary">
                          Last updated:{' '}
                          {new Date(result.lastUpdated).toLocaleDateString()}
                        </material_1.Typography>
                      </material_1.Stack>

                      {/* Tags */}
                      <material_1.Stack direction="row" spacing={1} flexWrap="wrap">
                        {result.tags.slice(0, 4).map((tag) => (<material_1.Chip key={tag} label={tag} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 24 }} onClick={() => onTagSelect?.(tag)}/>))}
                        {result.tags.length > 4 && (<material_1.Chip label={`+${result.tags.length - 4} more`} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 24 }}/>)}
                      </material_1.Stack>
                    </material_1.Box>

                    {/* Actions */}
                    <material_1.Stack direction="row" spacing={1}>
                      <material_1.Tooltip title={bookmarked.has(result.id)
                ? 'Remove bookmark'
                : 'Bookmark'}>
                        <material_1.IconButton size="small" onClick={() => toggleBookmark(result.id)}>
                          {bookmarked.has(result.id) ? (<icons_material_1.Star color="warning"/>) : (<icons_material_1.StarBorder />)}
                        </material_1.IconButton>
                      </material_1.Tooltip>

                      <material_1.Tooltip title="View details">
                        <material_1.IconButton size="small" onClick={() => handleSelectResult(result)}>
                          <icons_material_1.Visibility />
                        </material_1.IconButton>
                      </material_1.Tooltip>

                      <material_1.Tooltip title="Add to investigation">
                        <material_1.IconButton size="small">
                          <icons_material_1.Add />
                        </material_1.IconButton>
                      </material_1.Tooltip>

                      <material_1.Tooltip title="More actions">
                        <material_1.IconButton size="small" onClick={(e) => handleMenuOpen(result.id, e)}>
                          <icons_material_1.MoreVert />
                        </material_1.IconButton>
                      </material_1.Tooltip>
                    </material_1.Stack>
                  </material_1.Stack>
                </material_1.Box>
              </material_1.Stack>

              {/* Additional metadata based on entity type */}
              {Boolean(result.metadata) && (<material_1.Box sx={{
                    mt: 2,
                    pt: 2,
                    borderTop: '1px solid',
                    borderTopColor: 'divider',
                }}>
                  <material_1.Stack direction="row" spacing={4}>
                    {result.type === 'PERSON' &&
                    typeof result.metadata?.organization === 'string' && (<material_1.Box>
                          <material_1.Typography variant="caption" color="text.secondary">
                            Organization
                          </material_1.Typography>
                          <material_1.Typography variant="body2">
                            {result.metadata.organization}
                          </material_1.Typography>
                        </material_1.Box>)}
                    {result.type === 'ORGANIZATION' &&
                    typeof result.metadata?.industry === 'string' && (<material_1.Box>
                          <material_1.Typography variant="caption" color="text.secondary">
                            Industry
                          </material_1.Typography>
                          <material_1.Typography variant="body2">
                            {result.metadata.industry}
                          </material_1.Typography>
                        </material_1.Box>)}
                    {result.type === 'IOC' &&
                    typeof result.metadata?.threatType === 'string' && (<material_1.Box>
                          <material_1.Typography variant="caption" color="text.secondary">
                            Threat Type
                          </material_1.Typography>
                          <material_1.Typography variant="body2">
                            {result.metadata.threatType}
                          </material_1.Typography>
                        </material_1.Box>)}
                    {typeof result.metadata?.riskScore === 'number' &&
                    (() => {
                        const riskScore = typeof result.metadata?.riskScore === 'number'
                            ? result.metadata.riskScore
                            : 0;
                        const color = riskScore > 70
                            ? 'error'
                            : riskScore > 40
                                ? 'warning'
                                : 'success';
                        return (<material_1.Box>
                            <material_1.Typography variant="caption" color="text.secondary">
                              Risk Score
                            </material_1.Typography>
                            <material_1.LinearProgress variant="determinate" value={riskScore} color={color} sx={{
                                width: 60,
                                height: 6,
                                borderRadius: 3,
                                mt: 0.5,
                            }}/>
                          </material_1.Box>);
                    })()}
                  </material_1.Stack>
                </material_1.Box>)}

              {/* Context Menu */}
              <material_1.Menu anchorEl={menuAnchor[result.id]} open={Boolean(menuAnchor[result.id])} onClose={() => handleMenuClose(result.id)} PaperProps={{
                sx: { width: 200 },
            }}>
                <material_1.MenuItem onClick={() => {
                openInNewTab(result);
                handleMenuClose(result.id);
            }}>
                  <material_1.ListItemIcon>
                    <icons_material_1.OpenInNew />
                  </material_1.ListItemIcon>
                  <material_1.ListItemText primary="Open in new tab"/>
                </material_1.MenuItem>
                <material_1.MenuItem onClick={() => handleMenuClose(result.id)}>
                  <material_1.ListItemIcon>
                    <icons_material_1.Share />
                  </material_1.ListItemIcon>
                  <material_1.ListItemText primary="Share"/>
                </material_1.MenuItem>
                <material_1.MenuItem onClick={() => handleMenuClose(result.id)}>
                  <material_1.ListItemIcon>
                    <icons_material_1.Timeline />
                  </material_1.ListItemIcon>
                  <material_1.ListItemText primary="View relationships"/>
                </material_1.MenuItem>
                <material_1.MenuItem onClick={() => handleMenuClose(result.id)}>
                  <material_1.ListItemIcon>
                    <icons_material_1.Add />
                  </material_1.ListItemIcon>
                  <material_1.ListItemText primary="Add to investigation"/>
                </material_1.MenuItem>
              </material_1.Menu>
            </material_1.CardContent>
          </material_1.Card>))}
      </material_1.Stack>

      {/* Pagination */}
      {results.length > resultsPerPage && (<material_1.Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <material_1.Pagination count={Math.ceil(results.length / resultsPerPage)} page={page} onChange={(_, newPage) => setPage(newPage)} color="primary" size="large"/>
        </material_1.Box>)}

      {/* Results Summary */}
      {results.length > 0 && (<material_1.Alert severity="info" sx={{ mt: 3 }}>
          <material_1.Typography variant="body2">
            Showing {startIndex + 1}-
            {Math.min(startIndex + resultsPerPage, results.length)} of{' '}
            {results.length} results. Results are sorted by {sortBy} and
            filtered based on your search criteria.
          </material_1.Typography>
        </material_1.Alert>)}
    </material_1.Box>);
}
