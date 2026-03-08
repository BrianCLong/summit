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
exports.default = LiveActivityFeed;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const client_1 = require("@apollo/client");
const ACTIVITY_FEED_QUERY = (0, client_1.gql) `
  query ActivityFeed($limit: Int, $offset: Int) {
    activities(limit: $limit, offset: $offset) {
      id
      actionType
      resourceType
      resourceId
      actorId
      timestamp
      payload
      metadata
    }
  }
`;
const getActivityIcon = (type) => {
    switch (type) {
        case 'INVESTIGATION_CREATED':
        case 'INVESTIGATION_UPDATED':
            return <icons_material_1.Search fontSize="small"/>;
        case 'ENTITY_ADDED':
        case 'RELATIONSHIP_ADDED':
            return <icons_material_1.Timeline fontSize="small"/>;
        case 'THREAT_DETECTED':
            return <icons_material_1.Security fontSize="small"/>;
        case 'USER_LOGIN':
            return <icons_material_1.Person fontSize="small"/>;
        default:
            return <icons_material_1.Notifications fontSize="small"/>;
    }
};
const getActivityColor = (type) => {
    switch (type) {
        case 'THREAT_DETECTED':
            return 'error';
        case 'INVESTIGATION_CREATED':
            return 'primary';
        case 'ENTITY_ADDED':
        case 'RELATIONSHIP_ADDED':
            return 'success';
        default:
            return 'default';
    }
};
const mapActivity = (row) => {
    const payload = row.payload && typeof row.payload === 'object'
        ? row.payload
        : undefined;
    const metadata = row.metadata && typeof row.metadata === 'object'
        ? row.metadata
        : undefined;
    const message = payload?.message ||
        metadata?.message ||
        `${row.actionType}${row.resourceType ? `: ${row.resourceType}` : ''}`;
    const actorName = payload?.actorName ||
        metadata?.actorName ||
        row.actorId ||
        'Unknown';
    return {
        id: row.id,
        type: row.actionType,
        message,
        timestamp: row.timestamp,
        actor: {
            id: row.actorId || 'unknown',
            name: actorName,
        },
        metadata: row.metadata,
    };
};
function LiveActivityFeed() {
    const [isExpanded, setIsExpanded] = (0, react_1.useState)(false);
    const [activities, setActivities] = (0, react_1.useState)([]);
    const [newActivityCount, setNewActivityCount] = (0, react_1.useState)(0);
    const { data, loading, error } = (0, client_1.useQuery)(ACTIVITY_FEED_QUERY, {
        variables: { limit: 20, offset: 0 },
        pollInterval: 15000,
        fetchPolicy: 'cache-and-network',
        notifyOnNetworkStatusChange: true,
    });
    (0, react_1.useEffect)(() => {
        if (!data?.activities)
            return;
        const next = data.activities.map(mapActivity);
        setActivities((prev) => {
            if (!prev.length)
                return next;
            const prevIds = new Set(prev.map((activity) => activity.id));
            const incoming = next.filter((activity) => !prevIds.has(activity.id));
            if (!isExpanded && incoming.length > 0) {
                setNewActivityCount((count) => count + incoming.length);
            }
            return next;
        });
    }, [data, isExpanded]);
    const handleToggleExpand = () => {
        setIsExpanded(!isExpanded);
        if (!isExpanded) {
            setNewActivityCount(0);
        }
    };
    const formatTimestamp = (timestamp) => {
        const now = new Date();
        const eventTime = new Date(timestamp);
        const diffMs = now.getTime() - eventTime.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1)
            return 'Just now';
        if (diffMins < 60)
            return `${diffMins}m ago`;
        if (diffMins < 1440)
            return `${Math.floor(diffMins / 60)}h ago`;
        return eventTime.toLocaleDateString();
    };
    return (<material_1.Paper elevation={1} sx={{ borderRadius: 3 }}>
      <material_1.Box sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
        }} onClick={handleToggleExpand}>
        <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <material_1.Badge badgeContent={newActivityCount} color="error" invisible={newActivityCount === 0}>
            <icons_material_1.Timeline />
          </material_1.Badge>
          <material_1.Typography variant="h6">Live Activity</material_1.Typography>
          {loading && (<material_1.Chip label="Connecting..." size="small" color="warning" variant="outlined"/>)}
          {error && (<material_1.Chip label="Offline" size="small" color="error" variant="outlined"/>)}
        </material_1.Box>
        <material_1.IconButton size="small">
          {isExpanded ? <icons_material_1.ExpandLess /> : <icons_material_1.ExpandMore />}
        </material_1.IconButton>
      </material_1.Box>

      <material_1.Collapse in={isExpanded}>
        <material_1.Box sx={{ pb: 2 }}>
          {activities.length === 0 ? (<material_1.Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
              No recent activity
            </material_1.Typography>) : (<material_1.List dense>
              {activities.map((activity) => (<material_1.ListItem key={activity.id} sx={{ py: 0.5 }}>
                  <material_1.ListItemIcon sx={{ minWidth: 32 }}>
                    {getActivityIcon(activity.type)}
                  </material_1.ListItemIcon>
                  <material_1.ListItemText primary={<material_1.Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        flexWrap: 'wrap',
                    }}>
                        <material_1.Typography variant="body2">
                          {activity.message}
                        </material_1.Typography>
                        <material_1.Chip label={activity.type
                        .toLowerCase()
                        .replace('_', ' ')} size="small" color={getActivityColor(activity.type)} variant="outlined"/>
                      </material_1.Box>} secondary={<material_1.Typography variant="caption" color="text.secondary">
                        {activity.actor.name} • {formatTimestamp(activity.timestamp)}
                      </material_1.Typography>}/>
                </material_1.ListItem>))}
            </material_1.List>)}
        </material_1.Box>
      </material_1.Collapse>
    </material_1.Paper>);
}
