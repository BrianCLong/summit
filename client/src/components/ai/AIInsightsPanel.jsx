import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import $ from 'jquery';
import {
  setHighlightEnabled,
  setSelectedInsightType,
  setCommunityIdFilter,
} from '../../store/slices/aiInsightsSlice';
import {
  Drawer,
  Box,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemText,
  Switch,
  FormControlLabel,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slider,
  InputLabel,
  Select,
  MenuItem,
  FormControl,
  Chip,
} from '@mui/material';
import { ChevronLeft, ExpandMore, Download, Highlight, InfoOutlined } from '@mui/icons-material';

function AIInsightsPanel({ open, onClose, onExportData }) {
  const dispatch = useDispatch();
  const { highlightEnabled, selectedInsightType, communityIdFilter, communityData } = useSelector(
    (state) => state.aiInsights,
  );
  const contentRef = React.useRef(null);

  const maxCommunityId =
    Object.values(communityData).length > 0 ? Math.max(...Object.values(communityData)) : 100; // Default max if no community data

  React.useEffect(() => {
    if (open) {
      // Animate content in with jQuery
      $(contentRef.current).hide().fadeIn(500);
    }
  }, [open]);

  const handleHighlightToggle = (event) => {
    const enabled = event.target.checked;
    dispatch(setHighlightEnabled(enabled));

    // Toggle a "highlighted" class on Cytoscape elements if available
    const cy = window.cy;
    if (cy && typeof cy.elements === 'function') {
      cy.elements('.ai-insight').forEach((el) => {
        if (enabled) {
          el.addClass('highlighted');
        } else {
          el.removeClass('highlighted');
        }
      });
    }
  };

  const handleInsightTypeChange = (event) => {
    dispatch(setSelectedInsightType(event.target.value));
  };

  const handleCommunityIdFilterChange = (event, newValue) => {
    dispatch(setCommunityIdFilter(newValue));
  };

  const handleExport = (format) => {
    onExportData(format);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        width: 350,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 350,
          boxSizing: 'border-box',
          p: 2,
          // Responsive width
          width: { xs: '100%', sm: 350 },
        },
      }}
    >
      <Box
        ref={contentRef}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Typography variant="h6" noWrap component="div">
          AI Insights Panel
        </Typography>
        <Button onClick={onClose} startIcon={<ChevronLeft />}>
          Close
        </Button>
      </Box>
      <Divider />

      <Box sx={{ mt: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={highlightEnabled}
              onChange={handleHighlightToggle}
              name="highlightToggle"
              color="primary"
            />
          }
          label="Enable Highlighting"
        />
        <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
          Toggle to visually highlight insights on the graph.
        </Typography>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Insight Filters
      </Typography>

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel id="insight-type-select-label">Insight Type</InputLabel>
        <Select
          labelId="insight-type-select-label"
          value={selectedInsightType}
          label="Insight Type"
          onChange={(e) => setSelectedInsightType(e.target.value)}
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          <MenuItem value="community_detection">Community Detection</MenuItem>
          <MenuItem value="link_prediction">Link Prediction</MenuItem>
          <MenuItem value="entity_extraction">Entity Extraction</MenuItem>
        </Select>
      </FormControl>

      {selectedInsightType === 'community_detection' && (
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary
            expandIcon={<ExpandMore />}
            aria-controls="community-panel-content"
            id="community-panel-header"
          >
            <Typography>Community ID Filter</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography gutterBottom>Filter by Community ID Range</Typography>
            <Slider
              value={communityIdFilter}
              onChange={handleCommunityIdFilterChange}
              valueLabelDisplay="auto"
              min={0}
              max={maxCommunityId} // Dynamic max based on community data
              sx={{ mt: 2 }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Chip label={`Min: ${communityIdFilter[0]}`} />
              <Chip label={`Max: ${communityIdFilter[1]}`} />
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Placeholder for Metadata Popovers - will be handled directly on Cytoscape.js elements */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Metadata Popovers
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <InfoOutlined color="action" />
          <Typography variant="body2" color="text.secondary">
            Hover over graph elements to see detailed metadata.
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Export Insights
      </Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          startIcon={<Download />}
          onClick={() => handleExport('csv')}
          fullWidth
        >
          Export CSV
        </Button>
        <Button
          variant="contained"
          startIcon={<Download />}
          onClick={() => handleExport('json')}
          fullWidth
        >
          Export JSON
        </Button>
      </Box>

      <List sx={{ mt: 2 }}>
        <ListItem>
          <ListItemText
            primary="A11y Compliance"
            secondary="Ensured through Material-UI components."
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary="Responsiveness"
            secondary="Handled by Material-UI's responsive design."
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary="E2E Test Coverage"
            secondary="To be implemented with Playwright."
          />
        </ListItem>
      </List>
    </Drawer>
  );
}

export default AIInsightsPanel;
