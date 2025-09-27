import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
  Tooltip
} from '@mui/material';
import {
  Comment,
  Reply,
  MoreVert,
  Edit,
  Delete,
  Flag,
  ThumbUp,
  ThumbDown,
  Attachment,
  Close,
  Send
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { gql, useLazyQuery } from '@apollo/client';

const COMMENTS_QUERY = gql`
  query Comments($investigationId: ID!, $targetId: ID) {
    comments(investigationId: $investigationId, targetId: $targetId) {
      id
      investigationId
      targetId
      userId
      content
      metadata
      createdAt
      updatedAt
    }
  }
`;
import { useSelector } from 'react-redux';

function CommentSystem({ 
  targetType, 
  targetId, 
  investigationId,
  socket,
  onCommentCountChange 
}) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedComment, setSelectedComment] = useState(null);
  const [showReplies, setShowReplies] = useState(new Set());
  const [filterType, setFilterType] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [attachmentDialog, setAttachmentDialog] = useState(false);
  
  const { user } = useSelector(state => state.auth);
  const commentInputRef = useRef(null);
  const [loadCommentsQuery, { data: commentsData, called }] = useLazyQuery(COMMENTS_QUERY);

  useEffect(() => {
    // Load persisted comments
    if (investigationId && !called) {
      loadCommentsQuery({ variables: { investigationId, targetId } });
    }
    // Socket updates
    if (socket) {
      socket.on('comment:update', handleCommentUpdate);
      return () => socket.off('comment:update', handleCommentUpdate);
    }
  }, [targetId, socket]);

  useEffect(() => {
    if (commentsData?.comments) {
      const transformed = commentsData.comments.map(c => ({
        id: c.id,
        content: c.content,
        author: { id: c.userId, firstName: 'User', lastName: '' },
        timestamp: new Date(c.createdAt),
        type: 'general',
        reactions: { likes: 0, dislikes: 0 },
        replies: [],
        tags: [],
        priority: 'normal'
      }));
      setComments(transformed);
    }
  }, [commentsData]);

  useEffect(() => {
    if (onCommentCountChange) {
      onCommentCountChange(comments.length);
    }
  }, [comments.length, onCommentCountChange]);

  // Removed mock loadComments in favor of GraphQL

  const handleCommentUpdate = (data) => {
    const { type, comment, commentId } = data;
    
    switch (type) {
      case 'comment_added':
        setComments(prev => [comment, ...prev]);
        break;
      case 'comment_updated':
        setComments(prev => prev.map(c => 
          c.id === comment.id ? { ...c, ...comment } : c
        ));
        break;
      case 'comment_deleted':
        setComments(prev => prev.filter(c => c.id !== commentId));
        break;
      default:
        break;
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    const comment = {
      id: Date.now().toString(),
      content: newComment,
      author: user,
      timestamp: new Date(),
      type: 'general',
      reactions: { likes: 0, dislikes: 0 },
      replies: [],
      tags: [],
      priority: 'normal',
      targetType,
      targetId,
      investigationId
    };

    try {
      if (replyTo) {
        // Add as reply
        const reply = {
          ...comment,
          id: `${replyTo}-${Date.now()}`
        };
        
        setComments(prev => prev.map(c => 
          c.id === replyTo 
            ? { ...c, replies: [...c.replies, reply] }
            : c
        ));
        
        if (socket) {
          socket.emit('comment:add', {
            investigationId,
            comment: reply,
            parentId: replyTo
          });
        }
        
        setReplyTo(null);
      } else {
        // Add as new comment
        setComments(prev => [comment, ...prev]);
        
        if (socket) {
          socket.emit('comment:add', {
            investigationId,
            comment
          });
        }
      }
      
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleEditComment = async (commentId, newContent) => {
    try {
      setComments(prev => prev.map(c => 
        c.id === commentId 
          ? { ...c, content: newContent, edited: true, editedAt: new Date() }
          : c
      ));
      
      if (socket) {
        socket.emit('comment:update', {
          investigationId,
          comment: { id: commentId, content: newContent }
        });
      }
      
      setEditingComment(null);
    } catch (error) {
      console.error('Error editing comment:', error);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      setComments(prev => prev.filter(c => c.id !== commentId));
      
      if (socket) {
        socket.emit('comment:delete', {
          investigationId,
          commentId
        });
      }
      
      setMenuAnchor(null);
      setSelectedComment(null);
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleReaction = (commentId, reactionType) => {
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        const reactions = { ...c.reactions };
        reactions[reactionType] = (reactions[reactionType] || 0) + 1;
        return { ...c, reactions };
      }
      return c;
    }));
  };

  const toggleReplies = (commentId) => {
    setShowReplies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'observation': return '👁️';
      case 'analysis': return '📊';
      case 'question': return '❓';
      case 'alert': return '🚨';
      default: return '💬';
    }
  };

  const filteredAndSortedComments = comments
    .filter(comment => {
      if (filterType === 'all') return true;
      return comment.type === filterType;
    })
    .sort((a, b) => {
      switch (sortOrder) {
        case 'newest':
          return new Date(b.timestamp) - new Date(a.timestamp);
        case 'oldest':
          return new Date(a.timestamp) - new Date(b.timestamp);
        case 'most_reactions':
          return (b.reactions.likes + b.reactions.dislikes) - (a.reactions.likes + a.reactions.dislikes);
        default:
          return 0;
      }
    });

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Comments & Annotations
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Button
            size="small"
            variant={filterType === 'all' ? 'contained' : 'outlined'}
            onClick={() => setFilterType('all')}
          >
            All ({comments.length})
          </Button>
          <Button
            size="small"
            variant={filterType === 'observation' ? 'contained' : 'outlined'}
            onClick={() => setFilterType('observation')}
          >
            Observations
          </Button>
          <Button
            size="small"
            variant={filterType === 'analysis' ? 'contained' : 'outlined'}
            onClick={() => setFilterType('analysis')}
          >
            Analysis
          </Button>
          <Button
            size="small"
            variant={filterType === 'alert' ? 'contained' : 'outlined'}
            onClick={() => setFilterType('alert')}
          >
            Alerts
          </Button>
        </Box>
      </Box>

      {/* Comment Input */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        {replyTo && (
          <Box sx={{ mb: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Replying to comment
            </Typography>
            <Button
              size="small"
              startIcon={<Close />}
              onClick={() => setReplyTo(null)}
            >
              Cancel
            </Button>
          </Box>
        )}
        <TextField
          ref={commentInputRef}
          fullWidth
          multiline
          rows={3}
          placeholder={replyTo ? "Write a reply..." : "Add a comment..."}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          variant="outlined"
          sx={{ mb: 2 }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              startIcon={<Attachment />}
              size="small"
              onClick={() => setAttachmentDialog(true)}
            >
              Attach
            </Button>
          </Box>
          <Button
            variant="contained"
            startIcon={<Send />}
            onClick={handleSubmitComment}
            disabled={!newComment.trim()}
          >
            {replyTo ? 'Reply' : 'Comment'}
          </Button>
        </Box>
      </Box>

      {/* Comments List */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <List>
          {filteredAndSortedComments.map((comment) => (
            <React.Fragment key={comment.id}>
              <ListItem alignItems="flex-start" sx={{ py: 2 }}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    {comment.author.firstName[0]}{comment.author.lastName[0]}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="subtitle2">
                        {comment.author.firstName} {comment.author.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true })}
                      </Typography>
                      <Chip
                        size="small"
                        label={comment.priority}
                        color={getPriorityColor(comment.priority)}
                        variant="outlined"
                      />
                      <Typography variant="caption">
                        {getTypeIcon(comment.type)}
                      </Typography>
                      {comment.edited && (
                        <Typography variant="caption" color="text.secondary">
                          (edited)
                        </Typography>
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      {editingComment === comment.id ? (
                        <Box sx={{ mt: 1 }}>
                          <TextField
                            fullWidth
                            multiline
                            rows={2}
                            defaultValue={comment.content}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && e.ctrlKey) {
                                handleEditComment(comment.id, e.target.value);
                              }
                            }}
                          />
                          <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              onClick={(e) => handleEditComment(comment.id, e.target.previousSibling.querySelector('textarea').value)}
                            >
                              Save
                            </Button>
                            <Button
                              size="small"
                              onClick={() => setEditingComment(null)}
                            >
                              Cancel
                            </Button>
                          </Box>
                        </Box>
                      ) : (
                        <>
                          <Typography variant="body2" sx={{ mt: 1, mb: 1 }}>
                            {comment.content}
                          </Typography>
                          
                          {comment.tags.length > 0 && (
                            <Box sx={{ mb: 1 }}>
                              {comment.tags.map(tag => (
                                <Chip
                                  key={tag}
                                  label={tag}
                                  size="small"
                                  variant="outlined"
                                  sx={{ mr: 0.5 }}
                                />
                              ))}
                            </Box>
                          )}

                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                            <Tooltip title="Like">
                              <IconButton
                                size="small"
                                onClick={() => handleReaction(comment.id, 'likes')}
                              >
                                <Badge badgeContent={comment.reactions.likes} color="primary">
                                  <ThumbUp fontSize="small" />
                                </Badge>
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Dislike">
                              <IconButton
                                size="small"
                                onClick={() => handleReaction(comment.id, 'dislikes')}
                              >
                                <Badge badgeContent={comment.reactions.dislikes} color="error">
                                  <ThumbDown fontSize="small" />
                                </Badge>
                              </IconButton>
                            </Tooltip>
                            <Button
                              size="small"
                              startIcon={<Reply />}
                              onClick={() => {
                                setReplyTo(comment.id);
                                commentInputRef.current?.focus();
                              }}
                            >
                              Reply
                            </Button>
                            {comment.replies.length > 0 && (
                              <Button
                                size="small"
                                onClick={() => toggleReplies(comment.id)}
                              >
                                {showReplies.has(comment.id) ? 'Hide' : 'Show'} {comment.replies.length} replies
                              </Button>
                            )}
                          </Box>
                        </>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      setMenuAnchor(e.currentTarget);
                      setSelectedComment(comment);
                    }}
                  >
                    <MoreVert />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>

              {/* Replies */}
              {showReplies.has(comment.id) && comment.replies.map((reply) => (
                <ListItem key={reply.id} sx={{ pl: 8, py: 1 }}>
                  <ListItemAvatar>
                    <Avatar size="small" sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                      {reply.author.firstName[0]}{reply.author.lastName[0]}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" fontSize="0.875rem">
                          {reply.author.firstName} {reply.author.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDistanceToNow(new Date(reply.timestamp), { addSuffix: true })}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" fontSize="0.875rem">
                        {reply.content}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}

              <Divider />
            </React.Fragment>
          ))}
        </List>
      </Box>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            setEditingComment(selectedComment.id);
            setMenuAnchor(null);
          }}
          disabled={selectedComment?.author.id !== user.id}
        >
          <Edit fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem
          onClick={() => handleDeleteComment(selectedComment.id)}
          disabled={selectedComment?.author.id !== user.id}
        >
          <Delete fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
        <MenuItem onClick={() => setMenuAnchor(null)}>
          <Flag fontSize="small" sx={{ mr: 1 }} />
          Report
        </MenuItem>
      </Menu>

      {/* Attachment Dialog */}
      <Dialog
        open={attachmentDialog}
        onClose={() => setAttachmentDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Attachment</DialogTitle>
        <DialogContent>
          <Typography>
            Attachment functionality would be implemented here.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAttachmentDialog(false)}>Cancel</Button>
          <Button variant="contained">Attach</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CommentSystem;
