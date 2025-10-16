import React from 'react';
import { Box, Button, Typography } from '@mui/material';

const ThreadedComments = ({ comments = [], onReply }) => {
  const renderThread = (parentId = null, level = 0) =>
    comments
      .filter((c) => c.parentId === parentId)
      .map((c) => (
        <Box key={c.id} sx={{ pl: level * 2, mb: 1 }}>
          <Typography variant="body2" gutterBottom>
            <strong>{c.author}:</strong> {c.text}
          </Typography>
          <Button size="small" onClick={() => onReply(c.id)}>
            Reply
          </Button>
          {renderThread(c.id, level + 1)}
        </Box>
      ));

  return <Box>{renderThread()}</Box>;
};

export default ThreadedComments;
