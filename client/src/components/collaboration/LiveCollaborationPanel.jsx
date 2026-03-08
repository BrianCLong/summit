import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Badge,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Switch,
  FormControlLabel,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Circle as CircleIcon,
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
  Psychology as PsychologyIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';
import {
  useRealTimeGraph,
  useAIInsights,
  useInvestigationCollab,
} from '../../hooks/useRealTimeUpdates';

function UserAvatar({ user }) {
  const getStatusColor = (isOnline) => (isOnline ? '#4caf50' : '#9e9e9e');

  return (
    <Tooltip
      title={`${user.name} - ${user.role} - ${user.isOnline ? 'Online' : 'Offline'}`}
    >
      <Badge
        overlap="circular"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        badgeContent={
          <CircleIcon
            sx={{
              color: getStatusColor(user.isOnline),
              fontSize: 12,
              filter: 'drop-shadow(0px 0px 2px rgba(0,0,0,0.5))',
            }}
          />
        }
      >
        <Avatar
          sx={{
            width: 32,
            height: 32,
            bgcolor: user.isOnline ? 'primary.main' : 'grey.400',
            fontSize: '14px',
          }}
        >
          {user.name
            .split(' ')
            .map((n) => n[0])
            .join('')}
        </Avatar>
      </Badge>
    </Tooltip>
  );
}

function LiveUpdate({ update }) {
  const getUpdateIcon = (type) => {
    switch (type) {
      case 'ENTITY_ADDED':
        return '🆕';
      case 'RELATIONSHIP_UPDATED':
        return '🔗';
      case 'AI_INSIGHT':
        return '🤖';
      default:
        return '📍';
    }
  };

  const getUpdateColor = (type) => {
    switch (type) {
      case 'ENTITY_ADDED':
        return 'success';
      case 'RELATIONSHIP_UPDATED':
        return 'info';
      case 'AI_INSIGHT':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <ListItem sx={{ py: 1, px: 2 }}>
      <ListItemAvatar>
        <Avatar sx={{ width: 24, height: 24, fontSize: '12px' }}>
          {getUpdateIcon(update.type)}
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ flexGrow: 1 }}>
              {update.user?.name} {update.user?.action}{' '}
              {update.entity?.label || update.relationship?.type}
            </Typography>
            <Chip
              label={
                update.entity?.confidence ||
                update.relationship?.confidence ||
                '95'
              }
              size="small"
              color={getUpdateColor(update.type)}
              sx={{ fontSize: '10px', height: 18 }}
            />
          </Box>
        }
        secondary={
          <Typography variant="caption" color="text.secondary">
            {new Date(
              update.timestamp || update.entity?.timestamp,
            ).toLocaleTimeString()}
          </Typography>
        }
      />
    </ListItem>
  );
}

function AIInsightItem({ insight }) {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Alert
      severity={getPriorityColor(insight.priority)}
      sx={{ mb: 1, fontSize: '0.85rem' }}
      icon={<span style={{ fontSize: '16px' }}>{insight.icon}</span>}
    >
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {insight.message}
        </Typography>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mt: 0.5,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Confidence: {insight.confidence}% | Entities:{' '}
            {insight.affectedEntities}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(insight.timestamp).toLocaleTimeString()}
          </Typography>
        </Box>
      </Box>
    </Alert>
  );
}

export default function LiveCollaborationPanel() {
  const { liveUpdates, connectedUsers, isConnected } = useRealTimeGraph();
  const aiInsights = useAIInsights();
  const { recentActivity } = useInvestigationCollab('current');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ pb: 1 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <Typography variant="h6">🌐 Live Collaboration</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Badge color={isConnected ? 'success' : 'error'} variant="dot">
              <Typography
                variant="caption"
                color={isConnected ? 'success.main' : 'error.main'}
              >
                {isConnected ? 'Connected' : 'Disconnected'}
              </Typography>
            </Badge>
            <IconButton
              size="small"
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              color={notificationsEnabled ? 'primary' : 'default'}
            >
              {notificationsEnabled ? (
                <NotificationsIcon />
              ) : (
                <NotificationsOffIcon />
              )}
            </IconButton>
          </Box>
        </Box>

        {/* Connected Users */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            👥 Online Team ({connectedUsers.filter((u) => u.isOnline).length}/
            {connectedUsers.length})
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {connectedUsers.map((user) => (
              <UserAvatar key={user.id} user={user} />
            ))}
          </Box>
        </Box>
      </CardContent>

      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">
              🤖 AI Insights ({aiInsights.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0, maxHeight: 200, overflow: 'auto' }}>
            {aiInsights.length > 0 ? (
              aiInsights.map((insight) => (
                <AIInsightItem key={insight.id} insight={insight} />
              ))
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: 'center', py: 2 }}
              >
                🧠 AI is analyzing patterns...
              </Typography>
            )}
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">
              📈 Live Updates ({liveUpdates.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails
            sx={{ pt: 0, maxHeight: 200, overflow: 'auto', px: 0 }}
          >
            <List dense>
              {liveUpdates.length > 0 ? (
                liveUpdates.map((update) => (
                  <LiveUpdate key={update.id} update={update} />
                ))
              ) : (
                <ListItem>
                  <ListItemText
                    primary="🔄 Monitoring for updates..."
                    secondary="Real-time changes will appear here"
                  />
                </ListItem>
              )}
            </List>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">
              ⚡ Recent Activity ({recentActivity.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails
            sx={{ pt: 0, maxHeight: 150, overflow: 'auto', px: 0 }}
          >
            <List dense>
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <ListItem key={activity.id} sx={{ py: 0.5 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ width: 20, height: 20, fontSize: '10px' }}>
                        {activity.user.includes('AI') ? '🤖' : '👤'}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          <strong>{activity.user}</strong> {activity.action}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {new Date(activity.timestamp).toLocaleTimeString()}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))
              ) : (
                <ListItem>
                  <ListItemText
                    primary="🕒 No recent activity"
                    secondary="Team actions will appear here"
                  />
                </ListItem>
              )}
            </List>
          </AccordionDetails>
        </Accordion>
      </Box>

      {/* Progress Indicator */}
      {isConnected && (
        <Box sx={{ p: 1 }}>
          <LinearProgress
            variant="indeterminate"
            sx={{ height: 2, borderRadius: 1, opacity: 0.3 }}
            color="primary"
          />
        </Box>
      )}
    </Card>
  );
}
