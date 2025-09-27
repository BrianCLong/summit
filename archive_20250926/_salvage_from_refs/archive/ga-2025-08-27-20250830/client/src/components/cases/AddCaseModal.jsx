import React, { useState } from 'react';
import { Modal, Box, Typography, TextField, Button, Select, MenuItem, FormControl, InputLabel, CircularProgress, Alert } from '@mui/material';
import { useQuery, useMutation, gql } from '@apollo/client';
import $ from 'jquery'; // Import jQuery for toasts

const GET_CASES = gql`
  query GetCases {
    cases {
      id
      name
    }
  }
`;

const ADD_TO_CASE_MUTATION = gql`
  mutation AddCaseItem($caseId: ID!, $kind: String!, $refId: String!) {
    addCaseItem(caseId: $caseId, kind: $kind, refId: $refId) {
      id
    }
  }
`;

const CREATE_CASE_MUTATION = gql`
  mutation CreateCase($name: String!, $summary: String) {
    createCase(name: $name, summary: $summary) {
      id
      name
    }
  }
`;

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

function AddCaseModal({ open, handleClose, itemKind, itemRefId }) {
  const [selectedCase, setSelectedCase] = useState('');
  const [newCaseName, setNewCaseName] = useState('');
  const [newCaseSummary, setNewCaseSummary] = useState('');
  const [createOrSelect, setCreateOrSelect] = useState('select'); // 'select' or 'create'

  const { loading, error, data, refetch } = useQuery(GET_CASES);
  const [addToCase, { loading: adding, error: addError }] = useMutation(ADD_TO_CASE_MUTATION);
  const [createCase, { loading: creating, error: createError }] = useMutation(CREATE_CASE_MUTATION);

  const handleAddToCase = async () => {
    try {
      let caseIdToUse = selectedCase;
      if (createOrSelect === 'create') {
        if (!newCaseName) {
          $(document).trigger('intelgraph:toast', ['New case name is required.', 'error']);
          return;
        }
        const { data: newCaseData } = await createCase({ variables: { name: newCaseName, summary: newCaseSummary } });
        caseIdToUse = newCaseData.createCase.id; // Use the actual new case ID
        $(document).trigger('intelgraph:toast', [`Case "${newCaseData.createCase.name}" created successfully!`, 'success']);
      }

      await addToCase({ variables: { caseId: caseIdToUse, kind: itemKind, refId: itemRefId } });
      $(document).trigger('intelgraph:toast', [`Item added to case successfully!`, 'success']);
      handleClose();
    } catch (e) {
      $(document).trigger('intelgraph:toast', [`Failed to add item to case: ${e.message}`, 'error']);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="add-to-case-modal-title"
      aria-describedby="add-to-case-modal-description"
    >
      <Box sx={style}>
        <Typography id="add-to-case-modal-title" variant="h6" component="h2">
          Add Item to Case
        </Typography>
        <Typography sx={{ mt: 2 }}>
          Adding {itemKind}: {itemRefId}
        </Typography>

        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>Action</InputLabel>
          <Select
            value={createOrSelect}
            label="Action"
            onChange={(e) => setCreateOrSelect(e.target.value)}
          >
            <MenuItem value="select">Select Existing Case</MenuItem>
            <MenuItem value="create">Create New Case</MenuItem>
          </Select>
        </FormControl>

        {createOrSelect === 'select' && (
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="select-case-label">Select Case</InputLabel>
            <Select
              labelId="select-case-label"
              value={selectedCase}
              label="Select Case"
              onChange={(e) => setSelectedCase(e.target.value)}
            >
              {loading && <MenuItem disabled><CircularProgress size={20} /></MenuItem>}
              {error && <MenuItem disabled><Alert severity="error">Error loading cases</Alert></MenuItem>}
              {data?.cases.map((caseItem) => ( // Now using data.cases
                <MenuItem key={caseItem.id} value={caseItem.id}>
                  {caseItem.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {createOrSelect === 'create' && (
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="New Case Name"
              value={newCaseName}
              onChange={(e) => setNewCaseName(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="New Case Summary"
              value={newCaseSummary}
              onChange={(e) => setNewCaseSummary(e.target.value)}
              multiline
              rows={3}
            />
          </Box>
        )}

        {(adding || creating) && <CircularProgress sx={{ mt: 2 }} />}
        {addError && <Alert severity="error" sx={{ mt: 2 }}>Error adding to case: {addError.message}</Alert>}
        {createError && <Alert severity="error" sx={{ mt: 2 }}>Error creating case: {createError.message}</Alert>}

        <Button
          variant="contained"
          onClick={handleAddToCase}
          disabled={adding || creating || (createOrSelect === 'select' && !selectedCase) || (createOrSelect === 'create' && !newCaseName)}
          sx={{ mt: 2 }}
        >
          {createOrSelect === 'select' ? 'Add to Selected Case' : 'Create Case and Add'}
        </Button>
      </Box>
    </Modal>
  );
}

export default AddCaseModal;
