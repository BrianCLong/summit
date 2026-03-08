"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransformSearch = void 0;
const react_1 = require("react");
const material_1 = require("@mui/material");
const transformIndex_1 = require("../../lib/search/transformIndex");
const TransformSearch = () => {
    const [query, setQuery] = (0, react_1.useState)('');
    const [results, setResults] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        const fetchTransforms = async () => {
            try {
                const response = await fetch('/api/transforms');
                if (!response.ok) {
                    throw new Error('Failed to fetch transforms');
                }
                const data = await response.json();
                const transforms = data.transforms || [];
                transformIndex_1.transformIndex.setTransforms(transforms);
                setResults(transforms);
            }
            catch (err) {
                console.error(err);
                setError('Error loading transforms');
            }
            finally {
                setLoading(false);
            }
        };
        fetchTransforms();
    }, []);
    (0, react_1.useEffect)(() => {
        setResults(transformIndex_1.transformIndex.search(query));
    }, [query]);
    if (loading) {
        return <material_1.Box display="flex" justifyContent="center" p={2}><material_1.CircularProgress /></material_1.Box>;
    }
    if (error) {
        return <material_1.Box p={2}><material_1.Typography color="error">{error}</material_1.Typography></material_1.Box>;
    }
    return (<material_1.Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <material_1.Typography variant="h6" gutterBottom>
        Run Transforms
      </material_1.Typography>
      <material_1.TextField fullWidth variant="outlined" placeholder="Search transforms..." value={query} onChange={(e) => setQuery(e.target.value)} sx={{ mb: 2 }} autoFocus slotProps={{ htmlInput: { 'data-testid': 'transform-search-input' } }}/>
      <material_1.Paper variant="outlined" sx={{ flexGrow: 1, overflow: 'auto' }}>
        <material_1.List data-testid="transform-list">
          {results.map((transform) => (<material_1.ListItem key={transform.id} disablePadding>
              <material_1.ListItemButton>
                <material_1.ListItemText primary={transform.name} secondary={transform.description}/>
              </material_1.ListItemButton>
            </material_1.ListItem>))}
          {results.length === 0 && (<material_1.Typography variant="body2" color="textSecondary" sx={{ p: 2 }}>
               No transforms found.
             </material_1.Typography>)}
        </material_1.List>
      </material_1.Paper>
    </material_1.Box>);
};
exports.TransformSearch = TransformSearch;
