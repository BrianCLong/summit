import React, { useState } from 'react';
import { Button, TextField, Stack, Switch, FormControlLabel } from '@mui/material';
import $ from 'jquery';

export default function RunbookPlanner() {
  const [task, setTask] = useState('qa');
  const [loa, setLoa] = useState(1);
  const [stream, setStream] = useState(true);
  const [input, setInput] = useState('say hello');

  function execute() {
    $.ajax({
      url: '/route/execute', method: 'POST', contentType: 'application/json',
      data: JSON.stringify({ task, loa, input, stream }),
      success: (resp) => console.log('audit_id', resp.audit_id),
      error: (xhr) => console.error(xhr.responseText)
    });
  }

  return (
    <Stack spacing={2} direction="row" alignItems="center">
      <TextField size="small" label="Task" value={task} onChange={e => setTask(e.target.value)} />
      <TextField size="small" label="LoA" type="number" value={loa} onChange={e => setLoa(Number(e.target.value))} />
      <TextField size="small" label="Input" value={input} onChange={e => setInput(e.target.value)} style={{ minWidth: 280 }} />
      <FormControlLabel control={<Switch checked={stream} onChange={e => setStream(e.target.checked)} />} label="Stream" />
      <Button variant="contained" onClick={execute}>Plan & Execute</Button>
    </Stack>
  );
}
