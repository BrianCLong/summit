import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Paper,
  Divider,
  Badge,
  Tooltip,
  TextField,
  Button,
  Alert,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  People,
  Edit,
  Comment,
  Notifications,
  Send,
  Check,
  Close,
  Circle,
  CheckCircle,
  Cancel,
  Visibility,
  VisibilityOff,
  Timeline,
  Person,
  Group,
  Message
} from '@mui/icons-material';
import { useQuery, useMutation, useSubscription } from '@apollo/client';
import { gql } from '@apollo/client';

// GraphQL queries for collaboration
const GET_ACTIVE_USERS = gql`
  query GetActiveUsers($investigationId: ID!) {
    getActiveUsers(investigationId: $investigationId) {
      userId
      investigationId
      currentPage
      cursorPosition {
        x
        y
      }
      selectedEntityId
      timestamp
      userInfo {
        id
        name
        email
        avatar
        role
        isActive
        lastSeen
      }
    }
  }
`;

const GET_PENDING_EDITS = gql`
  query GetPendingEdits($investigationId: ID!) {
    getPendingEdits(investigationId: $investigationId) {
      id
      userId
      investigationId
      entityId
      editType
      changes
      timestamp
      status
      user {
        id
        name
        email
        avatar
        role
      }
    }
  }
`;

const GET_COMMENTS = gql`
  query GetComments($investigationId: ID!, $entityId: ID) {
    getComments(investigationId: $investigationId, entityId: $entityId) {
      id
      userId
      investigationId
      entityId
      content
      position {
        x
        y
      }
      timestamp
      replies {
        id
        content
        timestamp
      }
      resolved
      user {
        id
        name
        email
        avatar
        role
      }
    }
  }
`;

const GET_NOTIFICATIONS = gql`
  query GetNotifications($investigationId: ID!, $limit: Int) {
    getNotifications(investigationId: $investigationId, limit: $limit) {
      id
      type
      userId
      investigationId
      message
      timestamp
      metadata
      user {
        id
        name
        email
        avatar
        role
      }
    }
  }
`;

const GET_COLLABORATION_STATS = gql`
  query GetCollaborationStats {
    getCollaborationStats {
      activeUsers
      activeInvestigations
      pendingEdits
      totalComments
      recentNotifications
    }
  }
`;

// GraphQL mutations
const JOIN_INVESTIGATION = gql`
  mutation JoinInvestigation($investigationId: ID!, $userInfo: UserInput!) {
    joinInvestigation(investigationId: $investigationId, userInfo: $userInfo) {
      userId
      investigationId
      currentPage
      timestamp
      userInfo {
        id
        name
        email
        avatar
        role
      }
    }
  }
`;

const ADD_COMMENT = gql`
  mutation AddComment($comment: CommentInput!) {
    addComment(comment: $comment) {
      id
      userId
      investigationId
      entityId
      content
      timestamp
      resolved
      user {
        id
        name
        email
        avatar
        role
      }
    }
  }
`;

const RESOLVE_EDIT = gql`
  mutation ResolveEdit($editId: ID!, $status: EditStatus!) {
    resolveEdit(editId: $editId, status: $status) {
      id
      status
      timestamp
      user {
        id
        name
        role
      }
    }
  }
`;

// GraphQL subscriptions
const USER_PRESENCE_UPDATED = gql`
  subscription UserPresenceUpdated($investigationId: ID!) {
    userPresenceUpdated(investigationId: $investigationId) {
      userId
      investigationId
      currentPage
      timestamp
      userInfo {
        id
        name
        email
        avatar
        role
        isActive
      }
    }
  }
`;

const COMMENT_ADDED = gql`
  subscription CommentAdded($investigationId: ID!) {
    commentAdded(investigationId: $investigationId) {
      id
      userId
      content
      timestamp
      user {
        id
        name
        avatar
        role
      }
    }
  }
`;

const LIVE_NOTIFICATION = gql`
  subscription LiveNotification($investigationId: ID!) {
    liveNotification(investigationId: $investigationId) {
      id
      type
      userId
      message
      timestamp
      user {
        id
        name
        avatar
        role
      }
    }
  }
`;

const CollaborationPanel = ({ investigationId = 'inv-001' }) => {
  const [currentTab, setCurrentTab] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [selectedEntityId, setSelectedEntityId] = useState(null);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);

  // GraphQL queries
  const { data: activeUsersData, loading: usersLoading } = useQuery(GET_ACTIVE_USERS, {
    variables: { investigationId },
    pollInterval: 5000,
    errorPolicy: 'all'
  });

  const { data: pendingEditsData, loading: editsLoading } = useQuery(GET_PENDING_EDITS, {
    variables: { investigationId },
    pollInterval: 3000,
    errorPolicy: 'all'
  });

  const { data: commentsData, loading: commentsLoading } = useQuery(GET_COMMENTS, {
    variables: { investigationId, entityId: selectedEntityId },
    pollInterval: 2000,
    errorPolicy: 'all'
  });

  const { data: notificationsData, loading: notificationsLoading } = useQuery(GET_NOTIFICATIONS, {
    variables: { investigationId, limit: 10 },
    pollInterval: 1000,
    errorPolicy: 'all'
  });

  const { data: statsData } = useQuery(GET_COLLABORATION_STATS, {
    pollInterval: 10000,
    errorPolicy: 'all'
  });

  // GraphQL mutations
  const [joinInvestigation] = useMutation(JOIN_INVESTIGATION);
  const [addCommentMutation] = useMutation(ADD_COMMENT);
  const [resolveEditMutation] = useMutation(RESOLVE_EDIT);

  // GraphQL subscriptions
  const { data: presenceUpdate } = useSubscription(USER_PRESENCE_UPDATED, {
    variables: { investigationId }
  });

  const { data: commentUpdate } = useSubscription(COMMENT_ADDED, {
    variables: { investigationId }
  });

  const { data: notificationUpdate } = useSubscription(LIVE_NOTIFICATION, {
    variables: { investigationId }
  });

  // Auto-join investigation on mount
  useEffect(() => {
    joinInvestigation({
      variables: {
        investigationId,
        userInfo: {
          name: 'Current User',
          email: 'user@intelgraph.com',
          avatar: 'https://avatar.com/current-user',
          role: 'ANALYST'
        }
      }
    }).catch(err => console.log('Join investigation error:', err));
  }, [investigationId, joinInvestigation]);

  const handleAddComment = async () => {
    if (newComment.trim()) {
      try {
        await addCommentMutation({
          variables: {
            comment: {
              investigationId,
              entityId: selectedEntityId,
              content: newComment.trim(),
              position: null
            }
          }
        });
        setNewComment('');
        setCommentDialogOpen(false);
      } catch (err) {
        console.error('Add comment error:', err);
      }
    }
  };

  const handleResolveEdit = async (editId, status) => {
    try {
      await resolveEditMutation({
        variables: { editId, status }
      });
    } catch (err) {
      console.error('Resolve edit error:', err);
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const getEditTypeColor = (editType) => {
    switch (editType) {
      case 'CREATE': return 'success';
      case 'UPDATE': return 'info';
      case 'DELETE': return 'error';
      case 'MOVE': return 'warning';
      default: return 'default';
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'USER_JOINED': return <Person color="success" />;
      case 'USER_LEFT': return <Person color="action" />;
      case 'ENTITY_UPDATED': return <Edit color="info" />;
      case 'COMMENT_ADDED': return <Message color="primary" />;
      case 'EDIT_CONFLICT': return <Cancel color="error" />;
      default: return <Notifications />;
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now - time) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <Box sx={{ p: 2 }}>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Group color="primary" />
            🤝 Real-time Collaboration
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Live collaboration features for investigation {investigationId}
          </Typography>
          
          {statsData?.getCollaborationStats && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6} sm={3}>
                <Paper sx={{ p: 1, textAlign: 'center' }}>
                  <Typography variant="caption">Active Users</Typography>
                  <Typography variant="h6" color="primary">
                    {statsData.getCollaborationStats.activeUsers}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Paper sx={{ p: 1, textAlign: 'center' }}>
                  <Typography variant="caption">Pending Edits</Typography>
                  <Typography variant="h6" color="warning.main">
                    {statsData.getCollaborationStats.pendingEdits}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Paper sx={{ p: 1, textAlign: 'center' }}>
                  <Typography variant="caption">Comments</Typography>
                  <Typography variant="h6" color="info.main">
                    {statsData.getCollaborationStats.totalComments}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Paper sx={{ p: 1, textAlign: 'center' }}>
                  <Typography variant="caption">Notifications</Typography>
                  <Typography variant="h6" color="secondary.main">
                    {statsData.getCollaborationStats.recentNotifications}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab 
              label="Active Users" 
              icon={<Badge badgeContent={activeUsersData?.getActiveUsers?.length || 0} color="primary">
                <People />
              </Badge>}
            />
            <Tab 
              label="Pending Edits" 
              icon={<Badge badgeContent={pendingEditsData?.getPendingEdits?.length || 0} color="warning">
                <Edit />
              </Badge>}
            />
            <Tab 
              label="Comments" 
              icon={<Badge badgeContent={commentsData?.getComments?.length || 0} color="info">
                <Comment />
              </Badge>}
            />
            <Tab 
              label="Live Feed" 
              icon={<Badge badgeContent={notificationsData?.getNotifications?.length || 0} color="secondary">
                <Timeline />
              </Badge>}
            />
          </Tabs>
        </Box>

        <CardContent>
          {/* Active Users Tab */}
          {currentTab === 0 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Active Users</Typography>
                {usersLoading && <Typography variant="caption" color="text.secondary">Updating...</Typography>}
              </Box>
              
              {activeUsersData?.getActiveUsers?.length === 0 ? (
                <Alert severity="info">No active users in this investigation</Alert>
              ) : (
                <List>
                  {activeUsersData?.getActiveUsers?.map((user, index) => (
                    <ListItem key={index}>
                      <ListItemAvatar>
                        <Badge
                          overlap="circular"
                          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                          badgeContent={<Circle sx={{ color: 'success.main', fontSize: 8 }} />}
                        >
                          <Avatar src={user.userInfo.avatar}>{user.userInfo.name[0]}</Avatar>
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText
                        primary={user.userInfo.name}
                        secondary={
                          <Box>
                            <Typography variant="caption" display="block">
                              {user.userInfo.role} • {user.currentPage} page
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Last seen: {formatTimeAgo(user.timestamp)}
                            </Typography>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Tooltip title={user.selectedEntityId ? "Viewing entity" : "No selection"}>
                          <IconButton size="small">
                            {user.selectedEntityId ? <Visibility /> : <VisibilityOff />}
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          )}

          {/* Pending Edits Tab */}
          {currentTab === 1 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Pending Edits</Typography>
                {editsLoading && <Typography variant="caption" color="text.secondary">Updating...</Typography>}
              </Box>
              
              {pendingEditsData?.getPendingEdits?.length === 0 ? (
                <Alert severity="success">No pending edits</Alert>
              ) : (
                <List>
                  {pendingEditsData?.getPendingEdits?.map((edit) => (
                    <ListItem key={edit.id}>
                      <ListItemAvatar>
                        <Avatar src={edit.user.avatar}>{edit.user.name[0]}</Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip 
                              label={edit.editType}
                              color={getEditTypeColor(edit.editType)}
                              size="small"
                            />
                            <Typography variant="body2">
                              {edit.user.name} • Entity {edit.entityId}
                            </Typography>
                          </Box>
                        }
                        secondary={formatTimeAgo(edit.timestamp)}
                      />
                      <ListItemSecondaryAction>
                        <IconButton 
                          color="success" 
                          size="small" 
                          onClick={() => handleResolveEdit(edit.id, 'APPLIED')}
                        >
                          <Check />
                        </IconButton>
                        <IconButton 
                          color="error" 
                          size="small"
                          onClick={() => handleResolveEdit(edit.id, 'REJECTED')}
                        >
                          <Close />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          )}

          {/* Comments Tab */}
          {currentTab === 2 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Comments</Typography>
                <Button 
                  startIcon={<Comment />} 
                  variant="contained" 
                  size="small"
                  onClick={() => setCommentDialogOpen(true)}
                >
                  Add Comment
                </Button>
              </Box>
              
              {commentsData?.getComments?.length === 0 ? (
                <Alert severity="info">No comments yet</Alert>
              ) : (
                <List>
                  {commentsData?.getComments?.map((comment) => (
                    <ListItem key={comment.id} alignItems="flex-start">
                      <ListItemAvatar>
                        <Avatar src={comment.user.avatar}>{comment.user.name[0]}</Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle2">{comment.user.name}</Typography>
                            {comment.resolved && (
                              <Chip label="Resolved" color="success" size="small" />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                              {comment.content}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatTimeAgo(comment.timestamp)}
                              {comment.entityId && ` • Entity ${comment.entityId}`}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          )}

          {/* Live Feed Tab */}
          {currentTab === 3 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Live Activity Feed</Typography>
                {notificationsLoading && <Typography variant="caption" color="text.secondary">Updating...</Typography>}
              </Box>
              
              {notificationsData?.getNotifications?.length === 0 ? (
                <Alert severity="info">No recent activity</Alert>
              ) : (
                <List>
                  {notificationsData?.getNotifications?.map((notification) => (
                    <ListItem key={notification.id}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'background.paper' }}>
                          {getNotificationIcon(notification.type)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={notification.message}
                        secondary={
                          <Box>
                            <Typography variant="caption" display="block">
                              {notification.user.name} • {notification.type.replace(/_/g, ' ')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatTimeAgo(notification.timestamp)}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Add Comment Dialog */}
      <Dialog open={commentDialogOpen} onClose={() => setCommentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Comment</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Comment"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Enter your comment..."
          />
          <TextField
            margin="dense"
            label="Entity ID (optional)"
            fullWidth
            variant="outlined"
            value={selectedEntityId || ''}
            onChange={(e) => setSelectedEntityId(e.target.value || null)}
            placeholder="Leave blank for general comment"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommentDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddComment} variant="contained" startIcon={<Send />}>
            Add Comment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CollaborationPanel;