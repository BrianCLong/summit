import React, { useState } from 'react'
import { gql, useMutation } from '@apollo/client'
import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material'

const ROLLBACK_MERGE = gql`
  mutation RollbackMergeSnapshot($mergeId: String!, $reason: String!) {
    rollbackMergeSnapshot(mergeId: $mergeId, reason: $reason) {
      success
      snapshotId
      decisionId
    }
  }
`

export default function MergeRollbackPanel() {
  const [mergeId, setMergeId] = useState('')
  const [reason, setReason] = useState('')

  const [rollbackMerge, { data, loading, error }] = useMutation(ROLLBACK_MERGE)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    await rollbackMerge({
      variables: {
        mergeId,
        reason,
      },
    })
  }

  const successMessage = data?.rollbackMergeSnapshot?.success
    ? `Rollback queued. Snapshot ${data.rollbackMergeSnapshot.snapshotId} restored.`
    : null

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Merge Rollback
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Restore a merge using its idempotency key (merge ID) and capture a
        reason for audit.
      </Typography>

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: 'grid', gap: 2 }}
      >
        <TextField
          label="Merge ID"
          value={mergeId}
          onChange={event => setMergeId(event.target.value)}
          required
          fullWidth
        />
        <TextField
          label="Rollback reason"
          value={reason}
          onChange={event => setReason(event.target.value)}
          required
          fullWidth
          multiline
          minRows={2}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !mergeId || !reason}
          >
            {loading ? 'Restoring...' : 'Restore Merge'}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error.message}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {successMessage}
        </Alert>
      )}
    </Paper>
  )
}
