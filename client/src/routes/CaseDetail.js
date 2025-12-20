import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, gql } from '@apollo/client';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Button,
  List,
  ListItem,
  ListItemText,
  Paper,
} from '@mui/material';
import { SuggestionsPanel } from '../components/predictive/SuggestionsPanel';
import { attachSuggestionHover } from '../graph/hooks/jquery-hover-preview';
import { AlertsPanel } from '../components/alerts/AlertsPanel';
import { attachAlertHighlight } from '../graph/hooks/jquery-alert-highlight';

const GET_CASE_DETAILS = gql`
  query Case($id: ID!) {
    case(id: $id) {
      id
      name
      status
      priority
      summary
      created_by
      created_at
      updated_at
      members {
        user_id
        role
      }
      items {
        id
        kind
        ref_id
        tags
        added_by
        added_at
      }
      notes {
        id
        author_id
        body
        created_at
      }
      timeline {
        id
        at
        event
        payload
      }
    }
  }
`;

const ADD_CASE_NOTE = gql`
  mutation AddCaseNote($caseId: ID!, $body: String!) {
    addCaseNote(caseId: $caseId, body: $body) {
      id
      body
      author_id
      created_at
    }
  }
`;

const UPDATE_CASE = gql`
  mutation UpdateCase($id: ID!, $status: String, $priority: String) {
    updateCase(id: $id, status: $status, priority: $priority) {
      id
      status
      priority
    }
  }
`;

const REMOVE_CASE_ITEM = gql`
  mutation RemoveCaseItem($caseId: ID!, $itemId: ID!) {
    removeCaseItem(caseId: $caseId, itemId: $itemId)
  }
`;

const EXPORT_CASE_BUNDLE = gql`
  mutation ExportCaseBundle($caseId: ID!, $format: String!) {
    exportCaseBundle(caseId: $caseId, format: $format)
  }
`;

function CaseDetail() {
  const { id } = useParams();

  const { loading, error, data, refetch } = useQuery(GET_CASE_DETAILS, {
    variables: { id },
  });

  const [addNote] = useMutation(ADD_CASE_NOTE);
  const [updateCase] = useMutation(UPDATE_CASE);
  const [removeCaseItem] = useMutation(REMOVE_CASE_ITEM);
  const [exportCaseBundle] = useMutation(EXPORT_CASE_BUNDLE);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">Error: {error.message}</Alert>;
  if (!data || !data.case)
    return <Alert severity="info">Case not found.</Alert>;

  const { case: caseData } = data;

  const handleAddNote = async () => {
    const body = prompt('Enter note content:');
    if (body) {
      await addNote({ variables: { caseId: id, body } });
      refetch();
    }
  };

  const handleUpdateStatus = async () => {
    const newStatus = prompt('Enter new status (OPEN/CLOSED):');
    if (newStatus) {
      await updateCase({ variables: { id, status: newStatus } });
      refetch();
    }
  };

  const handleExport = async (format) => {
    try {
      const { data } = await exportCaseBundle({
        variables: { caseId: id, format },
      });
      if (data && data.exportCaseBundle) {
        alert(`Export successful! Download link: ${data.exportCaseBundle}`);
        // Optionally, trigger download directly
        window.open(data.exportCaseBundle, '_blank');
      }
    } catch (e) {
      alert(`Export failed: ${e.message}`);
    }
  };

  const handleRemoveItem = async (itemId) => {
    if (
      window.confirm('Are you sure you want to remove this item from the case?')
    ) {
      await removeCaseItem({ variables: { caseId: id, itemId } });
      refetch();
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Case: {caseData.name}
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          Status: {caseData.status} | Priority: {caseData.priority}
        </Typography>
        <Box>
          <Button variant="outlined" onClick={handleAddNote} sx={{ mr: 1 }}>
            Add Note
          </Button>
          <Button
            variant="outlined"
            onClick={handleUpdateStatus}
            sx={{ mr: 1 }}
          >
            Update Status
          </Button>
          <Button
            variant="outlined"
            onClick={() => handleExport('PDF')}
            sx={{ mr: 1 }}
          >
            Export PDF
          </Button>
          <Button
            variant="outlined"
            onClick={() => handleExport('HTML')}
            sx={{ mr: 1 }}
          >
            Export HTML
          </Button>
          <Button variant="outlined" onClick={() => handleExport('ZIP')}>
            Export ZIP
          </Button>
        </Box>
      </Box>
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h5" gutterBottom>
          Summary
        </Typography>
        <Typography variant="body1">
          {caseData.summary || 'No summary provided.'}
        </Typography>
      </Paper>
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h5" gutterBottom>
          Evidence ({caseData.items.length})
        </Typography>
        <List>
          {caseData.items.map((item) => (
            <ListItem
              key={item.id}
              secondaryAction={
                <Button
                  edge="end"
                  aria-label="delete"
                  onClick={() => handleRemoveItem(item.id)}
                >
                  Remove
                </Button>
              }
            >
              <ListItemText
                primary={`${item.kind}: ${item.ref_id}`}
                secondary={`Added by: ${item.added_by} on ${new Date(item.added_at).toLocaleString()} | Tags: ${item.tags.join(', ')}`}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h5" gutterBottom>
          Notes ({caseData.notes.length})
        </Typography>
        <List>
          {caseData.notes.map((note) => (
            <ListItem key={note.id}>
              <ListItemText
                primary={note.body}
                secondary={`By: ${note.author_id} on ${new Date(note.created_at).toLocaleString()}`}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
      <SuggestionsPanel caseId={caseData.id} seeds={[caseData.id]} />{' '}
      {/* Add SuggestionsPanel */}
      <AlertsPanel caseId={caseData.id} /> {/* Add AlertsPanel */}
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h5" gutterBottom>
          Timeline ({caseData.timeline.length})
        </Typography>
        <List>
          {caseData.timeline.map((event) => (
            <ListItem key={event.id}>
              <ListItemText
                primary={`${event.event} at ${new Date(event.at).toLocaleString()}`}
                secondary={JSON.stringify(event.payload)}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Container>
  );
}

export default CaseDetail;
