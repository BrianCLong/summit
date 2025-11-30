/**
 * Analyst Console Storybook Stories
 *
 * Interactive demos showcasing cross-highlighting, time brushing,
 * and the "Explain This View" panel.
 */

import type { Meta, StoryObj } from '@storybook/react'
import { AnalystConsole } from './AnalystConsole'
import {
  generateMockDataset,
  mockEntities,
  mockLinks,
  mockEvents,
  mockLocations,
} from './mockData'

const meta: Meta<typeof AnalystConsole> = {
  title: 'Features/AnalystConsole',
  component: AnalystConsole,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# Tri-Pane Analyst Console

A sophisticated intelligence analysis interface with three synchronized panes:

- **Graph Pane** (left): Entity network visualization with node selection
- **Timeline Pane** (bottom-left): Temporal event display with time brush
- **Map Pane** (right): Geographic visualization of locations
- **Explain Panel** (far right): Dynamic summary of current view state

## Key Features

- **Cross-highlighting**: Selecting an entity in the graph highlights related events and locations
- **Time brushing**: Adjusting the timeline filters data across all panes
- **Global state**: All panes share synchronized view state via React Context
- **Keyboard shortcuts**: ⌘1-3 to focus panes, P for provenance, E for explain panel

## Usage

\`\`\`tsx
import { AnalystConsole } from '@/features/analyst-console'

<AnalystConsole
  entities={entities}
  links={links}
  events={events}
  locations={locations}
  onExport={() => console.log('Export clicked')}
/>
\`\`\`
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onExport: { action: 'export clicked' },
  },
  decorators: [
    Story => (
      <div style={{ height: '100vh', width: '100vw' }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof AnalystConsole>

// =============================================================================
// Default Story
// =============================================================================

/**
 * Default analyst console with pre-generated mock data.
 * Try:
 * - Clicking nodes in the graph to select entities
 * - Adjusting the time brush in the timeline
 * - Clicking location markers on the map
 * - Observing how the "Explain This View" panel updates
 */
export const Default: Story = {
  args: {
    entities: mockEntities,
    links: mockLinks,
    events: mockEvents,
    locations: mockLocations,
  },
}

// =============================================================================
// Large Dataset Story
// =============================================================================

const largeDataset = generateMockDataset({
  entityCount: 50,
  linkCount: 100,
  eventCount: 150,
  locationCount: 30,
})

/**
 * Console with a larger dataset to demonstrate performance
 * and filtering capabilities.
 */
export const LargeDataset: Story = {
  args: {
    entities: largeDataset.entities,
    links: largeDataset.links,
    events: largeDataset.events,
    locations: largeDataset.locations,
  },
}

// =============================================================================
// Custom Time Window Story
// =============================================================================

/**
 * Console with a custom initial time window (last 3 days).
 */
export const CustomTimeWindow: Story = {
  args: {
    entities: mockEntities,
    links: mockLinks,
    events: mockEvents,
    locations: mockLocations,
    initialTimeWindow: {
      from: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      to: new Date().toISOString(),
    },
  },
}

// =============================================================================
// Minimal Data Story
// =============================================================================

const minimalDataset = generateMockDataset({
  entityCount: 5,
  linkCount: 5,
  eventCount: 10,
  locationCount: 3,
})

/**
 * Console with minimal data for simple demonstration.
 */
export const MinimalData: Story = {
  args: {
    entities: minimalDataset.entities,
    links: minimalDataset.links,
    events: minimalDataset.events,
    locations: minimalDataset.locations,
  },
}

// =============================================================================
// Empty State Story
// =============================================================================

/**
 * Console with no data to show empty states.
 */
export const EmptyState: Story = {
  args: {
    entities: [],
    links: [],
    events: [],
    locations: [],
  },
}

// =============================================================================
// High-Importance Entities Story
// =============================================================================

const highImportanceDataset = generateMockDataset({
  entityCount: 15,
  linkCount: 40,
  eventCount: 30,
  locationCount: 10,
})

// Boost importance scores for some entities
highImportanceDataset.entities.slice(0, 5).forEach(entity => {
  entity.importanceScore = 0.9 + Math.random() * 0.1
})

/**
 * Console highlighting high-importance entities.
 * Notice how the "Top Entities" section in the Explain panel
 * shows entities ranked by importance score.
 */
export const HighImportanceEntities: Story = {
  args: {
    entities: highImportanceDataset.entities,
    links: highImportanceDataset.links,
    events: highImportanceDataset.events,
    locations: highImportanceDataset.locations,
  },
}

// =============================================================================
// Interactive Demo Story
// =============================================================================

/**
 * Interactive demo with instructions.
 *
 * ## Try these interactions:
 *
 * 1. **Graph**: Click on a node to select it and see related data highlighted
 * 2. **Timeline**: Drag in the histogram to adjust the time window
 * 3. **Map**: Click on a marker to select that location
 * 4. **Explain Panel**: Watch it update as you interact
 *
 * ## Keyboard Shortcuts:
 * - `⌘1` / `⌘2` / `⌘3`: Focus Graph / Timeline / Map
 * - `P`: Toggle provenance overlay
 * - `E`: Toggle Explain panel
 * - `R`: Reset all filters
 * - `Esc`: Clear selection
 */
export const InteractiveDemo: Story = {
  args: {
    entities: mockEntities,
    links: mockLinks,
    events: mockEvents,
    locations: mockLocations,
  },
  parameters: {
    docs: {
      description: {
        story: `
## Interactive Demo

This story demonstrates the full interactivity of the Analyst Console.

### Try these interactions:

1. **Graph Pane**: Click on entity nodes to select them. Notice how:
   - Connected entities are highlighted
   - The Explain panel updates to show the selected entity
   - Related events and locations may be highlighted

2. **Timeline Pane**:
   - Click on events to select them
   - Use the time histogram to brush and filter by time range
   - Watch as other panes filter based on the time window

3. **Map Pane**:
   - Click on location markers to select them
   - Zoom in/out with the controls
   - See tooltips with location details

4. **Explain This View Panel**:
   - Watch it dynamically update as you interact
   - Expand/collapse sections for more detail
   - Use "Clear Selection" and "Clear Filters" buttons
        `,
      },
    },
  },
}
