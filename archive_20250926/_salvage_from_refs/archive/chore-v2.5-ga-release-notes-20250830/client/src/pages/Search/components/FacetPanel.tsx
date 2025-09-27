import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Checkbox,
  FormControlLabel,
  Box,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Slider,
  TextField,
  Switch,
  Divider,
  IconButton,
  Tooltip,
  Badge,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton
} from '@mui/material';
import {
  ExpandMore,
  Person,
  Business,
  Description,
  Event,
  Place,
  Security,
  FilterList,
  Clear,
  Lock
} from '@mui/icons-material';

interface FacetPanelProps {
  onFiltersChange?: (filters: SearchFilters) => void;
}

interface SearchFilters {
  entityTypes: string[];
  dateRange: {
    start: string;
    end: string;
  };
  riskScore: [number, number];
  classifications: string[];
  tags: string[];
  sources: string[];
  status: string[];
  hasAttachments: boolean;
  isBookmarked: boolean;
}

const entityTypes = [
  { value: 'PERSON', label: 'Person', icon: <Person />, count: 1247 },
  { value: 'ORGANIZATION', label: 'Organization', icon: <Business />, count: 892 },
  { value: 'DOCUMENT', label: 'Document', icon: <Description />, count: 3421 },
  { value: 'EVENT', label: 'Event', icon: <Event />, count: 567 },
  { value: 'LOCATION', label: 'Location', icon: <Place />, count: 234 },
  { value: 'IOC', label: 'IOC', icon: <Security />, count: 1089 }
];

const classifications = [
  { value: 'UNCLASSIFIED', label: 'Unclassified', count: 4521 },
  { value: 'CONFIDENTIAL', label: 'Confidential', count: 1234 },
  { value: 'SECRET', label: 'Secret', count: 567 },
  { value: 'TOP_SECRET', label: 'Top Secret', count: 128 }
];

const sources = [
  { value: 'OSINT', label: 'Open Source', count: 2341 },
  { value: 'HUMINT', label: 'Human Intelligence', count: 892 },
  { value: 'SIGINT', label: 'Signals Intelligence', count: 1456 },
  { value: 'IMINT', label: 'Imagery Intelligence', count: 678 },
  { value: 'FININT', label: 'Financial Intelligence', count: 543 },
  { value: 'INTERNAL', label: 'Internal Analysis', count: 1234 }
];

const popularTags = [
  'APT29', 'Financial Crime', 'Cybersecurity', 'Money Laundering',
  'Threat Actor', 'Malware', 'Phishing', 'Data Breach', 'Insider Threat',
  'Nation State', 'Cryptocurrency', 'Dark Web', 'C2 Infrastructure'
];

export default function FacetPanel({ onFiltersChange }: FacetPanelProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    entityTypes: [],
    dateRange: { start: '', end: '' },
    riskScore: [0, 100],
    classifications: [],
    tags: [],
    sources: [],
    status: ['active'],
    hasAttachments: false,
    isBookmarked: false
  });

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['entityTypes', 'dateRange']));

  const updateFilters = (key: keyof SearchFilters, value: SearchFilters[keyof SearchFilters]) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleEntityTypeChange = (entityType: string) => {
    const newTypes = filters.entityTypes.includes(entityType)
      ? filters.entityTypes.filter(t => t !== entityType)
      : [...filters.entityTypes, entityType];
    updateFilters('entityTypes', newTypes);
  };

  const handleClassificationChange = (classification: string) => {
    const newClassifications = filters.classifications.includes(classification)
      ? filters.classifications.filter(c => c !== classification)
      : [...filters.classifications, classification];
    updateFilters('classifications', newClassifications);
  };

  const handleSourceChange = (source: string) => {
    const newSources = filters.sources.includes(source)
      ? filters.sources.filter(s => s !== source)
      : [...filters.sources, source];
    updateFilters('sources', newSources);
  };

  const handleTagToggle = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag];
    updateFilters('tags', newTags);
  };

  const clearAllFilters = () => {
    const clearedFilters: SearchFilters = {
      entityTypes: [],
      dateRange: { start: '', end: '' },
      riskScore: [0, 100],
      classifications: [],
      tags: [],
      sources: [],
      status: [],
      hasAttachments: false,
      isBookmarked: false
    };
    setFilters(clearedFilters);
    onFiltersChange?.(clearedFilters);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.entityTypes.length > 0) count++;
    if (filters.dateRange.start || filters.dateRange.end) count++;
    if (filters.riskScore[0] > 0 || filters.riskScore[1] < 100) count++;
    if (filters.classifications.length > 0) count++;
    if (filters.tags.length > 0) count++;
    if (filters.sources.length > 0) count++;
    if (filters.status.length > 0) count++;
    if (filters.hasAttachments) count++;
    if (filters.isBookmarked) count++;
    return count;
  };

  return (
    <Card sx={{ borderRadius: 3, height: 'fit-content' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <FilterList color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Search Filters
            </Typography>
            {getActiveFilterCount() > 0 && (
              <Badge badgeContent={getActiveFilterCount()} color="primary">
                <Box />
              </Badge>
            )}
          </Stack>
          {getActiveFilterCount() > 0 && (
            <Tooltip title="Clear all filters">
              <IconButton size="small" onClick={clearAllFilters}>
                <Clear />
              </IconButton>
            </Tooltip>
          )}
        </Stack>

        {/* Quick Filters */}
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <FormControlLabel
              control={
                <Switch
                  checked={filters.isBookmarked}
                  onChange={(e) => updateFilters('isBookmarked', e.target.checked)}
                />
              }
              label="Bookmarked only"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={filters.hasAttachments}
                  onChange={(e) => updateFilters('hasAttachments', e.target.checked)}
                />
              }
              label="Has attachments"
            />
          </Stack>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Entity Types */}
        <Accordion 
          expanded={expandedSections.has('entityTypes')}
          onChange={() => toggleSection('entityTypes')}
          sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}
        >
          <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: 0, minHeight: 40 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              Entity Types {filters.entityTypes.length > 0 && `(${filters.entityTypes.length})`}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 0, pt: 0 }}>
            <List dense>
              {entityTypes.map((type) => (
                <ListItem key={type.value} disablePadding>
                  <ListItemButton 
                    onClick={() => handleEntityTypeChange(type.value)}
                    sx={{ borderRadius: 1 }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <Avatar sx={{ width: 24, height: 24, fontSize: '0.875rem' }}>
                        {type.icon}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText 
                      primary={type.label}
                      secondary={`${type.count.toLocaleString()} items`}
                    />
                    <Checkbox
                      edge="end"
                      checked={filters.entityTypes.includes(type.value)}
                      tabIndex={-1}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>

        {/* Date Range */}
        <Accordion 
          expanded={expandedSections.has('dateRange')}
          onChange={() => toggleSection('dateRange')}
          sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}
        >
          <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: 0, minHeight: 40 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              Date Range
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 0, pt: 0 }}>
            <Stack spacing={2}>
              <TextField
                label="Start Date"
                type="date"
                size="small"
                value={filters.dateRange.start}
                onChange={(e) => updateFilters('dateRange', { ...filters.dateRange, start: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="End Date"
                type="date"
                size="small"
                value={filters.dateRange.end}
                onChange={(e) => updateFilters('dateRange', { ...filters.dateRange, end: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
              <Stack direction="row" spacing={1}>
                <Chip 
                  label="Last 7 days" 
                  size="small" 
                  variant="outlined"
                  onClick={() => {
                    const end = new Date().toISOString().split('T')[0];
                    const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                    updateFilters('dateRange', { start, end });
                  }}
                />
                <Chip 
                  label="Last 30 days" 
                  size="small" 
                  variant="outlined"
                  onClick={() => {
                    const end = new Date().toISOString().split('T')[0];
                    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                    updateFilters('dateRange', { start, end });
                  }}
                />
              </Stack>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Risk Score */}
        <Accordion 
          expanded={expandedSections.has('riskScore')}
          onChange={() => toggleSection('riskScore')}
          sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}
        >
          <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: 0, minHeight: 40 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              Risk Score ({filters.riskScore[0]}% - {filters.riskScore[1]}%)
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 0, pt: 0 }}>
            <Box sx={{ px: 1 }}>
              <Slider
                value={filters.riskScore}
                onChange={(_, newValue) => updateFilters('riskScore', newValue as [number, number])}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}%`}
                min={0}
                max={100}
                step={5}
                marks={[
                  { value: 0, label: '0%' },
                  { value: 25, label: '25%' },
                  { value: 50, label: '50%' },
                  { value: 75, label: '75%' },
                  { value: 100, label: '100%' }
                ]}
              />
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Classification Level */}
        <Accordion 
          expanded={expandedSections.has('classifications')}
          onChange={() => toggleSection('classifications')}
          sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}
        >
          <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: 0, minHeight: 40 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              Classification {filters.classifications.length > 0 && `(${filters.classifications.length})`}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 0, pt: 0 }}>
            <List dense>
              {classifications.map((classification) => (
                <ListItem key={classification.value} disablePadding>
                  <ListItemButton 
                    onClick={() => handleClassificationChange(classification.value)}
                    sx={{ borderRadius: 1 }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <Lock 
                        sx={{ 
                          color: classification.value === 'UNCLASSIFIED' ? 'success.main' :
                                 classification.value === 'CONFIDENTIAL' ? 'warning.main' :
                                 classification.value === 'SECRET' ? 'error.main' : 'error.dark'
                        }} 
                      />
                    </ListItemIcon>
                    <ListItemText 
                      primary={classification.label}
                      secondary={`${classification.count.toLocaleString()} items`}
                    />
                    <Checkbox
                      edge="end"
                      checked={filters.classifications.includes(classification.value)}
                      tabIndex={-1}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>

        {/* Intelligence Sources */}
        <Accordion 
          expanded={expandedSections.has('sources')}
          onChange={() => toggleSection('sources')}
          sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}
        >
          <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: 0, minHeight: 40 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              Intelligence Sources {filters.sources.length > 0 && `(${filters.sources.length})`}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 0, pt: 0 }}>
            <List dense>
              {sources.map((source) => (
                <ListItem key={source.value} disablePadding>
                  <ListItemButton 
                    onClick={() => handleSourceChange(source.value)}
                    sx={{ borderRadius: 1 }}
                  >
                    <ListItemText 
                      primary={source.label}
                      secondary={`${source.count.toLocaleString()} items`}
                    />
                    <Checkbox
                      edge="end"
                      checked={filters.sources.includes(source.value)}
                      tabIndex={-1}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>

        {/* Popular Tags */}
        <Accordion 
          expanded={expandedSections.has('tags')}
          onChange={() => toggleSection('tags')}
          sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}
        >
          <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: 0, minHeight: 40 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              Popular Tags {filters.tags.length > 0 && `(${filters.tags.length})`}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 0, pt: 0 }}>
            <Stack direction="row" flexWrap="wrap" spacing={1}>
              {popularTags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  variant={filters.tags.includes(tag) ? 'filled' : 'outlined'}
                  color={filters.tags.includes(tag) ? 'primary' : 'default'}
                  onClick={() => handleTagToggle(tag)}
                  sx={{ mb: 1 }}
                />
              ))}
            </Stack>
            <TextField
              placeholder="Add custom tag..."
              size="small"
              fullWidth
              sx={{ mt: 2 }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const value = (e.target as HTMLInputElement).value.trim();
                  if (value && !filters.tags.includes(value)) {
                    handleTagToggle(value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
            />
          </AccordionDetails>
        </Accordion>

        {/* Applied Filters Summary */}
        {getActiveFilterCount() > 0 && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Active Filters:
            </Typography>
            <Stack direction="row" flexWrap="wrap" spacing={0.5} sx={{ mt: 1 }}>
              {filters.entityTypes.map(type => (
                <Chip 
                  key={`entity-${type}`} 
                  label={entityTypes.find(e => e.value === type)?.label || type} 
                  size="small" 
                  onDelete={() => handleEntityTypeChange(type)}
                  color="primary"
                />
              ))}
              {filters.classifications.map(classification => (
                <Chip 
                  key={`classification-${classification}`} 
                  label={classifications.find(c => c.value === classification)?.label || classification} 
                  size="small" 
                  onDelete={() => handleClassificationChange(classification)}
                  color="secondary"
                />
              ))}
              {filters.sources.map(source => (
                <Chip 
                  key={`source-${source}`} 
                  label={sources.find(s => s.value === source)?.label || source} 
                  size="small" 
                  onDelete={() => handleSourceChange(source)}
                  color="info"
                />
              ))}
              {filters.tags.map(tag => (
                <Chip 
                  key={`tag-${tag}`} 
                  label={tag} 
                  size="small" 
                  onDelete={() => handleTagToggle(tag)}
                  color="warning"
                />
              ))}
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}