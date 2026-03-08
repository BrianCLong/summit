"use strict";
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/**
 * Storybook Stories for TriPaneShell Component
 *
 * These stories showcase the tri-pane analysis shell in different states
 * and configurations for development and documentation purposes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Playground = exports.HierarchicLayout = exports.RadialLayout = exports.LargeDataset = exports.SmallDataset = exports.Empty = exports.WithSelectedEntity = exports.WithTimeFilter = exports.WithProvenance = exports.Default = void 0;
const TriPaneShell_1 = require("./TriPaneShell");
const mockData_1 = require("./mockData");
// Generate mock data for stories
const mockEntities = (0, mockData_1.generateMockEntities)(25);
const mockRelationships = (0, mockData_1.generateMockRelationships)(mockEntities, 40);
const mockTimelineEvents = (0, mockData_1.generateMockTimelineEvents)(mockEntities, 60);
const mockGeospatialEvents = (0, mockData_1.generateMockGeospatialEvents)(30);
const meta = {
    title: 'Features/TriPaneShell',
    component: TriPaneShell_1.TriPaneShell,
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component: 'The TriPaneShell provides a synchronized view of graph, timeline, and map data for comprehensive analysis. Features include synchronized brushing, keyboard shortcuts, and accessibility support.',
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
        onEntitySelect: () => undefined,
        onEventSelect: () => undefined,
        onLocationSelect: () => undefined,
        onTimeWindowChange: () => undefined,
        onSyncStateChange: () => undefined,
        onExport: () => undefined,
    },
};
exports.default = meta;
/**
 * Default story with full mock data
 */
exports.Default = {
    args: {
        entities: mockEntities,
        relationships: mockRelationships,
        timelineEvents: mockTimelineEvents,
        geospatialEvents: mockGeospatialEvents,
        showProvenanceOverlay: false,
    },
    render: (args) => (<div style={{ height: '100vh', padding: '1rem' }}>
      <TriPaneShell_1.TriPaneShell {...args}/>
    </div>),
};
/**
 * With provenance overlay enabled
 */
exports.WithProvenance = {
    args: {
        entities: mockEntities,
        relationships: mockRelationships,
        timelineEvents: mockTimelineEvents,
        geospatialEvents: mockGeospatialEvents,
        showProvenanceOverlay: true,
    },
    render: (args) => (<div style={{ height: '100vh', padding: '1rem' }}>
      <TriPaneShell_1.TriPaneShell {...args}/>
    </div>),
    parameters: {
        docs: {
            description: {
                story: 'Shows the tri-pane shell with provenance overlay enabled, displaying confidence scores and data lineage information.',
            },
        },
    },
};
/**
 * With time window filter active
 */
exports.WithTimeFilter = {
    args: {
        entities: mockEntities,
        relationships: mockRelationships,
        timelineEvents: mockTimelineEvents,
        geospatialEvents: mockGeospatialEvents,
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
    render: (args) => (<div style={{ height: '100vh', padding: '1rem' }}>
      <TriPaneShell_1.TriPaneShell {...args}/>
    </div>),
    parameters: {
        docs: {
            description: {
                story: 'Demonstrates the tri-pane shell with an active time window filter, showing how data is synchronized across all three panes.',
            },
        },
    },
};
/**
 * With selected entity
 */
exports.WithSelectedEntity = {
    args: {
        entities: mockEntities,
        relationships: mockRelationships,
        timelineEvents: mockTimelineEvents,
        geospatialEvents: mockGeospatialEvents,
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
    render: (args) => (<div style={{ height: '100vh', padding: '1rem' }}>
      <TriPaneShell_1.TriPaneShell {...args}/>
    </div>),
    parameters: {
        docs: {
            description: {
                story: 'Shows the shell with a pre-selected entity, demonstrating how selections synchronize across panes.',
            },
        },
    },
};
/**
 * Empty state with no data
 */
exports.Empty = {
    args: {
        entities: [],
        relationships: [],
        timelineEvents: [],
        geospatialEvents: [],
        showProvenanceOverlay: false,
    },
    render: (args) => (<div style={{ height: '100vh', padding: '1rem' }}>
      <TriPaneShell_1.TriPaneShell {...args}/>
    </div>),
    parameters: {
        docs: {
            description: {
                story: 'Shows how the tri-pane shell handles empty data states gracefully.',
            },
        },
    },
};
/**
 * Small dataset for performance testing
 */
exports.SmallDataset = {
    args: {
        entities: (0, mockData_1.generateMockEntities)(5),
        relationships: (0, mockData_1.generateMockRelationships)((0, mockData_1.generateMockEntities)(5), 8),
        timelineEvents: (0, mockData_1.generateMockTimelineEvents)((0, mockData_1.generateMockEntities)(5), 15),
        geospatialEvents: (0, mockData_1.generateMockGeospatialEvents)(5),
        showProvenanceOverlay: false,
    },
    render: (args) => (<div style={{ height: '100vh', padding: '1rem' }}>
      <TriPaneShell_1.TriPaneShell {...args}/>
    </div>),
    parameters: {
        docs: {
            description: {
                story: 'A smaller dataset for testing performance and responsiveness.',
            },
        },
    },
};
/**
 * Large dataset for stress testing
 */
exports.LargeDataset = {
    args: {
        entities: (0, mockData_1.generateMockEntities)(50),
        relationships: (0, mockData_1.generateMockRelationships)((0, mockData_1.generateMockEntities)(50), 100),
        timelineEvents: (0, mockData_1.generateMockTimelineEvents)((0, mockData_1.generateMockEntities)(50), 150),
        geospatialEvents: (0, mockData_1.generateMockGeospatialEvents)(50),
        showProvenanceOverlay: false,
    },
    render: (args) => (<div style={{ height: '100vh', padding: '1rem' }}>
      <TriPaneShell_1.TriPaneShell {...args}/>
    </div>),
    parameters: {
        docs: {
            description: {
                story: 'A larger dataset to test performance with more complex data visualizations.',
            },
        },
    },
};
/**
 * Radial graph layout
 */
exports.RadialLayout = {
    args: {
        entities: mockEntities,
        relationships: mockRelationships,
        timelineEvents: mockTimelineEvents,
        geospatialEvents: mockGeospatialEvents,
        initialSyncState: {
            graph: {
                layout: { type: 'radial', settings: {} },
            },
            timeline: { autoScroll: false },
            map: { center: [0, 0], zoom: 2 },
        },
    },
    render: (args) => (<div style={{ height: '100vh', padding: '1rem' }}>
      <TriPaneShell_1.TriPaneShell {...args}/>
    </div>),
    parameters: {
        docs: {
            description: {
                story: 'Demonstrates the tri-pane shell with a radial graph layout.',
            },
        },
    },
};
/**
 * Hierarchic graph layout
 */
exports.HierarchicLayout = {
    args: {
        entities: mockEntities,
        relationships: mockRelationships,
        timelineEvents: mockTimelineEvents,
        geospatialEvents: mockGeospatialEvents,
        initialSyncState: {
            graph: {
                layout: { type: 'hierarchic', settings: {} },
            },
            timeline: { autoScroll: false },
            map: { center: [0, 0], zoom: 2 },
        },
    },
    render: (args) => (<div style={{ height: '100vh', padding: '1rem' }}>
      <TriPaneShell_1.TriPaneShell {...args}/>
    </div>),
    parameters: {
        docs: {
            description: {
                story: 'Shows the shell with a hierarchical graph layout, useful for displaying hierarchies.',
            },
        },
    },
};
/**
 * Interactive playground
 */
exports.Playground = {
    args: {
        entities: mockEntities,
        relationships: mockRelationships,
        timelineEvents: mockTimelineEvents,
        geospatialEvents: mockGeospatialEvents,
        showProvenanceOverlay: false,
    },
    render: (args) => (<div style={{ height: '100vh', padding: '1rem' }}>
      <TriPaneShell_1.TriPaneShell {...args}/>
    </div>),
    parameters: {
        docs: {
            description: {
                story: 'An interactive playground to experiment with different configurations and data.',
            },
        },
    },
};
