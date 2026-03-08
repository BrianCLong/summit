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
exports.default = FacetPanel;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const entityTypes = [
    { value: 'PERSON', label: 'Person', icon: <icons_material_1.Person />, count: 1247 },
    {
        value: 'ORGANIZATION',
        label: 'Organization',
        icon: <icons_material_1.Business />,
        count: 892,
    },
    { value: 'DOCUMENT', label: 'Document', icon: <icons_material_1.Description />, count: 3421 },
    { value: 'EVENT', label: 'Event', icon: <icons_material_1.Event />, count: 567 },
    { value: 'LOCATION', label: 'Location', icon: <icons_material_1.Place />, count: 234 },
    { value: 'IOC', label: 'IOC', icon: <icons_material_1.Security />, count: 1089 },
];
const classifications = [
    { value: 'UNCLASSIFIED', label: 'Unclassified', count: 4521 },
    { value: 'CONFIDENTIAL', label: 'Confidential', count: 1234 },
    { value: 'SECRET', label: 'Secret', count: 567 },
    { value: 'TOP_SECRET', label: 'Top Secret', count: 128 },
];
const sources = [
    { value: 'OSINT', label: 'Open Source', count: 2341 },
    { value: 'HUMINT', label: 'Human Intelligence', count: 892 },
    { value: 'SIGINT', label: 'Signals Intelligence', count: 1456 },
    { value: 'IMINT', label: 'Imagery Intelligence', count: 678 },
    { value: 'FININT', label: 'Financial Intelligence', count: 543 },
    { value: 'INTERNAL', label: 'Internal Analysis', count: 1234 },
];
const popularTags = [
    'APT29',
    'Financial Crime',
    'Cybersecurity',
    'Money Laundering',
    'Threat Actor',
    'Malware',
    'Phishing',
    'Data Breach',
    'Insider Threat',
    'Nation State',
    'Cryptocurrency',
    'Dark Web',
    'C2 Infrastructure',
];
function FacetPanel({ onFiltersChange }) {
    const [filters, setFilters] = (0, react_1.useState)({
        entityTypes: [],
        dateRange: { start: '', end: '' },
        riskScore: [0, 100],
        classifications: [],
        tags: [],
        sources: [],
        status: ['active'],
        hasAttachments: false,
        isBookmarked: false,
    });
    const [expandedSections, setExpandedSections] = (0, react_1.useState)(new Set(['entityTypes', 'dateRange']));
    const updateFilters = (key, value) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        onFiltersChange?.(newFilters);
    };
    const toggleSection = (section) => {
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(section)) {
            newExpanded.delete(section);
        }
        else {
            newExpanded.add(section);
        }
        setExpandedSections(newExpanded);
    };
    const handleEntityTypeChange = (entityType) => {
        const newTypes = filters.entityTypes.includes(entityType)
            ? filters.entityTypes.filter((t) => t !== entityType)
            : [...filters.entityTypes, entityType];
        updateFilters('entityTypes', newTypes);
    };
    const handleClassificationChange = (classification) => {
        const newClassifications = filters.classifications.includes(classification)
            ? filters.classifications.filter((c) => c !== classification)
            : [...filters.classifications, classification];
        updateFilters('classifications', newClassifications);
    };
    const handleSourceChange = (source) => {
        const newSources = filters.sources.includes(source)
            ? filters.sources.filter((s) => s !== source)
            : [...filters.sources, source];
        updateFilters('sources', newSources);
    };
    const handleTagToggle = (tag) => {
        const newTags = filters.tags.includes(tag)
            ? filters.tags.filter((t) => t !== tag)
            : [...filters.tags, tag];
        updateFilters('tags', newTags);
    };
    const clearAllFilters = () => {
        const clearedFilters = {
            entityTypes: [],
            dateRange: { start: '', end: '' },
            riskScore: [0, 100],
            classifications: [],
            tags: [],
            sources: [],
            status: [],
            hasAttachments: false,
            isBookmarked: false,
        };
        setFilters(clearedFilters);
        onFiltersChange?.(clearedFilters);
    };
    const getActiveFilterCount = () => {
        let count = 0;
        if (filters.entityTypes.length > 0)
            count++;
        if (filters.dateRange.start || filters.dateRange.end)
            count++;
        if (filters.riskScore[0] > 0 || filters.riskScore[1] < 100)
            count++;
        if (filters.classifications.length > 0)
            count++;
        if (filters.tags.length > 0)
            count++;
        if (filters.sources.length > 0)
            count++;
        if (filters.status.length > 0)
            count++;
        if (filters.hasAttachments)
            count++;
        if (filters.isBookmarked)
            count++;
        return count;
    };
    return (<material_1.Card sx={{ borderRadius: 3, height: 'fit-content' }}>
      <material_1.CardContent>
        <material_1.Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <material_1.Stack direction="row" alignItems="center" spacing={1}>
            <icons_material_1.FilterList color="primary"/>
            <material_1.Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Search Filters
            </material_1.Typography>
            {getActiveFilterCount() > 0 && (<material_1.Badge badgeContent={getActiveFilterCount()} color="primary">
                <material_1.Box />
              </material_1.Badge>)}
          </material_1.Stack>
          {getActiveFilterCount() > 0 && (<material_1.Tooltip title="Clear all filters">
              <material_1.IconButton size="small" onClick={clearAllFilters}>
                <icons_material_1.Clear />
              </material_1.IconButton>
            </material_1.Tooltip>)}
        </material_1.Stack>

        {/* Quick Filters */}
        <material_1.Box sx={{ mb: 3 }}>
          <material_1.Stack direction="row" spacing={1} flexWrap="wrap">
            <material_1.FormControlLabel control={<material_1.Switch checked={filters.isBookmarked} onChange={(e) => updateFilters('isBookmarked', e.target.checked)}/>} label="Bookmarked only"/>
            <material_1.FormControlLabel control={<material_1.Switch checked={filters.hasAttachments} onChange={(e) => updateFilters('hasAttachments', e.target.checked)}/>} label="Has attachments"/>
          </material_1.Stack>
        </material_1.Box>

        <material_1.Divider sx={{ mb: 2 }}/>

        {/* Entity Types */}
        <material_1.Accordion expanded={expandedSections.has('entityTypes')} onChange={() => toggleSection('entityTypes')} sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}>
          <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />} sx={{ px: 0, minHeight: 40 }}>
            <material_1.Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              Entity Types{' '}
              {filters.entityTypes.length > 0 &&
            `(${filters.entityTypes.length})`}
            </material_1.Typography>
          </material_1.AccordionSummary>
          <material_1.AccordionDetails sx={{ px: 0, pt: 0 }}>
            <material_1.List dense>
              {entityTypes.map((type) => (<material_1.ListItem key={type.value} disablePadding>
                  <material_1.ListItemButton onClick={() => handleEntityTypeChange(type.value)} sx={{ borderRadius: 1 }}>
                    <material_1.ListItemIcon sx={{ minWidth: 32 }}>
                      <material_1.Avatar sx={{ width: 24, height: 24, fontSize: '0.875rem' }}>
                        {type.icon}
                      </material_1.Avatar>
                    </material_1.ListItemIcon>
                    <material_1.ListItemText primary={type.label} secondary={`${type.count.toLocaleString()} items`}/>
                    <material_1.Checkbox edge="end" checked={filters.entityTypes.includes(type.value)} tabIndex={-1}/>
                  </material_1.ListItemButton>
                </material_1.ListItem>))}
            </material_1.List>
          </material_1.AccordionDetails>
        </material_1.Accordion>

        {/* Date Range */}
        <material_1.Accordion expanded={expandedSections.has('dateRange')} onChange={() => toggleSection('dateRange')} sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}>
          <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />} sx={{ px: 0, minHeight: 40 }}>
            <material_1.Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              Date Range
            </material_1.Typography>
          </material_1.AccordionSummary>
          <material_1.AccordionDetails sx={{ px: 0, pt: 0 }}>
            <material_1.Stack spacing={2}>
              <material_1.TextField label="Start Date" type="date" size="small" value={filters.dateRange.start} onChange={(e) => updateFilters('dateRange', {
            ...filters.dateRange,
            start: e.target.value,
        })} InputLabelProps={{ shrink: true }}/>
              <material_1.TextField label="End Date" type="date" size="small" value={filters.dateRange.end} onChange={(e) => updateFilters('dateRange', {
            ...filters.dateRange,
            end: e.target.value,
        })} InputLabelProps={{ shrink: true }}/>
              <material_1.Stack direction="row" spacing={1}>
                <material_1.Chip label="Last 7 days" size="small" variant="outlined" onClick={() => {
            const end = new Date().toISOString().split('T')[0];
            const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split('T')[0];
            updateFilters('dateRange', { start, end });
        }}/>
                <material_1.Chip label="Last 30 days" size="small" variant="outlined" onClick={() => {
            const end = new Date().toISOString().split('T')[0];
            const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split('T')[0];
            updateFilters('dateRange', { start, end });
        }}/>
              </material_1.Stack>
            </material_1.Stack>
          </material_1.AccordionDetails>
        </material_1.Accordion>

        {/* Risk Score */}
        <material_1.Accordion expanded={expandedSections.has('riskScore')} onChange={() => toggleSection('riskScore')} sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}>
          <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />} sx={{ px: 0, minHeight: 40 }}>
            <material_1.Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              Risk Score ({filters.riskScore[0]}% - {filters.riskScore[1]}%)
            </material_1.Typography>
          </material_1.AccordionSummary>
          <material_1.AccordionDetails sx={{ px: 0, pt: 0 }}>
            <material_1.Box sx={{ px: 1 }}>
              <material_1.Slider value={filters.riskScore} onChange={(_, newValue) => updateFilters('riskScore', newValue)} valueLabelDisplay="auto" valueLabelFormat={(value) => `${value}%`} min={0} max={100} step={5} marks={[
            { value: 0, label: '0%' },
            { value: 25, label: '25%' },
            { value: 50, label: '50%' },
            { value: 75, label: '75%' },
            { value: 100, label: '100%' },
        ]}/>
            </material_1.Box>
          </material_1.AccordionDetails>
        </material_1.Accordion>

        {/* Classification Level */}
        <material_1.Accordion expanded={expandedSections.has('classifications')} onChange={() => toggleSection('classifications')} sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}>
          <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />} sx={{ px: 0, minHeight: 40 }}>
            <material_1.Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              Classification{' '}
              {filters.classifications.length > 0 &&
            `(${filters.classifications.length})`}
            </material_1.Typography>
          </material_1.AccordionSummary>
          <material_1.AccordionDetails sx={{ px: 0, pt: 0 }}>
            <material_1.List dense>
              {classifications.map((classification) => (<material_1.ListItem key={classification.value} disablePadding>
                  <material_1.ListItemButton onClick={() => handleClassificationChange(classification.value)} sx={{ borderRadius: 1 }}>
                    <material_1.ListItemIcon sx={{ minWidth: 32 }}>
                      <icons_material_1.Lock sx={{
                color: classification.value === 'UNCLASSIFIED'
                    ? 'success.main'
                    : classification.value === 'CONFIDENTIAL'
                        ? 'warning.main'
                        : classification.value === 'SECRET'
                            ? 'error.main'
                            : 'error.dark',
            }}/>
                    </material_1.ListItemIcon>
                    <material_1.ListItemText primary={classification.label} secondary={`${classification.count.toLocaleString()} items`}/>
                    <material_1.Checkbox edge="end" checked={filters.classifications.includes(classification.value)} tabIndex={-1}/>
                  </material_1.ListItemButton>
                </material_1.ListItem>))}
            </material_1.List>
          </material_1.AccordionDetails>
        </material_1.Accordion>

        {/* Intelligence Sources */}
        <material_1.Accordion expanded={expandedSections.has('sources')} onChange={() => toggleSection('sources')} sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}>
          <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />} sx={{ px: 0, minHeight: 40 }}>
            <material_1.Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              Intelligence Sources{' '}
              {filters.sources.length > 0 && `(${filters.sources.length})`}
            </material_1.Typography>
          </material_1.AccordionSummary>
          <material_1.AccordionDetails sx={{ px: 0, pt: 0 }}>
            <material_1.List dense>
              {sources.map((source) => (<material_1.ListItem key={source.value} disablePadding>
                  <material_1.ListItemButton onClick={() => handleSourceChange(source.value)} sx={{ borderRadius: 1 }}>
                    <material_1.ListItemText primary={source.label} secondary={`${source.count.toLocaleString()} items`}/>
                    <material_1.Checkbox edge="end" checked={filters.sources.includes(source.value)} tabIndex={-1}/>
                  </material_1.ListItemButton>
                </material_1.ListItem>))}
            </material_1.List>
          </material_1.AccordionDetails>
        </material_1.Accordion>

        {/* Popular Tags */}
        <material_1.Accordion expanded={expandedSections.has('tags')} onChange={() => toggleSection('tags')} sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}>
          <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />} sx={{ px: 0, minHeight: 40 }}>
            <material_1.Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              Popular Tags{' '}
              {filters.tags.length > 0 && `(${filters.tags.length})`}
            </material_1.Typography>
          </material_1.AccordionSummary>
          <material_1.AccordionDetails sx={{ px: 0, pt: 0 }}>
            <material_1.Stack direction="row" flexWrap="wrap" spacing={1}>
              {popularTags.map((tag) => (<material_1.Chip key={tag} label={tag} size="small" variant={filters.tags.includes(tag) ? 'filled' : 'outlined'} color={filters.tags.includes(tag) ? 'primary' : 'default'} onClick={() => handleTagToggle(tag)} sx={{ mb: 1 }}/>))}
            </material_1.Stack>
            <material_1.TextField placeholder="Add custom tag..." size="small" fullWidth sx={{ mt: 2 }} onKeyPress={(e) => {
            if (e.key === 'Enter') {
                const value = e.target.value.trim();
                if (value && !filters.tags.includes(value)) {
                    handleTagToggle(value);
                    e.target.value = '';
                }
            }
        }}/>
          </material_1.AccordionDetails>
        </material_1.Accordion>

        {/* Applied Filters Summary */}
        {getActiveFilterCount() > 0 && (<material_1.Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
            <material_1.Typography variant="caption" color="text.secondary" gutterBottom>
              Active Filters:
            </material_1.Typography>
            <material_1.Stack direction="row" flexWrap="wrap" spacing={0.5} sx={{ mt: 1 }}>
              {filters.entityTypes.map((type) => (<material_1.Chip key={`entity-${type}`} label={entityTypes.find((e) => e.value === type)?.label || type} size="small" onDelete={() => handleEntityTypeChange(type)} color="primary"/>))}
              {filters.classifications.map((classification) => (<material_1.Chip key={`classification-${classification}`} label={classifications.find((c) => c.value === classification)
                    ?.label || classification} size="small" onDelete={() => handleClassificationChange(classification)} color="secondary"/>))}
              {filters.sources.map((source) => (<material_1.Chip key={`source-${source}`} label={sources.find((s) => s.value === source)?.label || source} size="small" onDelete={() => handleSourceChange(source)} color="info"/>))}
              {filters.tags.map((tag) => (<material_1.Chip key={`tag-${tag}`} label={tag} size="small" onDelete={() => handleTagToggle(tag)} color="warning"/>))}
            </material_1.Stack>
          </material_1.Box>)}
      </material_1.CardContent>
    </material_1.Card>);
}
