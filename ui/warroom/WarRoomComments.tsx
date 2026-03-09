/**
 * Summit War Room — Comments Panel
 *
 * Threaded comments for investigation collaboration.
 */

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import { useWarRoomStore } from './store';

export const WarRoomComments: React.FC = () => {
  const comments = useWarRoomStore((s) => s.comments);
  const addComment = useWarRoomStore((s) => s.addComment);
  const collaborators = useWarRoomStore((s) => s.collaborators);
  const [text, setText] = useState('');

  const rootComments = comments.filter((c) => !c.parentId);

  const handleSubmit = () => {
    if (!text.trim()) return;
    addComment({
      id: `comment-${Date.now()}`,
      authorId: 'current-user',
      text: text.trim(),
      createdAt: new Date().toISOString(),
      resolved: false,
    });
    setText('');
  };

  const getAuthor = (authorId: string) => collaborators.find((c) => c.id === authorId);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        {rootComments.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
            No comments yet. Start a discussion.
          </Typography>
        )}
        <List dense disablePadding>
          {rootComments.map((comment) => {
            const author = getAuthor(comment.authorId);
            const replies = comments.filter((c) => c.parentId === comment.id);
            return (
              <ListItem key={comment.id} sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 1 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}>
                  <Avatar sx={{ width: 20, height: 20, fontSize: 10, bgcolor: author?.color ?? 'grey.500' }}>
                    {author?.name?.charAt(0) ?? '?'}
                  </Avatar>
                  <Typography variant="caption" fontWeight={600}>
                    {author?.name ?? comment.authorId}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(comment.createdAt).toLocaleTimeString()}
                  </Typography>
                  {comment.resolved && <Chip label="Resolved" size="small" color="success" sx={{ height: 16, fontSize: 9 }} />}
                </Box>
                <Typography variant="body2">{comment.text}</Typography>
                {replies.length > 0 && (
                  <Box sx={{ ml: 3, mt: 0.5, borderLeft: 2, borderColor: 'divider', pl: 1 }}>
                    {replies.map((reply) => (
                      <Box key={reply.id} sx={{ mb: 0.5 }}>
                        <Typography variant="caption" fontWeight={600}>
                          {getAuthor(reply.authorId)?.name ?? reply.authorId}
                        </Typography>
                        <Typography variant="body2">{reply.text}</Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </ListItem>
            );
          })}
        </List>
      </Box>

      <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Add a comment..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
          sx={{ '& .MuiInputBase-input': { fontSize: 12 } }}
        />
        <Button variant="contained" size="small" onClick={handleSubmit} disabled={!text.trim()}>
          Send
        </Button>
      </Box>
    </Box>
  );
};
