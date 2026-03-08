"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityFeed = ActivityFeed;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const date_fns_1 = require("date-fns");
const client_1 = require("@apollo/client");
const ACTIVITY_FEED_QUERY = (0, client_1.gql) `
  query ActivityFeedData {
    serverStats {
      uptime
      totalInvestigations
      totalEntities
    }
  }
`;
const ACTION_COLORS = {
    created: 'success',
    updated: 'info',
    deleted: 'error',
    viewed: 'default',
    shared: 'secondary',
    exported: 'warning',
};
function ActivityFeed({ filters, maxItems = 50 }) {
    // Fallback to a lightweight query with polling; replace with subscription when available
    const { data, loading } = (0, client_1.useQuery)(ACTIVITY_FEED_QUERY, {
        pollInterval: 10000,
    });
    const activities = (data?.activityFeed ?? []).slice(0, maxItems);
    if (loading && activities.length === 0) {
        return (<material_1.Paper elevation={1} sx={{ p: 2 }}>
        <material_1.Typography variant="h6" gutterBottom>
          Activity Feed
        </material_1.Typography>
        <material_1.Typography color="text.secondary">
          Loading recent activity...
        </material_1.Typography>
      </material_1.Paper>);
    }
    return (<material_1.Paper elevation={1} sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
      <material_1.Typography variant="h6" gutterBottom>
        Live Activity Feed
        {activities.length > 0 && (<material_1.Chip size="small" label={activities.length} sx={{ ml: 1 }}/>)}
      </material_1.Typography>

      {activities.length === 0 ? (<material_1.Typography color="text.secondary" variant="body2">
          No recent activity
        </material_1.Typography>) : (<material_1.List dense>
          {activities.map((activity, index) => (<react_1.default.Fragment key={activity.id}>
              <material_1.ListItem alignItems="flex-start">
                <material_1.ListItemAvatar>
                  <material_1.Avatar sx={{ width: 32, height: 32 }}>
                    {activity.actor?.displayName?.charAt(0).toUpperCase() ||
                    '?'}
                  </material_1.Avatar>
                </material_1.ListItemAvatar>

                <material_1.ListItemText primary={<material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <material_1.Typography variant="subtitle2" component="span">
                        {activity.actor?.displayName || 'Unknown User'}
                      </material_1.Typography>
                      <material_1.Chip size="small" label={activity.action} color={ACTION_COLORS[activity.action] || 'default'} sx={{ height: 20, fontSize: '0.7rem' }}/>
                      <material_1.Typography variant="body2" color="text.secondary" component="span">
                        {activity.target?.name}
                      </material_1.Typography>
                    </material_1.Box>} secondary={<material_1.Typography variant="caption" color="text.secondary">
                      {(0, date_fns_1.formatDistanceToNow)(new Date(activity.timestamp), {
                        addSuffix: true,
                    })}
                      {activity.target?.type && (<material_1.Chip size="small" label={activity.target.type} variant="outlined" sx={{ ml: 1, height: 16, fontSize: '0.6rem' }}/>)}
                    </material_1.Typography>}/>
              </material_1.ListItem>

              {index < activities.length - 1 && (<material_1.Divider variant="inset" component="li"/>)}
            </react_1.default.Fragment>))}
        </material_1.List>)}
    </material_1.Paper>);
}
