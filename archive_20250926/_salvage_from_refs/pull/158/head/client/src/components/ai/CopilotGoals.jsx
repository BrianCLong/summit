import React, { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { Box, Typography, TextField, Button, Card, CardContent, List, ListItem, ListItemText, Divider, Grid } from '@mui/material';

const GET_GOALS = gql`
  query CopilotGoals($investigationId: ID) {
    copilotGoals(investigationId: $investigationId) {
      id
      text
      createdAt
    }
  }
`;

const CREATE_GOAL = gql`
  mutation CreateCopilotGoal($text: String!, $investigationId: ID) {
    createCopilotGoal(text: $text, investigationId: $investigationId) {
      id
      text
      createdAt
    }
  }
`;

export default function CopilotGoals() {
  const [text, setText] = useState("");
  const [investigationId, setInvestigationId] = useState('');
  const { data, loading, error, refetch } = useQuery(GET_GOALS, { variables: { investigationId: investigationId || null } });
  const GET_INVESTIGATIONS = gql`
    query Investigations { investigations { id title } }
  `;
  const invQuery = useQuery(GET_INVESTIGATIONS);
  const [createGoal, { loading: saving }] = useMutation(CREATE_GOAL, {
    onCompleted: () => {
      setText("");
      refetch();
    }
  });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    await createGoal({ variables: { text: text.trim(), investigationId } });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Copilot Goals</Typography>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Define a goal for the copilot</Typography>
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField label="Investigation" select fullWidth SelectProps={{ native: true }} value={investigationId} onChange={(e) => setInvestigationId(e.target.value)}>
                <option value="">(None)</option>
                {(invQuery.data?.investigations || []).map((i) => (
                  <option key={i.id} value={i.id}>{i.title}</option>
                ))}
              </TextField>
            </Grid>
          </Grid>
          <form onSubmit={onSubmit}>
            <TextField
              fullWidth
              multiline
              minRows={3}
              placeholder="e.g., Identify likely coordinators in the last 90 days of communications"
              value={text}
              onChange={(e) => setText(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button type="submit" variant="contained" disabled={saving || !text.trim()}>
              {saving ? 'Saving…' : 'Save Goal'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Typography variant="h6" sx={{ mb: 1 }}>Recent Goals</Typography>
      {loading && <Typography>Loading…</Typography>}
      {error && <Typography color="error">Error loading goals</Typography>}
      <List>
        {(data?.copilotGoals || []).map((g) => (
          <React.Fragment key={g.id}>
            <ListItem>
              <ListItemText
                primary={g.text}
                secondary={new Date(g.createdAt).toLocaleString()}
              />
            </ListItem>
            <Divider component="li" />
          </React.Fragment>
        ))}
        {data && data.copilotGoals && data.copilotGoals.length === 0 && (
          <Typography color="text.secondary">No goals yet.</Typography>
        )}
      </List>
    </Box>
  );
}
