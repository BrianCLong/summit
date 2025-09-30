import React, { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Divider,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import CopilotRunPanel from './CopilotRunPanel';

const GET_GOALS = gql`
  query CopilotGoals($investigationId: ID) {
    copilotGoals(investigationId: $investigationId) {
      id
      text
      createdAt
    }
  }
`;

const GET_INVESTIGATIONS = gql`
  query Investigations {
    investigations {
      id
      title
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
  const [text, setText] = useState('');
  const [investigationId, setInvestigationId] = useState('');
  const [toast, setToast] = useState({ open: false, msg: '' });
  const [selectedGoalId, setSelectedGoalId] = useState(null);

  const { data, loading, error, refetch } = useQuery(GET_GOALS, {
    variables: { investigationId: investigationId || null },
  });
  const invQuery = useQuery(GET_INVESTIGATIONS);

  const [createGoal, { loading: saving }] = useMutation(CREATE_GOAL, {
    onCompleted: () => {
      setText('');
      refetch();
      setToast({ open: true, msg: 'Goal created' });
    },
    onError: (e) => setToast({ open: true, msg: e.message || 'Failed to create goal' }),
  });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    await createGoal({
      variables: { text: text.trim(), investigationId: investigationId || null },
    });
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Box sx={{ flexGrow: 1, p: 2 }}>
        <Typography variant="h4" gutterBottom>
          Copilot Goals
        </Typography>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Define a goal for the copilot
            </Typography>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="inv-label">Investigation</InputLabel>
                  <Select
                    labelId="inv-label"
                    label="Investigation"
                    value={investigationId}
                    onChange={(e) => setInvestigationId(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>(None)</em>
                    </MenuItem>
                    {(invQuery.data?.investigations || []).map((i) => (
                      <MenuItem key={i.id} value={i.id}>
                        {i.title}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <form onSubmit={onSubmit}>
              <TextField
                fullWidth
                multiline
                minRows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g., Identify likely coordinators in the last 90 days of communications"
                sx={{ mb: 2 }}
              />
              <Button type="submit" variant="contained" disabled={saving || !text.trim()}>
                {saving ? 'Saving…' : 'Create Goal'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Typography variant="h6" sx={{ mb: 1 }}>
          Recent Goals
        </Typography>
        {loading && <CircularProgress size={24} />}
        {error && <Typography color="error">Error loading goals</Typography>}

        <List>
          {(data?.copilotGoals || []).map((g) => (
            <React.Fragment key={g.id}>
              <ListItem
                secondaryAction={
                  <Button variant="outlined" onClick={() => setSelectedGoalId(g.id)}>
                    Run Copilot
                  </Button>
                }
              >
                <ListItemText primary={g.text} secondary={new Date(g.createdAt).toLocaleString()} />
              </ListItem>
              <Divider component="li" />
            </React.Fragment>
          ))}
          {data && data.copilotGoals && data.copilotGoals.length === 0 && (
            <Typography color="text.secondary">No goals yet.</Typography>
          )}
        </List>

        <Snackbar
          open={toast.open}
          onClose={() => setToast({ open: false, msg: '' })}
          autoHideDuration={2500}
          message={toast.msg}
        />
      </Box>
      <Box sx={{ width: 400, flexShrink: 0, borderLeft: '1px solid #e0e0e0' }}>
        {selectedGoalId && <CopilotRunPanel goalId={selectedGoalId} />}
      </Box>
    </Box>
  );
}
