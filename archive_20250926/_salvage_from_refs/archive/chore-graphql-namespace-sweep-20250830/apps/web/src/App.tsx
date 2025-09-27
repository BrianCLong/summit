import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, Box, Drawer, List, ListItem, ListItemText, CssBaseline, TextField, Paper } from '@mui/material';
import $ from 'jquery'; // Import jQuery

// Shared state for synchronized brushing (simulated)
interface BrushingState {
  selectedNodes: string[];
  selectedTimeRange: [string, string] | null;
  selectedGeoArea: any | null; // GeoJSON or similar
}

// Placeholder Components
interface PaneProps {
  brushingState: BrushingState;
  onBrushChange: (newState: Partial<BrushingState>) => void;
}

const GraphPane: React.FC<PaneProps> = ({ brushingState, onBrushChange }) => {
  React.useEffect(() => {
    // Example of jQuery usage for imperative DOM manipulation
    $('#graph-container').html('<p>Graph visualization will go here (Cytoscape.js)</p>');
    if (brushingState.selectedNodes.length > 0) {
      $('#graph-container').append(`<p>Selected Nodes: ${brushingState.selectedNodes.join(', ')}</p>`);
    }
  }, [brushingState.selectedNodes]);

  const handleGraphBrush = () => {
    // Simulate brushing action
    const newSelection = ['NodeA', 'NodeB'];
    onBrushChange({ selectedNodes: newSelection });
  };

  return (
    <Box id="graph-container" sx={{ flexGrow: 1, p: 2, borderRight: '1px solid grey' }}>
      <Typography variant="h6">Graph View</Typography>
      <button onClick={handleGraphBrush}>Simulate Graph Brush</button>
    </Box>
  );
};

const TimelinePane: React.FC<PaneProps> = ({ brushingState, onBrushChange }) => {
  React.useEffect(() => {
    if (brushingState.selectedTimeRange) {
      $('#timeline-container').html(`<p>Selected Time: ${brushingState.selectedTimeRange[0]} to ${brushingState.selectedTimeRange[1]}</p>`);
    }
  }, [brushingState.selectedTimeRange]);

  const handleTimelineBrush = () => {
    // Simulate brushing action
    const newTimeRange: [string, string] = ['2023-01-01', '2023-01-31'];
    onBrushChange({ selectedTimeRange: newTimeRange });
  };

  return (
    <Box sx={{ flexGrow: 1, p: 2, borderRight: '1px solid grey' }}>
      <Typography variant="h6">Timeline View</Typography>
      <p>Temporal events will be displayed here.</p>
      <button onClick={handleTimelineBrush}>Simulate Timeline Brush</button>
    </Box>
  );
};

const MapPane: React.FC<PaneProps> = ({ brushingState, onBrushChange }) => {
  React.useEffect(() => {
    if (brushingState.selectedGeoArea) {
      $('#map-container').html(`<p>Selected Geo Area: ${JSON.stringify(brushingState.selectedGeoArea)}</p>`);
    }
  }, [brushingState.selectedGeoArea]);

  const handleMapBrush = () => {
    // Simulate brushing action
    const newGeoArea = { type: 'Polygon', coordinates: [[0,0],[1,1],[1,0],[0,0]] };
    onBrushChange({ selectedGeoArea: newGeoArea });
  };

  return (
    <Box sx={{ flexGrow: 1, p: 2 }}>
      <Typography variant="h6">Map View</Typography>
      <p>Geospatial data will be displayed here.</p>
      <button onClick={handleMapBrush}>Simulate Map Brush</button>
    </Box>
  );
};

const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [command, setCommand] = useState('');
  const [filteredCommands, setFilteredCommands] = useState<string[]>([]);

  const mockCommands = [
    "find all persons",
    "show events by Sensor A",
    "list assets in location New York",
    "toggle dark mode",
    "open settings",
    "run shortest path",
    "ingest CSV data"
  ];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'k') {
        event.preventDefault();
        setIsOpen(prev => !prev);
        setCommand(''); // Clear input on open/close
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (command) {
      setFilteredCommands(mockCommands.filter(cmd => cmd.includes(command.toLowerCase())));
    } else {
      setFilteredCommands(mockCommands);
    }
  }, [command]);

  const handleCommandChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCommand(event.target.value);
  };

  const handleCommandExecute = (cmd: string) => {
    console.log(`Executing command: ${cmd}`);
    // In a real app, this would dispatch Redux actions or call APIs
    setIsOpen(false);
    setCommand('');
  };

  if (!isOpen) return null;

  return (
    <Paper sx={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 400,
      maxWidth: '90%',
      p: 2,
      zIndex: 1300, // Above Drawer
      boxShadow: 6
    }}>
      <TextField
        fullWidth
        autoFocus
        label="Enter command (Ctrl+K to close)"
        variant="outlined"
        value={command}
        onChange={handleCommandChange}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && filteredCommands.length > 0) {
            handleCommandExecute(filteredCommands[0]);
          }
        }}
        sx={{ mb: 2 }}
      />
      <List>
        {filteredCommands.map((cmd, index) => (
          <ListItem button key={index} onClick={() => handleCommandExecute(cmd)}>
            <ListItemText primary={cmd} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

const App: React.FC = () => {
  const [brushingState, setBrushingState] = useState<BrushingState>({
    selectedNodes: [],
    selectedTimeRange: null,
    selectedGeoArea: null,
  });

  const handleBrushChange = (newState: Partial<BrushingState>) => {
    setBrushingState(prevState => ({ ...prevState, ...newState }));
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            IntelGraph
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: 240,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: 240, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {[ 'Dashboard', 'Connectors', 'Analytics', 'Governance' ].map((text) => (
              <ListItem key={text} disablePadding>
                <ListItemText primary={text} sx={{ ml: 2 }} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
          <GraphPane brushingState={brushingState} onBrushChange={handleBrushChange} />
          <TimelinePane brushingState={brushingState} onBrushChange={handleBrushChange} />
          <MapPane brushingState={brushingState} onBrushChange={handleBrushChange} />
        </Box>
        <CommandPalette />
      </Box>
    </Box>
  );
};

export default App;
