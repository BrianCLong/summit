/**
 * Storybook Stories for TriPaneShell Component
 *
 * These stories showcase the tri-pane analysis shell in different states
 * and configurations for development and documentation purposes.
 */

import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { TriPaneShell } from './TriPaneShell'
import {
  generateMockEntities,
  generateMockRelationships,
  generateMockTimelineEvents,
  generateMockGeospatialEvents,
} from './mockData'

// Generate mock data for stories
const mockEntities = generateMockEntities(25)
const mockRelationships = generateMockRelationships(mockEntities, 40)
const mockTimelineEvents = generateMockTimelineEvents(mockEntities, 60)
const mockGeospatialEvents = generateMockGeospatialEvents(30)

const meta: Meta<typeof TriPaneShell> = {
  title: 'Features/TriPaneShell',
  component: TriPaneShell,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The TriPaneShell provides a synchronized view of graph, timeline, and map data for comprehensive analysis. Features include synchronized brushing, keyboard shortcuts, and accessibility support.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    entities: {
      description: 'Array of entity objects to display in the graph pane',
      control: 'object',
    },
    relationships: {
      description: 'Array of relationships between entities',
      control: 'object',
    },
    timelineEvents: {
      description: 'Array of timeline events to display',
      control: 'object',
    },
    geospatialEvents: {
      description: 'Array of geographic events to display on the map',
      control: 'object',
    },
    showProvenanceOverlay: {
      description: 'Show provenance information overlay',
      control: 'boolean',
    },
    onEntitySelect: {
      description: 'Callback when an entity is selected',
      action: 'entity-selected',
    },
    onEventSelect: {
      description: 'Callback when a timeline event is selected',
      action: 'event-selected',
    },
    onLocationSelect: {
      description: 'Callback when a location is selected',
      action: 'location-selected',
    },
    onTimeWindowChange: {
      description: 'Callback when the time window filter changes',
      action: 'time-window-changed',
    },
    onSyncStateChange: {
      description: 'Callback when the synchronized state changes',
      action: 'sync-state-changed',
    },
    onExport: {
      description: 'Callback when export button is clicked',
      action: 'export-clicked',
    },
  },
  args: {
    onEntitySelect: fn(),
    onEventSelect: fn(),
    onLocationSelect: fn(),
    onTimeWindowChange: fn(),
    onSyncStateChange: fn(),
    onExport: fn(),
  },
}

export default meta
type Story = StoryObj<typeof TriPaneShell>

/**
 * Default story with full mock data
 */
export const Default: Story = {
  args: {
    entities: mockEntities,
    relationships: mockRelationships,
    timelineEvents: mockTimelineEvents,
    geospatialEvents: mockGeospatialEvents,
    showProvenanceOverlay: false,
  },
  render: args => (
    <div style={{ height: '100vh', padding: '1rem' }}>
      <TriPaneShell {...args} />
    </div>
  ),
}

/**
 * With provenance overlay enabled
 */
export const WithProvenance: Story = {
  args: {
    ...Default.args,
    showProvenanceOverlay: true,
  },
  render: args => (
    <div style={{ height: '100vh', padding: '1rem' }}>
      <TriPaneShell {...args} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Shows the tri-pane shell with provenance overlay enabled, displaying confidence scores and data lineage information.',
      },
    },
  },
}

/**
 * With time window filter active
 */
export const WithTimeFilter: Story = {
  args: {
    ...Default.args,
    initialSyncState: {
      globalTimeWindow: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        end: new Date(),
      },
      graph: { layout: { type: 'force', settings: {} } },
      timeline: { autoScroll: false },
      map: { center: [0, 0], zoom: 2 },
    },
  },
  render: args => (
    <div style={{ height: '100vh', padding: '1rem' }}>
      <TriPaneShell {...args} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates the tri-pane shell with an active time window filter, showing how data is synchronized across all three panes.',
      },
    },
  },
}

/**
 * With selected entity
 */
export const WithSelectedEntity: Story = {
  args: {
    ...Default.args,
    initialSyncState: {
      graph: {
        layout: { type: 'force', settings: {} },
        selectedEntityId: mockEntities[0].id,
        focusedEntityIds: [mockEntities[0].id],
      },
      timeline: { autoScroll: false },
      map: { center: [0, 0], zoom: 2 },
    },
  },
  render: args => (
    <div style={{ height: '100vh', padding: '1rem' }}>
      <TriPaneShell {...args} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Shows the shell with a pre-selected entity, demonstrating how selections synchronize across panes.',
      },
    },
  },
}

/**
 * Empty state with no data
 */
export const Empty: Story = {
  args: {
    entities: [],
    relationships: [],
    timelineEvents: [],
    geospatialEvents: [],
    showProvenanceOverlay: false,
  },
  render: args => (
    <div style={{ height: '100vh', padding: '1rem' }}>
      <TriPaneShell {...args} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Shows how the tri-pane shell handles empty data states gracefully.',
      },
    },
  },
}

/**
 * Small dataset for performance testing
 */
export const SmallDataset: Story = {
  args: {
    entities: generateMockEntities(5),
    relationships: generateMockRelationships(generateMockEntities(5), 8),
    timelineEvents: generateMockTimelineEvents(generateMockEntities(5), 15),
    geospatialEvents: generateMockGeospatialEvents(5),
    showProvenanceOverlay: false,
  },
  render: args => (
    <div style={{ height: '100vh', padding: '1rem' }}>
      <TriPaneShell {...args} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'A smaller dataset for testing performance and responsiveness.',
      },
    },
  },
}

/**
 * Large dataset for stress testing
 */
export const LargeDataset: Story = {
  args: {
    entities: generateMockEntities(50),
    relationships: generateMockRelationships(generateMockEntities(50), 100),
    timelineEvents: generateMockTimelineEvents(generateMockEntities(50), 150),
    geospatialEvents: generateMockGeospatialEvents(50),
    showProvenanceOverlay: false,
  },
  render: args => (
    <div style={{ height: '100vh', padding: '1rem' }}>
      <TriPaneShell {...args} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'A larger dataset to test performance with more complex data visualizations.',
      },
    },
  },
}

/**
 * Radial graph layout
 */
export const RadialLayout: Story = {
  args: {
    ...Default.args,
    initialSyncState: {
      graph: {
        layout: { type: 'radial', settings: {} },
      },
      timeline: { autoScroll: false },
      map: { center: [0, 0], zoom: 2 },
    },
  },
  render: args => (
    <div style={{ height: '100vh', padding: '1rem' }}>
      <TriPaneShell {...args} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates the tri-pane shell with a radial graph layout.',
      },
    },
  },
}

/**
 * Hierarchic graph layout
 */
export const HierarchicLayout: Story = {
  args: {
    ...Default.args,
    initialSyncState: {
      graph: {
        layout: { type: 'hierarchic', settings: {} },
      },
      timeline: { autoScroll: false },
      map: { center: [0, 0], zoom: 2 },
    },
  },
  render: args => (
    <div style={{ height: '100vh', padding: '1rem' }}>
      <TriPaneShell {...args} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Shows the shell with a hierarchical graph layout, useful for displaying hierarchies.',
      },
    },
  },
}

/**
 * Interactive playground
 */
export const Playground: Story = {
  args: {
    entities: mockEntities,
    relationships: mockRelationships,
    timelineEvents: mockTimelineEvents,
    geospatialEvents: mockGeospatialEvents,
    showProvenanceOverlay: false,
  },
  render: args => (
    <div style={{ height: '100vh', padding: '1rem' }}>
      <TriPaneShell {...args} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'An interactive playground to experiment with different configurations and data.',
      },
    },
  },
}
