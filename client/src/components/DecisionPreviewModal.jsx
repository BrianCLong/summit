import { useEffect, useState, forwardRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, List, ListItem, ListItemText,
  Chip, Alert, Stack, CircularProgress
} from '@mui/material';
import Slide from '@mui/material/Slide';

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function DecisionPreviewModal({
  open, onClose, intent, scope, proposal, allowApply = true,
  onApplied // (result)=>void
}) {
  const [loading, setLoading] = useState(false);
  const [diff, setDiff] = useState(null);
  const [policy, setPolicy] = useState({ allow: false, reason: '' });
  const [dryRun, setDryRun] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch('/v1/decisions/diff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-roles': 'Exec,Presenter' },
      body: JSON.stringify({ intent, scope, proposal })
    })
      .then(r => r.json())
      .then(d => { setDiff(d); setPolicy(d.policy || { allow:false, reason:'n/a'}); })
      .catch(() => setDiff({ changes: [], warnings: ['Failed to compute diff'] }))
      .finally(() => setLoading(false));
  }, [open, intent, scope, proposal]);

  const apply = () => {
    setLoading(true);
    fetch(`/v1/decisions/apply?dry=${dryRun?'1':'0'}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-roles': 'Exec,Presenter' },
      body: JSON.stringify({ intent, scope, diff: diff?.changes, proposal })
    })
      .then(r => r.json())
      .then(res => onApplied?.(res))
      .finally(() => setLoading(false));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" TransitionComponent={Transition}>
      <DialogTitle>Preview &amp; Commit — {intent}</DialogTitle>
      <DialogContent dividers>
        {loading && <Stack alignItems="center" sx={{ my: 2 }}><CircularProgress /></Stack>}

        {!loading && (
          <>
            {!policy.allow && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Blocked by policy: {policy.reason || 'not allowed'}
              </Alert>
            )}
            {diff?.warnings?.length > 0 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                {diff.warnings.join(' • ')}
              </Alert>
            )}
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Scope</Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
              {(scope?.accounts||[]).map(a => <Chip key={a} size="small" label={`acct:${a}`} />)}
              {(scope?.teams||[]).map(t => <Chip key={t} size="small" label={`team:${t}`} />)}
            </Stack>

            <Typography variant="subtitle2">Changes</Typography>
            <List dense>
              {(diff?.changes||[]).map((c, i) => (
                <ListItem key={i}>
                  <ListItemText
                    primary={`${c.path}  ${c.op.toUpperCase()}  →  ${JSON.stringify(c.to)}`}
                    secondary={c.reason || ''}
                  />
                </ListItem>
              ))}
              {(diff?.changes||[]).length === 0 && (
                <ListItem><ListItemText primary="No effective changes" /></ListItem>
              )}
            </List>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Chip
          label={dryRun ? 'Dry-run' : 'Apply for real'}
          onClick={() => setDryRun(v => !v)}
          color={dryRun ? 'default' : 'warning'}
          variant="outlined"
        />
        <Button disabled={!policy.allow || !allowApply || loading} variant="contained" onClick={apply}>
          {dryRun ? 'Run Dry-Run' : 'Apply Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}