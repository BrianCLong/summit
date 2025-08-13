import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Badge,
  Collapse,
  Divider,
  Tooltip,
  Button,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Fab,
  Slide,
  Card,
  CardContent
} from '@mui/material';
import {
  Send,
  Chat,
  Close,
  ExpandMore,
  ExpandLess,
  Minimize,
  Fullscreen,
  FullscreenExit,
  MoreVert,
  Reply,
  Delete,
  Flag,
  Attachment,
  Emoji,
  Mic,
  MicOff,
  VideocamOff,
  Videocam,
  ScreenShare,
  StopScreenShare,
  Group,
  Settings,
  NotificationsOff,
  Notifications
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { gql, useLazyQuery } from '@apollo/client';

const CHAT_MESSAGES_QUERY = gql`
  query ChatMessages($investigationId: ID!, $limit: Int) {
    chatMessages(investigationId: $investigationId, limit: $limit) {
      id
      investigationId
      userId
      content
      createdAt
      editedAt
    }
  }
`;

function LiveChat({ 
  websocketService, 
  currentUser, 
  investigationId,
  isMinimized = true,
  onToggleMinimize,
  position = 'bottom-right'
}) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(!isMinimized);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isTyping, setIsTyping] = useState(new Set());
  const [onlineUsers, setOnlineUsers] = useState(new Map());
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [attachmentDialog, setAttachmentDialog] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const chatInputRef = useRef(null);
  const [loadHistory, { called, loading: loadingHistory, data: historyData }] = useLazyQuery(CHAT_MESSAGES_QUERY);

  useEffect(() => {
    if (!websocketService) return;

    // Join investigation chat room
    websocketService.emit('join_investigation_chat', {
      investigationId,
      userId: currentUser?.id,
      userName: currentUser?.firstName || currentUser?.name || 'User'
    });

    // Message event handlers
    const handleNewMessage = (message) => {
      setMessages(prev => [...prev, {
        ...message,
        timestamp: new Date(message.timestamp)
      }]);

      // Update unread count if chat is minimized
      if (isMinimized && message.userId !== currentUser?.id) {
        setUnreadCount(prev => prev + 1);
        
        // Show notification if enabled
        if (notifications && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(`New message from ${message.userName}`, {
            body: message.content.substring(0, 100),
            icon: '/favicon.ico'
          });
        }
      }

      // Auto-scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    };

    const handleTypingUpdate = (data) => {
      if (data.userId !== currentUser?.id) {
        setIsTyping(prev => {
          const newTyping = new Set(prev);
          if (data.isTyping) {
            newTyping.add(data.userId);
          } else {
            newTyping.delete(data.userId);
          }
          return newTyping;
        });

        // Clear typing indicator after timeout
        setTimeout(() => {
          setIsTyping(prev => {
            const newTyping = new Set(prev);
            newTyping.delete(data.userId);
            return newTyping;
          });
        }, 3000);
      }
    };

    const handleUserPresence = (data) => {
      setOnlineUsers(prev => {
        const newUsers = new Map(prev);
        if (data.status === 'online') {
          newUsers.set(data.userId, {
            id: data.userId,
            name: data.userName,
            avatar: data.avatar,
            lastSeen: new Date()
          });
        } else {
          newUsers.delete(data.userId);
        }
        return newUsers;
      });
    };

    const handleMessageDeleted = (data) => {
      setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
    };

    const handleMessageEdited = (data) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, content: data.newContent, edited: true }
          : msg
      ));
    };

    // Register event listeners
    websocketService.on('chat_message', handleNewMessage);
    websocketService.on('user_typing', handleTypingUpdate);
    websocketService.on('user_presence', handleUserPresence);
    websocketService.on('message_deleted', handleMessageDeleted);
    websocketService.on('message_edited', handleMessageEdited);

    return () => {
      websocketService.off('chat_message', handleNewMessage);
      websocketService.off('user_typing', handleTypingUpdate);
      websocketService.off('user_presence', handleUserPresence);
      websocketService.off('message_deleted', handleMessageDeleted);
      websocketService.off('message_edited', handleMessageEdited);
    };
  }, [websocketService, currentUser, investigationId, isMinimized, notifications]);

  // Load chat history on open
  useEffect(() => {
    if (investigationId && !called) {
      loadHistory({ variables: { investigationId, limit: 100 } });
    }
  }, [investigationId]);

  useEffect(() => {
    if (historyData?.chatMessages?.length) {
      const historical = historyData.chatMessages
        .slice()
        .reverse()
        .map(m => ({ id: m.id, userId: m.userId, userName: 'User', investigationId: m.investigationId, content: m.content, timestamp: m.createdAt }));
      setMessages(historical);
      setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 50);
    }
  }, [historyData]);

  useEffect(() => {
    // Reset unread count when expanded
    if (isExpanded) {
      setUnreadCount(0);
    }
  }, [isExpanded]);

  const sendMessage = () => {
    if (!newMessage.trim() || !websocketService) return;

    const message = {
      id: Date.now().toString(),
      investigationId,
      userId: currentUser?.id,
      userName: currentUser?.firstName || currentUser?.name || 'User',
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
      type: 'text',
      replyTo: replyToMessage?.id || null
    };

    websocketService.emit('send_chat_message', message);
    setNewMessage('');
    setReplyToMessage(null);

    // Stop typing indicator
    websocketService.emit('user_typing', {
      investigationId,
      userId: currentUser?.id,
      isTyping: false
    });
  };

  const handleTyping = (value) => {
    setNewMessage(value);

    // Send typing indicator
    if (websocketService) {
      websocketService.emit('user_typing', {
        investigationId,
        userId: currentUser?.id,
        userName: currentUser?.firstName || currentUser?.name || 'User',
        isTyping: value.length > 0
      });

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        websocketService.emit('user_typing', {
          investigationId,
          userId: currentUser?.id,
          isTyping: false
        });
      }, 2000);
    }
  };

  const handleContextMenu = (event, message) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4
    });
    setSelectedMessage(message);
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
    setSelectedMessage(null);
  };

  const deleteMessage = () => {
    if (selectedMessage && websocketService) {
      websocketService.emit('delete_chat_message', {
        investigationId,
        messageId: selectedMessage.id
      });
    }
    handleCloseContextMenu();
  };

  const replyToMessageAction = () => {
    setReplyToMessage(selectedMessage);
    handleCloseContextMenu();
    chatInputRef.current?.focus();
  };

  const toggleFullscreen = () => {
    setFullscreen(!fullscreen);
  };

  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        setNotifications(permission === 'granted');
      });
    }
  };

  const MessageItem = ({ message }) => {
    const isOwnMessage = message.userId === currentUser?.id;
    const replyMessage = replyToMessage && messages.find(m => m.id === message.replyTo);

    return (
      <ListItem
        sx={{
          flexDirection: 'column',
          alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
          py: 1
        }}
        onContextMenu={(e) => handleContextMenu(e, message)}
      >
        {replyMessage && (
          <Box sx={{ mb: 1, opacity: 0.7, fontSize: '0.75rem' }}>
            <Typography variant="caption">
              Replying to {replyMessage.userName}: {replyMessage.content.substring(0, 50)}...
            </Typography>
          </Box>
        )}
        
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 1,
            maxWidth: '80%',
            flexDirection: isOwnMessage ? 'row-reverse' : 'row'
          }}
        >
          <Avatar
            sx={{ width: 32, height: 32 }}
            src={message.avatar}
          >
            {message.userName[0]}
          </Avatar>
          
          <Paper
            sx={{
              px: 2,
              py: 1,
              bgcolor: isOwnMessage ? 'primary.main' : 'background.paper',
              color: isOwnMessage ? 'primary.contrastText' : 'text.primary',
              borderRadius: isOwnMessage ? '16px 4px 16px 16px' : '4px 16px 16px 16px'
            }}
          >
            {!isOwnMessage && (
              <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block' }}>
                {message.userName}
              </Typography>
            )}
            <Typography variant="body2">{message.content}</Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                display: 'block', 
                mt: 0.5, 
                opacity: 0.7,
                fontSize: '0.6rem'
              }}
            >
              {formatDistanceToNow(message.timestamp, { addSuffix: true })}
              {message.edited && ' (edited)'}
            </Typography>
          </Paper>
        </Box>
      </ListItem>
    );
  };

  const ChatHeader = () => (
    <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chat />
          <Typography variant="h6">Investigation Chat</Typography>
          <Badge badgeContent={onlineUsers.size} color="success">
            <Group fontSize="small" />
          </Badge>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Toggle notifications">
            <IconButton
              size="small"
              onClick={() => {
                if (!notifications && 'Notification' in window) {
                  requestNotificationPermission();
                } else {
                  setNotifications(!notifications);
                }
              }}
            >
              {notifications ? <Notifications /> : <NotificationsOff />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title={fullscreen ? "Exit fullscreen" : "Fullscreen"}>
            <IconButton size="small" onClick={toggleFullscreen}>
              {fullscreen ? <FullscreenExit /> : <Fullscreen />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title={isExpanded ? "Minimize" : "Expand"}>
            <IconButton 
              size="small" 
              onClick={() => {
                setIsExpanded(!isExpanded);
                if (onToggleMinimize) onToggleMinimize(!isExpanded);
              }}
            >
              {isExpanded ? <Minimize /> : <ExpandMore />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {isTyping.size > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {Array.from(isTyping).length === 1 ? 'Someone is typing...' : `${isTyping.size} people are typing...`}
        </Typography>
      )}
    </Box>
  );

  if (fullscreen) {
    return (
      <Dialog
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { height: '80vh' } }}
      >
        <DialogTitle>
          <ChatHeader />
        </DialogTitle>
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Same content as main chat */}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      {/* Minimized Chat Button */}
      {!isExpanded && (
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: position.includes('bottom') ? 16 : 'auto',
            top: position.includes('top') ? 16 : 'auto',
            right: position.includes('right') ? 16 : 'auto',
            left: position.includes('left') ? 16 : 'auto',
            zIndex: 1000
          }}
          onClick={() => {
            setIsExpanded(true);
            if (onToggleMinimize) onToggleMinimize(false);
          }}
        >
          <Badge badgeContent={unreadCount} color="error">
            <Chat />
          </Badge>
        </Fab>
      )}

      {/* Expanded Chat Window */}
      <Slide direction="up" in={isExpanded} mountOnEnter unmountOnExit>
        <Paper
          sx={{
            position: 'fixed',
            bottom: position.includes('bottom') ? 16 : 'auto',
            top: position.includes('top') ? 16 : 'auto',
            right: position.includes('right') ? 16 : 'auto',
            left: position.includes('left') ? 16 : 'auto',
            width: 400,
            height: 600,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            boxShadow: 3
          }}
        >
          <ChatHeader />

          {/* Messages List */}
          <Box sx={{ flex: 1, overflow: 'auto', px: 1 }}>
            <List>
              {messages.map((message) => (
                <MessageItem key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </List>
          </Box>

          {/* Reply Banner */}
          {replyToMessage && (
            <Box sx={{ p: 1, bgcolor: 'action.hover', borderTop: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Reply fontSize="small" />
                <Typography variant="caption">
                  Replying to {replyToMessage.userName}: {replyToMessage.content.substring(0, 50)}...
                </Typography>
                <IconButton size="small" onClick={() => setReplyToMessage(null)}>
                  <Close fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          )}

          {/* Message Input */}
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <TextField
                ref={chatInputRef}
                fullWidth
                multiline
                maxRows={3}
                variant="outlined"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                size="small"
              />
              
              <IconButton
                color="primary"
                onClick={sendMessage}
                disabled={!newMessage.trim()}
              >
                <Send />
              </IconButton>
            </Box>
          </Box>
        </Paper>
      </Slide>

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={replyToMessageAction}>
          <Reply fontSize="small" sx={{ mr: 1 }} />
          Reply
        </MenuItem>
        {selectedMessage?.userId === currentUser?.id && (
          <MenuItem onClick={deleteMessage}>
            <Delete fontSize="small" sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        )}
        <MenuItem onClick={handleCloseContextMenu}>
          <Flag fontSize="small" sx={{ mr: 1 }} />
          Report
        </MenuItem>
      </Menu>
    </>
  );
}

export default LiveChat;
