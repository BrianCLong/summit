"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LiveTicker;
const react_1 = __importDefault(require("react"));
const client_1 = require("@apollo/client");
const material_1 = require("@mui/material");
const ENTITY_CREATED = (0, client_1.gql) `
  subscription EntityCreated {
    entityCreated {
      id
      label
      type
      properties
      timestamp
    }
  }
`;
const RELATIONSHIP_CREATED = (0, client_1.gql) `
  subscription RelationshipCreated {
    relationshipCreated {
      id
      from
      to
      type
      timestamp
    }
  }
`;
const typeIcon = {
    person: '👤',
    organization: '🏢',
    location: '📍',
};
function LiveTicker() {
    const [items, setItems] = react_1.default.useState([]);
    (0, client_1.useSubscription)(ENTITY_CREATED, {
        onData: ({ data }) => {
            const entity = data.data?.entityCreated;
            if (!entity)
                return;
            setItems((prev) => [
                {
                    id: entity.id,
                    message: `${entity.label} created`,
                    type: 'entity',
                    entityType: entity.type,
                    timestamp: entity.timestamp,
                    details: JSON.stringify(entity.properties, null, 2),
                },
                ...prev,
            ]);
        },
    });
    (0, client_1.useSubscription)(RELATIONSHIP_CREATED, {
        onData: ({ data }) => {
            const rel = data.data?.relationshipCreated;
            if (!rel)
                return;
            setItems((prev) => [
                {
                    id: rel.id,
                    message: `Relationship ${rel.type} created`,
                    type: 'relationship',
                    timestamp: rel.timestamp,
                    details: JSON.stringify({ from: rel.from, to: rel.to }, null, 2),
                },
                ...prev,
            ]);
        },
    });
    return (<material_1.Box sx={{ width: 300, borderLeft: '1px solid #ccc', p: 1, overflowY: 'auto' }}>
      <material_1.Typography variant="h6" sx={{ mb: 1 }}>
        Live Activity
      </material_1.Typography>
      <material_1.List>
        {items.map((item) => (<material_1.ListItem key={item.id} sx={{
                borderBottom: '1px solid #eee',
                position: 'relative',
                '&:before': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    width: 8,
                    height: 8,
                    bgcolor: item.type === 'entity' ? 'success.main' : 'info.main',
                    borderRadius: '50%',
                    transform: 'translate(-12px, -50%)',
                    animation: 'pulse 2s infinite',
                },
                '@keyframes pulse': {
                    '0%': {
                        transform: 'translate(-12px, -50%) scale(0.8)',
                        opacity: 0.8,
                    },
                    '50%': {
                        transform: 'translate(-12px, -50%) scale(1.2)',
                        opacity: 0.5,
                    },
                    '100%': {
                        transform: 'translate(-12px, -50%) scale(0.8)',
                        opacity: 0.8,
                    },
                },
            }} title={item.details}>
            <material_1.Typography variant="body2">
              {item.entityType ? `${typeIcon[item.entityType] || '❓'} ` : ''}
              {item.message}
            </material_1.Typography>
          </material_1.ListItem>))}
      </material_1.List>
    </material_1.Box>);
}
