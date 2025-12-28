import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

export function ExperimentalBanner() {
  return (
    <Stack spacing={1} sx={{ mb: 2 }}>
      <Alert severity="warning" role="status">
        <Typography variant="subtitle2">
          Experimental / Preview — isolated from GA workflows
        </Typography>
        <Typography variant="body2">
          Read-only access. Changes are non-persistent and can be disabled instantly.
        </Typography>
      </Alert>
    </Stack>
  )
}
