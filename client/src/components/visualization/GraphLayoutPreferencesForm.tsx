import React, { useEffect, useMemo, useRef } from 'react';
import cytoscape, { Core, ElementsDefinition } from 'cytoscape';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';

export type GraphLayoutOption = 'force' | 'hierarchical' | 'circular' | 'grid';

export type GraphLayoutPreference = {
  layout: GraphLayoutOption;
  physicsEnabled: boolean;
  options?: {
    orientation?: 'vertical' | 'horizontal';
    [key: string]: unknown;
  };
};

interface GraphLayoutPreferencesFormProps {
  preference: GraphLayoutPreference;
  onPreferenceChange: (next: GraphLayoutPreference) => void;
  isSaving?: boolean;
}

const SAMPLE_ELEMENTS: ElementsDefinition = {
  nodes: [
    { data: { id: 'n1', label: 'Analyst' } },
    { data: { id: 'n2', label: 'Person of Interest' } },
    { data: { id: 'n3', label: 'Organization' } },
    { data: { id: 'n4', label: 'Location' } },
    { data: { id: 'n5', label: 'Event' } },
  ],
  edges: [
    { data: { id: 'e1', source: 'n1', target: 'n2', label: 'Investigates' } },
    { data: { id: 'e2', source: 'n2', target: 'n3', label: 'Affiliated' } },
    { data: { id: 'e3', source: 'n3', target: 'n4', label: 'Operates In' } },
    { data: { id: 'e4', source: 'n4', target: 'n5', label: 'Hosts' } },
    { data: { id: 'e5', source: 'n1', target: 'n5', label: 'Monitors' } },
  ],
};

export const buildLayoutOptions = (
  preference: GraphLayoutPreference,
  options: { rootId?: string } = {},
): cytoscape.LayoutOptions => {
  switch (preference.layout) {
    case 'hierarchical': {
      const horizontal = preference.options?.orientation === 'horizontal';
      return {
        name: 'breadthfirst',
        directed: true,
        padding: 30,
        spacingFactor: 1.2,
        animate: preference.physicsEnabled,
        animationDuration: preference.physicsEnabled ? 400 : 0,
        avoidOverlap: true,
        circle: false,
        grid: false,
        fit: true,
        roots: options.rootId ? `#${options.rootId}` : undefined,
        transform: horizontal
          ? (_node, position) => ({ x: position.y, y: position.x })
          : undefined,
      } as cytoscape.BreadthFirstLayoutOptions;
    }
    case 'circular':
      return {
        name: 'circle',
        fit: true,
        padding: 30,
        avoidOverlap: true,
        animate: preference.physicsEnabled,
      } as cytoscape.CircleLayoutOptions;
    case 'grid':
      return {
        name: 'grid',
        fit: true,
        avoidOverlap: true,
        padding: 30,
      } as cytoscape.GridLayoutOptions;
    case 'force':
    default:
      return {
        name: 'cose',
        animate: preference.physicsEnabled,
        animationDuration: preference.physicsEnabled ? 400 : 0,
        padding: 40,
        nodeRepulsion: () => 9000,
        idealEdgeLength: () => 80,
        gravity: preference.physicsEnabled ? 1 : 0,
      } as cytoscape.CoseLayoutOptions;
  }
};

const layoutOptions: Array<{
  value: GraphLayoutOption;
  label: string;
  description: string;
}> = [
  {
    value: 'force',
    label: 'Force-directed',
    description: 'Organic layout that uses physics simulation to space nodes.',
  },
  {
    value: 'hierarchical',
    label: 'Hierarchical',
    description: 'Ranks nodes into levels, ideal for dependency or flow graphs.',
  },
  {
    value: 'circular',
    label: 'Circular',
    description: 'Places nodes in a circle, great for balanced visual distribution.',
  },
  {
    value: 'grid',
    label: 'Grid',
    description: 'Aligns nodes on a grid for consistent spacing and comparison.',
  },
];

const GraphLayoutPreferencesForm: React.FC<GraphLayoutPreferencesFormProps> = ({
  preference,
  onPreferenceChange,
  isSaving = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);

  const activeOption = useMemo(
    () => layoutOptions.find((option) => option.value === preference.layout),
    [preference.layout],
  );

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    if (!cyRef.current) {
      cyRef.current = cytoscape({
        container: containerRef.current,
        elements: SAMPLE_ELEMENTS,
        style: [
          {
            selector: 'node',
            style: {
              'background-color': '#1a73e8',
              label: 'data(label)',
              color: '#fff',
              'font-size': 12,
              'text-outline-width': 2,
              'text-outline-color': '#1a73e8',
            },
          },
          {
            selector: 'edge',
            style: {
              width: 2,
              'line-color': '#90caf9',
              'target-arrow-shape': 'triangle',
              'target-arrow-color': '#90caf9',
              'curve-style': 'bezier',
              label: 'data(label)',
              'font-size': 10,
              color: '#4a4a4a',
              'text-background-color': '#ffffff',
              'text-background-opacity': 0.75,
              'text-background-padding': 2,
            },
          },
          {
            selector: 'node:selected',
            style: {
              'border-width': 3,
              'border-color': '#ff9800',
            },
          },
        ],
        layout: buildLayoutOptions(preference, { rootId: 'n1' }),
      });
    } else {
      cyRef.current.json({ elements: SAMPLE_ELEMENTS });
    }

    cyRef.current.resize();
    cyRef.current.layout(buildLayoutOptions(preference, { rootId: 'n1' })).run();
  }, [preference]);

  useEffect(() => {
    return () => {
      cyRef.current?.destroy();
      cyRef.current = null;
    };
  }, []);

  const handleLayoutChange = (_: React.MouseEvent<HTMLElement>, value: GraphLayoutOption | null) => {
    if (!value || value === preference.layout) {
      return;
    }

    const nextOptions = { ...(preference.options || {}) };
    if (value === 'hierarchical') {
      nextOptions.orientation = (preference.options?.orientation as 'vertical' | 'horizontal') || 'vertical';
    } else {
      delete nextOptions.orientation;
    }

    onPreferenceChange({
      ...preference,
      layout: value,
      options: nextOptions,
    });
  };

  const handlePhysicsChange = (_event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
    if (checked === preference.physicsEnabled) {
      return;
    }

    onPreferenceChange({
      ...preference,
      physicsEnabled: checked,
    });
  };

  const handleOrientationChange = (event: SelectChangeEvent<'vertical' | 'horizontal'>) => {
    const orientation = event.target.value as 'vertical' | 'horizontal';
    onPreferenceChange({
      ...preference,
      options: {
        ...(preference.options || {}),
        orientation,
      },
    });
  };

  return (
    <Card variant="outlined" data-testid="graph-layout-preferences">
      <CardHeader
        title="Visualization preferences"
        subheader="Choose how IntelGraph renders your network visualizations"
      />
      <CardContent>
        <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={3}>
          <Box flex={1}>
            <Typography variant="subtitle2" gutterBottom>
              Layout algorithm
            </Typography>
            <ToggleButtonGroup
              value={preference.layout}
              exclusive
              onChange={handleLayoutChange}
              aria-label="Graph layout selection"
            >
              {layoutOptions.map((option) => (
                <ToggleButton
                  key={option.value}
                  value={option.value}
                  data-testid={`graph-layout-${option.value}`}
                  aria-label={option.label}
                  disabled={isSaving}
                >
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            {activeOption && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {activeOption.description}
              </Typography>
            )}

            <Box mt={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={preference.physicsEnabled}
                    onChange={handlePhysicsChange}
                    color="primary"
                    disabled={isSaving}
                  />
                }
                label="Enable physics simulation"
              />
            </Box>

            {preference.layout === 'hierarchical' && (
              <Box mt={2}>
                <FormControl fullWidth size="small">
                  <InputLabel id="graph-layout-orientation-label">Layout orientation</InputLabel>
                  <Select
                    labelId="graph-layout-orientation-label"
                    value={preference.options?.orientation || 'vertical'}
                    label="Layout orientation"
                    onChange={handleOrientationChange}
                    disabled={isSaving}
                  >
                    <MenuItem value="vertical">Vertical (top to bottom)</MenuItem>
                    <MenuItem value="horizontal">Horizontal (left to right)</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}

            {isSaving && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                Saving preferences…
              </Typography>
            )}
          </Box>

          <Box
            flex={1}
            display="flex"
            flexDirection="column"
            gap={1}
            aria-label="Graph layout preview"
          >
            <Typography variant="subtitle2" gutterBottom>
              Preview
            </Typography>
            <Box
              ref={containerRef}
              data-testid="graph-layout-preview"
              sx={{
                border: '1px solid var(--hairline, #e0e0e0)',
                borderRadius: 2,
                height: 260,
                minHeight: 240,
                backgroundColor: '#fff',
              }}
            />
            <Typography variant="caption" color="text.secondary">
              Preview uses representative data so you can evaluate node placement before applying it to
              investigations.
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default GraphLayoutPreferencesForm;
