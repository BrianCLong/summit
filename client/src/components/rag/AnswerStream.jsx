import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';

export default function AnswerStream({ question }) {
  const [answer, setAnswer] = useState('');
  const [citations, setCitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!question) return;
    setLoading(true);
    setAnswer('');
    setCitations([]);
    setError('');

    const controller = new AbortController();
    const signal = controller.signal;

    const fetchData = async () => {
      try {
        const response = await fetch('/v1/rag/answer/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question }),
          signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process each SSE event
          let lastIndex = 0;
          buffer.replace(/data: (.*)\n\n/g, (match, data) => {
            try {
              const parsed = JSON.parse(data);
              if (parsed.answer) {
                setAnswer(prev => prev + parsed.answer);
              }
              if (parsed.citations) {
                setCitations(parsed.citations);
              }
            } catch (e) {
              console.error("Error parsing SSE data:", e);
            }
            lastIndex = match.length;
            return ''; // Remove processed data from buffer
          });
          buffer = buffer.substring(lastIndex);
        }
      } catch (e) {
        if (e.name !== 'AbortError') {
          setError(e.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      controller.abort();
    };
  }, [question]);

  return (
    <Box>
      {loading && <CircularProgress size={20} sx={{ mr: 2 }} />}
      {error && <Alert severity="error">Error: {error}</Alert>}
      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
        {answer || (loading ? 'Generating answer...' : 'No answer generated.')}
      </Typography>
      {citations.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2">Citations:</Typography>
          <List dense>
            {citations.map((c, i) => (
              <ListItem key={c.id || i}>
                <ListItemText
                  primary={`[${c.n || i + 1}] ${c.title}`}
                  secondary={c.snippet}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Box>
  );
}
